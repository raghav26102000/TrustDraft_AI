// MOCKED email notification. Replace with Resend later.
export async function notifySubmission(submission) {
  const to = process.env.NOTIFICATION_EMAIL || 'unset'
  // eslint-disable-next-line no-console
  console.log('\n========== [MOCK EMAIL] New TrustDraft submission ==========')
  console.log(`To:        ${to}`)
  console.log(`Subject:   New questionnaire from ${submission.company} (${submission.email})`)
  console.log(`Name:      ${submission.name}`)
  console.log(`Email:     ${submission.email}`)
  console.log(`Company:   ${submission.company}`)
  console.log(`Submitted: ${submission.created_at}`)
  console.log(`Files:`)
  for (const f of submission.files) {
    console.log(`  - ${f.kind}: ${f.original_name} (${f.size} bytes) -> ${f.stored_path}`)
  }
  console.log('===========================================================\n')
  return { ok: true, mocked: true }
}
