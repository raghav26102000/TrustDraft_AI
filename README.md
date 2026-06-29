# TrustDraft_AI — Landing + lead-capture prototype

Next.js 15 (App Router, JS) landing page + upload flow for TrustDraft_AI.

## What this prototype does
- Public landing page (`/`) with hero, 4-step explainer, testimonials, FAQ, footer email capture
- Upload page (`/upload`) with drag-and-drop for the questionnaire + supporting docs
- Thank-you page (`/thank-you`)
- Backend (Next.js route handlers under `/api/*`):
  - `POST /api/early-access` — email signup, IP-rate-limited, stored in Mongo
  - `POST /api/submissions` — multipart upload, server-validated (type/size), files written to disk, metadata stored in Mongo
  - `GET /api/health` — health probe
- **Email is MOCKED** for now — submissions are logged to the server console with the destination email. Swap `lib/server/notify.js` to use Resend later.

## Stack
- Next.js 15 (App Router) + React 18
- Tailwind CSS + shadcn/ui (dialog, accordion, sonner)
- MongoDB (collections: `submissions`, `early_access`)
- Local disk storage for files (`UPLOAD_DIR`, defaults to `/app/uploads`)

## Environment variables (`/app/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=trustdraft
NEXT_PUBLIC_BASE_URL=https://your-domain
CORS_ORIGINS=*
NOTIFICATION_EMAIL=agnexus831@gmail.com   # recipient for the mocked notifications
UPLOAD_DIR=/app/uploads                    # disk path for uploaded files
```

## Run
```
yarn
sudo supervisorctl restart nextjs
```

## Folder layout
```
app/
  app/
    api/[[...path]]/route.js   # all backend endpoints
    page.js                    # landing
    upload/page.js             # upload form
    thank-you/page.js          # confirmation
    sitemap.js robots.js
  components/
    landing/                   # Nav, Hero, Steps, Testimonials, FAQ, Footer, EarlyAccessButton
    upload/UploadFlow.js       # dropzone + processing overlay
  lib/server/                  # db, rateLimit, validation, notify (mocked)
  uploads/                     # written files
```

## Security notes (prototype)
- All Mongo/email keys live server-side only.
- All form inputs are sanitized and re-validated on the server.
- File uploads are restricted to `.pdf/.docx/.xlsx`, 20MB cap per file, plus a hard cap on total upload size.
- IP-based rate limit on `/api/early-access` and `/api/submissions`.
- HTTPS handled by the platform (Vercel/preview).
- When you wire up Supabase/Resend, replace `lib/server/db.js` and `lib/server/notify.js`. No app code changes needed elsewhere.
