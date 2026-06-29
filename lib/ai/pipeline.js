// End-to-end pipeline: parse → chunk → embed → retrieve → draft → store.
// Designed to run async (fire-and-forget) after the user-facing API returns.
// Every external operation is wrapped, every stage logs structured progress,
// and the whole job is bounded by an overall timeout.

import { getDb } from '@/lib/server/db'
import { extractTextFromFile, extractQuestionsFromQuestionnaire } from '@/lib/ai/parse'
import { chunkText } from '@/lib/ai/chunk'
import { embedText, embedMany, EMBEDDING_PROVIDER } from '@/lib/ai/embeddings'
import { topK } from '@/lib/ai/similarity'
import { draftAnswer, activeProviderInfo } from '@/lib/ai/generateAnswer'
import { segmentQuestionsWithLLM } from '@/lib/ai/segmentQuestions'
import { notifySubmissionComplete, notifySubmissionFailed } from '@/lib/server/notify'

const PIPELINE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes overall budget
const MIN_RELEVANCE_SCORE = 0.35           // cosine threshold for "matched" eligibility
const MAX_RETRIEVAL_K = 4

function log(submissionId, ...rest) {
  console.log(`[pipeline ${submissionId}]`, ...rest)
}
function warn(submissionId, ...rest) {
  console.warn(`[pipeline ${submissionId}]`, ...rest)
}
function errlog(submissionId, ...rest) {
  console.error(`[pipeline ${submissionId}]`, ...rest)
}

async function setStatus(submissionId, patch) {
  const db = await getDb()
  await db.collection('submissions').updateOne(
    { id: submissionId },
    { $set: { ...patch, updated_at: new Date().toISOString() } }
  )
}

async function markFailed(submissionId, status, error) {
  try {
    const db = await getDb()
    await db.collection('submissions').updateOne(
      { id: submissionId },
      { $set: { status, error, updated_at: new Date().toISOString() } }
    )
    const sub = await db.collection('submissions').findOne({ id: submissionId })
    if (sub) {
      notifySubmissionFailed({ submission: sub, error }).catch((e) =>
        errlog(submissionId, 'failure notification failed:', e?.message || e),
      )
    }
  } catch (e) {
    errlog(submissionId, 'markFailed itself failed:', e?.message || e)
  }
}

function overallTimeout(ms = PIPELINE_TIMEOUT_MS) {
  let cancel
  const p = new Promise((_, reject) => {
    const t = setTimeout(
      () => reject(new Error(`processing timeout (over ${Math.round(ms / 1000)}s)`)),
      ms,
    )
    cancel = () => clearTimeout(t)
  })
  return { promise: p, cancel }
}

async function runCore(submissionId) {
  const db = await getDb()
  const submission = await db.collection('submissions').findOne({ id: submissionId })
  if (!submission) throw new Error(`submission not found: ${submissionId}`)

  const questionnaire = (submission.files || []).find((f) => f.kind === 'questionnaire')
  const supporting = (submission.files || []).filter((f) => f.kind === 'supporting')
  if (!questionnaire) throw new Error('questionnaire file missing from submission record')

  log(submissionId, 'start', {
    company: submission.company,
    questionnaire: questionnaire.original_name,
    supporting_count: supporting.length,
  })
  await setStatus(submissionId, { status: 'processing', stage: 'parsing' })

  // Lightweight usage counters \u2014 incremented at every call site, persisted at the end.
  const usage = { llmCalls: 0, embeddingCalls: 0, inputChars: 0, outputChars: 0 }
  const accInput = (s) => { usage.inputChars += (s ? String(s).length : 0) }
  const accOutput = (s) => { usage.outputChars += (s ? String(s).length : 0) }

  // --- 1. Extract questions -----------------------------------------------
  let questions = []
  try {
    const parsed = await extractQuestionsFromQuestionnaire(
      questionnaire.stored_path,
      questionnaire.original_name,
    )
    if (parsed.mode === 'rows' && parsed.questions.length > 0) {
      questions = parsed.questions
      log(submissionId, `parsed: ${questions.length} questions from row-based xlsx layout`)
    } else if (parsed.rawText) {
      log(submissionId, 'parsed: row layout not detected, segmenting via LLM')
      accInput(parsed.rawText)
      usage.llmCalls += 1
      const segmented = await segmentQuestionsWithLLM(parsed.rawText)
      accOutput(segmented.join('\n'))
      if (segmented.length > 0) {
        questions = segmented
        log(submissionId, `parsed: ${questions.length} questions via LLM segmentation`)
      } else {
        warn(submissionId, 'parsed: LLM segmentation returned 0 questions, treating entire document as one question')
        questions = [parsed.rawText.slice(0, 2000)]
      }
    }
  } catch (err) {
    errlog(submissionId, 'questionnaire parse failed:', err?.message || err)
    await markFailed(submissionId, 'parse_error', `questionnaire: ${err?.message || 'parse failed'}`)
    return
  }
  questions = (questions || []).map((q) => (q || '').toString().trim()).filter((q) => q.length >= 4)
  if (questions.length === 0) {
    await markFailed(submissionId, 'parse_error', 'no questions could be extracted from the questionnaire')
    return
  }

  // --- 2. Parse supporting docs into chunks --------------------------------
  await setStatus(submissionId, { stage: 'parsing_supporting_docs', question_count: questions.length })
  const allChunks = []
  const parseFailures = []
  for (const doc of supporting) {
    try {
      const text = await extractTextFromFile(doc.stored_path, doc.original_name)
      const chunks = chunkText(text)
      for (const c of chunks) allChunks.push({ sourceDoc: doc.original_name, text: c })
      log(submissionId, `parsed supporting: ${doc.original_name} → ${chunks.length} chunks`)
    } catch (err) {
      warn(submissionId, `supporting doc parse failed (${doc.original_name}):`, err?.message || err)
      parseFailures.push({ name: doc.original_name, error: err?.message || 'parse failed' })
    }
  }
  log(submissionId, `chunked: ${allChunks.length} total chunks (${parseFailures.length} doc(s) failed)`)

  // --- 3. Embed chunks ------------------------------------------------------
  await setStatus(submissionId, {
    stage: 'embedding',
    chunk_count: allChunks.length,
    parse_failures: parseFailures,
  })
  let chunkVectors = []
  if (allChunks.length > 0) {
    try {
      const vecs = await embedMany(allChunks.map((c) => c.text))
      chunkVectors = allChunks.map((c, i) => ({ ...c, embedding: vecs[i] }))
      // One embedding call per chunk under the hood.
      usage.embeddingCalls += chunkVectors.length
      for (const c of allChunks) accInput(c.text)
      log(submissionId, `embedded: ${chunkVectors.length} chunks via ${EMBEDDING_PROVIDER}`)
    } catch (err) {
      errlog(submissionId, 'embedding chunks failed:', err?.message || err)
      // Continue — every question becomes needs_review.
    }
  } else {
    log(submissionId, 'embedded: skipped (no supporting chunks)')
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
      for (let i = 0; i < docs.length; i += 100) {
        await db.collection('chunks').insertMany(docs.slice(i, i + 100))
      }
    } catch (err) {
      warn(submissionId, 'chunk persistence failed:', err?.message || err)
    }
  }

  // --- 4. For each question: retrieve + draft ------------------------------
  const provider = activeProviderInfo()
  await setStatus(submissionId, { stage: 'drafting', provider })
  const noSupporting = chunkVectors.length === 0
  const k = Math.max(1, Math.min(MAX_RETRIEVAL_K, chunkVectors.length))

  const results = []
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    let retrieved = []
    let topScore = 0
    let qErr = null

    if (!noSupporting) {
      try {
        const qvec = await embedText(question)
        usage.embeddingCalls += 1
        accInput(question)
        retrieved = topK(qvec, chunkVectors, k).map((s) => ({
          text: s.item.text,
          sourceDoc: s.item.sourceDoc,
          score: s.score,
        }))
        topScore = retrieved[0]?.score || 0
      } catch (err) {
        warn(submissionId, `embed question ${i + 1} failed:`, err?.message || err)
        qErr = `embed_failed: ${err?.message || 'unknown'}`
      }
    }

    let entry
    if (noSupporting) {
      entry = {
        index: i,
        question,
        answer: 'No supporting documentation was provided, so this question could not be drafted automatically. Manual review required.',
        status: 'needs_review',
        source_doc: null,
        retrieved_chunks: [],
        top_score: 0,
        provider: provider.name,
        error: 'no_supporting_docs',
      }
    } else if (qErr) {
      entry = {
        index: i,
        question,
        answer: 'Automated draft failed, manual review required.',
        status: 'needs_review',
        source_doc: null,
        retrieved_chunks: retrieved.map((r) => ({ source_doc: r.sourceDoc, score: r.score })),
        top_score: topScore,
        provider: provider.name,
        error: qErr,
      }
    } else if (topScore < MIN_RELEVANCE_SCORE) {
      entry = {
        index: i,
        question,
        answer: `No supporting context was sufficiently relevant to this question (best similarity ${topScore.toFixed(2)}). Manual review required.`,
        status: 'needs_review',
        source_doc: retrieved[0]?.sourceDoc || null,
        retrieved_chunks: retrieved.map((r) => ({ source_doc: r.sourceDoc, score: r.score })),
        top_score: topScore,
        provider: provider.name,
        error: 'low_relevance',
      }
    } else {
      const sourceDocNames = Array.from(new Set(retrieved.map((r) => r.sourceDoc))).filter(Boolean)
      const promptInputApprox = question + retrieved.map((r) => r.text).join('\n')
      accInput(promptInputApprox)
      usage.llmCalls += 1
      const drafted = await draftAnswer({
        question,
        context: retrieved,
        sourceDocNames,
      })
      accOutput(drafted.answer)
      entry = {
        index: i,
        question,
        answer: drafted.answer,
        status: drafted.confidence,
        source_doc: drafted.sourceDoc || sourceDocNames[0] || null,
        retrieved_chunks: retrieved.map((r) => ({ source_doc: r.sourceDoc, score: r.score })),
        top_score: topScore,
        provider: drafted.provider,
        error: drafted.error || null,
      }
    }
    results.push(entry)

    await db.collection('submissions').updateOne(
      { id: submissionId },
      { $set: { results, processed: i + 1, total: questions.length, updated_at: new Date().toISOString() } },
    )
    log(
      submissionId,
      `drafted Q${i + 1}/${questions.length}: status=${entry.status} topScore=${topScore.toFixed(3)} provider=${entry.provider}${entry.error ? ' err=' + entry.error : ''}`,
    )
  }

  // --- 5. Summarize + notify -----------------------------------------------
  const matched = results.filter((r) => r.status === 'matched').length
  const needsReview = results.filter((r) => r.status === 'needs_review').length
  const summary = { matched, needs_review: needsReview, total: results.length }
  const estTokens = Math.round((usage.inputChars + usage.outputChars) / 4)
  const usageFinal = { llmCalls: usage.llmCalls, embeddingCalls: usage.embeddingCalls, estTokens }
  await setStatus(submissionId, {
    status: 'completed',
    stage: 'done',
    summary,
    embedding_provider: EMBEDDING_PROVIDER,
    parse_failures: parseFailures,
    usage: usageFinal,
  })
  log(submissionId, `completed: ${matched}/${results.length} matched, ${needsReview} needs review · llmCalls=${usageFinal.llmCalls} embeddingCalls=${usageFinal.embeddingCalls} estTokens=${usageFinal.estTokens}`)
  const finalSub = await db.collection('submissions').findOne({ id: submissionId })
  notifySubmissionComplete({ submission: finalSub }).catch((e) =>
    errlog(submissionId, 'completion notification failed:', e?.message || e),
  )
}

export async function runPipelineForSubmission(submissionId) {
  const { promise: timeoutPromise, cancel } = overallTimeout()
  try {
    await Promise.race([runCore(submissionId), timeoutPromise])
  } catch (err) {
    const msg = err?.message || 'unknown pipeline error'
    errlog(submissionId, 'fatal:', msg)
    const isTimeout = /timeout/i.test(msg)
    await markFailed(submissionId, isTimeout ? 'failed' : 'failed', msg)
  } finally {
    cancel()
  }
}

export function runPipelineAsync(submissionId) {
  setImmediate(() => {
    runPipelineForSubmission(submissionId).catch((err) => {
      errlog(submissionId, 'top-level uncaught:', err?.message || err)
    })
  })
}
