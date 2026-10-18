# Supabase setup

This guide connects the **What's Your Story** website to Supabase. Follow the
steps **in order**. Anything you must run yourself is marked clearly — the
website never creates tables, buckets or admins on its own.

> **What Supabase stores:** story text/metadata, submissions, cover images
> (Storage bucket `story-images`) and admin accounts (Auth).
>
> **What stays local:** site content, the founder profile, categories, LinkedIn
> import history, rate-limit counters and the activity log (a small local
> SQLite database). These features are outside the scope of this integration,
> so both data stores run side by side. Story and submission *content* is
> always read from and written to Supabase.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Choose an organization, a name and a strong database password (store it in
   a password manager — you will not need it for this app, but never lose it).
3. Pick a region close to your users and wait for provisioning to finish.

---

## 2. Open the SQL Editor

In the left sidebar, click **SQL Editor** → **New query**.

---

## 3. Review and run `supabase_setup.sql`

1. Open the file [`supabase_setup.sql`](./supabase_setup.sql) in this project
   and read it. It is written to be reviewed.
2. Copy the **entire** file into the SQL editor and press **Run**.

It creates:

| Object | Purpose |
| --- | --- |
| `public.stories` | published + draft stories (plus extra columns the site uses) |
| `public.story_submissions` | public submissions, always starting at `pending_review` |
| `public.admin_users` | allowlist of admin user IDs |
| `public.is_admin()` | recursion-safe admin check (SECURITY DEFINER) |
| RLS policies | public reads only published stories; admins manage everything |
| `story-images` bucket | public read, admin-only write |

It performs **no destructive operations**: no tables are dropped and no data is
deleted. It is safe to run again later — only policies are replaced.

---

## 4. Create your admin user in Supabase Auth

1. Sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the email and a strong password.
3. Tick **Auto Confirm User** so the account can sign in immediately.
4. Click **Create user**.

There is no public sign-up page: admin accounts exist only here.

---

## 5. Copy the new user's UUID

In **Authentication → Users**, click your new user and copy the **User UID**
(the long UUID at the top, e.g. `11111111-1111-1111-1111-111111111111`).

---

## 6. Add the UUID to the `admin_users` allowlist

Back in **SQL Editor**, run this (replace the placeholder with the UUID you
copied in step 5):

```sql
insert into public.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000000')  -- <-- paste the admin UUID
on conflict (user_id) do nothing;
```

Signing in succeeds only for users listed here. Nobody can add themselves from
the website.

---

## 7. Create your local `.env.local`

1. In **Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (or **anon public** key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Copy `.env.example` to `.env.local` and fill in those two values.
   Never commit `.env.local`. **Never** use the `service_role` key in this app.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-or-anon-key>
SITE_URL=http://localhost:3000
```

---

## 8. Upload cover images (optional)

Cover images can be uploaded from the admin panel (**Portraits** →
choose a story → upload). Files are validated (JPEG/PNG/WebP by content) and
stored in the public `story-images` bucket; only allow-listed admins may
upload or delete.

You can also upload manually via **Storage → story-images → Upload file**, then
paste the public URL into a story's `cover_image_url` in the Table Editor.
Images are only shown publicly once the story is published **and** the
photograph is marked verified.

---

## 9. Run the site locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

---

## 10. Sign in and test

1. Go to <http://localhost:3000/admin/login> and sign in with the admin
   account from step 4.
2. Create a story, optionally attach a cover image, then publish it.
3. Visit `/stories` and confirm it appears.
4. Submit the public form at `/share` and confirm the entry shows up under
   **Admin → Submissions** as *Pending review*.

---

## Example SQL (handy snippets)

```sql
-- Add another admin (find the UUID in Authentication → Users):
insert into public.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;

-- List admins:
select user_id, created_at from public.admin_users order by created_at;

-- Check published stories:
select title, slug, category, published_at
from public.stories
where is_published = true and is_archived = false
order by published_at desc nulls last;

-- Check pending submissions:
select name, email, title, status, created_at
from public.story_submissions
where status = 'pending_review'
order by created_at desc;
```

---

## Testing checklist

Code and SQL are complete. The tests below require a configured Supabase
project (steps 1–7) — run them after step 7. Items 1–6 work with only the
`.env.local` values; the rest also need an admin account.

| # | Check | How |
| --- | --- | --- |
| 1 | Build passes | `npm run build` |
| 2 | Types pass | `npm run typecheck` |
| 3 | Lint passes | `npm run lint` |
| 4 | Public site loads | open `/` — no error, empty state if no stories |
| 5 | Public list loads | open `/stories` |
| 6 | Public form loads | open `/share` |
| 7 | Admin sign-in works | `/admin/login` with your admin account |
| 8 | Non-admin is rejected | sign in with an account **not** in `admin_users` |
| 9 | Create + publish a story | Admin → Stories → New → Publish; appears on `/stories` |
| 10 | Story page renders | open `/stories/<slug>` — title, person, body, cover |
| 11 | Cover upload works | Admin → Portraits → upload; image appears in `story-images` |
| 12 | Public submission works | submit at `/share`; appears under Admin → Submissions as *Pending review* |
| 13 | Submission status change | set a submission to *Rejected*; status persists |
| 14 | RLS blocks the public | with the anon key, a direct `stories` write and any `story_submissions` read must fail |

If Supabase is not configured, the public pages render empty (no crash) and the
admin login reports that Supabase is not configured — that is expected.

---

## Security notes

- The browser never receives the service-role key. All access uses the
  publishable/anon key with Row Level Security enforced server-side.
- The public anon role can read **only** published, non-archived stories and
  may **only** insert submissions whose `status` is `pending_review` and whose
  consent flag is true.
- `admin_users` has **no** policies, so it cannot be read or written through
  the API at all — admins are added manually in the SQL editor. Admin checks go
  through `public.is_admin()`, which is `SECURITY DEFINER` with a fixed
  `search_path` to avoid recursion and search-path attacks.
- The four submission statuses are enforced by a database `CHECK` constraint:
  `pending_review`, `under_review`, `approved`, `rejected`.

---

## Adjustments to the existing site

The site was **not** rebuilt; its repository layer now talks to Supabase. A few
deliberate choices keep every existing feature while matching the required
schema:

1. **Extra columns.** Beyond the required columns, `stories` keeps
   `image_alt`, `portrait_verified`, `is_sample`, `source_linkedin_post_id`,
   `seo_title`, `seo_description`, `author_credit` and `is_archived`;
   `story_submissions` keeps `updated_at`, `introduction`, `city`,
   `linkedin_profile_url`, `category`, `portrait_url`, `additional_message`,
   `allow_name_display`, `allow_portrait_display`, `consent_records`,
   `reviewer_notes` and `linked_story_id`.
2. **Submission statuses trimmed to four.** The previous app also had
   *Needs revision* and *Archived*. The database constraint allows exactly the
   four required values, so those two options were removed from the admin UI.
3. **`is_published` + `is_archived`.** The app's `draft / published / archived`
   status maps onto these two columns; ordering and "featured new stories"
   behaviour is unchanged.
4. **Category.** Stories store the category **name** in `category` (as
   required); the app resolves the local category id/slug from it so the admin
   editor and filters keep working.
5. **Two data stores.** Local SQLite still serves site content, the founder
   profile, categories, LinkedIn imports, rate limits and the activity log.
6. **Sample stories are no longer auto-seeded** into SQLite. Everything now
   lives in Supabase, so create real content via the admin panel. Starter
   *categories* are still seeded locally.
7. **Admin accounts** are created in Supabase (steps 4–6). The old
   `npm run create-admin` script and `AUTH_SECRET` / `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` variables are obsolete.
