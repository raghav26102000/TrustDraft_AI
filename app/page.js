import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import Steps from '@/components/landing/Steps'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import Footer from '@/components/landing/Footer'

export const metadata = {
  title: 'Respond to enterprise security questionnaires in minutes, not days',
  description:
    'TrustDraft_AI helps small B2B SaaS teams answer security reviews, vendor assessments, and RFPs using their existing documentation — without pulling engineers into every sales cycle.',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <Nav />
      <Hero />
      <Steps />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  )
}
