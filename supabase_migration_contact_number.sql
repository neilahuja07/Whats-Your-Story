-- ============================================================
--  Migration: add contact_number to story_submissions
--  Run this manually in the Supabase SQL Editor.
--
--  Non-destructive: adds ONE nullable column. No existing rows,
--  columns, ids, timestamps, statuses or policies are changed.
-- ============================================================

alter table public.story_submissions
  add column if not exists contact_number text;
