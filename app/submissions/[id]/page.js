import { notFound } from 'next/navigation'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import SubmissionResults from '@/components/submissions/SubmissionResults'
import { getDb } from '@/lib/server/db'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Submission results',
  robots: { index: false, follow: false },
}

async function loadSubmission(id) {
  try {
    const db = await getDb()
    const sub = await db.collection('submissions').findOne({ id })
    if (!sub) return null
    const { _id, ip, ...safe } = sub
    safe.files = (safe.files || []).map((f) => ({
      kind: f.kind,
      original_name: f.original_name,
      size: f.size,
      mime: f.mime,
    }))
    return safe
  } catch {
    return null
  }
}

export default async function SubmissionPage({ params }) {
  const { id } = await params
  const sub = await loadSubmission(id)
  if (!sub) notFound()
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <Nav />
      <section className="flex-1 mx-auto w-full max-w-5xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-12">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">Submission</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-[-0.02em] text-neutral-900 leading-[1.05]">
            {sub.company || 'Draft answers'}
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Drafted from your supporting documentation. Review each answer before sending it back.
          </p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <SubmissionResults initial={sub} />
      </section>
      <Footer />
    </main>
  )
}
