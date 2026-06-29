import { Upload, FileStack, Wand2, Send } from 'lucide-react'

const STEPS = [
  { icon: Upload, title: 'Upload questionnaire', body: 'Drop in the PDF, DOCX, or XLSX you got from the customer’s security team.' },
  { icon: FileStack, title: 'Upload your docs', body: 'Add SOC2, security policies, past answers — anything that already describes your stance.' },
  { icon: Wand2, title: 'Draft answers generated', body: 'AI maps each question to the right answer in your docs and writes a first-pass response.' },
  { icon: Send, title: 'Review & export', body: 'You review, edit, and send back to the customer in their original format.' },
]

export default function Steps() {
  return (
    <section id="how-it-works" className="border-t border-neutral-200 bg-neutral-50/60">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">How it works</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">From questionnaire to drafted answers in four steps.</h2>
          <p className="mt-4 text-neutral-600">No new sources of truth. We use what you already have.</p>
        </div>
        <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <li key={i} className="relative rounded-xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">0{i + 1}</span>
                <s.icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900">{s.title}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
