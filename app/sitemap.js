const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai'

export default function sitemap() {
  const now = new Date()
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/upload`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/thank-you`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
