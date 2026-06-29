// Export drafted answers as .xlsx or .docx.

import { promises as fs } from 'fs'
import path from 'path'

export async function buildXlsxBuffer(submission) {
  const XLSX = await import('xlsx')
  const rows = [['#', 'Question', 'Drafted Answer', 'Status', 'Source Doc']]
  for (const r of submission.results || []) {
    rows.push([
      (r.index ?? 0) + 1,
      r.question || '',
      r.answer || '',
      r.status || '',
      r.source_doc || '',
    ])
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 4 }, { wch: 60 }, { wch: 80 }, { wch: 14 }, { wch: 30 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Responses')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

export async function buildDocxBuffer(submission) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx')
  const children = []
  children.push(new Paragraph({ text: `TrustDraft_AI — ${submission.company || 'Submission'}`, heading: HeadingLevel.TITLE }))
  children.push(new Paragraph({ children: [new TextRun({ text: `Submitted by ${submission.name} · ${submission.email}`, italics: true })] }))
  children.push(new Paragraph({ text: '' }))
  for (const r of submission.results || []) {
    children.push(new Paragraph({ text: `Q${(r.index ?? 0) + 1}. ${r.question || ''}`, heading: HeadingLevel.HEADING_2 }))
    children.push(new Paragraph({ text: r.answer || '' }))
    const meta = []
    if (r.source_doc) meta.push(`Source: ${r.source_doc}`)
    meta.push(`Status: ${r.status}`)
    children.push(new Paragraph({ children: [new TextRun({ text: meta.join(' · '), italics: true, color: '6b7280' })] }))
    children.push(new Paragraph({ text: '' }))
  }
  const doc = new Document({ sections: [{ children }] })
  return await Packer.toBuffer(doc)
}
