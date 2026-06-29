'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UploadCloud, FileText, X, ShieldCheck, Loader2 } from 'lucide-react'

const ACCEPTED_EXT = ['.pdf', '.docx', '.xlsx']
const ACCEPT_ATTR = '.pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_BYTES = 20 * 1024 * 1024

function extOf(name = '') {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function prettySize(bytes) {
  if (!bytes && bytes !== 0) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function validateFile(file) {
  if (!file) return 'No file selected'
  if (file.size > MAX_BYTES) return `${file.name} is over 20MB`
  const ext = extOf(file.name)
  if (!ACCEPTED_EXT.includes(ext)) return `${file.name}: only PDF, DOCX, or XLSX`
  return null
}

function Dropzone({ multiple = false, value, onChange, label, helper, idPrefix }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)
  const files = Array.isArray(value) ? value : value ? [value] : []

  const handleFiles = useCallback((list) => {
    const arr = Array.from(list || [])
    if (arr.length === 0) return
    for (const f of arr) {
      const err = validateFile(f)
      if (err) { toast.error(err); return }
    }
    if (multiple) onChange([...(value || []), ...arr])
    else onChange(arr[0])
  }, [multiple, value, onChange])

  return (
    <div>
      <label htmlFor={`${idPrefix}-input`} className="block text-sm font-medium text-neutral-900">{label}</label>
      {helper ? <p className="mt-1 text-sm text-neutral-500">{helper}</p> : null}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`mt-2 group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition px-6 py-10 text-center ${drag ? 'border-emerald-500 bg-emerald-50/60' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100'}`}
      >
        <UploadCloud className={`h-6 w-6 ${drag ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-neutral-600'} transition`} aria-hidden="true" />
        <p className="text-sm text-neutral-700"><span className="font-medium text-neutral-900">Click to upload</span> or drag and drop</p>
        <p className="text-xs text-neutral-500">PDF, DOCX, XLSX · up to 20MB each</p>
        <input
          id={`${idPrefix}-input`}
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-neutral-500 shrink-0" aria-hidden="true" />
                <span className="truncate">{f.name}</span>
                <span className="text-neutral-400 shrink-0">{prettySize(f.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (multiple) onChange((value || []).filter((_, idx) => idx !== i))
                  else onChange(null)
                }}
                className="rounded p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const PROCESSING_STEPS = [
  'Reading your questionnaire…',
  'Parsing supporting documentation…',
  'Matching questions against your docs…',
  'Drafting responses…',
  'Finalizing for human review…',
]

function ProcessingOverlay({ done, error }) {
  const [stepIdx, setStepIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1))
    }, 1200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl p-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-8 w-8 rounded-full border-2 border-neutral-200" />
            <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">Working on it</h2>
        </div>
        <ol className="mt-6 space-y-2.5">
          {PROCESSING_STEPS.map((s, i) => {
            const isDone = i < stepIdx || (done && i <= stepIdx)
            const isActive = i === stepIdx && !done
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${isDone ? 'border-emerald-600 bg-emerald-600 text-white' : isActive ? 'border-neutral-900' : 'border-neutral-300'}`}>
                  {isDone ? (
                    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12 15.3 5.3a1 1 0 011.4 0z" /></svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 animate-pulse" />
                  ) : null}
                </span>
                <span className={isDone || isActive ? 'text-neutral-900' : 'text-neutral-400'}>{s}</span>
              </li>
            )
          })}
        </ol>
        {error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : (
          <p className="mt-6 text-xs text-neutral-500">A human will review and email you within 24 hours.</p>
        )}
      </div>
    </div>
  )
}

export default function UploadFlow() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [questionnaire, setQuestionnaire] = useState(null)
  const [supporting, setSupporting] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErrMsg('')
    if (!name.trim()) return toast.error('Please enter your name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast.error('Please enter a valid work email')
    if (!company.trim()) return toast.error('Please enter your company name')
    if (!questionnaire) return toast.error('Please upload the questionnaire file')

    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('email', email.trim())
    fd.append('company', company.trim())
    fd.append('notes', notes.trim())
    fd.append('questionnaire', questionnaire)
    for (const f of supporting) fd.append('supporting', f)

    setSubmitting(true)
    setShowProcessing(true)
    const startedAt = Date.now()

    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      // Keep the premium feel — let the sequence breathe for ~6s minimum.
      const elapsed = Date.now() - startedAt
      const minMs = 6000
      if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed))
      setDone(true)
      router.push('/thank-you')
    } catch (err) {
      setErrMsg(err.message || 'Could not submit. Please try again.')
      toast.error(err.message || 'Could not submit')
      setShowProcessing(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <legend className="sr-only">Your details</legend>
        <div className="sm:col-span-1">
          <label htmlFor="name" className="block text-sm font-medium text-neutral-900">Name</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="email" className="block text-sm font-medium text-neutral-900">Work email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="company" className="block text-sm font-medium text-neutral-900">Company</label>
          <input id="company" required value={company} onChange={(e) => setCompany(e.target.value)} className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </fieldset>

      <Dropzone
        idPrefix="q"
        label="Questionnaire (required)"
        helper="The security questionnaire, vendor assessment, or RFP you need to answer."
        value={questionnaire}
        onChange={setQuestionnaire}
      />

      <Dropzone
        idPrefix="s"
        multiple
        label="Supporting documents (optional)"
        helper="Security policies, SOC2 report, past answers — anything that already describes your stance."
        value={supporting}
        onChange={setSupporting}
      />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-neutral-900">Anything we should know? (optional)</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Deadline, customer name, anything we should flag…" />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-neutral-500 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Reviewed by a human. We don’t train models on your files.
        </p>
        <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition">
          {submitting ? 'Submitting…' : 'Send for review'}
        </button>
      </div>

      {showProcessing ? <ProcessingOverlay done={done} error={errMsg} /> : null}
    </form>
  )
}
