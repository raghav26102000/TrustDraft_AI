import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import UploadFlow from '@/components/upload/UploadFlow'

export const metadata = {
  title: 'Upload your security questionnaire',
  description: 'Upload a PDF, DOCX, or XLSX questionnaire and your supporting docs. We will draft responses and email them back within 24 hours.',
  alternates: { canonical: '/upload' },
  robots: { index: false, follow: true },
}

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <Nav />
      <section className="flex-1 mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <header className="mb-10">
          <p className="text-sm font-medium text-emerald-700">Step 1 of 1</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900">
            Send us your questionnaire
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl">
            Upload the security questionnaire or RFP you need to answer. Add any supporting docs — policies, SOC2 report, past responses — and we’ll return drafted answers within 24 hours.
          </p>
        </header>
        <UploadFlow />
      </section>
      <Footer />
    </main>
  )
}
