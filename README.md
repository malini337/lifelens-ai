# LifeLens AI — From Information to Action

**Problem statement:** AI for Everyday Life

LifeLens AI turns everyday documents and notices (college circulars, exam notices, bills, forms, event announcements) into **actions, deadlines, priorities, reminders, and progress tracking**.

> **Capture → Understand → Decide → Act → Track**

It is not a chatbot and not just a summarizer. A summary is step one; the product is what happens *after* you understand the information: "What exactly do I have to do, by when, and have I done it?"

---

## Innovation

| Idea | How LifeLens does it |
|---|---|
| Information → structured actions | The AI returns validated JSON (title, deadline, priority, required items). Each action becomes a task. |
| Honest about uncertainty | If a date or amount is not in the document, the app shows **"Not clearly identified"** instead of guessing. |
| Extracted vs. interpreted | Text taken from the document is shown with a yellow highlighter. The AI's summary and confidence are in a separate, labelled panel. |
| You stay in control | Priority is only a suggestion; change it any time. Delete tasks that do not apply. |
| English + Tamil | The AI writes a natural Tamil version of every result in the same call, and the whole interface is translated. |
| Safe fallback | If the AI is unavailable, plain-text input gets a simple keyword/date analysis, clearly labelled **"AI unavailable — deterministic fallback used."** |

## Features

- Register, login, logout, JWT-protected routes, bcrypt password hashing, profile editing
- Analyze from **file upload** (PDF, PNG, JPG, TXT), **camera capture** (open → capture → preview → use/retake), or **pasted text**
- Summary, important information, dates, requirements, warnings, AI confidence
- Action detection with deadlines (`YYYY-MM-DD`) and High / Medium / Low priority
- Dashboard: needs-attention-today, upcoming deadlines, pending by priority, progress, recent documents
- My Tasks (pending/completed + priority filters), Deadlines (overdue / today / next 7 days / later / none), History
- Reminders: browser notifications (when allowed) plus in-app alerts while LifeLens is open
- Loading, empty, and error states on every page; responsive layout; keyboard-friendly

## Tech stack

- **Frontend:** React 18, Vite, React Router, Axios, hand-written CSS, browser MediaDevices API
- **Backend:** Node.js (18+), Express, Mongoose, JWT, bcryptjs, multer, helmet, cors, express-rate-limit, pdf-parse
- **Database:** MongoDB Atlas
- **AI:** pluggable provider module (Anthropic Claude by default, Google Gemini included). Images are read by the AI's vision directly, so no separate OCR is needed.

## Architecture

```
React (browser)  ──Axios──▶  Express API  ──▶  services/ai  ──▶  AI provider
                                  │
                                  └──▶ Mongoose ──▶ MongoDB Atlas
```

The AI key lives only in `server/.env`. The browser never sees it.

Inside `/api/analyze`:

1. Upload (kept in memory only) → check type, size, and real file signature
2. PDF/TXT → text. Image → sent to the AI as an image. Pasted text → used as-is
3. `services/ai/index.js` → prompt → provider → extract JSON → `validateResult.js`
4. Save the document (structured results only; the original file and raw text are **not** stored) and its actions
5. Return everything to the page

## Folder structure

```
lifelens-ai/
├── .gitignore
├── README.md
├── samples/sample-notice.txt
├── client/
│   ├── package.json, vite.config.js, index.html, .env.example
│   ├── public/favicon.svg
│   └── src/
│       ├── main.jsx, App.jsx
│       ├── api/axios.js                 # Axios instance + friendly error messages
│       ├── context/                     # AuthContext, LanguageContext
│       ├── i18n/                        # en.json, ta.json
│       ├── components/                  # Navbar, ProtectedRoute, CameraCapture, ActionCard,
│       │                                # PriorityBadge, EmptyState, DocumentResult
│       ├── pages/                       # Home, Login, Register, Dashboard, Analyze,
│       │                                # MyTasks, Deadlines, History, Profile
│       ├── hooks/                       # useReminders.js, useTasks.js
│       ├── utils/                       # dateHelpers.js, localize.js
│       └── styles/index.css
└── server/
    ├── package.json, .env.example, server.js, app.js
    ├── config/db.js
    ├── models/                          # User, Document, Action, Reminder
    ├── routes/ + controllers/           # auth, analyze, documents, actions, reminders
    ├── middleware/                      # authMiddleware, uploadMiddleware, errorHandler
    ├── services/ai/                     # index.js, provider.js, prompts.js,
    │                                    # validateResult.js, fallback.js
    ├── utils/dateHelpers.js
    └── tests/run.js                     # unit tests (npm test)
```

(Compared with the brief, two small additions: a **Dashboard** page at `/dashboard`, and `fallback.js` for the labelled no-AI fallback.)

---

## Prerequisites (Windows)

1. **Node.js LTS** (18 or newer) from https://nodejs.org
2. **Git** (optional, for GitHub) and **VS Code**
3. A free **MongoDB Atlas** account
4. An **AI API key** (Anthropic or Google Gemini)

Check your install in PowerShell:

```powershell
node -v
npm -v
```

## 1. MongoDB Atlas setup

1. Sign in at https://cloud.mongodb.com and create a free **M0** cluster.
2. **Database Access** → Add New Database User → choose a username and password (write them down).
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`) for development, or add your own IP.
4. **Database** → Connect → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Replace `<username>` and `<password>`, and add a database name before the `?`:
   `mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/lifelens?retryWrites=true&w=majority`
   If your password has special characters (`@ : / ?`), URL-encode them.

## 2. AI API setup

**Anthropic (default):** create a key at https://console.anthropic.com → API keys. Leave `AI_PROVIDER=anthropic`.

**Google Gemini (alternative):** create a key in Google AI Studio and set `AI_PROVIDER=gemini`.

`AI_MODEL` is optional. Leave it empty to use the provider's default (set in `services/ai/provider.js`). If a provider retires a model name, put a current one in `AI_MODEL`.

## 3. Environment variables

Create the server file:

```powershell
cd server
copy .env.example .env
notepad .env
```

Fill it in:

```
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/lifelens?retryWrites=true&w=majority
JWT_SECRET=paste-a-long-random-string
AI_API_KEY=your-ai-key
PORT=5000
CLIENT_URL=http://localhost:5173
AI_PROVIDER=anthropic
```

Generate a good `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The client file is optional (it defaults to `http://localhost:5000/api`):

```powershell
cd ..\client
copy .env.example .env
```

Never commit `.env` files. `.gitignore` already excludes them.

## 4. Run the project

**Terminal 1 — backend**

```powershell
cd server
npm install
npm run dev
```

You should see `MongoDB connected` and `LifeLens AI server running on port 5000`.

**Terminal 2 — frontend**

```powershell
cd client
npm install
npm run dev
```

Open http://localhost:5173.

Other scripts: backend `npm start`, `npm test`; frontend `npm run build`, `npm run preview`.

## 5. Testing it

### Quick test with the sample notice

1. Register an account, then open **Analyze → Paste text**.
2. Click **Use a sample notice** (or paste `samples/sample-notice.txt`) and click **Analyze document**.
3. Expected result:

| Field | Expected |
|---|---|
| Summary | Project report submission is required by 15 October 2026 |
| Action | Submit completed project report |
| Deadline | 15 Oct 2026 |
| Requirement | Signed approval form |
| Priority | High |

The wording from the AI will vary slightly. Check the **Extracted from your document** panel against the **AI interpretation** panel.

### Demo flow (2–3 minutes)

1. Open LifeLens → **Register / Login**
2. **Analyze** → upload or capture a notice (or paste the sample)
3. Show the summary, detected deadline, action, and priority
4. Point out the highlighted extracted text vs. the AI interpretation
5. Click **Remind me** on the task (allow notifications when asked)
6. Open **My Tasks** → **Mark as done**
7. Open **Dashboard** → show progress and the Completed count
8. Click **தமிழ்** in the navbar → the interface and the result switch to Tamil

### Other things to try

- Upload a PDF with selectable text, a PNG/JPG photo, and a `.txt` file
- Use **Use camera** (needs `localhost` or `https`, and camera permission)
- Upload an unsupported file (e.g. `.docx`) or a file over 8 MB to see friendly errors
- Remove `AI_API_KEY` and restart the server: pasted text uses the labelled fallback; images show a clear "AI is not configured" message

### Automated tests

```powershell
cd server
npm test
```

These cover date handling, AI-response validation, malformed JSON handling, and the fallback analyzer. They need no database or API key.

## API routes

All routes except register/login need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/me` | Update name, email, language, notification preference |
| POST | `/api/analyze` | Analyze (multipart: `file`, or field `text`; plus `today`, `sourceType`) |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | One document with its tasks |
| DELETE | `/api/documents/:id` | Delete document, its tasks, and reminders |
| GET | `/api/actions` | List tasks (`?status=Pending` or `Completed`, `?priority=High`, `Medium` or `Low`) |
| PATCH | `/api/actions/:id` | Update title, description, priority, status, deadline |
| DELETE | `/api/actions/:id` | Delete task and its reminder |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create/replace the reminder for a task |
| PATCH | `/api/reminders/:id` | Change time, enable/disable, mark notified |
| DELETE | `/api/reminders/:id` | Delete reminder |
| GET | `/api/health` | Health check |

## Data model

- **User:** name, email (unique), password (hash), preferredLanguage (`en`/`ta`), notificationPreference, timestamps
- **Document:** userId, title, originalFileName, documentType, sourceType, summary, importantInformation, dates, requirements, warnings, confidence, usedFallback, translations (Tamil), createdAt
- **Action:** userId, documentId, title/description (+ Tamil), deadline (null = not identified), priority, requiredItems, status, completedAt, timestamps
- **Reminder:** userId, actionId (one per task), title, reminderDate, enabled, notifiedAt, notificationType

## Security

- Passwords hashed with bcrypt; JWT sessions; no passwords in logs
- AI key and secrets only in server environment variables
- Helmet headers, CORS limited to `CLIENT_URL`, rate limits on all routes (stricter on login and analyze)
- Upload checks: allowed types, 8 MB limit, real file signature, memory-only storage (nothing written to disk)
- Every query is scoped to the logged-in user
- Stack traces and secrets are never sent to the browser
- Document text is treated as data; the AI prompt tells the model to ignore instructions inside documents

## Limits to be aware of

- Reminders fire only while LifeLens is open in a browser tab. The `Reminder` model and `useReminders` hook are structured so email/push can be added later.
- Scanned PDFs have no text layer. Upload a photo or screenshot of the page instead.
- The AI can still be wrong. The app shows confidence, separates extracted from interpreted content, and tells users to check the original.
- LifeLens is an information tool. It does not give medical, legal, or financial advice.

## Deployment

**Backend on Render**

1. Push the repo to GitHub. On https://render.com create a **Web Service** from the repo.
2. Root Directory: `server` · Build command: `npm install` · Start command: `npm start`
3. Environment variables: `MONGO_URI`, `JWT_SECRET`, `AI_API_KEY`, `AI_PROVIDER`, and `CLIENT_URL` (your Vercel URL, e.g. `https://lifelens.vercel.app`)
4. In MongoDB Atlas → Network Access, allow Render (`0.0.0.0/0` is the simplest).

**Frontend on Vercel** (`client/vercel.json` is already included)

1. Import the repo on https://vercel.com. Root Directory: `client` · Framework: Vite
2. Environment variable: `VITE_API_URL=https://your-render-service.onrender.com/api`
3. Camera capture requires HTTPS, which Vercel provides.

## Future enhancements

Email and WhatsApp ingestion, Google Calendar export, push/email reminders from a scheduled server job, more languages, shared family or class task lists, scanned-PDF OCR, and an editable "correct the AI" step that learns from fixes.

## Screenshots

_Add screenshots here: landing page, Analyze result, Dashboard, My Tasks, Tamil view._
