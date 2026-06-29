// Lightweight server-side validation + sanitization helpers.

export const ALLOWED_MIME = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  // Some browsers send octet-stream for docx/xlsx
  'application/msword': '.doc',
  'application/vnd.ms-excel': '.xls',
}

export const ALLOWED_EXT = new Set(['.pdf', '.docx', '.xlsx'])
export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB

export function sanitizeText(str, maxLen = 500) {
  if (typeof str !== 'string') return ''
  // Strip control characters and trim, cap length, remove tags.
  const noTags = str.replace(/<[^>]*>/g, '')
  const noCtrl = noTags.replace(/[\u0000-\u001f\u007f]/g, '')
  return noCtrl.trim().slice(0, maxLen)
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  // Conservative RFC-ish check; good enough for a lead form.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254
}

export function getExtensionFromName(name = '') {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return ''
  return name.slice(dot).toLowerCase()
}

export function validateFile(file, { required = false } = {}) {
  if (!file) {
    if (required) return { ok: false, error: 'File is required' }
    return { ok: true, skip: true }
  }
  if (typeof file.size !== 'number' || typeof file.name !== 'string') {
    return { ok: false, error: 'Invalid file' }
  }
  if (file.size === 0) {
    if (required) return { ok: false, error: 'Empty file' }
    return { ok: true, skip: true }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `File too large: ${file.name} exceeds 20MB` }
  }
  const ext = getExtensionFromName(file.name)
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: `Unsupported file type: ${ext || 'unknown'}. Use PDF, DOCX, or XLSX.` }
  }
  return { ok: true, ext }
}
