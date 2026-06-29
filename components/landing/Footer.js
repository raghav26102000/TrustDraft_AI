'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      toast.success('You’re on the list. We’ll be in touch.')
      setEmail('')
    } catch (err) {
      toast.error(err.message || 'Could not sign you up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
            <span className="font-semibold tracking-tight">TrustDraft_AI</span>
          </Link>
          <p className="mt-3 text-sm text-neutral-600 max-w-md">
            Help small B2B SaaS teams answer enterprise security questionnaires and RFPs in hours instead of weeks.
          </p>
          <p className="mt-6 text-xs text-neutral-500">
            © {new Date().getFullYear()} TrustDraft_AI. All rights reserved.
          </p>
        </div>
        <div className="md:justify-self-end w-full max-w-md">
          <h3 className="text-sm font-semibold text-neutral-900">Get early access</h3>
          <p className="mt-1 text-sm text-neutral-600">One short email when we open up new spots.</p>
          <form onSubmit={onSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              aria-label="Work email"
            />
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition">
              {submitting ? 'Joining…' : 'Join'}
            </button>
          </form>
          <p className="mt-4 text-sm text-neutral-500">
            Questions? <a className="text-neutral-900 underline underline-offset-2 hover:text-emerald-700" href="mailto:agnexus831@gmail.com">agnexus831@gmail.com</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
