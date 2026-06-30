// Chunker with heading-aware splitting (numbered, bolded-style caps, markdown-ish)
// and a sentence-boundary fallback for genuinely unstructured prose.

const CHARS_PER_TOKEN = 4

// Recognizes several common heading styles seen in real compliance docs:
// "1. Data Encryption", "Section 3: Access Control", "DATA ENCRYPTION",
// "Data Encryption:" on its own short line.
const HEADING_PATTERNS = [
  /\n(?=\d+[.)]\s+[A-Z])/,                    // "1. Heading" / "1) Heading"
  /\n(?=Section\s+\d+[:.]?\s+[A-Z])/i,        // "Section 3: Heading"
  /\n(?=[A-Z][A-Za-z\s]{3,50}:\s*\n)/,        // "Heading:\n" on its own line
  /\n(?=[A-Z\s]{4,60}\n)/,                    // ALL CAPS heading line
]

function splitOnHeadings(text) {
  let blocks = [text]
  for (const pattern of HEADING_PATTERNS) {
    blocks = blocks.flatMap((b) => b.split(pattern))
  }
  return blocks.map((b) => b.trim()).filter(Boolean)
}

function splitIntoSentences(text) {
  return text
    .split(/\n\s*\n+/)
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((s) => s.trim())
    .filter(Boolean)
}

export function chunkText(text, { targetTokens = 180, overlapTokens = 30, minChunks = 3 } = {}) {
  if (!text || typeof text !== 'string') return []
  const targetChars = targetTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN

  // Try heading-aware blocks first.
  const headingBlocks = splitOnHeadings(text)
  // If heading detection didn't actually find meaningful structure
  // (e.g. only 1 block, or blocks are wildly uneven), fall back to
  // plain sentence splitting across the whole text.
  const usableHeadingSplit = headingBlocks.length >= minChunks
  const pieces = usableHeadingSplit
    ? headingBlocks.flatMap((block) => splitIntoSentences(block))
    : splitIntoSentences(text)

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

  // Safety net: if a single document still collapsed into very few large
  // chunks (e.g. truly unstructured wall of text with long sentences),
  // forcibly split any oversized chunk by character count so retrieval
  // never has to deal with a multi-thousand-char blob.
  const hardCapChars = targetChars * 2
  const final = []
  for (const c of chunks) {
    if (c.length <= hardCapChars) {
      final.push(c)
    } else {
      for (let i = 0; i < c.length; i += targetChars) {
        final.push(c.slice(i, i + targetChars + overlapChars))
      }
    }
  }
  return final
}