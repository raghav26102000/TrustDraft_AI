// Local embeddings via @xenova/transformers (Xenova/all-MiniLM-L6-v2).
// Free, no API key. Model downloads on first use (~25MB) into cache.
// Interface is provider-agnostic so a paid embedder (Voyage/OpenAI) could be
// swapped in by replacing this single file.

let _extractor = null
let _loadPromise = null

async function getExtractor() {
  if (_extractor) return _extractor
  if (!_loadPromise) {
    _loadPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Cache models on disk so we don't re-download each cold start.
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
  // Return a plain Array<number> so it serializes cleanly to Mongo.
  return Array.from(output.data)
}

export async function embedMany(texts) {
  const out = []
  // Process sequentially to keep memory bounded. The model is fast enough
  // for the document volume we expect at this stage.
  for (const t of texts) {
    out.push(await embedText(t))
  }
  return out
}

export const EMBEDDING_PROVIDER = 'xenova/all-MiniLM-L6-v2'
