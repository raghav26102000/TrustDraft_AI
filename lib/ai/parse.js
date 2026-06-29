// File parsing for PDF / DOCX / XLSX, with structure-aware extraction for
// XLSX (one question per row) and a free-text fallback for everything else.

import { promises as fs } from 'fs'
import path from 'path'

async function parsePdf(filePath) {
  // pdf-parse used to run a self-test on import; the modern build no longer does
  // and exposes a default export.
  const mod = await import('pdf-parse')
  const pdfParse = mod.default || mod
  const data = await fs.readFile(filePath)
  const result = await pdfParse(data)
  return (result.text || '').trim()
}

async function parseDocx(filePath) {
  const mammoth = await import('mammoth')
  const buffer = await fs.readFile(filePath)
  const out = await mammoth.extractRawText({ buffer })
  return (out.value || '').trim()
}

async function parseXlsxRows(filePath) {
  const XLSX = await import('xlsx')
  const wb = XLSX.readFile(filePath)
  const rows = []
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
    for (const row of json) {
      const cells = row.map((c) => (c == null ? '' : String(c).trim())).filter(Boolean)
      if (cells.length === 0) continue
      rows.push({ sheet: sheetName, cells })
    }
  }
  return rows
}

function looksLikeHeader(cells) {
  const joined = cells.join(' ').toLowerCase()
  return /(question|item|control|requirement|description|answer|response)/.test(joined) && cells.length <= 6
}

function pickQuestionCell(cells) {
  // Prefer the longest cell that contains a question mark, else the longest.
  let best = ''
  for (const c of cells) {
    if (c.length > best.length) best = c
    if (c.includes('?') && c.length > 10) return c
  }
  return best
}

export async function extractTextFromFile(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase()
  if (ext === '.pdf') return await parsePdf(filePath)
  if (ext === '.docx') return await parseDocx(filePath)
  if (ext === '.xlsx' || ext === '.xls') {
    const rows = await parseXlsxRows(filePath)
    return rows.map((r) => r.cells.join(' | ')).join('\n')
  }
  throw new Error(`Unsupported file type: ${ext}`)
}

// Parse the questionnaire into discrete question strings.
// For XLSX we try row-based extraction; for PDF/DOCX we return the raw text
// and let the caller use an LLM fallback to segment questions.
export async function extractQuestionsFromQuestionnaire(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase()
  if (ext === '.xlsx' || ext === '.xls') {
    const rows = await parseXlsxRows(filePath)
    const out = []
    let headerSkipped = false
    for (const r of rows) {
      if (!headerSkipped && looksLikeHeader(r.cells)) { headerSkipped = true; continue }
      const q = pickQuestionCell(r.cells)
      if (q && q.length >= 8) out.push(q)
    }
    // Dedup while preserving order.
    const seen = new Set()
    const deduped = []
    for (const q of out) {
      const key = q.toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(key)) { seen.add(key); deduped.push(q) }
    }
    if (deduped.length > 0) {
      return { mode: 'rows', questions: deduped, rawText: null }
    }
    // fall through to text mode if rows yielded nothing useful
    const text = rows.map((r) => r.cells.join(' | ')).join('\n')
    return { mode: 'text', questions: [], rawText: text }
  }
  const text = await extractTextFromFile(filePath, originalName)
  return { mode: 'text', questions: [], rawText: text }
}
