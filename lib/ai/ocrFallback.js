// OCR fallback for scanned/image-based PDFs where normal text extraction
// fails or returns unreliable text. Requires GraphicsMagick or ImageMagick
// installed on the host machine (pdf2pic depends on it) — this will not
// work on serverless platforms without a custom build step.

const MIN_USEFUL_TEXT_CHARS = 50
const MAX_OCR_PAGES = 10

export async function ocrPdfFallback(filePath) {
  const { fromPath } = await import('pdf2pic')
  const Tesseract = (await import('tesseract.js')).default

  const converter = fromPath(filePath, {
    density: 200,
    saveFilename: 'page',
    savePath: '/tmp/ocr-pages',
    format: 'png',
    width: 1600,
    height: 2200,
  })

  let fullText = ''
  for (let page = 1; page <= MAX_OCR_PAGES; page++) {
    let result
    try {
      result = await converter(page)
    } catch {
      break
    }
    const { data: { text } } = await Tesseract.recognize(result.path, 'eng')
    fullText += text + '\n\n'
  }

  const trimmed = fullText.trim()
  if (trimmed.length < MIN_USEFUL_TEXT_CHARS) {
    throw new Error('OCR could not extract readable text from this PDF.')
  }
  return trimmed
}