-- ============================================================================
--  What's Your Story — Supabase setup
-- ============================================================================
--  HOW TO RUN
--    1. Create a project at https://supabase.com
--    2. Open  SQL Editor → New query
--    3. Paste this WHOLE file and press "Run"
--
--  SAFE TO REVIEW AND RE-RUN
--   • No tables are dropped and no data is deleted.
--   • Tables use "create table if not exists".
--   • Policies are replaced ("drop policy if exists" affects ONLY access
--     rules, never rows).
--   • Bucket creation is idempotent.
--
--  This script creates everything the website needs:
--   • 3 tables:            stories, story_submissions, admin_users
--   • 1 helper function:   is_admin()   (recursion-safe admin check)
--   • Row Level Security + policies for every table
--   • 1 Storage bucket:    story-images (public read, admin write)
-- ============================================================================


-- ============================================================================
--  1. EXTENSIONS
-- ============================================================================
-- gen_random_uuid() is built into modern PostgreSQL (pgcrypto for older
-- projects). This is a no-op when the extension is already present.
create extension if not exists pgcrypto with schema extensions;


-- ============================================================================
--  2. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
--  stories
--  The published (and draft) stories shown on the public website.
--  Columns required by the website spec are listed first; the block after
--  "extra columns" keeps every feature of the existing site working
--  (SEO fields, author credit, portrait verification, samples, archiving).
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  slug                    text not null unique,
  person_name             text not null,
  excerpt                 text,
  content                 text,
  cover_image_url         text,
  category                text,
  source_linkedin_url     text,
  published_at            timestamptz,
  is_published            boolean not null default false,
  is_featured             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- ---- extra columns (preserve existing website features) ----
  image_alt               text,
  portrait_verified       boolean not null default false,
  is_sample               boolean not null default false,
  source_linkedin_post_id text,
  seo_title               text,
  seo_description         text,
  author_credit           text,
  is_archived             boolean not null default false  -- alongside is_published
);

-- ---------------------------------------------------------------------------
--  story_submissions
--  Stories sent in through the public /share form. They ALWAYS start life as
--  "pending_review" and can never publish themselves.
--  Extra columns keep the existing submission form (introduction, city,
--  LinkedIn URL, display permissions, consent records, reviewer notes).
-- ---------------------------------------------------------------------------
create table if not exists public.story_submissions (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  email                    text not null,
  title                    text not null,
  content                  text not null,
  consent_given            boolean not null default false,
  created_at               timestamptz not null default now(),
  status                   text not null default 'pending_review'
                             check (status in (
                               'pending_review',
                               'under_review',
                               'approved',
                               'rejected'
                             )),

  -- ---- extra columns (preserve existing website features) ----
  updated_at               timestamptz not null default now(),
  introduction             text,
  city                     text,
  linkedin_profile_url     text,
  category                 text,
  portrait_url             text,
  additional_message       text,
  allow_name_display       boolean not null default false,
  allow_portrait_display   boolean not null default false,
  consent_records          jsonb not null default '[]'::jsonb,
  reviewer_notes           text,
  linked_story_id          uuid references public.stories(id) on delete set null
);

-- ---------------------------------------------------------------------------
--  admin_users
--  A simple allowlist: a user may use the admin panel ONLY if their auth
--  user id appears here. There is no "admin_passwords" table — Supabase Auth
--  owns credentials.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);


-- ============================================================================
--  3. INDEXES
-- ============================================================================
create index if not exists stories_published_idx
  on public.stories (is_published, published_at desc);
create index if not exists stories_featured_idx
  on public.stories (is_featured) where is_published;
create index if not exists stories_category_idx
  on public.stories (category);
create index if not exists submissions_status_idx
  on public.story_submissions (status, created_at desc);


-- ============================================================================
--  4. updated_at TRIGGER
--  Keeps updated_at accurate on every write.
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

create or replace trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

create or replace trigger submissions_set_updated_at
  before update on public.story_submissions
  for each row execute function public.set_updated_at();


-- ============================================================================
--  5. ADMIN CHECK HELPER
--  SECURITY DEFINER lets the function read admin_users WITHOUT triggering
--  Row Level Security, which avoids the classic "infinite recursion detected
--  in policy" error. A fixed search_path prevents search-path hijacking.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;


-- ============================================================================
--  6. ROW LEVEL SECURITY
-- ============================================================================
alter table public.stories           enable row level security;
alter table public.story_submissions enable row level security;
alter table public.admin_users       enable row level security;

-- Table privileges. Only SELECT/INSERT/UPDATE/DELETE are granted — deliberately
-- NOT "all", because TRUNCATE is not governed by Row Level Security and must
-- never be available to an API role. RLS still decides which rows are visible.
grant select                 on public.stories to anon;
grant select, insert, update, delete on public.stories to authenticated;

grant insert                 on public.story_submissions to anon;
grant select, insert, update, delete on public.story_submissions to authenticated;

-- admin_users is intentionally NOT granted to any API role: it is only ever
-- read through the SECURITY DEFINER function public.is_admin().

-- ---------------------------------------------------------------------------
--  6a. stories policies
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read published stories" on public.stories;
create policy "Public can read published stories"
  on public.stories for select
  to anon, authenticated
  using (is_published = true and is_archived = false);

drop policy if exists "Admins manage stories" on public.stories;
create policy "Admins manage stories"
  on public.stories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  6b. story_submissions policies
-- ---------------------------------------------------------------------------
-- The public may only INSERT, and only as a fresh, consented, unpublished
-- submission. They can never read, edit or delete submissions.
drop policy if exists "Anyone may submit a story" on public.story_submissions;
create policy "Anyone may submit a story"
  on public.story_submissions for insert
  to anon, authenticated
  with check (
    status = 'pending_review'
    and consent_given = true
    and (reviewer_notes is null or reviewer_notes = '')
    and linked_story_id is null
  );

drop policy if exists "Admins manage submissions" on public.story_submissions;
create policy "Admins manage submissions"
  on public.story_submissions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  6c. admin_users policies
-- ---------------------------------------------------------------------------
-- Deliberately NO policies: nobody can read or write this table directly.
-- The allowlist is only ever consulted through public.is_admin(), and admins
-- are added manually in the SQL editor (see SUPABASE_SETUP.md). This makes
-- self-promotion impossible.
--
-- If you later want signed-in admins to be able to read the allowlist:
--   create policy "Admins read admin list" on public.admin_users
--     for select to authenticated using (public.is_admin());


-- ============================================================================
--  7. STORAGE — story cover images
-- ============================================================================
-- One public bucket for story cover photographs.
insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', true)
on conflict (id) do update set public = true;

-- Anyone may VIEW a story image (images are embedded in public pages).
drop policy if exists "Story images are publicly readable" on storage.objects;
create policy "Story images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'story-images');

-- Only administrators may upload, replace or delete story images.
drop policy if exists "Admins can upload story images" on storage.objects;
create policy "Admins can upload story images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'story-images' and public.is_admin());

drop policy if exists "Admins can update story images" on storage.objects;
create policy "Admins can update story images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'story-images' and public.is_admin())
  with check (bucket_id = 'story-images' and public.is_admin());

drop policy if exists "Admins can delete story images" on storage.objects;
create policy "Admins can delete story images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'story-images' and public.is_admin());


-- ============================================================================
--  DONE
--  Next: SUPABASE_SETUP.md — create an admin user and add them to
--  admin_users, then copy the project URL + publishable key into .env.local.
-- ============================================================================
