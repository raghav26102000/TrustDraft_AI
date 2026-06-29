// Simple in-memory IP rate limiter. Resets when server restarts.
// Good enough for a validation prototype.
const buckets = new Map()

export function rateLimit({ key, limit = 5, windowMs = 10 * 60 * 1000 }) {
  const now = Date.now()
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + windowMs
  }
  bucket.count += 1
  buckets.set(key, bucket)
  const remaining = Math.max(0, limit - bucket.count)
  const allowed = bucket.count <= limit
  return { allowed, remaining, resetAt: bucket.resetAt }
}

export function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
