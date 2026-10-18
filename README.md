# What's Your Story

**The Voice of Untold Stories** — a human storytelling platform that publishes
real-life stories about people: their experiences, struggles, achievements, and
personal journeys.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4**, and
**Lucide** icons. Story content, submissions and admin accounts live in
**Supabase** (Postgres + Auth + Storage); a small local **SQLite** file keeps
site content, the founder profile, categories and import history. See
[`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) to connect a project.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase (required) — see SUPABASE_SETUP.md
copy .env.example .env.local            # Windows
# cp .env.example .env.local            # macOS / Linux
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

# 3. Run the SQL in supabase_setup.sql (Supabase SQL Editor),
#    create an admin user in Supabase Auth, and add its UUID to admin_users.

# 4. Run the site
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin panel is at
[http://localhost:3000/admin](http://localhost:3000/admin). The full walkthrough
is in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check without emitting files |
| `npm run import-portrait` | Manually import a real photograph from the command line |

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. **Never commit real
secrets.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
required.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL (Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Publishable / anon key. Never use the service-role key. |
| `SITE_URL` | Recommended in production | Public origin used for canonical URLs, sitemap, and Open Graph tags. Example: `https://whatsyourstory.example.com` |
| `UPLOAD_DIR` | Optional | Directory for locally uploaded images (e.g. founder portrait). Default `data/uploads`. |
| `MAX_UPLOAD_MB` | Optional | Max upload size per file in MB. Default `5`. |
| `DATA_DIR` | Optional | Directory for the local SQLite file. Default `data`. |
| `RESEND_API_KEY` | Optional | Resend API key for submission notification e-mails (server-side only). |
| `STORY_NOTIFICATION_EMAIL` | Optional | Inbox that receives submission notifications (e.g. your personal address). |
| `STORY_NOTIFICATION_FROM` | Optional | Verified Resend sender, e.g. `What's Your Story <notifications@yourdomain.com>`. |

---

## Email notifications (Resend)

Every story submitted through `/share` is saved to Supabase first and then
emailed to you via [Resend](https://resend.com) — **if** the three variables
above are configured. Submissions are **always saved**, even when e-mail is
not configured or delivery fails; a failed e-mail is recorded locally and can
be retried from **Admin → Submissions → open a submission → Send/Resend
notification**.

### 1. Create a Resend account

Sign up at [resend.com](https://resend.com). The free tier (3,000 e-mails /
month) is more than enough. No paid service is required.

### 2. Create an API key

In the Resend dashboard: **API Keys → Create API Key**. Give it any name
(e.g. `whatsyourstory-local`) and copy the key (it starts with `re_`).

### 3. Configure a sender address

- **Easiest (development):** Resend provides a shared sandbox domain
  (`onboarding@resend.dev`) that works immediately — you can send to your own
  address while your Resend account is unverified. Use it as
  `STORY_NOTIFICATION_FROM="What's Your Story <onboarding@resend.dev>"`.
- **Production:** verify your domain in **Domains → Add Domain**, then create
  a sender on that domain (e.g. `notifications@yourdomain.com`). See
  [Resend's domain guide](https://resend.com/docs/dashboard/domains/introduction).

### 4. Fill in `.env.local`

Open `.env.local` (do **not** commit it) and add:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
STORY_NOTIFICATION_EMAIL=you@example.com
STORY_NOTIFICATION_FROM="What's Your Story <onboarding@resend.dev>"
```

### 5. Restart the development server

Environment variables are read at startup:

```bash
# stop the server (Ctrl+C), then:
npm run dev
```

If any of the three variables is missing, the server logs a clear warning in
development and notifications are silently skipped — nothing breaks.

### 6. Test a submission

1. Open [http://localhost:3000/share](http://localhost:3000/share) and submit
   a story with a valid name, email, title and content, and the consent box
   ticked.
2. You should see the thank-you screen; the submission appears in
   [http://localhost:3000/admin/submissions](http://localhost:3000/admin/submissions)
   with status **Pending review**.
3. The notification e-mail arrives at `STORY_NOTIFICATION_EMAIL` with the
   subject **“New Interest Entry — What's Your Story: <title>”**.
4. Open the submission in the admin panel to see the delivery status and a
   **Resend notification** button.

### 7. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Server log: `Submission notifications are disabled — missing: …` | One or more of the three variables is absent from `.env.local`, or the server was not restarted after adding them. |
| Admin panel says “Notification was skipped — e-mail is not configured” | Same as above. |
| `Resend rejected the request: HTTP 422 — …` | `STORY_NOTIFICATION_FROM` address/domain is not verified in Resend. Use the sandbox sender for testing. |
| `Resend rejected the request: HTTP 401 — …` | `RESEND_API_KEY` is wrong or revoked. Create a new key. |
| Email sent but not received | Check spam; confirm `STORY_NOTIFICATION_EMAIL` is correct; check the Resend **Logs** dashboard for delivery status. |
| Duplicate submissions, no second e-mail | Intentional: identical submissions within 10 minutes are stored but do not re-notify. Use **Resend notification** in the admin panel if you need it again. |

The API key is only ever read in server code (`src/lib/email.ts` and the API
routes). It is never exposed to the browser — there is no
`NEXT_PUBLIC_` variable involved.

---

## Admin accounts

There is deliberately **no public registration**. Admin accounts are managed by
**Supabase Auth** and authorised by an allowlist:

1. Create the user in the Supabase dashboard (Authentication → Users).
2. Add the user's UUID to the `admin_users` table (SQL Editor).

Only allow-listed users can reach the admin panel. Passwords are never stored
by this application — Supabase Auth owns credentials and the session lives in
HTTP-only cookies. See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) steps 4–6.

All `/admin/*` routes are gated server-side — unauthenticated requests are
redirected to `/admin/login`. Every admin API route re-checks authentication and
the allowlist on the server, so the panel cannot be reached by manipulating the
client.

---

## Importing real photographs (manual workflow)

The site **never** invents, generates, or scrapes photographs of people. It
ships with **no stock portraits**. Every portrait must be imported manually and
verified before it is shown publicly.

Until a photograph is imported **and** verified, the site renders a neutral
placeholder (the person's initials on a plain background) — never another
person's photo and never a generated substitute.

### Rules enforced in code

1. **Originals are preserved** — imported files are copied, never cropped or
   re-encoded into a substitute.
2. **Descriptive, person-based filenames** — e.g. `amara-okafor.jpg`.
3. **Photographs are stored UNVERIFIED by default** and a placeholder is shown
   publicly until verification.
4. **Verification is a separate, explicit step** confirming (a) the photo is of
   the named person and (b) you have permission to publish it.
5. **Never associate a photo with a person unless verified.**

### Option A — Admin panel (recommended)

1. Go to **Admin → Stories → New / Edit**.
2. In the **Portrait** section, upload the person's photograph.
3. Tick the confirmation box that the photo is of this person and that you have
   permission to publish it.
4. Save. The photo now displays on the homepage, story cards, and story page.

There is also a dedicated **Portraits** panel for reviewing imports and the
founder photograph.

### Option B — Command line

```bash
# See available story slugs
npm run import-portrait -- --list-stories

# Import a photograph (stored UNVERIFIED — verify in the admin panel)
npm run import-portrait -- --story <slug> --file C:\photos\amara.jpg

# Import and mark verified in one step (only after confirming identity + permission)
npm run import-portrait -- --story <slug> --file ~/amara.jpg --verified \
  --note "Downloaded from the person's LinkedIn post; permission confirmed."

# Preview without writing anything
npm run import-portrait -- --story <slug> --file ~/amara.jpg --dry-run
```

Files land in `public/images/portraits/imported/`. See `public/images/CREDITS.md`
for provenance notes.

---

## Content & editorial policy

- The site **does not invent** founder identity, real stories, statistics, or
  legal text. Bundled example content is clearly labelled with a **"Sample"**
  badge and an `is_sample` flag.
- Founder details and legal pages start as **empty drafts** until real,
  approved content is entered via the admin panel.
- Every imported/submitted story must be **reviewed and confirmed by an admin**
  before it can be published.
- Legal copy (privacy, terms) ships with a **DRAFT** notice and should be
  reviewed by a lawyer before launch.

---

## Project structure

```
src/
  app/                 Public pages + admin panel + API routes
    (panel)/           Server-side auth-gated admin layout
    api/admin/         Authenticated admin API routes
  components/          UI components (public + admin)
  lib/                 Database, auth, repositories, sanitising, connectors
scripts/
  import-portrait.mjs  Manual photograph import (local portrait workflow)
supabase_setup.sql     Supabase schema, RLS policies and Storage bucket
SUPABASE_SETUP.md      Step-by-step Supabase connection guide
data/                  Local SQLite file + uploads (created automatically)
public/images/         Bundled editorial images + imported portraits
```

---

## Storage

- **Supabase (primary):** `stories`, `story_submissions`, `admin_users`, admin
  auth, and the public `story-images` Storage bucket. Run
  [`supabase_setup.sql`](./supabase_setup.sql) once in the SQL Editor.
- **Local SQLite:** site content, founder profile, categories, LinkedIn import
  history, rate limits and the activity log live in `data/whatsyourstory.db`
  (WAL mode), created automatically using Node's built-in `node:sqlite`.
- **Local uploads:** `data/uploads` by default; the founder portrait and
  CLI-imported photographs go to `public/images/portraits/imported/`.
