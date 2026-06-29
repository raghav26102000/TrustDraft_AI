import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai'
const SITE_NAME = 'TrustDraft_AI'
const SITE_DESC =
  'Respond to enterprise security questionnaires, vendor assessments, and RFPs in minutes using your existing documentation. Win more enterprise deals without burning out your engineering team.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Answer security questionnaires in minutes`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    'security questionnaire',
    'vendor security assessment',
    'RFP response',
    'SOC2',
    'B2B SaaS sales',
    'enterprise sales',
  ],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: `${SITE_NAME} — Answer security questionnaires in minutes`,
    description: SITE_DESC,
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Answer security questionnaires in minutes`,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
