// Semantic chunker: splits text into sentences, embeds each, and groups
// consecutive sentences together while their topic similarity stays high,
// breaking into a new chunk when similarity drops (i.e. an actual topic shift)
// or a size cap is hit. More expensive than regex chunking — one embedding
// call per sentence instead of per chunk.

import { embedText } from '@/lib/ai/embeddings'
import { cosine } from '@/lib/ai/similarity'

function splitSentences(text) {
  return text
    .split(/\n\s*\n+/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function semanticChunk(text, { similarityDropThreshold = 0.35, maxChunkChars = 1200 } = {}) {
  if (!text || typeof text !== 'string') return []
  const sentences = splitSentences(text)
  if (sentences.length === 0) return []
  if (sentences.length === 1) return sentences

  const embeddings = []
  for (const s of sentences) {
    embeddings.push(await embedText(s))
  }

  const chunks = []
  let buf = sentences[0]
  let bufEmbedding = embeddings[0]

  for (let i = 1; i < sentences.length; i++) {
    const sim = cosine(bufEmbedding, embeddings[i])
    const wouldExceedSize = (buf.length + sentences[i].length) > maxChunkChars
    if (sim < similarityDropThreshold || wouldExceedSize) {
      chunks.push(buf)
      buf = sentences[i]
      bufEmbedding = embeddings[i]
    } else {
      buf += ' ' + sentences[i]
      bufEmbedding = bufEmbedding.map((v, idx) => (v + embeddings[i][idx]) / 2)
    }
  }
  chunks.push(buf)
  return chunks
}