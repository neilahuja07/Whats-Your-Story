-- ============================================================================
--  What's Your Story — persistence migration
--  Moves the last local-filesystem (SQLite) tables into Supabase Postgres so
--  the site runs on serverless hosts (Vercel) with no local data directory.
-- ============================================================================
--  HOW TO RUN
--    Open your Supabase project → SQL Editor → New query, paste this WHOLE
--    file and press "Run". Run supabase_migration_contact_number.sql FIRST if
--    you have not already.
--
--  SAFE TO REVIEW AND RE-RUN
--   • No tables are dropped and no data is deleted.
--   • Tables use "create table if not exists"; policies are replaced
--     ("drop policy if exists" affects ONLY access rules, never rows).
--   • RPC functions are "create or replace".
--   • No seed rows are inserted — the existing site content, founder profile
--     and collage selection are carried over by
--     supabase_migration_local_data.sql (generated from the local database).
--
--  WHAT THIS CREATES
--   • 8 tables:  site_content, founder_profile, categories, activity_log,
--                portrait_imports, collage_portraits, submission_notifications,
--                rate_limits
--   • 5 RPCs:    bump_rate_limit, rate_limit_count, clear_rate_limit,
--                record_submission_notification, recent_notification_sent
--                (SECURITY DEFINER — the rate limiter and notification log
--                 are only ever touched through these functions)
--   • updated_at triggers (reusing public.set_updated_at from supabase_setup.sql)
--   • Row Level Security + policies for every table, reusing public.is_admin()
--
--  STORAGE: no new bucket is required. Story portraits (stories/<id>/…),
--  collage portraits (collage/…) and the founder portrait (founder/…) all
--  live in the existing public `story-images` bucket, whose policies from
--  supabase_setup.sql already cover every object in it.
-- ============================================================================


-- ============================================================================
--  0. updated_at TRIGGER HELPER
--  Same function as in supabase_setup.sql; re-declared here so this file is
--  self-contained. "create or replace" is a no-op when it already exists.
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
--  1. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
--  site_content — key/value store for editable public-page copy.
--  The application falls back to its built-in defaults for any missing key.
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  key        text primary key,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  founder_profile — the single founder row (id is always 1).
-- ---------------------------------------------------------------------------
create table if not exists public.founder_profile (
  id                smallint primary key default 1 check (id = 1),
  name              text not null default '',
  role              text not null default '',
  biography         text not null default '',
  portrait_url      text not null default '',
  portrait_verified boolean not null default false,
  vision            text not null default '',
  motivation        text not null default '',
  is_draft          boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  categories — reference data for the admin editor / story metadata.
--  Story and submission rows store the category NAME; this table supplies the
--  id/name mapping for the editors.
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text not null default ''
);

-- ---------------------------------------------------------------------------
--  activity_log — editorial audit trail shown on the admin dashboard.
--  Admin ids are Supabase Auth user UUIDs; the e-mail is denormalised at
--  write time so the dashboard never needs access to auth.users.
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid,
  admin_email text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  portrait_imports — audit entries for imported photographs.
--  story_id references the Supabase stories table (nullable: a photograph can
--  be imported before it is attached to a story). Deleting a story keeps the
--  audit row but clears the link.
-- ---------------------------------------------------------------------------
create table if not exists public.portrait_imports (
  id            uuid primary key default gen_random_uuid(),
  story_id      uuid references public.stories(id) on delete set null,
  file_name     text not null,
  original_name text not null default '',
  source_note   text not null default '',
  person_match  text not null default 'unconfirmed'
                check (person_match in ('confirmed', 'unconfirmed')),
  permission_ok boolean not null default false,
  imported_by   text not null default '',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  collage_portraits — metadata for the homepage hero collage. The image
--  files live in the `story-images` Storage bucket under collage/.
--  At most 30 portraits may be enabled for the homepage at once (enforced in
--  application code, as before).
-- ---------------------------------------------------------------------------
create table if not exists public.collage_portraits (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,
  url           text not null,
  original_name text not null default '',
  verified      boolean not null default false,
  enabled       boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  submission_notifications — delivery log for the admin notification
--  e-mails (Resend). A failed send can be retried from the admin panel.
--  Deleting a submission removes its delivery log entry.
-- ---------------------------------------------------------------------------
create table if not exists public.submission_notifications (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique
                references public.story_submissions(id) on delete cascade,
  fingerprint   text not null,
  status        text not null default 'pending'
                check (status in ('sent', 'failed', 'skipped', 'pending')),
  error         text not null default '',
  attempts      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  rate_limits — brute-force / spam counters (login attempts, submissions).
--  RPC-ONLY: row level security is enabled with NO policies and NO table
--  grants, so the API roles can never read or write it directly. All access
--  goes through the SECURITY DEFINER functions in section 3.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start text not null, -- ISO-8601 UTC string, as produced by the app
  count        integer not null default 0,
  primary key (bucket, window_start)
);


-- ============================================================================
--  2. INDEXES + updated_at TRIGGERS
-- ============================================================================
create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);
create index if not exists portrait_imports_story_idx
  on public.portrait_imports (story_id);
create index if not exists collage_portraits_order_idx
  on public.collage_portraits (sort_order);
create index if not exists submission_notifications_fingerprint_idx
  on public.submission_notifications (fingerprint);

create or replace trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

create or replace trigger founder_profile_set_updated_at
  before update on public.founder_profile
  for each row execute function public.set_updated_at();

create or replace trigger collage_portraits_set_updated_at
  before update on public.collage_portraits
  for each row execute function public.set_updated_at();

create or replace trigger submission_notifications_set_updated_at
  before update on public.submission_notifications
  for each row execute function public.set_updated_at();


-- ============================================================================
--  3. RPCs (SECURITY DEFINER)
--  The rate limiter and the notification log replace the old local SQLite
--  tables. SECURITY DEFINER lets these functions work for ANON callers
--  (public submission form, pre-authentication login) while the underlying
--  tables stay unreachable through the data API. A fixed search_path
--  prevents search-path hijacking.
-- ============================================================================

-- Increment a bucket's counter for the current window and return the NEW
-- count. Callers compare it against their limit: allowed when count <= limit.
create or replace function public.bump_rate_limit(
  p_bucket       text,
  p_window_start text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, p_window_start, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

-- Read a bucket's current counter WITHOUT consuming an attempt.
create or replace function public.rate_limit_count(
  p_bucket       text,
  p_window_start text
)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select count from public.rate_limits
      where bucket = p_bucket and window_start = p_window_start),
    0
  );
$$;

-- Clear one bucket's failure history, and prune windows older than the
-- given ISO timestamp (best-effort housekeeping, as the old code did).
create or replace function public.clear_rate_limit(
  p_bucket     text,
  p_older_than text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits
  where bucket = p_bucket or window_start < p_older_than;
$$;

-- Record (or update) the delivery outcome of one submission's notification
-- e-mail. Attempts are incremented on every call, matching the old
-- INSERT … ON CONFLICT behaviour exactly. Errors are capped at 1000 chars.
create or replace function public.record_submission_notification(
  p_submission_id uuid,
  p_fingerprint   text,
  p_status        text,
  p_error         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.submission_notifications
    (submission_id, fingerprint, status, error, attempts)
  values
    (p_submission_id, p_fingerprint, p_status, left(coalesce(p_error, ''), 1000), 1)
  on conflict (submission_id) do update set
    status     = excluded.status,
    error      = excluded.error,
    attempts   = public.submission_notifications.attempts + 1,
    updated_at = now();
end;
$$;

-- True when an identical submission already produced a SENT notification
-- since the given timestamp (duplicate-submission e-mail suppression).
create or replace function public.recent_notification_sent(
  p_fingerprint text,
  p_since       timestamptz
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.submission_notifications
    where fingerprint = p_fingerprint
      and status = 'sent'
      and updated_at >= p_since
  );
$$;

grant execute on function public.bump_rate_limit(text, text)      to anon, authenticated;
grant execute on function public.rate_limit_count(text, text)     to anon, authenticated;
grant execute on function public.clear_rate_limit(text, text)     to anon, authenticated;
grant execute on function public.record_submission_notification(uuid, text, text, text)
  to anon, authenticated;
grant execute on function public.recent_notification_sent(text, timestamptz)
  to anon, authenticated;


-- ============================================================================
--  4. ROW LEVEL SECURITY
-- ============================================================================
alter table public.site_content             enable row level security;
alter table public.founder_profile          enable row level security;
alter table public.categories               enable row level security;
alter table public.activity_log             enable row level security;
alter table public.portrait_imports         enable row level security;
alter table public.collage_portraits        enable row level security;
alter table public.submission_notifications enable row level security;
alter table public.rate_limits              enable row level security;

-- Table privileges. Only SELECT/INSERT/UPDATE/DELETE are granted — deliberately
-- NOT "all" (TRUNCATE is not governed by RLS). rate_limits is intentionally
-- NOT granted to any API role at all: it is only reachable through the RPCs.
grant select                 on public.site_content to anon;
grant select, insert, update, delete on public.site_content to authenticated;

grant select                 on public.founder_profile to anon;
grant select, insert, update, delete on public.founder_profile to authenticated;

grant select                 on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;

grant select, insert, update, delete on public.activity_log to authenticated;

grant select, insert, update, delete on public.portrait_imports to authenticated;

grant select                 on public.collage_portraits to anon;
grant select, insert, update, delete on public.collage_portraits to authenticated;

grant select, insert, update, delete on public.submission_notifications to authenticated;

-- ---------------------------------------------------------------------------
--  4a. site_content policies
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content"
  on public.site_content for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4b. founder_profile policies
--  The public read policy exposes the row to anonymous visitors; the public
--  pages only render it once it is no longer a draft (application logic,
--  exactly as before).
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read founder profile" on public.founder_profile;
create policy "Public can read founder profile"
  on public.founder_profile for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage founder profile" on public.founder_profile;
create policy "Admins manage founder profile"
  on public.founder_profile for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4c. categories policies
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4d. activity_log policies — administrators only (no public read).
-- ---------------------------------------------------------------------------
drop policy if exists "Admins manage activity log" on public.activity_log;
create policy "Admins manage activity log"
  on public.activity_log for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4e. portrait_imports policies — administrators only.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins manage portrait imports" on public.portrait_imports;
create policy "Admins manage portrait imports"
  on public.portrait_imports for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4f. collage_portraits policies
--  The public may read the metadata (the homepage shows only the rows the
--  application filters to: verified AND enabled); only admins write.
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read collage portraits" on public.collage_portraits;
create policy "Public can read collage portraits"
  on public.collage_portraits for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage collage portraits" on public.collage_portraits;
create policy "Admins manage collage portraits"
  on public.collage_portraits for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4g. submission_notifications policies — administrators only.
--  (Anonymous writes happen exclusively through the SECURITY DEFINER RPCs.)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins manage notification log" on public.submission_notifications;
create policy "Admins manage notification log"
  on public.submission_notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  4h. rate_limits — deliberately NO policies and NO grants.
--  Only the SECURITY DEFINER functions in section 3 can touch it.
-- ---------------------------------------------------------------------------


-- ============================================================================
--  DONE
--  Next: run supabase_migration_local_data.sql to carry over the existing
--  site content, founder profile, categories, collage selection, portrait
--  imports, activity log and notification log from the local database.
-- ============================================================================
