// OpenRouter provider — OpenAI-compatible chat completions, model from env
// (OPENROUTER_MODEL), e.g. 'x-ai/grok-4', 'moonshotai/kimi-k2', etc.

const BASE = 'https://openrouter.ai/api/v1/chat/completions'

export function isConfigured() {
  return !!process.env.OPENROUTER_API_KEY && !!process.env.OPENROUTER_MODEL
}

function buildMessages({ question, context, sourceDocNames, mode }) {
  if (mode === 'segment') {
    return [
      { role: 'system', content: 'You extract distinct questions from a security questionnaire. Respond ONLY with a JSON array of strings.' },
      { role: 'user', content: question + '\n\n---\n\n' + (context?.[0]?.text || '') },
    ]
  }
  const ctxBlock = (context || [])
    .map((c, i) => `[Source ${i + 1}: ${c.sourceDoc || 'doc'}]\n${c.text}`)
    .join('\n\n')
  const sources = (sourceDocNames || []).join(', ') || 'the provided documents'
  return [
    {
      role: 'system',
      content:
        'You draft answers to enterprise security questionnaires using ONLY the supporting documentation provided as context. ' +
        'If the context does not clearly answer the question, set confidence to "needs_review". Do not invent facts. Be concise and factual. ' +
        'Respond ONLY with valid JSON of the shape: {"answer": string, "confidence": "matched"|"needs_review", "sourceDoc": string}.',
    },
    {
      role: 'user',
      content: `Question:\n${question}\n\nAvailable source documents: ${sources}\n\nContext:\n${ctxBlock || '(no supporting context retrieved)'}\n\nReturn JSON only.`,
    },
  ]
}

export async function draftAnswer({ question, context, sourceDocNames, mode = 'answer' }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL
  const messages = buildMessages({ question, context, sourceDocNames, mode })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45_000)
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'http-referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai',
        'x-title': 'TrustDraft_AI',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`openrouter ${res.status}: ${t.slice(0, 200)}`)
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
