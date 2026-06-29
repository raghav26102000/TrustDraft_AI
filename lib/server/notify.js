// MOCKED email notifications. All paths log to stdout so you can see exactly
// what would be sent. Swap the body of these functions for a real Resend
// (or SES, etc.) call later.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://trustdraft.ai'

export async function notifySubmission(submission) {
  const to = process.env.NOTIFICATION_EMAIL || 'unset'
  console.log('\n========== [MOCK EMAIL] New TrustDraft submission ==========')
  console.log(`To:        ${to}`)
  console.log(`Subject:   New questionnaire from ${submission.company} (${submission.email})`)
  console.log(`Name:      ${submission.name}`)
  console.log(`Email:     ${submission.email}`)
  console.log(`Company:   ${submission.company}`)
  console.log(`Submitted: ${submission.created_at}`)
  console.log(`Review:    ${BASE}/submissions/${submission.id}`)
  console.log(`Files:`)
  for (const f of submission.files || []) {
    console.log(`  - ${f.kind}: ${f.original_name} (${f.size} bytes) -> ${f.stored_path}`)
  }
  console.log('===========================================================\n')
  return { ok: true, mocked: true }
}

export async function notifySubmissionComplete({ submission }) {
  const to = process.env.NOTIFICATION_EMAIL || 'unset'
  const s = submission.summary || {}
  console.log('\n========== [MOCK EMAIL] Submission completed ==========')
  console.log(`To:        ${to}`)
  console.log(`Subject:   Draft answers ready for ${submission.company} — ${s.matched}/${s.total} matched`)
  console.log(`Review:    ${BASE}/submissions/${submission.id}`)
  console.log(`Summary:   ${s.matched} matched · ${s.needs_review} needs review · ${s.total} total`)
  console.log(`Provider:  ${submission.stage === 'done' ? (submission.provider?.name || 'n/a') : 'n/a'}`)
  console.log('=======================================================\n')
  return { ok: true, mocked: true }
}

export async function notifySubmissionFailed({ submission, error }) {
  const to = process.env.NOTIFICATION_EMAIL || 'unset'
  console.log('\n========== [MOCK EMAIL] Submission FAILED ==========')
  console.log(`To:        ${to}`)
  console.log(`Subject:   ⚠️ Parse error for ${submission.company}`)
  console.log(`Review:    ${BASE}/submissions/${submission.id}`)
  console.log(`Error:     ${error}`)
  console.log('=====================================================\n')
  return { ok: true, mocked: true }
}
