// Local embeddings via @xenova/transformers (Xenova/all-MiniLM-L6-v2).
// Free, no API key. Model downloads on first use (~25MB) into cache.

let _extractor = null
let _loadPromise = null

async function getExtractor() {
  if (_extractor) return _extractor
  if (!_loadPromise) {
    _loadPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      env.cacheDir = process.env.TRANSFORMERS_CACHE || '/app/.cache/transformers'
      env.allowLocalModels = true
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      _extractor = extractor
      return extractor
    })()
  }
  return _loadPromise
}

export async function embedText(text) {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// Process in small concurrent batches instead of one-at-a-time.
// The model itself is CPU-bound and not thread-safe for true parallelism
// in this runtime, but batching calls still reduces wall-clock overhead
// from per-call async scheduling on large chunk sets.
export async function embedMany(texts, { batchSize = 5 } = {}) {
  const out = new Array(texts.length)
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((t) => embedText(t)))
    for (let j = 0; j < results.length; j++) {
      out[i + j] = results[j]
    }
  }
  return out
}

export const EMBEDDING_PROVIDER = 'xenova/all-MiniLM-L6-v2'