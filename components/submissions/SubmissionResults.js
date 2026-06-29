'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCw, ShieldCheck, Loader2 } from 'lucide-react'

const STATUS_META = {
  drafting: { label: 'Drafting…', classes: 'bg-neutral-100 text-neutral-500 ring-neutral-200', dot: 'bg-neutral-400' },
  matched: { label: 'Matched', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
  needs_review: { label: 'Needs review', classes: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
}

function Badge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.drafting
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ${meta.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function useSubmission(initial) {
  const [sub, setSub] = useState(initial)
  useEffect(() => {
    if (!sub) return
    if (sub.status === 'completed' || sub.status === 'parse_error') return
    let stopped = false
    const tick = async () => {
      try {
        const r = await fetch(`/api/submissions/${sub.id}`, { cache: 'no-store' })
        if (r.ok) {
          const data = await r.json()
          if (!stopped) setSub(data)
          if (data.status === 'completed' || data.status === 'parse_error') return
        }
      } catch {}
      if (!stopped) setTimeout(tick, 3500)
    }
    const t = setTimeout(tick, 2500)
    return () => { stopped = true; clearTimeout(t) }
  }, [sub])
  return [sub, setSub]
}

export default function SubmissionResults({ initial }) {
  const [sub] = useSubmission(initial)
  const results = sub?.results || []
  const total = sub?.total || results.length || 0
  const processed = sub?.processed || results.length || 0
  const completed = sub?.status === 'completed'
  const failed = sub?.status === 'parse_error'

  const summary = useMemo(() => {
    const matched = results.filter((r) => r.status === 'matched').length
    const review = results.filter((r) => r.status === 'needs_review').length
    return { matched, review, total: results.length }
  }, [results])

  return (
    <div>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-white px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="ml-3 text-xs text-neutral-500 font-mono truncate">
            {sub?.files?.find?.((f) => f.kind === 'questionnaire')?.original_name || 'questionnaire'}
          </span>
          <span className="ml-auto flex items-center gap-3">
            {failed ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Parse error
              </span>
            ) : completed ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /> Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Loader2 className="h-3 w-3 animate-spin" /> {sub?.stage || 'processing'} {total ? `· ${processed}/${total}` : ''}
              </span>
            )}
          </span>
        </div>

        {failed ? (
          <div className="bg-white px-6 sm:px-10 py-16 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">We couldn’t process this submission.</h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">{sub.error || 'Parse error — we’ve been notified and will follow up by email.'}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white px-6 sm:px-10 py-16 sm:py-20 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-emerald-700 animate-spin" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">Processing your questionnaire</h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">
              This page updates automatically as answers are drafted. You can also close it — we’ll email you when it’s ready.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 bg-white">
            {results.map((r) => (
              <div key={r.index} className="grid grid-cols-12 gap-4 px-4 sm:px-6 py-5">
                <div className="col-span-12 sm:col-span-5 text-sm text-neutral-800 leading-relaxed">
                  <span className="font-mono text-xs text-neutral-400">Q{r.index + 1}.</span>{' '}
                  {r.question}
                </div>
                <div className="col-span-12 sm:col-span-5 text-sm leading-relaxed">
                  <p className="text-neutral-700 whitespace-pre-wrap">{r.answer}</p>
                  {r.source_doc ? (
                    <p className="mt-2 text-xs text-neutral-500 inline-flex items-center gap-1.5">
                      <span className="inline-block h-1 w-1 rounded-full bg-neutral-400" />
                      Source: <span className="font-mono text-neutral-600">{r.source_doc}</span>
                    </p>
                  ) : null}
                </div>
                <div className="col-span-12 sm:col-span-2 sm:text-right">
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-200 bg-white/60 px-4 py-2.5">
          <p className="text-[11px] text-neutral-500">
            Drafted from your supporting documents. Always review before sending back to the customer.
          </p>
          {!completed && !failed ? (
            <button onClick={() => location.reload()} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900">
              <RotateCw className="h-3.5 w-3.5" /> Refresh
            </button>
          ) : null}
        </div>
      </div>

      {completed && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-5 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {summary.matched} of {summary.total} answered automatically.{' '}
                  <span className="text-amber-800">{summary.review} review recommended.</span>
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Export and edit, then send back to your customer in their original format.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <a href={`/api/submissions/${sub.id}/export?format=xlsx`} className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition">
                <Download className="mr-1.5 h-4 w-4" /> Export .xlsx
              </a>
              <a href={`/api/submissions/${sub.id}/export?format=docx`} className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition">
                <Download className="mr-1.5 h-4 w-4" /> Export .docx
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
