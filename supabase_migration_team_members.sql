-- ============================================================================
--  What's Your Story — Core Team migration
--  Adds the `team_members` table so administrators can manage the public
--  /core-team page from the admin panel without editing source code.
-- ============================================================================
--  HOW TO RUN
--    1. Open your Supabase project → SQL Editor → New query
--    2. Paste this WHOLE file and press "Run"
--    3. No existing tables, rows, or policies are affected.
--
--  SAFE TO RE-RUN
--   • "create table if not exists" — no-op when the table already exists.
--   • "drop policy if exists" — affects only access rules, never rows.
--   • "create or replace trigger" — idempotent.
-- ============================================================================


-- ============================================================================
--  1. TABLE
-- ============================================================================

-- ---------------------------------------------------------------------------
--  team_members
--  One row per team member. Admins manage these; the public page reads only
--  rows where is_published = true, ordered by display_order ASC.
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null default '',
  bio           text not null default '',
  image_url     text not null default '',
  image_alt     text not null default '',
  linkedin_url  text not null default '',
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ============================================================================
--  2. INDEXES
-- ============================================================================
create index if not exists team_members_published_order_idx
  on public.team_members (is_published, display_order);

create index if not exists team_members_created_idx
  on public.team_members (created_at desc);


-- ============================================================================
--  3. updated_at TRIGGER
--  Reuses public.set_updated_at() from supabase_setup.sql (already present).
-- ============================================================================
create or replace trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();


-- ============================================================================
--  4. ROW LEVEL SECURITY
-- ============================================================================
alter table public.team_members enable row level security;

-- Anonymous visitors may SELECT only published members.
grant select on public.team_members to anon;
-- Authenticated users (admins) get full DML access; RLS still applies.
grant select, insert, update, delete on public.team_members to authenticated;

-- Public read: only published members are visible.
drop policy if exists "Public can read published team members" on public.team_members;
create policy "Public can read published team members"
  on public.team_members for select
  to anon, authenticated
  using (is_published = true);

-- Admin full access (uses the existing is_admin() SECURITY DEFINER function).
drop policy if exists "Admins manage team members" on public.team_members;
create policy "Admins manage team members"
  on public.team_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
--  STORAGE
--  No new bucket is required. Team member portraits are stored under team/
--  inside the existing public `story-images` bucket. The existing admin
--  upload/delete policies from supabase_setup.sql already cover every object
--  in that bucket (bucket_id = 'story-images' AND is_admin()).
-- ============================================================================


-- ============================================================================
--  DONE
--  After running this script:
--    1. Add the first team members through Admin → Core Team.
--    2. The /core-team public page will display all published members.
-- ============================================================================
