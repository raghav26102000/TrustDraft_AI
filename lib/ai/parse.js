// File parsing for PDF / DOCX / XLSX, with structure-aware extraction for
// XLSX (one question per row) and a free-text fallback for everything else.
// All parsers run under a hard per-file timeout and surface
// human-readable error messages for the common failure modes
// (password-protected, corrupted, empty document, unsupported sheet layout).

import { promises as fs } from 'fs'
import path from 'path'

const PARSE_TIMEOUT_MS = 30_000
const MIN_USEFUL_TEXT_CHARS = 50
const MIN_USEFUL_QUESTION_ROWS = 2

function parseTimeout(ms = PARSE_TIMEOUT_MS, label = 'parse') {
  let cancel
  const promise = new Promise((_, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    )
    cancel = () => clearTimeout(t)
  })
  return { promise, cancel }
}

async function withTimeout(promise, ms, label) {
  const { promise: timeoutPromise, cancel } = parseTimeout(ms, label)
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    cancel()
  }
}

// ---------- PDF -----------------------------------------------------------

async function parsePdfInner(filePath) {
  const mod = await import('pdf-parse')
  const { PDFParse, PasswordException, InvalidPDFException } = mod
  let data
  try {
    data = await fs.readFile(filePath)
  } catch (err) {
    throw new Error(`Could not read PDF file: ${err.message}`)
  }
  let result
  try {
    const parser = new PDFParse({ data })
    result = await parser.getText()
  } catch (err) {
    if (PasswordException && err instanceof PasswordException) {
      throw new Error('PDF appears to be password protected. Please re-upload an unprotected copy.')
    }
    if (InvalidPDFException && err instanceof InvalidPDFException) {
      throw new Error('PDF file appears to be corrupted or is not a valid PDF.')
    }
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('password') || msg.includes('encrypted')) {
      throw new Error('PDF appears to be password protected. Please re-upload an unprotected copy.')
    }
    throw new Error(`PDF could not be read (file may be password protected or corrupted): ${err?.message || 'unknown error'}`)
  }
  const text = (result?.text || '').trim()
  if (text.length < MIN_USEFUL_TEXT_CHARS) {
    throw new Error('PDF appears empty or only contains scanned images (no extractable text).')
  }
  return text
}

async function parsePdf(filePath) {
  return await withTimeout(parsePdfInner(filePath), PARSE_TIMEOUT_MS, 'pdf parse')
}

// ---------- DOCX ----------------------------------------------------------

async function parseDocxInner(filePath) {
  const mammoth = await import('mammoth')
  let buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch (err) {
    throw new Error(`Could not read DOCX file: ${err.message}`)
  }
  let out
  try {
    out = await mammoth.extractRawText({ buffer })
  } catch (err) {
    throw new Error('DOCX file may be corrupted or not a valid Word document.')
  }
  const text = (out?.value || '').trim()
  if (text.length < MIN_USEFUL_TEXT_CHARS) {
    throw new Error('Document appears empty or unreadable (less than 50 characters of extractable text).')
  }
  return text
}

async function parseDocx(filePath) {
  return await withTimeout(parseDocxInner(filePath), PARSE_TIMEOUT_MS, 'docx parse')
}

// ---------- XLSX ----------------------------------------------------------

async function parseXlsxRowsInner(filePath) {
  const XLSX = await import('xlsx')
  let wb
  try {
    wb = XLSX.readFile(filePath)
  } catch (err) {
    throw new Error('Spreadsheet file may be corrupted or not a valid .xlsx.')
  }
  const rows = []
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
    for (const row of json) {
      const cells = (row || []).map((c) => (c == null ? '' : String(c).trim())).filter(Boolean)
      if (cells.length === 0) continue
      rows.push({ sheet: sheetName, cells })
    }
  }
  return rows
}

async function parseXlsxRows(filePath) {
  return await withTimeout(parseXlsxRowsInner(filePath), PARSE_TIMEOUT_MS, 'xlsx parse')
}

function looksLikeHeader(cells) {
  const joined = cells.join(' ').toLowerCase()
  return /(question|item|control|requirement|description|answer|response)/.test(joined) && cells.length <= 6
}

function pickQuestionCell(cells) {
  let best = ''
  for (const c of cells) {
    if (c.length > best.length) best = c
    if (c.includes('?') && c.length > 10) return c
  }
  return best
}

// ---------- Public ---------------------------------------------------------

export async function extractTextFromFile(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase()
  if (ext === '.pdf') return await parsePdf(filePath)
  if (ext === '.docx') return await parseDocx(filePath)
  if (ext === '.xlsx' || ext === '.xls') {
    const rows = await parseXlsxRows(filePath)
    const text = rows.map((r) => r.cells.join(' | ')).join('\n')
    if (text.trim().length < MIN_USEFUL_TEXT_CHARS) {
      throw new Error('Spreadsheet appears empty or unreadable.')
    }
    return text
  }
  throw new Error(`Unsupported file type: ${ext || 'unknown'}`)
}

// Parse the questionnaire into discrete question strings.
// XLSX: try row-based extraction. If that yields too few questions OR the
// sheet has a layout we don't recognise (merged cells, multi-sheet, etc.), we
// fall back to text mode and let the caller's LLM segmentation handle it.
export async function extractQuestionsFromQuestionnaire(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase()

  if (ext === '.xlsx' || ext === '.xls') {
    const rows = await parseXlsxRows(filePath)
    if (rows.length === 0) {
      throw new Error('Spreadsheet appears empty (no readable rows on any sheet).')
    }
    const sheets = new Set(rows.map((r) => r.sheet))
    const out = []
    let headerSkipped = false
    for (const r of rows) {
      if (!headerSkipped && looksLikeHeader(r.cells)) { headerSkipped = true; continue }
      const q = pickQuestionCell(r.cells)
      if (q && q.length >= 8) out.push(q)
    }
    const seen = new Set()
    const deduped = []
    for (const q of out) {
      const key = q.toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(key)) { seen.add(key); deduped.push(q) }
    }
    // If we got a plausible number of row-based questions on a single sheet,
    // trust that. Otherwise fall back to flat-text + LLM segmentation.
    if (deduped.length >= MIN_USEFUL_QUESTION_ROWS && sheets.size === 1) {
      return { mode: 'rows', questions: deduped, rawText: null }
    }
    const flatText = rows.map((r) => r.cells.join(' | ')).join('\n')
    if (flatText.trim().length < MIN_USEFUL_TEXT_CHARS) {
      throw new Error('Spreadsheet has too little usable text to extract questions from.')
    }
    return { mode: 'text', questions: [], rawText: flatText }
  }

  const text = await extractTextFromFile(filePath, originalName)
  return { mode: 'text', questions: [], rawText: text }
}

export const PARSE_LIMITS = { PARSE_TIMEOUT_MS, MIN_USEFUL_TEXT_CHARS, MIN_USEFUL_QUESTION_ROWS }
