import Link from 'next/link'
import { getDb } from '@/lib/server/db'
import DeleteSubmissionButton from '@/components/admin/DeleteSubmissionButton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

const STATUS_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  processing: 'bg-blue-50 text-blue-700 ring-blue-100',
  received: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  parse_error: 'bg-red-50 text-red-700 ring-red-100',
  failed: 'bg-red-50 text-red-700 ring-red-100',
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-neutral-100 text-neutral-600 ring-neutral-200'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {status || 'unknown'}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return iso }
}

async function loadSubmissions() {
  const db = await getDb()
  const rows = await db
    .collection('submissions')
    .find({}, {
      projection: {
        _id: 0,
        id: 1,
        company: 1,
        email: 1,
        name: 1,
        status: 1,
        stage: 1,
        created_at: 1,
        updated_at: 1,
        files: 1,
        summary: 1,
        usage: 1,
      },
    })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray()
  return rows
}

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams
  const token = (sp?.token || '').toString()
  const expected = process.env.ADMIN_TOKEN || ''

  if (!expected || token !== expected) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-neutral-900">
        <p className="text-sm text-neutral-500">Not authorized.</p>
      </main>
    )
  }

  let submissions = []
  let loadError = null
  try {
    submissions = await loadSubmissions()
  } catch (err) {
    loadError = err?.message || 'failed to load'
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Submissions</h1>
            <p className="mt-1 text-sm text-neutral-500">All submissions, newest first.</p>
          </div>
          <p className="text-xs text-neutral-400">{submissions.length} total</p>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load submissions: {loadError}
          </div>
        ) : submissions.length === 0 ? (
          <div className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
            <p className="text-sm text-neutral-500">No submissions yet.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Questionnaire</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {submissions.map((s) => {
                  const qFile = (s.files || []).find((f) => f.kind === 'questionnaire')?.original_name || '—'
                  const summary = s.summary
                    ? `${s.summary.matched}/${s.summary.total} matched · ${s.summary.needs_review} review`
                    : s.stage || '—'
                  const u = s.usage
                  const usageStr = u
                    ? `${u.llmCalls ?? 0} LLM · ${u.embeddingCalls ?? 0} emb · ~${(u.estTokens ?? 0).toLocaleString('en-US')} tok`
                    : '—'
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <Link href={`/submissions/${s.id}`} className="hover:underline">
                          {s.company || '(unknown)'}
                        </Link>
                        <div className="text-xs text-neutral-400">{s.name}</div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{s.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600 truncate max-w-[220px]">{qFile}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-neutral-600">{summary}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">{usageStr}</td>
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <DeleteSubmissionButton id={s.id} company={s.company} token={token} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
