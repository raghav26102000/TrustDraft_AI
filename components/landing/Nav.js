import Link from 'next/link'
import EarlyAccessButton from './EarlyAccessButton'

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 group-hover:scale-110 transition" aria-hidden="true" />
          <span className="font-semibold tracking-tight text-neutral-900">TrustDraft_AI</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-neutral-600">
          <a href="#how-it-works" className="hover:text-neutral-900 transition">How it works</a>
          <a href="#faq" className="hover:text-neutral-900 transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <EarlyAccessButton variant="ghost" label="Early access" />
          <Link href="/upload" className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 transition">
            Try it
          </Link>
        </div>
      </div>
    </header>
  )
}
