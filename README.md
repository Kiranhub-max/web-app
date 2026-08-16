# Daily Progress Tracker

React (Vite) + Supabase web app. No backend server — the app talks to Supabase directly.

## Folder structure

```
daily-progress-tracker/
├── index.html
├── package.json
├── vite.config.js
├── .env.example          ← copy to .env and fill in your Supabase keys
├── .gitignore
├── schema.sql             ← run this once in Supabase SQL Editor (already done)
└── src/
    ├── main.jsx            entry point
    ├── App.jsx             auth gate + navigation (sidebar/bottom tabs)
    ├── index.css           all styling (design tokens at the top)
    ├── lib/
    │   ├── supabase.js      Supabase client
    │   └── dates.js         date helper functions
    └── pages/
        ├── Login.jsx        sign in / sign up
        ├── Today.jsx         today's checklist + progress bar
        ├── Tasks.jsx          add / edit / archive tasks
        ├── Progress.jsx      streaks, weekly chart, task & category performance, heatmap
        └── History.jsx        past days, tap to expand checklist
```

## 1. Run it locally

```bash
npm install
cp .env.example .env      # then paste your Supabase URL + anon key into .env
npm run dev
```

Open the local URL it prints (usually http://localhost:5173).

Sign up once from the login screen — that's your one account.

## 2. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New Project** → import that repo.
3. Vercel auto-detects Vite. Leave build settings as default (`npm run build`, output `dist`).
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as your local `.env`)
5. Deploy. Every future `git push` auto-redeploys.

## 3. Supabase

Your database schema (`schema.sql`) is already applied. If you ever need to re-apply it or check it, it's included in this folder for reference.

Free tier note: if the Supabase project gets zero API requests for 7 days, it auto-pauses. Just open the dashboard and un-pause if that happens — your data is untouched.

## What's built

- **Auth** — email/password, one account, Row Level Security scoped to your user id.
- **Today** — active tasks, tap to check off, resource links, live progress bar.
- **Tasks** — add / edit / archive (never hard-deletes, so history stays intact).
- **Progress** — overall completion, current & best streak, this week's bar chart, per-task and per-category performance, 35-day heatmap.
- **History** — last 60 days, tap any day to see that day's full checklist.

## Not built yet (nice-to-haves from the spec)

- Daily reflection notes (spec §19) — table already exists (`daily_notes`) in schema.sql, just needs a UI.
- Custom categories UI (spec §11) — table supports it, form just needs a "+ new category" option.
- Reminders/notifications — would need a scheduled job or browser push, which is a bigger addition.

Ask if you want any of these next.
