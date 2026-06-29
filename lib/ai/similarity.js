// Pure-math helpers for cosine similarity + top-k retrieval. No deps.

export function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i]
    const y = b[i]
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export function topK(queryVec, items, k = 4) {
  // items: [{ embedding, ...meta }]
  const scored = items.map((it) => ({ item: it, score: cosine(queryVec, it.embedding) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}
