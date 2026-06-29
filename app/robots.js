const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai'

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/thank-you'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
