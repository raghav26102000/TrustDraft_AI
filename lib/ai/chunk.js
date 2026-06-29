// Cheap, deterministic text chunker. Splits on paragraph/sentence boundaries
// and packs into ~500-800 token windows (approximated as ~4 chars/token)
// with a slight overlap so a fact straddling a boundary still gets retrieved.

const CHARS_PER_TOKEN = 4

function softSplit(text) {
  // Split on blank lines first, then sentences. Keep separators.
  const paragraphs = text.split(/\n\s*\n+/).flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z(])/))
  return paragraphs.map((s) => s.trim()).filter(Boolean)
}

export function chunkText(text, { targetTokens = 650, overlapTokens = 80 } = {}) {
  if (!text || typeof text !== 'string') return []
  const targetChars = targetTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN
  const pieces = softSplit(text)
  const chunks = []
  let buf = ''
  for (const piece of pieces) {
    if (!buf) { buf = piece; continue }
    if ((buf.length + 1 + piece.length) <= targetChars) {
      buf += ' ' + piece
    } else {
      chunks.push(buf)
      const carry = buf.slice(Math.max(0, buf.length - overlapChars))
      buf = (carry ? carry + ' ' : '') + piece
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}
