# TrustDraft_AI — Landing + lead-capture + automated draft pipeline

Next.js 15 (App Router, JS) prototype that takes a security questionnaire upload, runs an automated retrieval + drafting pipeline against the user's own supporting documents, and serves a review page with downloadable .xlsx / .docx exports.

## What this prototype does
- Public landing page (`/`) — hero, 4-step explainer, testimonials, FAQ, footer email capture
- Live demo (`/demo`) — pre-scripted walkthrough using `lib/demo-data.json`
- Upload page (`/upload`) — drag-and-drop questionnaire + supporting docs
- Thank-you page (`/thank-you`)
- Review page (`/submissions/[id]`) — auto-refreshing results with Matched / Needs review badges + Export buttons
- Backend (`/api/*`):
  - `POST /api/early-access` — email capture, IP rate-limited
  - `POST /api/submissions` — multipart upload, server-validated, files written to disk, metadata in Mongo; kicks off the async AI pipeline
  - `GET /api/submissions/:id` — JSON status + results
  - `GET /api/submissions/:id/export?format=xlsx|docx` — downloadable spreadsheet / doc
  - `GET /api/provider` — inspect active LLM provider config
  - `GET /api/health`

## AI pipeline (async, runs after upload)
1. **Parse** the questionnaire — `xlsx` row-aware extraction, with a `pdf-parse` / `mammoth` fallback. Free-form text is segmented into discrete questions via the active LLM.
2. **Chunk** supporting docs into ~650-token windows with overlap.
3. **Embed** every chunk locally via `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`). No API key, no rate limits. Vectors stored on the chunk documents in MongoDB.
4. **Retrieve** top-K chunks per question using in-process cosine similarity.
5. **Draft** an answer through the **provider abstraction**: `lib/ai/generateAnswer.js` dispatches to one of `lib/ai/providers/{anthropic,gemini,openrouter}.js` based on `LLM_PROVIDER`. Each provider returns `{ answer, confidence: matched | needs_review, sourceDoc }`. If the active provider isn't configured or errors out, that question is marked `needs_review` with the failure logged — the pipeline never blocks.
6. **Notify** (MOCKED) — submission completion + summary count + the unguessable review URL.

Switching providers is a one-line env var change. No code changes.

## Stack
- Next.js 15 + React 18 (App Router)
- Tailwind + shadcn/ui (dialog, accordion, sonner)
- MongoDB (collections: `submissions`, `chunks`, `early_access`)
- Local disk for uploads
- Local embeddings via `@xenova/transformers`
- File parsing: `pdf-parse`, `mammoth`, `xlsx`
- Export: `xlsx`, `docx`

## Environment variables (`/app/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=trustdraft
NEXT_PUBLIC_BASE_URL=https://your-domain
CORS_ORIGINS=*
NOTIFICATION_EMAIL=agnexus831@gmail.com
UPLOAD_DIR=/app/uploads
TRANSFORMERS_CACHE=/app/.cache/transformers

# --- LLM provider (one-line switch) ---
LLM_PROVIDER=                     # "" | "anthropic" | "gemini" | "openrouter"

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6 # override here if Anthropic renames the slug

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OPENROUTER_API_KEY=
OPENROUTER_MODEL=                 # e.g. "x-ai/grok-4-fast", "moonshotai/kimi-k2"
```

With `LLM_PROVIDER` empty, the pipeline runs to completion but every question is returned as `needs_review` with a clear "no provider configured" message — exactly the "fail soft" behavior specified.

## Run
```
yarn
sudo supervisorctl restart nextjs
```

## Folder layout (AI bits)
```
lib/ai/
  embeddings.js            # local model wrapper
  chunk.js                 # token-aware chunker
  similarity.js            # cosine + topK
  parse.js                 # pdf / docx / xlsx parsing
  segmentQuestions.js      # LLM fallback for free-form Qs
  generateAnswer.js        # provider dispatcher
  pipeline.js              # parse -> embed -> retrieve -> draft -> store
  export.js                # .xlsx / .docx builders
  providers/
    anthropic.js
    gemini.js
    openrouter.js
```

## Security notes (prototype)
- All API keys server-side only.
- All form inputs sanitized + server-revalidated.
- File types restricted to `.pdf/.docx/.xlsx`, 20MB per file.
- IP rate limit on submission + early-access.
- Review URL is an unguessable UUID; not indexed (`robots: noindex`).
- When you wire real Resend/Supabase later, only `lib/server/notify.js` (and optionally `lib/server/db.js`) need to change.
