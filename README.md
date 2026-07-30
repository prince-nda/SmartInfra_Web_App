# SmartInfra Web App

**Keep Kigali clean and green.** A civic infrastructure reporting platform for
Rwanda — citizens report issues (potholes, broken streetlights, water leaks,
damaged roads, illegal dumping) with photos and precise location; city
administrators triage, assign, resolve, and track everything with full
audit logging and analytics.

- **Live demo:** https://smart-infra-web-app-psi.vercel.app/
- **Demo video:** https://youtu.be/6QQWlZnmLhc
- **SRS document:** https://docs.google.com/document/d/1W8FP6VjMphEADXp6YHB6LwVkvd2KSqsddCZyTU2u3J0/edit?tab=t.0

---

## What this app does

**Citizens can:**
- Register and verify their account via a 6-digit email code
- Submit reports with a category, description, up to 3 photos, and a
  location — auto-detected GPS, or a manual pin dropped on a map if GPS
  fails or is declined
- Track every report's status in real time, with a full timeline
- Receive notifications (in-app + email) the moment a report's status
  changes, including any message the city adds
- Manage their profile and, if they choose, permanently delete their
  account and data
- Get automatically logged out after 30 minutes of inactivity

**City administrators can:**
- Search, filter (status, category, district, date range, report ID, or
  keyword), and triage every citizen report
- Update status and leave internal notes documenting action taken
- View analytics: totals by category/status/district, average
  resolution time
- Export report data as CSV or PDF
- View and export the full audit log of every administrative action

**Super-administrators can additionally:**
- Create new administrator accounts (the system generates a temporary
  password and emails it directly to the new staff member — the
  super-admin never sees or shares it manually)
- Assign reports to specific staff members
- Deactivate, reactivate, delete administrator accounts, and grant/revoke
  super-admin privileges

New staff accounts are forced to set their own password on first login
before they can access anything else.

---

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL, JWT auth, Cloudinary (photo
  storage), Nodemailer/Brevo (email), Twilio (SMS — optional, falls back
  gracefully to email-only if not configured)
- **Frontend:** React (Vite), React Router, Chart.js, Leaflet/OpenStreetMap
- **Testing/quality:** Jest (backend), Vitest + React Testing Library
  (frontend), ESLint on both

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later (`node -v` to check)
- [PostgreSQL](https://www.postgresql.org/download/) installed and running
  locally (or a hosted instance — see Deployment below)
- A [Cloudinary](https://cloudinary.com) account (free tier is fine) — for
  report photo uploads
- A [Brevo](https://www.brevo.com) account (free tier is fine) — for
  sending verification/reset/notification emails
- *(Optional)* A [Twilio](https://www.twilio.com) account — for SMS
  notifications; the app works fully without this

---

## 1. Clone the repository

```bash
git clone https://github.com/prince-nda/SmartInfra_Web_App.git
cd SmartInfra_Web_App
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in real values:

```properties
PORT=5000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=smartinfra_db
DB_PORT=5432

JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRES_IN=30m

# Brevo HTTP API
BREVO_API_KEY= the key you just generated
BREVO_SENDER_EMAIL= a verified sender email in your Brevo account
BREVO_SENDER_NAME=SmartInfra

# Optional - app falls back to email-only if left blank
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create the database (if it doesn't already exist):

```bash
psql -U postgres -c "CREATE DATABASE smartinfra_db;"
```

Apply the schema:

```bash
node scripts/initDb.js
```

This creates every table. **It does not create any admin account** — every
administrator account, including the very first one, can only be created
by an existing super-admin. See the next step to bootstrap your first one.

Start the backend:

```bash
npm run dev
```

You should see:
```
PostgreSQL connected successfully
Server running on port 5000
```

---

## 3. Frontend setup

Open a **new terminal window** (leave the backend running):

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` only needs one line (already correct by default if your backend
runs on port 5000):

```properties
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`) in your
browser.

---

## 4. Bootstrap your first super-admin account

Because admin accounts can only be created by an existing super-admin,
you need to manually promote your first one directly in the database:

1. Go to the app and **register a normal citizen account** with your own
   email — verify it with the OTP code emailed to you, then log in once
   to confirm it works.
2. Run this in `psql` (or any Postgres client), replacing the email:

   ```sql
   UPDATE users
   SET role = 'admin', is_super_admin = TRUE, is_email_verified = TRUE
   WHERE email = 'your-email@example.com';
   ```

3. Log out and log back in. You'll now land on the admin dashboard with
   full super-admin privileges — from here you can create every other
   staff account through the UI (Staff → Add staff member), and each one
   gets its temporary password emailed to them automatically.

---

## 5. Using the app

1. **Citizens:** register → verify the emailed code → log in → submit a
   report with a category, description, optional photos, and location.
2. **Admins:** log in with an account created by a super-admin → land on
   the reports dashboard → search/filter/triage/update status/add notes.
3. **Super-admins:** everything above, plus Staff management, the audit
   log, and report assignment.

---

## Running tests and linting

```bash
# Backend
cd backend
npm test          # Jest - unit tests for OTP/token generation, CSV export, phone normalization
npm run lint       # ESLint

# Frontend
cd frontend
npm test           # Vitest - component tests for StatusBadge, CategoryIcon, districts data
npm run lint       # ESLint
```

---

## Project structure

```
SmartInfra_Web_App/
├── backend/
│   ├── config/          DB (PostgreSQL) and Cloudinary configuration
│   ├── controllers/      Route handlers (auth, reports, admin, notifications)
│   ├── middleware/        JWT auth, role/super-admin checks, image upload
│   ├── routes/             Express route definitions
│   ├── utils/               Email, SMS, OTP/token generation, CSV/PDF export, audit logging
│   ├── scripts/               Database setup and migration scripts
│   ├── __tests__/              Jest unit tests
│   └── database_schema.sql
└── frontend/
    ├── public/images/       Static assets (landing page hero photo)
    └── src/
        ├── api/               API client functions
        ├── components/         Shared UI components (incl. map picker, report map)
        ├── context/             Auth and theme state
        ├── hooks/                Custom hooks (inactivity logout)
        ├── constants/              Shared data (districts list)
        ├── pages/                   Citizen-facing pages + component tests
        └── pages/admin/               Admin dashboard pages
```

---

## Deployment

This app is designed to deploy as: **frontend on Vercel, backend + database
on Render** (Vercel's serverless model doesn't suit a long-running
Express server with a persistent DB connection pool without a rewrite).

Quick outline — see inline comments in `backend/config/db.js` and
`backend/server.js` for the relevant configuration:

1. **Render:** create a PostgreSQL instance, then a Web Service pointing
   at `backend/` (`npm install` build, `npm start` start command). Set
   every backend `.env` variable in Render's environment settings, plus
   `DATABASE_URL` (from the Postgres instance) and `NODE_ENV=production`.
   Run `node scripts/initDb.js` once against that database, then bootstrap
   your first super-admin the same way as in local setup.
2. **Vercel:** import the repo, set root directory to `frontend/`, and set
   `VITE_API_URL` to your Render backend URL + `/api`.
3. Update the backend's `CLIENT_URL` environment variable on Render to your
   Vercel URL (comma-separate multiple origins if you need both local and
   production to work simultaneously).

---

## Troubleshooting

- **CORS errors in the browser console:** make sure `CLIENT_URL` in
  `backend/.env` exactly matches the URL your frontend is actually running
  on.
- **"Route not found" errors:** the backend didn't fully restart after a
  code change — stop it completely (Ctrl+C) and run `npm run dev` again
  rather than relying on auto-reload.
- **Emails not sending:** double-check your Brevo SMTP credentials, and
  that your Brevo account doesn't have IP-based SMTP restrictions enabled
  (Settings → Security → Authorized IPs).
- **Build fails only when deployed, not locally:** check for
  case-sensitivity mismatches between filenames and imports (e.g.
  `Profile.jsx` vs `profile.jsx`) — macOS/Windows filesystems ignore case,
  Linux deployment servers don't.

---

## Known limitations

- Kinyarwanda translation is not yet implemented; the interface is
  English-only.
- SMS notifications require a valid Twilio phone number configured; the
  app is fully functional without one, using email for all notifications.
