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
