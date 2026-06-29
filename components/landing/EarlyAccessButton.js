'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function EarlyAccessButton({ label = 'Join early access', variant = 'outline' }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const base = 'inline-flex items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium transition'
  const styles = {
    outline: 'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50',
    ghost: 'text-neutral-700 hover:text-neutral-900',
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800',
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'modal' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      toast.success('You’re on the list. We’ll be in touch.')
      setEmail('')
      setOpen(false)
    } catch (err) {
      toast.error(err.message || 'Could not sign you up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${base} ${styles[variant] || styles.outline}`}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join the early access list</DialogTitle>
            <DialogDescription>
              We’ll email you when we open new spots and ship features that matter. No noise.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="mt-2 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              aria-label="Work email"
            />
            <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition">
              {submitting ? 'Joining…' : 'Join early access'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
