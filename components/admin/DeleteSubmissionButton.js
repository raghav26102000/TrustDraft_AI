'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteSubmissionButton({ id, company, token }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [pending, startTransition] = useTransition()

  async function onClick() {
    const ok = window.confirm(
      `Delete submission for ${company || id}?\n\nThis permanently removes the database record, embeddings, and uploaded files. This cannot be undone.`,
    )
    if (!ok) return
    setBusy(true)
    try {
      const res = await fetch(`/api/submissions/${id}?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || `Delete failed (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      alert(e?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const loading = busy || pending
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="Delete submission"
      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-60 transition"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
