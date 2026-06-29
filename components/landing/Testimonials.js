const QUOTES = [
  {
    quote: 'We used to lose a full engineering week per enterprise deal to questionnaires. Now our AEs handle the first pass themselves.',
    name: 'Head of Sales',
    role: 'Series A devtool company',
  },
  {
    quote: 'The drafts are good enough that our security lead just edits — they don’t rewrite from scratch anymore.',
    name: 'Founder',
    role: 'B2B SaaS, 18 employees',
  },
  {
    quote: 'Closed a 6-figure deal two weeks faster because we turned the questionnaire around in a day instead of waiting on engineering.',
    name: 'Account Executive',
    role: 'Infrastructure startup',
  },
]

export default function Testimonials() {
  return (
    <section className="border-t border-neutral-200">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">What teams say</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Built for the people stuck answering these.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUOTES.map((q, i) => (
            <figure key={i} className="relative rounded-xl border border-neutral-200 bg-white p-6">
              <span className="absolute -top-2 left-4 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                Placeholder — replace with real quote
              </span>
              <blockquote className="mt-3 text-[15px] text-neutral-800 leading-relaxed">“{q.quote}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <div className="font-medium text-neutral-900">{q.name}</div>
                <div className="text-neutral-500">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
