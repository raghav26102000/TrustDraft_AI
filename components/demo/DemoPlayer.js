'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Play, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react'

const STATUS_META = {
  drafting: { label: 'Drafting…', classes: 'bg-neutral-100 text-neutral-500 ring-neutral-200' },
  matched: { label: 'Matched', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  needs_review: { label: 'Needs review', classes: 'bg-amber-50 text-amber-800 ring-amber-200' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.drafting
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ${meta.classes}`}>
      {status === 'drafting' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${status === 'matched' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      )}
      {meta.label}
    </span>
  )
}

function QuestionRow({ q, state, animKey }) {
  // state: 'hidden' | 'drafting' | 'done'
  const visible = state !== 'hidden'
  const done = state === 'done'

  return (
    <div
      className={`grid grid-cols-12 gap-4 px-4 sm:px-6 py-5 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <div className="col-span-12 sm:col-span-5 text-sm text-neutral-800 leading-relaxed">
        {q.question}
      </div>
      <div className="col-span-12 sm:col-span-5 text-sm leading-relaxed">
        {done ? (
          <div key={`a-${animKey}`} className="animate-[fadein_400ms_ease-out]">
            <p className="text-neutral-700">{q.answer}</p>
            <p className="mt-2 text-xs text-neutral-500 inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-neutral-400" />
              Source: <span className="font-mono text-neutral-600">{q.source_doc}</span>
            </p>
          </div>
        ) : visible ? (
          <span className="inline-flex items-center gap-2 text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
            Drafting from your documentation…
          </span>
        ) : null}
      </div>
      <div className="col-span-12 sm:col-span-2 sm:text-right">
        {visible ? <StatusBadge status={done ? q.status : 'drafting'} /> : null}
      </div>
    </div>
  )
}

export default function DemoPlayer({ data }) {
  const questions = data?.questions || []
  const total = questions.length
  // states[i]: 'hidden' | 'drafting' | 'done'
  const [states, setStates] = useState(() => Array(total).fill('hidden'))
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [runId, setRunId] = useState(0)
  const timersRef = useRef([])

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t)
    timersRef.current = []
  }, [])

  const start = useCallback(() => {
    clearTimers()
    setFinished(false)
    setStates(Array(total).fill('hidden'))
    setRunning(true)
    setRunId((n) => n + 1)

    let cumulative = 250 // initial breathe
    questions.forEach((_, idx) => {
      const revealDelay = 700 + Math.floor(Math.random() * 500) // 700–1200ms between reveals
      const draftingDuration = 900 + Math.floor(Math.random() * 700) // 900–1600ms drafting
      cumulative += revealDelay
      const showAt = cumulative
      const doneAt = cumulative + draftingDuration

      timersRef.current.push(
        setTimeout(() => {
          setStates((prev) => {
            const next = prev.slice()
            next[idx] = 'drafting'
            return next
          })
        }, showAt)
      )
      timersRef.current.push(
        setTimeout(() => {
          setStates((prev) => {
            const next = prev.slice()
            next[idx] = 'done'
            return next
          })
          if (idx === total - 1) {
            setRunning(false)
            setFinished(true)
          }
        }, doneAt)
      )
      cumulative = doneAt
    })
  }, [questions, total, clearTimers])

  const replay = useCallback(() => {
    clearTimers()
    start()
  }, [clearTimers, start])

  const counts = useMemo(() => {
    const matched = questions.filter((q) => q.status === 'matched').length
    const review = questions.filter((q) => q.status === 'needs_review').length
    return { matched, review, total }
  }, [questions, total])

  const idle = !running && !finished

  return (
    <div>
      <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm overflow-hidden">
        {/* Card header (matches hero mockup) */}
        <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-white px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="ml-3 text-xs text-neutral-500 font-mono truncate">{data.questionnaire_name}</span>
          <span className="ml-auto flex items-center gap-3">
            {running ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Drafting
              </span>
            ) : finished ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /> Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /> Ready
              </span>
            )}
          </span>
        </div>

        {/* Empty / pre-run state */}
        {idle ? (
          <div className="bg-white px-6 sm:px-10 py-16 sm:py-20 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
              <Play className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">Ready to run the sample questionnaire</h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">
              {total} questions, drafted from a real set of supporting documents. The replay takes about 15 seconds.
            </p>
            <button
              type="button"
              onClick={start}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition"
            >
              <Play className="mr-2 h-4 w-4" aria-hidden="true" /> Run demo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 bg-white">
            {questions.map((q, i) => (
              <QuestionRow key={`${runId}-${i}`} animKey={`${runId}-${i}`} q={q} state={states[i]} />
            ))}
          </div>
        )}

        {/* Footer of card — transparency label */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white/60 px-4 py-2.5">
          <p className="text-[11px] text-neutral-500">
            Demo using a sample questionnaire and real AI-drafted answers — not a live API call.
          </p>
          {(running || finished) && (
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Replay demo
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {finished && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-5 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {counts.matched} of {counts.total} answered automatically.{' '}
                  <span className="text-amber-800">{counts.review} review recommended.</span>
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  This is what your team gets back — reviewed by you, not rewritten from scratch.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Replay demo
              </button>
              <Link
                href="/upload"
                className="group inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition"
              >
                Try it with your questionnaire
                <ArrowRight className="ml-1.5 h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
