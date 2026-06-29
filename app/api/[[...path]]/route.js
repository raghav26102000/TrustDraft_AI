import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { promises as fs } from 'fs'
import path from 'path'
import { getDb } from '@/lib/server/db'
import { rateLimit, getClientIp } from '@/lib/server/rateLimit'
import {
  sanitizeText,
  isValidEmail,
  validateFile,
  MAX_FILE_BYTES,
} from '@/lib/server/validation'
import { notifySubmission } from '@/lib/server/notify'
import { runPipelineAsync } from '@/lib/ai/pipeline'
import { activeProviderInfo } from '@/lib/ai/generateAnswer'
import { buildXlsxBuffer, buildDocxBuffer } from '@/lib/ai/export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function ensureUploadDir() {
  const dir = process.env.UPLOAD_DIR || '/app/uploads'
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function persistFile(file, kind, submissionId) {
  const dir = await ensureUploadDir()
  const subDir = path.join(dir, submissionId)
  await fs.mkdir(subDir, { recursive: true })
  const ext = path.extname(file.name).toLowerCase()
  const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const stored = `${kind}-${uuidv4()}-${safeBase}${ext}`
  const full = path.join(subDir, stored)
  const bytes = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(full, bytes)
  return {
    kind,
    original_name: file.name,
    stored_path: full,
    stored_name: stored,
    size: file.size,
    mime: file.type || 'application/octet-stream',
  }
}

async function handleRoute(request, { params }) {
  const { path: parts = [] } = await params
  const route = `/${parts.join('/')}`
  const method = request.method

  try {
    // Health
    if (route === '/health' && method === 'GET') {
      return cors(NextResponse.json({ ok: true, service: 'trustdraft-ai', time: new Date().toISOString() }))
    }

    if ((route === '/' || route === '/root') && method === 'GET') {
      return cors(NextResponse.json({ ok: true, name: 'TrustDraft_AI API' }))
    }

    // Early access email capture
    if (route === '/early-access' && method === 'POST') {
      const ip = getClientIp(request)
      const rl = rateLimit({ key: `early:${ip}`, limit: 10, windowMs: 10 * 60 * 1000 })
      if (!rl.allowed) {
        return cors(NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 }))
      }
      let body
      try { body = await request.json() } catch { body = {} }
      const email = sanitizeText(body.email || '', 254).toLowerCase()
      const source = sanitizeText(body.source || 'landing', 60)
      if (!isValidEmail(email)) {
        return cors(NextResponse.json({ error: 'Please enter a valid work email.' }, { status: 400 }))
      }
      const db = await getDb()
      const doc = {
        id: uuidv4(),
        email,
        source,
        ip,
        created_at: new Date().toISOString(),
      }
      await db.collection('early_access').insertOne(doc)
      // eslint-disable-next-line no-console
      console.log(`[MOCK EMAIL] Early-access signup: ${email} (source=${source}) -> notify ${process.env.NOTIFICATION_EMAIL}`)
      return cors(NextResponse.json({ ok: true }))
    }

    // Questionnaire submission (multipart)
    if (route === '/submissions' && method === 'POST') {
      const ip = getClientIp(request)
      const rl = rateLimit({ key: `sub:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 })
      if (!rl.allowed) {
        return cors(NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 }))
      }

      const contentType = request.headers.get('content-type') || ''
      if (!contentType.includes('multipart/form-data')) {
        return cors(NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 }))
      }

      const form = await request.formData()
      const name = sanitizeText(form.get('name'), 120)
      const email = sanitizeText(form.get('email'), 254).toLowerCase()
      const company = sanitizeText(form.get('company'), 160)
      const notes = sanitizeText(form.get('notes'), 1000)
      const questionnaire = form.get('questionnaire')
      const supporting = form.getAll('supporting').filter(Boolean)

      if (!name) return cors(NextResponse.json({ error: 'Name is required.' }, { status: 400 }))
      if (!isValidEmail(email)) return cors(NextResponse.json({ error: 'Valid work email required.' }, { status: 400 }))
      if (!company) return cors(NextResponse.json({ error: 'Company name is required.' }, { status: 400 }))

      const qCheck = validateFile(questionnaire, { required: true })
      if (!qCheck.ok) return cors(NextResponse.json({ error: qCheck.error }, { status: 400 }))

      for (const f of supporting) {
        const s = validateFile(f, { required: false })
        if (!s.ok) return cors(NextResponse.json({ error: s.error }, { status: 400 }))
      }

      // Limit total payload size defensively (already capped per file).
      const totalBytes = questionnaire.size + supporting.reduce((a, f) => a + (f.size || 0), 0)
      if (totalBytes > 5 * MAX_FILE_BYTES) {
        return cors(NextResponse.json({ error: 'Total upload too large.' }, { status: 413 }))
      }

      const submissionId = uuidv4()
      const files = []
      files.push(await persistFile(questionnaire, 'questionnaire', submissionId))
      for (const f of supporting) {
        if (f && f.size > 0) files.push(await persistFile(f, 'supporting', submissionId))
      }

      const submission = {
        id: submissionId,
        name,
        email,
        company,
        notes,
        files,
        ip,
        status: 'received',
        created_at: new Date().toISOString(),
      }

      const db = await getDb()
      await db.collection('submissions').insertOne(submission)
      await notifySubmission(submission)

      // Kick off the AI pipeline async \u2014 the user is already redirected to /thank-you.
      runPipelineAsync(submissionId)

      return cors(NextResponse.json({ ok: true, id: submissionId }))
    }

    // GET /api/submissions/:id  \u2014 results for the review page
    if (parts.length === 2 && parts[0] === 'submissions' && method === 'GET') {
      const id = parts[1]
      const db = await getDb()
      const sub = await db.collection('submissions').findOne({ id })
      if (!sub) return cors(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const { _id, ip, ...safe } = sub
      // Hide internal absolute paths from the public response.
      safe.files = (safe.files || []).map((f) => ({
        kind: f.kind,
        original_name: f.original_name,
        size: f.size,
        mime: f.mime,
      }))
      return cors(NextResponse.json(safe))
    }

    // GET /api/submissions/:id/export?format=xlsx|docx
    if (parts.length === 3 && parts[0] === 'submissions' && parts[2] === 'export' && method === 'GET') {
      const id = parts[1]
      const url = new URL(request.url)
      const format = (url.searchParams.get('format') || 'xlsx').toLowerCase()
      const db = await getDb()
      const sub = await db.collection('submissions').findOne({ id })
      if (!sub) return cors(NextResponse.json({ error: 'not found' }, { status: 404 }))
      if (!sub.results || sub.results.length === 0) {
        return cors(NextResponse.json({ error: 'submission not ready' }, { status: 409 }))
      }
      const safeBase = (sub.company || 'submission').toString().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40)
      try {
        if (format === 'docx') {
          const buf = await buildDocxBuffer(sub)
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'content-disposition': `attachment; filename="TrustDraft_${safeBase}.docx"`,
            },
          })
        }
        const buf = await buildXlsxBuffer(sub)
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'content-disposition': `attachment; filename="TrustDraft_${safeBase}.xlsx"`,
          },
        })
      } catch (err) {
        console.error('export failed:', err)
        return cors(NextResponse.json({ error: 'export failed' }, { status: 500 }))
      }
    }

    // GET /api/provider  \u2014 inspect active LLM provider
    if (route === '/provider' && method === 'GET') {
      return cors(NextResponse.json(activeProviderInfo()))
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (err) {
    console.error('API error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
