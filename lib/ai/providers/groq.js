// Groq provider. Uses Groq's OpenAI-compatible Chat Completions API.
// Model is taken from env (GROQ_MODEL) and defaults to a current Groq-hosted
// model. If that slug is retired the operator can override via env without
// code changes — check console.groq.com for currently available models.

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

export function isConfigured() {
  return !!process.env.GROQ_API_KEY
}

function buildPrompt({ question, context, sourceDocNames, mode }) {
  if (mode === 'segment') {
    return {
      system:
        'You extract distinct questions from a security questionnaire. Respond ONLY with a JSON array of strings.',
      user: question + '\n\n---\n\n' + (context?.[0]?.text || ''),
    }
  }
  const ctxBlock = (context || [])
    .map((c, i) => `[Source ${i + 1}: ${c.sourceDoc || 'doc'}]\n${c.text}`)
    .join('\n\n')
  const sources = (sourceDocNames || []).join(', ') || 'the provided documents'
  const system =
    'You draft answers to enterprise security questionnaires using ONLY the supporting documentation provided as context. ' +
    'If the context does not clearly answer the question, you MUST set confidence to "needs_review" and say so plainly. ' +
    'Do not invent facts, certifications, dates, or vendors. Keep answers concise, factual, and in the same voice the source uses. ' +
    'Cite the source you relied on by name. ' +
    'Respond ONLY with valid JSON of the shape: {"answer": string, "confidence": "matched"|"needs_review", "sourceDoc": string}.'
  const user =
    `Question:\n${question}\n\n` +
    `Available source documents: ${sources}\n\n` +
    `Context:\n${ctxBlock || '(no supporting context retrieved)'}\n\n` +
    'Return JSON only.'
  return { system, user }
}

export async function draftAnswer({ question, context, sourceDocNames, mode = 'answer' }) {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const { system, user } = buildPrompt({ question, context, sourceDocNames, mode })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45_000)
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`groq ${res.status}: ${t.slice(0, 200)}`)
    }
    const data = await res.json()
    const text = (data?.choices?.[0]?.message?.content || '').trim()
    if (mode === 'segment') return { answer: text, confidence: 'matched' }
    return parseAnswerJson(text)
  } finally {
    clearTimeout(timer)
  }
}

function parseAnswerJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { answer: text, confidence: 'needs_review' }
  try {
    const obj = JSON.parse(match[0])
    return {
      answer: typeof obj.answer === 'string' ? obj.answer : text,
      confidence: obj.confidence === 'matched' ? 'matched' : 'needs_review',
      sourceDoc: typeof obj.sourceDoc === 'string' ? obj.sourceDoc : undefined,
    }
  } catch {
    return { answer: text, confidence: 'needs_review' }
  }
}