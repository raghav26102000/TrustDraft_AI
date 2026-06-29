// Email notifications via Resend, with automatic fallback to console.log
// when RESEND_API_KEY is missing or the send fails. Same function signatures
// as before so no callers need to change.

import { Resend } from 'resend'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai'
const SANDBOX_FROM = 'onboarding@resend.dev'

let _client = null
function getClient() {
  if (_client) return _client
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  _client = new Resend(key)
  return _client
}

function recipient() {
  return process.env.RECIPIENT_EMAIL || process.env.NOTIFICATION_EMAIL || ''
}

function fromAddress() {
  return process.env.RESEND_FROM_ADDRESS || SANDBOX_FROM
}

function isSandbox(from) {
  return (from || '').toLowerCase().endsWith('@resend.dev')
}

function sandboxNote(from) {
  if (!isSandbox(from)) return ''
  return `<p style="color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:10px 12px;border-radius:6px;font-size:12px;margin:16px 0;">Sent from the Resend sandbox sender (<code>${from}</code>). Deliverability is limited to the Resend account owner’s verified email until a custom domain is configured.</p>`
}

async function send({ subject, html, text, tag }) {
  const to = recipient()
  const from = fromAddress()
  if (!to) {
    console.warn('[notify] RECIPIENT_EMAIL not set; skipping email send')
    return { ok: false, reason: 'no_recipient' }
  }
  const client = getClient()
  if (!client) {
    console.warn(`[notify] RESEND_API_KEY not configured — falling back to console log (${tag}).`)
    console.log(`[MOCK EMAIL ${tag}] to=${to} from=${from}`)
    console.log(`Subject: ${subject}`)
    console.log(text)
    return { ok: true, mocked: true }
  }
  try {
    const res = await client.emails.send({
      from: `TrustDraft_AI <${from}>`,
      to: [to],
      subject,
      html,
      text,
    })
    if (res?.error) throw new Error(res.error.message || JSON.stringify(res.error))
    console.log(`[notify] sent (${tag}) id=${res?.data?.id || 'unknown'} to=${to}`)
    return { ok: true, id: res?.data?.id }
  } catch (err) {
    console.error(`[notify] Resend send failed (${tag}):`, err?.message || err)
    // Fallback to console.log so the pipeline still completes visibly.
    console.log(`[MOCK EMAIL ${tag}] to=${to} from=${from}`)
    console.log(`Subject: ${subject}`)
    console.log(text)
    return { ok: false, error: err?.message || 'send_failed' }
  }
}

function reviewUrl(id) {
  return `${BASE}/submissions/${id}`
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function notifySubmission(submission) {
  const from = fromAddress()
  const url = reviewUrl(submission.id)
  const qFile = (submission.files || []).find((f) => f.kind === 'questionnaire')?.original_name || 'questionnaire'
  const supporting = (submission.files || []).filter((f) => f.kind === 'supporting').map((f) => f.original_name)
  const subject = `New questionnaire from ${submission.company} (${submission.email})`
  const text = [
    `New TrustDraft_AI submission`,
    ``,
    `Company:        ${submission.company}`,
    `Name:           ${submission.name}`,
    `Email:          ${submission.email}`,
    `Questionnaire: ${qFile}`,
    `Supporting:     ${supporting.length ? supporting.join(', ') : '(none)'}`,
    `Notes:          ${submission.notes || '(none)'}`,
    `Submitted:      ${submission.created_at}`,
    ``,
    `Review: ${url}`,
  ].join('\n')
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;">
      <h2 style="margin:0 0 12px 0;">New submission</h2>
      <p style="margin:0 0 16px 0;color:#525252;">${esc(submission.company)} — ${esc(submission.email)}</p>
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Name</td><td>${esc(submission.name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Questionnaire</td><td><code>${esc(qFile)}</code></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Supporting</td><td>${esc(supporting.join(', ') || '(none)')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Notes</td><td>${esc(submission.notes || '(none)')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Submitted</td><td>${esc(submission.created_at)}</td></tr>
      </table>
      <p style="margin:20px 0;">
        <a href="${url}" style="background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:500;">Open review page</a>
      </p>
      ${sandboxNote(from)}
    </div>`
  return send({ subject, html, text, tag: 'new_submission' })
}

export async function notifySubmissionComplete({ submission }) {
  const from = fromAddress()
  const s = submission.summary || {}
  const url = reviewUrl(submission.id)
  const qFile = (submission.files || []).find((f) => f.kind === 'questionnaire')?.original_name || 'questionnaire'
  const subject = `Draft answers ready for ${submission.company} — ${s.matched ?? 0}/${s.total ?? 0} matched`
  const text = [
    `Drafts ready for ${submission.company}`,
    ``,
    `Questionnaire: ${qFile}`,
    `Summary:        ${s.matched ?? 0} matched · ${s.needs_review ?? 0} needs review · ${s.total ?? 0} total`,
    `Provider:       ${submission?.results?.[0]?.provider || 'n/a'}`,
    ``,
    `Review: ${url}`,
  ].join('\n')
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;">
      <h2 style="margin:0 0 6px 0;">Drafts ready</h2>
      <p style="margin:0 0 16px 0;color:#525252;">${esc(submission.company)}</p>
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Questionnaire</td><td><code>${esc(qFile)}</code></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Matched</td><td style="color:#047857;font-weight:600;">${esc(s.matched ?? 0)} / ${esc(s.total ?? 0)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Needs review</td><td style="color:#92400e;">${esc(s.needs_review ?? 0)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Provider</td><td>${esc(submission?.results?.[0]?.provider || 'n/a')}</td></tr>
      </table>
      <p style="margin:20px 0;">
        <a href="${url}" style="background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:500;">Open review page</a>
      </p>
      ${sandboxNote(from)}
    </div>`
  return send({ subject, html, text, tag: 'complete' })
}

export async function notifySubmissionFailed({ submission, error }) {
  const from = fromAddress()
  const url = reviewUrl(submission.id)
  const qFile = (submission.files || []).find((f) => f.kind === 'questionnaire')?.original_name || 'questionnaire'
  const subject = `⚠ Parse error for ${submission.company || submission.id}`
  const text = [
    `Submission failed processing`,
    ``,
    `Submission ID: ${submission.id}`,
    `Company:        ${submission.company || '(unknown)'}`,
    `Questionnaire: ${qFile}`,
    `Error:          ${error}`,
    ``,
    `Review: ${url}`,
  ].join('\n')
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5;">
      <h2 style="margin:0 0 6px 0;color:#b91c1c;">Parse error</h2>
      <p style="margin:0 0 16px 0;color:#525252;">${esc(submission.company || submission.id)}</p>
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Submission ID</td><td><code>${esc(submission.id)}</code></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;">Questionnaire</td><td><code>${esc(qFile)}</code></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373;vertical-align:top;">Error</td><td><pre style="margin:0;white-space:pre-wrap;background:#fef2f2;padding:8px;border-radius:4px;">${esc(error)}</pre></td></tr>
      </table>
      <p style="margin:20px 0;">
        <a href="${url}" style="background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:500;">Open review page</a>
      </p>
      ${sandboxNote(from)}
    </div>`
  return send({ subject, html, text, tag: 'failed' })
}
