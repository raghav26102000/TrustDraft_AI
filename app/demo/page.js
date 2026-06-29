import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import DemoPlayer from '@/components/demo/DemoPlayer'
import demoData from '@/lib/demo-data.json'

export const metadata = {
  title: 'See it in action — a live demo',
  description:
    'Watch TrustDraft_AI work through a real sample security questionnaire and draft each answer from supporting documentation, question by question.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: 'TrustDraft_AI — see it in action',
    description: 'A live walkthrough of how we draft answers to enterprise security questionnaires.',
    type: 'website',
  },
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <Nav />
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-12">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">Live demo</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-[-0.02em] text-neutral-900 leading-[1.05]">
            Watch TrustDraft_AI answer a real questionnaire.
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            One sample security questionnaire, eight questions, drafted from supporting documentation. Press play and see what your team gets back.
          </p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <DemoPlayer data={demoData} />
      </section>
      <Footer />
    </main>
  )
}
