import Link from 'next/link'
import EarlyAccessButton from './EarlyAccessButton'
import { ArrowRight, FileText, ShieldCheck, Sparkles } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            For B2B SaaS founders, AEs and sales engineers
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl font-semibold tracking-[-0.02em] text-neutral-900 leading-[1.05]">
            Respond to enterprise security questionnaires in <span className="text-emerald-700">minutes, not days</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-2xl leading-relaxed">
            Win enterprise deals faster by answering security reviews, vendor assessments, and RFPs using your existing documentation — without pulling engineers into every sales cycle.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/upload" className="group inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition">
              Try it with your questionnaire
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <EarlyAccessButton variant="outline" label="Join early access" />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Human review on every draft</span>
            <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-emerald-600" aria-hidden="true" /> PDF, DOCX, XLSX supported</span>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  )
}

function HeroMockup() {
  const rows = [
    { q: 'Do you encrypt data at rest?', a: 'Yes — AES-256 across all production stores. See §3.2 of our SOC2.', status: 'matched' },
    { q: 'Describe your incident response process.', a: 'Documented in IR-Playbook v4. 24/7 on-call with 15-min ack SLA.', status: 'matched' },
    { q: 'Do you have a vulnerability disclosure program?', a: 'Yes, security@…  triaged within one business day.', status: 'matched' },
    { q: 'List sub-processors that handle customer data.', a: 'AWS (us-east-1), Stripe, Resend. Full list at /trust.', status: 'matched' },
    { q: 'How do you handle data deletion on customer request?', a: 'Drafting…', status: 'drafting' },
  ]
  return (
    <div className="mt-16 sm:mt-20">
      <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-white px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="ml-3 text-xs text-neutral-500 font-mono">Acme_SecurityQuestionnaire_2025.xlsx</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Drafting
          </span>
        </div>
        <div className="divide-y divide-neutral-200 bg-white">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-4 sm:px-6 py-4">
              <div className="col-span-12 sm:col-span-5 text-sm text-neutral-700">{r.q}</div>
              <div className="col-span-12 sm:col-span-6 text-sm text-neutral-600">
                {r.status === 'drafting' ? (
                  <span className="inline-flex items-center gap-2 text-neutral-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
                    Drafting from your SOC2 + DPA…
                  </span>
                ) : (
                  <span>{r.a}</span>
                )}
              </div>
              <div className="col-span-12 sm:col-span-1 text-xs sm:text-right">
                {r.status === 'matched' ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-emerald-100">Matched</span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-neutral-500 ring-1 ring-neutral-200">Drafting</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
