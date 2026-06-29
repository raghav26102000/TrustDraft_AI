// End-to-end pipeline: parse → chunk → embed → retrieve → draft → store.
// Designed to run async (fire-and-forget) after the user-facing API returns.

import { getDb } from '@/lib/server/db'
import { extractTextFromFile, extractQuestionsFromQuestionnaire } from '@/lib/ai/parse'
import { chunkText } from '@/lib/ai/chunk'
import { embedText, embedMany, EMBEDDING_PROVIDER } from '@/lib/ai/embeddings'
import { topK } from '@/lib/ai/similarity'
import { draftAnswer, activeProviderInfo } from '@/lib/ai/generateAnswer'
import { segmentQuestionsWithLLM } from '@/lib/ai/segmentQuestions'
import { notifySubmissionComplete, notifySubmissionFailed } from '@/lib/server/notify'

async function setStatus(submissionId, patch) {
  const db = await getDb()
  await db.collection('submissions').updateOne(
    { id: submissionId },
    { $set: { ...patch, updated_at: new Date().toISOString() } }
  )
}

export async function runPipelineForSubmission(submissionId) {
  const db = await getDb()
  const submission = await db.collection('submissions').findOne({ id: submissionId })
  if (!submission) throw new Error(`submission not found: ${submissionId}`)

  const questionnaire = (submission.files || []).find((f) => f.kind === 'questionnaire')
  const supporting = (submission.files || []).filter((f) => f.kind === 'supporting')
  if (!questionnaire) throw new Error('questionnaire file missing')

  await setStatus(submissionId, { status: 'processing', stage: 'parsing' })

  // --- 1. Extract questions from questionnaire -----------------------------
  let questions = []
  try {
    const parsed = await extractQuestionsFromQuestionnaire(questionnaire.stored_path, questionnaire.original_name)
    if (parsed.mode === 'rows' && parsed.questions.length > 0) {
      questions = parsed.questions
    } else if (parsed.rawText) {
      const segmented = await segmentQuestionsWithLLM(parsed.rawText)
      if (segmented.length > 0) {
        questions = segmented
      } else {
        // Last resort: treat the whole document as one question.
        questions = [parsed.rawText.slice(0, 2000)]
      }
    }
  } catch (err) {
    console.error('[pipeline] questionnaire parse failed:', err)
    await setStatus(submissionId, { status: 'parse_error', error: `questionnaire: ${err.message}` })
    notifySubmissionFailed({ submission, error: `questionnaire parse: ${err.message}` }).catch(() => {})
    return
  }
  questions = questions.map((q) => (q || '').toString().trim()).filter((q) => q.length >= 4)
  if (questions.length === 0) {
    await setStatus(submissionId, { status: 'parse_error', error: 'no questions extracted from questionnaire' })
    notifySubmissionFailed({ submission, error: 'no questions extracted' }).catch(() => {})
    return
  }

  // --- 2. Parse supporting docs into chunks --------------------------------
  await setStatus(submissionId, { stage: 'parsing_supporting_docs', question_count: questions.length })
  const allChunks = []
  for (const doc of supporting) {
    try {
      const text = await extractTextFromFile(doc.stored_path, doc.original_name)
      const chunks = chunkText(text)
      for (const c of chunks) {
        allChunks.push({ sourceDoc: doc.original_name, text: c })
      }
    } catch (err) {
      console.error(`[pipeline] supporting doc parse failed: ${doc.original_name}`, err.message)
      // Skip this doc but don't fail the whole pipeline.
    }
  }

  // --- 3. Embed chunks ------------------------------------------------------
  await setStatus(submissionId, { stage: 'embedding', chunk_count: allChunks.length })
  let chunkVectors = []
  if (allChunks.length > 0) {
    try {
      const vecs = await embedMany(allChunks.map((c) => c.text))
      chunkVectors = allChunks.map((c, i) => ({ ...c, embedding: vecs[i] }))
    } catch (err) {
      console.error('[pipeline] embedding chunks failed:', err)
      // Continue with empty retrieval; every question will be needs_review.
    }
  }

  if (chunkVectors.length > 0) {
    try {
      await db.collection('chunks').deleteMany({ submission_id: submissionId })
      const docs = chunkVectors.map((c, i) => ({
        submission_id: submissionId,
        index: i,
        source_doc: c.sourceDoc,
        text: c.text,
        embedding: c.embedding,
      }))
      // Insert in batches to keep individual documents under 16MB.
      for (let i = 0; i < docs.length; i += 100) {
        await db.collection('chunks').insertMany(docs.slice(i, i + 100))
      }
    } catch (err) {
      console.error('[pipeline] chunk persistence failed:', err.message)
    }
  }

  // --- 4. For each question: retrieve + draft ------------------------------
  await setStatus(submissionId, { stage: 'drafting', provider: activeProviderInfo() })
  const results = []
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    let retrieved = []
    if (chunkVectors.length > 0) {
      try {
        const qvec = await embedText(question)
        retrieved = topK(qvec, chunkVectors, 4).map((s) => ({
          text: s.item.text,
          sourceDoc: s.item.sourceDoc,
          score: s.score,
        }))
      } catch (err) {
        console.error(`[pipeline] embed question ${i} failed:`, err.message)
      }
    }
    const sourceDocNames = Array.from(new Set(retrieved.map((r) => r.sourceDoc))).filter(Boolean)
    const drafted = await draftAnswer({
      question,
      context: retrieved,
      sourceDocNames,
    })
    results.push({
      index: i,
      question,
      answer: drafted.answer,
      status: drafted.confidence,
      source_doc: drafted.sourceDoc || sourceDocNames[0] || null,
      retrieved_chunks: retrieved.map((r) => ({ source_doc: r.sourceDoc, score: r.score })),
      provider: drafted.provider,
      error: drafted.error || null,
    })
    // Progressive write so the results page can show progress on refresh.
    await db.collection('submissions').updateOne(
      { id: submissionId },
      { $set: { results, processed: i + 1, total: questions.length, updated_at: new Date().toISOString() } }
    )
  }

  // --- 5. Summarize + notify -----------------------------------------------
  const matched = results.filter((r) => r.status === 'matched').length
  const needsReview = results.filter((r) => r.status === 'needs_review').length
  const summary = { matched, needs_review: needsReview, total: results.length }
  await setStatus(submissionId, {
    status: 'completed',
    stage: 'done',
    summary,
    embedding_provider: EMBEDDING_PROVIDER,
  })
  const finalSub = await db.collection('submissions').findOne({ id: submissionId })
  notifySubmissionComplete({ submission: finalSub }).catch((e) => console.error('notify failed:', e))
}

// Fire-and-forget wrapper. Errors are caught and persisted to the submission.
export function runPipelineAsync(submissionId) {
  // Use setImmediate to defer execution until after the HTTP response is flushed.
  setImmediate(() => {
    runPipelineForSubmission(submissionId).catch(async (err) => {
      console.error(`[pipeline] fatal for ${submissionId}:`, err)
      try {
        const db = await getDb()
        await db.collection('submissions').updateOne(
          { id: submissionId },
          { $set: { status: 'parse_error', error: err.message || 'unknown error', updated_at: new Date().toISOString() } }
        )
      } catch {}
    })
  })
}
