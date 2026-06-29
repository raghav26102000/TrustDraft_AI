// LLM-driven question segmentation for free-form PDFs/DOCX.
// Uses the same provider abstraction as draftAnswer.

import { draftAnswer } from '@/lib/ai/generateAnswer'

const INSTRUCTION =
  'You are given the raw text of a security questionnaire. Extract every distinct question the responder is being asked. Return ONLY a JSON array of strings, with no commentary. Do not invent questions. Preserve the original wording where possible. Skip headers, instructions, and metadata.'

export async function segmentQuestionsWithLLM(rawText) {
  // Cap the text we pass in to keep prompt bounded.
  const capped = (rawText || '').slice(0, 60_000)
  try {
    const { answer } = await draftAnswer({
      question: INSTRUCTION,
      context: [{ text: capped, sourceDoc: 'questionnaire' }],
      sourceDocNames: ['questionnaire'],
      mode: 'segment',
    })
    const text = (answer || '').trim()
    // Find the first JSON array in the response, robust to code-fence wrapping.
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const arr = JSON.parse(match[0])
    if (!Array.isArray(arr)) return []
    return arr
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s && s.length >= 8)
      .slice(0, 200)
  } catch (err) {
    console.error('[segmentQuestions] LLM segmentation failed:', err.message)
    return []
  }
}
