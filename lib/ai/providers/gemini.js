// Google Gemini provider (free-tier eligible). Uses generateContent REST API.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export function isConfigured() {
  return !!process.env.GEMINI_API_KEY
}

function buildPrompt({ question, context, sourceDocNames, mode }) {
  if (mode === 'segment') {
    return (
      'You extract distinct questions from a security questionnaire. Respond ONLY with a JSON array of strings.\n\n' +
      question +
      '\n\n---\n\n' +
      (context?.[0]?.text || '')
    )
  }
  const ctxBlock = (context || [])
    .map((c, i) => `[Source ${i + 1}: ${c.sourceDoc || 'doc'}]\n${c.text}`)
    .join('\n\n')
  const sources = (sourceDocNames || []).join(', ') || 'the provided documents'
  return (
    'You draft answers to enterprise security questionnaires using ONLY the supporting documentation provided as context. ' +
    'If the context does not clearly answer the question, set confidence to "needs_review". Do not invent facts. Be concise and factual. ' +
    'Respond ONLY with valid JSON of the shape: {"answer": string, "confidence": "matched"|"needs_review", "sourceDoc": string}.\n\n' +
    `Question:\n${question}\n\nAvailable source documents: ${sources}\n\nContext:\n${ctxBlock || '(no supporting context retrieved)'}\n\nReturn JSON only.`
  )
}

export async function draftAnswer({ question, context, sourceDocNames, mode = 'answer' }) {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const prompt = buildPrompt({ question, context, sourceDocNames, mode })
  const url = `${BASE}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45_000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`gemini ${res.status}: ${t.slice(0, 200)}`)
    }
    const data = await res.json()
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim()
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
