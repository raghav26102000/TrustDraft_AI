'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'Is my data secure?',
    a: 'Honest answer: we’re a small team building a prototype. Your files are stored privately and only the founder reviews them to draft answers. We use AI to assist that drafting, but every response gets human review before it’s sent back — no black-box automation. We don’t train models on your data, and we don’t share it with anyone outside the review loop. If you have specific compliance requirements (DPA, deletion, sub-processor list), email us and we’ll handle it manually.',
  },
  {
    q: 'What file formats do you support?',
    a: 'PDF, DOCX, and XLSX, up to 20MB per file. Most security questionnaires arrive as one of these. You can attach multiple supporting documents — policies, SOC2 report, past responses — in the same submission.',
  },
  {
    q: 'How long does it take?',
    a: 'We aim to email back draft answers within 24 hours of your submission. Longer questionnaires (200+ rows) can take a little more — we’ll always tell you up front if a turnaround needs more time.',
  },
  {
    q: 'Do you replace our security team?',
    a: 'No. We get you to a strong first draft so your security and engineering team review and approve, instead of writing from scratch. Final accountability stays with you.',
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="border-t border-neutral-200 bg-neutral-50/60">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-700">FAQ</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Common questions</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="px-5">
              <AccordionTrigger className="text-left text-base font-medium text-neutral-900 py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] text-neutral-600 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
