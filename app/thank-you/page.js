import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import { CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Thanks — we got it',
  description: 'Your questionnaire was received. We will email your draft responses within 24 hours.',
  alternates: { canonical: '/thank-you' },
  robots: { index: false, follow: false },
}

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <Nav />
      <section className="flex-1 mx-auto w-full max-w-2xl px-6 py-24 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight">Got it.</h1>
        <p className="mt-5 text-lg text-neutral-600">
          We’re reviewing your questionnaire and will email your draft responses within 24 hours.
        </p>
        <p className="mt-4 text-sm text-neutral-500 max-w-lg mx-auto">
          Every submission gets a human review combined with AI assistance — no black-box automation. If we need clarification, we’ll reply directly to the email you provided.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition">
            Back to home
          </Link>
          <a href="mailto:agnexus831@gmail.com" className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition">
            Contact us
          </a>
        </div>
      </section>
      <Footer />
    </main>
  )
}
