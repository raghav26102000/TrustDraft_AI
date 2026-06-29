// Provider-agnostic answer drafter. Selects the active provider by env var
// LLM_PROVIDER (anthropic | gemini | openrouter). If no provider is configured
// or the configured provider fails, returns a needs_review draft so the
// pipeline can complete without blocking.

import * as anthropic from '@/lib/ai/providers/anthropic'
import * as gemini from '@/lib/ai/providers/gemini'
import * as openrouter from '@/lib/ai/providers/openrouter'

const PROVIDERS = { anthropic, gemini, openrouter }

function resolveProvider() {
  const name = (process.env.LLM_PROVIDER || '').toLowerCase().trim()
  if (!name) return { name: null, mod: null }
  const mod = PROVIDERS[name]
  if (!mod) return { name, mod: null }
  return { name, mod }
}

export function activeProviderInfo() {
  const { name, mod } = resolveProvider()
  return {
    name: name || 'none',
    configured: !!(mod && mod.isConfigured && mod.isConfigured()),
  }
}

export async function draftAnswer({ question, context = [], sourceDocNames = [], mode = 'answer' }) {
  const { name, mod } = resolveProvider()
  if (!mod) {
    return {
      answer: 'Automated draft unavailable: no LLM provider configured. Manual review required.',
      confidence: 'needs_review',
      provider: name || 'none',
      error: 'no_provider',
    }
  }
  if (mod.isConfigured && !mod.isConfigured()) {
    return {
      answer: `Automated draft unavailable: ${name} provider not configured (missing API key). Manual review required.`,
      confidence: 'needs_review',
      provider: name,
      error: 'not_configured',
    }
  }
  try {
    const res = await mod.draftAnswer({ question, context, sourceDocNames, mode })
    return {
      answer: res.answer || '',
      confidence: res.confidence === 'matched' ? 'matched' : 'needs_review',
      provider: name,
      sourceDoc: res.sourceDoc,
    }
  } catch (err) {
    console.error(`[generateAnswer] provider=${name} failed:`, err?.message || err)
    return {
      answer: 'Automated draft failed, manual review required.',
      confidence: 'needs_review',
      provider: name,
      error: err?.message || 'provider_error',
    }
  }
}
