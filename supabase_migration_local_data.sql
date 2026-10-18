-- ============================================================
--  What's Your Story — local data carry-over (generated)
--
--  Generated from the local development database
--  (data/whatsyourstory.db) so the Supabase deployment keeps the
--  existing site content, founder profile, categories, homepage
--  collage selection, portrait-import audit entries, activity log
--  and notification log.
--
--  HOW TO RUN
--    Supabase project → SQL Editor → New query, paste this file, Run.
--    Run supabase_migration_persistence.sql FIRST (it creates the tables),
--    and supabase_migration_contact_number.sql before that.
--
--  SAFE TO RE-RUN
--    Every insert uses "on conflict do nothing": rows that already exist
--    (same primary key) are skipped, nothing is ever overwritten or
--    deleted, and each guarded insert only applies when its referenced
--    row exists. No SQL in this file is destructive.
--
--  NOT INCLUDED (by design)
--    • stories / story_submissions — these already live in Supabase.
--      The local copies are the pre-migration originals.
--    • admins / sessions — replaced by Supabase Auth + admin_users.
--    • rate_limits — short-lived per-hour/per-15-minute counters.
-- ============================================================

begin;

-- ----------------------------------------------------------------
--  categories (7 rows)
-- ----------------------------------------------------------------
insert into public.categories (id, name, slug, description) values ('e3e805cc-0b89-405b-ab8d-a7f3e6053172', 'Craft & Vocation', 'craft-vocation', 'Stories about work and mastery.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('96cabd9c-7611-4f8b-8efe-16110b005f3c', 'Everyday Lives', 'everyday-lives', 'Stories from ordinary days.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('17adb27a-4d04-47f6-b3aa-c16aa3d881f2', 'Family & Memory', 'family-memory', 'Stories about generations and inheritance.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('eafbbad4-5c06-4f5d-a2e4-aa992706b77e', 'Journeys', 'journeys', 'Stories about leaving, arriving, and belonging.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('fa797b34-b52f-447a-92c0-66e998efcf74', 'New Beginnings', 'new-beginnings', 'Stories about starting again.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('13be4de3-2dcd-4a76-b670-7c6837184afa', 'Resilience', 'resilience', 'Stories about enduring hardship.') on conflict do nothing;
insert into public.categories (id, name, slug, description) values ('802ab6d0-831e-415d-a584-3af2e0e5e4fa', 'Test Category', 'test-category', '') on conflict do nothing;

-- ----------------------------------------------------------------
--  site_content (15 rows)
-- ----------------------------------------------------------------
insert into public.site_content (key, content, updated_at) values ('about.page_body', 'What''s Your Story is a storytelling initiative with a simple belief: behind every face is a journey worth hearing.

We publish real-life stories about people — their experiences, struggles, achievements, personal journeys, and moments that deserve to be heard. Every story we share is submitted by an individual and reviewed by our editorial team before publication.

We are not interested in spectacle. We are interested in truth: the quiet courage of ordinary people, the turning points that reshape a life, and the lessons that only come from lived experience.

Every story published here belongs to the person who lived it. We publish only with their knowledge and permission.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('about.vision', 'A world where no meaningful human experience goes unheard — and where reading someone''s story makes the world feel a little smaller, and a little kinder.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('contact.email', '', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('footer.description', 'What''s Your Story publishes real-life stories about people, their experiences, struggles, and triumphs. The voice of untold stories.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('home.about_body', 'What''s Your Story exists because we believe every individual carries a story worth hearing. The quiet ones. The difficult ones. The ones that changed a life.

Personal experiences, honestly told, can inspire someone standing at the same crossroads years later. They create understanding where there was once distance, and connection where there was once silence.

This platform is a place for untold stories to be heard — told with dignity, published with care, and shared with the world.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('home.about_heading', 'Why We Exist', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('home.headline', 'Every Life Has A Story Worth Telling.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('home.supporting_text', 'Behind every face is a journey. Discover the experiences, struggles, and triumphs that remind us what it means to be human.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('privacy.page_body', 'DRAFT — requires legal review before launch.

We collect the personal information you choose to share when you submit a story, including your name, email address, and the content of your submission. We use this information only to review your submission and contact you about it.

We do not publish submitted stories automatically. A story becomes public only after our editorial team has reviewed it and confirmed the necessary permissions with you.

You may request access to, correction of, or deletion of your submission at any time by contacting us.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('share.consent_text', 'I confirm that I have the right to submit this story and its contents, and I agree that What''s Your Story may review my submission and contact me about it. I understand that submitting a story does not automatically publish it or grant permission for public publication.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('share.page_intro', 'Your story matters. If you have lived something — a struggle, a turning point, an achievement, a quiet journey — and believe it could mean something to someone else, we would be honoured to read it.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('site.meta_description', 'Discover real-life stories about people, their experiences, struggles, achievements, and personal journeys. Share your own story with What''s Your Story.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('site.meta_title', 'What''s Your Story — The Voice of Untold Stories', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('social.linkedin_url', 'https://www.linkedin.com/company/whatsyourstoryy/', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;
insert into public.site_content (key, content, updated_at) values ('terms.page_body', 'DRAFT — requires legal review before launch.

By submitting a story to What''s Your Story you confirm that you have the right to share the content you are submitting and that it does not infringe the rights of others.

Submission does not guarantee publication. Our editorial team reviews every submission and decides whether to publish it.

We will contact you before publishing your story and will confirm the permissions required to display your name, photograph, and story.', '2026-10-17T17:49:45.618Z'::timestamptz) on conflict do nothing;

-- ----------------------------------------------------------------
--  founder_profile (1 row)
-- ----------------------------------------------------------------
insert into public.founder_profile (id, name, role, biography, portrait_url, portrait_verified, vision, motivation, is_draft, updated_at) values (1, 'Manan Ahuja', 'Founder', 'hiii ', '/images/portraits/imported/founder.png', true, '', '', false, '2026-10-18T15:29:26.854Z'::timestamptz) on conflict do nothing;

-- ----------------------------------------------------------------
--  collage_portraits (4 rows)
--  The image files themselves are already in Supabase Storage
--  (bucket story-images, folder collage/).
-- ----------------------------------------------------------------
insert into public.collage_portraits (id, storage_path, url, original_name, verified, enabled, sort_order, created_at, updated_at) values ('63770945-4244-43a2-a90d-2570b5e2f471', 'collage/453ee1b0-7ecb-47b9-89cb-52d0a819f4be-1791085819172.jpg', 'https://qxbqaljzguuhjftpbsib.supabase.co/storage/v1/object/public/story-images/collage/453ee1b0-7ecb-47b9-89cb-52d0a819f4be-1791085819172.jpg', '1791085819172.jpg', true, true, 0, '2026-10-18T08:43:10.272Z'::timestamptz, '2026-10-18T08:44:38.238Z'::timestamptz) on conflict do nothing;
insert into public.collage_portraits (id, storage_path, url, original_name, verified, enabled, sort_order, created_at, updated_at) values ('8a0039f1-f231-407a-996c-a88c22f7360f', 'collage/ccf61dd9-bc3d-4e3f-81ec-52f18c13908a-1792211400614.jpg', 'https://qxbqaljzguuhjftpbsib.supabase.co/storage/v1/object/public/story-images/collage/ccf61dd9-bc3d-4e3f-81ec-52f18c13908a-1792211400614.jpg', '1792211400614.jpg', true, true, 1, '2026-10-18T08:43:10.431Z'::timestamptz, '2026-10-18T08:44:41.201Z'::timestamptz) on conflict do nothing;
insert into public.collage_portraits (id, storage_path, url, original_name, verified, enabled, sort_order, created_at, updated_at) values ('7008ddfe-ff8c-4715-9f66-51003d6c34ab', 'collage/29fe62ae-fd51-407c-8a5c-ad5da64e7cbe-screenshot-2026-10-17-232203.png', 'https://qxbqaljzguuhjftpbsib.supabase.co/storage/v1/object/public/story-images/collage/29fe62ae-fd51-407c-8a5c-ad5da64e7cbe-screenshot-2026-10-17-232203.png', 'Screenshot 2026-10-17 232203.png', true, true, 2, '2026-10-18T08:43:10.783Z'::timestamptz, '2026-10-18T08:44:42.644Z'::timestamptz) on conflict do nothing;
insert into public.collage_portraits (id, storage_path, url, original_name, verified, enabled, sort_order, created_at, updated_at) values ('7c7454b5-abb4-4c9a-82ad-c1c804f066d7', 'collage/c7f995c0-c781-41af-ac6c-20be2238a62c-screenshot-2026-10-17-205640.png', 'https://qxbqaljzguuhjftpbsib.supabase.co/storage/v1/object/public/story-images/collage/c7f995c0-c781-41af-ac6c-20be2238a62c-screenshot-2026-10-17-205640.png', 'Screenshot 2026-10-17 205640.png', true, true, 3, '2026-10-18T08:43:11.193Z'::timestamptz, '2026-10-18T08:44:44.296Z'::timestamptz) on conflict do nothing;

-- ----------------------------------------------------------------
--  portrait_imports (5 rows)
--  story_id is intentionally NULL: the local ids belong to the old
--  SQLite stories table, not to Supabase. The original story id is
--  preserved in source_note where one was recorded.
-- ----------------------------------------------------------------
insert into public.portrait_imports (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at) values ('f41a9152-d796-460d-9bc1-f11acd7b3c06', null, 'jane-audit.jpg', 'test-portrait.jpg', 'audit verification test | [story:e5add891-5c34-4659-8b8b-d7e1fc2e39c9]', 'confirmed', true, 'audit@test.local', '2026-10-17T12:37:50.492Z'::timestamptz) on conflict do nothing;
insert into public.portrait_imports (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at) values ('dd98a79b-1f82-4836-ac51-a845706f4de9', null, 'founder.png', 'Screenshot 2026-10-17 205640.png', '', 'unconfirmed', false, 'mananahuja2018@gmail.com', '2026-10-17T17:37:00.808Z'::timestamptz) on conflict do nothing;
insert into public.portrait_imports (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at) values ('f734e318-3ac3-480b-a2fd-10b9618b763a', null, 'stories/cada8271-aac7-4535-a396-77c9b6606aaf/amrita-mukherjee.png', 'Screenshot 2026-10-17 232203.png', '[story:cada8271-aac7-4535-a396-77c9b6606aaf]', 'unconfirmed', false, 'mananahuja2018@gmail.com', '2026-10-17T17:53:14.297Z'::timestamptz) on conflict do nothing;
insert into public.portrait_imports (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at) values ('85245943-5d81-496a-be6b-dbc2d284b7cf', null, 'stories/eed164d1-9957-4c32-9b6f-1e4ed0af198f/dr-jamuna-ravi.jpg', '1792211400614.jpg', '[story:eed164d1-9957-4c32-9b6f-1e4ed0af198f]', 'unconfirmed', false, 'mananahuja2018@gmail.com', '2026-10-17T17:56:51.487Z'::timestamptz) on conflict do nothing;
insert into public.portrait_imports (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at) values ('3497b030-275f-4ba0-a554-29d5e2b25e27', null, 'udaya-agarwal.jpg', '1791085819172.jpg', '', 'unconfirmed', false, 'mananahuja2018@gmail.com', '2026-10-17T18:01:40.903Z'::timestamptz) on conflict do nothing;

-- ----------------------------------------------------------------
--  activity_log (45 rows)
--  admin_id is NULL (the old local admin ids do not exist in
--  Supabase Auth); the admin e-mail is kept on each row.
-- ----------------------------------------------------------------
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('5acb0f99-6cd8-45c7-9418-8b960e9a7f4c', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T12:35:21.732Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('838c3d79-aaff-49be-b298-6a3252911572', null, 'audit@test.local', 'story.created', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:36:41.738Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('c35cc9a1-dfa2-49e9-ae0c-ee13be77694b', null, 'audit@test.local', 'portrait.imported', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:37:50.496Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('b6e195e9-2162-454f-a8cb-eaaca23c6c0e', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T12:45:33.518Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('72453631-2cdf-4078-9220-2bc8226d0e3c', null, 'audit@test.local', 'story.updated', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:45:34.263Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('0047e84c-0442-471e-b932-ebbb3ba843ca', null, 'audit@test.local', 'story.unfeatured', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:45:34.311Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('71e4a5b9-ec13-4e6c-9f10-5022b9d163d1', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T12:45:58.420Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('a801fa0b-6f5e-48f5-b53d-642d1760e80e', null, 'audit@test.local', 'portrait.verified', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:46:00.130Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('4bb10c27-d982-4076-88c3-f1a08a1b5793', null, 'audit@test.local', 'story.published', 'story', 'e5add891-5c34-4659-8b8b-d7e1fc2e39c9', '2026-10-17T12:46:00.274Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('607ea1ca-1a71-470c-8888-f49757a4aa33', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:21:44.512Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('c529aad5-e25e-40c4-a656-b25f606721ec', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:36:24.007Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('ab6775aa-eb94-4681-9342-21188df3728f', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:36:24.069Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('eb24928b-1f1c-46ea-b303-e0b2e9bbf585', null, 'audit@test.local', 'admin.logout', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:36:27.503Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('4cdeada5-6a50-40dc-aac9-42b9fe4f1c98', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:36:27.630Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('5082c0ff-67ff-43d3-a55f-b5c39bbcb081', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:46:17.046Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('e89481d2-3bd5-4ba2-9890-cd28be340576', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:46:17.119Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('1d580f9c-d846-4cdc-a710-105214158204', null, 'audit@test.local', 'story.created', 'story', 'ada4774c-812d-4529-a3b3-d0b3ba346a36', '2026-10-17T13:46:17.430Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('fd952f7c-2fe7-4a8c-9a63-b24560ebcf5f', null, 'audit@test.local', 'story.deleted', 'story', 'ada4774c-812d-4529-a3b3-d0b3ba346a36', '2026-10-17T13:46:19.747Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('84819bbf-8ea3-462b-8225-4ac0a12fb896', null, 'audit@test.local', 'admin.logout', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:46:20.088Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('b4f0cac7-77a6-45a6-b8af-fec2c35c0d73', null, 'audit@test.local', 'admin.login', 'admin', '7e93c08e-624a-406e-b199-fd83638ce809', '2026-10-17T13:46:20.191Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('cc332ec5-8eea-4abf-9fb1-c5b5a851f8ef', null, null, 'admin.login', 'admin', '6a5dba21-4e05-4057-88e4-62c14a3d68b9', '2026-10-17T14:30:41.005Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('5720a74f-a568-425b-9119-17ada15d8e74', null, null, 'story.created', 'story', '48b2e21f-2143-443d-93ec-2c55d6fe8810', '2026-10-17T15:11:35.595Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('ad6b0bcf-8aec-4463-9455-230989f300c6', null, null, 'story.updated', 'story', '48b2e21f-2143-443d-93ec-2c55d6fe8810', '2026-10-17T15:11:46.739Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('ffefe109-35e0-49eb-9556-af7e435acd5a', null, null, 'story.created', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T15:13:14.476Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('0c3111b6-d77d-48f5-96bc-22dcb876dae3', null, null, 'story.updated', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T15:13:43.399Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('cfdf2aea-9c4c-4ce5-98ee-3bf3cceb1aef', null, null, 'portrait.imported', 'founder', null, '2026-10-17T17:37:00.811Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('07a1ee6d-6c8e-49ee-9543-564824e9c566', null, null, 'founder.updated', 'founder', '1', '2026-10-17T17:37:39.427Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('9a8d1613-7f64-466c-a182-2072983c2b7c', null, null, 'story.created', 'story', 'cada8271-aac7-4535-a396-77c9b6606aaf', '2026-10-17T17:43:17.235Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('f87879ae-bfd3-41de-8034-96ed664a61e7', null, null, 'content.updated', 'site_content', null, '2026-10-17T17:49:45.639Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('287147c2-f4fc-480e-ad17-fd64bec7bfb8', null, null, 'portrait.imported', 'story', 'cada8271-aac7-4535-a396-77c9b6606aaf', '2026-10-17T17:53:14.301Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('a6610471-3208-4a52-85c7-0f306f804833', null, null, 'portrait.verified', 'story', 'cada8271-aac7-4535-a396-77c9b6606aaf', '2026-10-17T17:53:23.066Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2e8fa6dd-5fe3-4a9c-872d-f473fe3ce052', null, null, 'story.updated', 'story', 'cada8271-aac7-4535-a396-77c9b6606aaf', '2026-10-17T17:53:30.569Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('ee4c8a41-45f5-44a8-91f6-88aebebde966', null, null, 'story.updated', 'story', 'cada8271-aac7-4535-a396-77c9b6606aaf', '2026-10-17T17:56:32.439Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2ad79e28-5822-44a5-a047-448e3e5d8086', null, null, 'portrait.imported', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T17:56:51.493Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('b60c2b9a-a709-4b11-9f26-e6fcdcb8b50d', null, null, 'portrait.verified', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T17:56:55.572Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('1e3c93b2-a863-4812-8dc0-ad674cf0eaae', null, null, 'story.updated', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T17:56:59.548Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('8768fb19-9043-4d4f-82f4-40cde717a095', null, null, 'story.featured', 'story', 'eed164d1-9957-4c32-9b6f-1e4ed0af198f', '2026-10-17T17:57:13.128Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('7a814d7f-0794-4eed-a260-b078aa95b614', null, null, 'story.unpublished', 'story', '48b2e21f-2143-443d-93ec-2c55d6fe8810', '2026-10-17T17:57:25.685Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2f7f529e-9c8a-471f-875c-ba2c3380a3bb', null, null, 'portrait.imported', 'founder', null, '2026-10-17T18:01:40.906Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2efdf979-d1ef-4c86-8a63-906308f2b0e7', null, null, 'collage.uploaded', 'collage', null, '2026-10-18T08:43:11.231Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('df59dc49-6768-45d8-be34-c7fb498b9559', null, null, 'collage.updated', 'collage', '63770945-4244-43a2-a90d-2570b5e2f471', '2026-10-18T08:44:38.275Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('c164e029-58be-4537-a09b-34843901b095', null, null, 'collage.updated', 'collage', '8a0039f1-f231-407a-996c-a88c22f7360f', '2026-10-18T08:44:41.235Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2d99bea5-5a60-4017-a682-b019f994cc4c', null, null, 'collage.updated', 'collage', '7008ddfe-ff8c-4715-9f66-51003d6c34ab', '2026-10-18T08:44:42.682Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('d6795912-88a8-468e-bccb-607f73b01d5b', null, null, 'collage.updated', 'collage', '7c7454b5-abb4-4c9a-82ad-c1c804f066d7', '2026-10-18T08:44:44.331Z'::timestamptz) on conflict do nothing;
insert into public.activity_log (id, admin_id, admin_email, action, entity_type, entity_id, created_at) values ('2a002d8d-ffff-4936-b796-3549c24c0963', null, null, 'founder.updated', 'founder', '1', '2026-10-18T15:29:26.860Z'::timestamptz) on conflict do nothing;

-- ----------------------------------------------------------------
--  submission_notifications (5 rows)
--  Inserted only when the referenced submission exists in
--  Supabase; rows for pre-migration local submissions are skipped.
-- ----------------------------------------------------------------
insert into public.submission_notifications (id, submission_id, fingerprint, status, error, attempts, created_at, updated_at) select 'b72f7df9-797f-4662-9004-f48d6d512072', s.id, '8150b5d328803f33a44f405917222ac0b04ea65c7f4ff05ec74f7c0f7a8253da', 'skipped', 'Email is not configured.', 1, '2026-10-18T05:32:25.283Z'::timestamptz, '2026-10-18T05:32:25.283Z'::timestamptz from public.story_submissions s where s.id = '11758052-41d2-4e18-810d-8132c2047849' on conflict do nothing;
insert into public.submission_notifications (id, submission_id, fingerprint, status, error, attempts, created_at, updated_at) select 'df8f565f-0133-4dea-add0-6d18e03c2dd9', s.id, '8150b5d328803f33a44f405917222ac0b04ea65c7f4ff05ec74f7c0f7a8253da', 'skipped', 'Email is not configured.', 1, '2026-10-18T05:33:45.105Z'::timestamptz, '2026-10-18T05:33:45.105Z'::timestamptz from public.story_submissions s where s.id = 'bfb9d446-c5b1-4639-9b83-8de4adbe8b07' on conflict do nothing;
insert into public.submission_notifications (id, submission_id, fingerprint, status, error, attempts, created_at, updated_at) select '7e1a0e52-cd52-408a-b083-f46338487d8e', s.id, '724b6b0b5e8e821011a32a363199707c0ff0315d1a71b5265ef99190eec22889', 'failed', 'Resend rejected the request: HTTP 403 — You can only send testing emails to your own email address (neilahuja0107@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.', 1, '2026-10-18T06:00:01.316Z'::timestamptz, '2026-10-18T06:00:01.316Z'::timestamptz from public.story_submissions s where s.id = '9d40935b-eee9-4757-84cc-099334b4b8c7' on conflict do nothing;
insert into public.submission_notifications (id, submission_id, fingerprint, status, error, attempts, created_at, updated_at) select '661c69ca-c2d6-4eb6-b828-a55c1a1c7995', s.id, '724b6b0b5e8e821011a32a363199707c0ff0315d1a71b5265ef99190eec22889', 'sent', '', 1, '2026-10-18T06:02:02.819Z'::timestamptz, '2026-10-18T06:02:02.819Z'::timestamptz from public.story_submissions s where s.id = '4cebc3d0-f05d-47b2-b409-ca7b15ad8ee1' on conflict do nothing;
insert into public.submission_notifications (id, submission_id, fingerprint, status, error, attempts, created_at, updated_at) select '358479fd-0dca-414e-b6a8-b7a0a86dbe66', s.id, '2757963790dd4ff0ba330291c1122aba9e9bb4b6128a2c246773a6d7d3ca99cf', 'sent', '', 1, '2026-10-18T07:27:15.654Z'::timestamptz, '2026-10-18T07:27:15.654Z'::timestamptz from public.story_submissions s where s.id = '5282a668-6916-4e65-b079-cbbf7c90e100' on conflict do nothing;

-- ----------------------------------------------------------------
--  rate_limits — intentionally not carried over (short-lived
--  per-window spam counters; the table is RPC-only).
-- ----------------------------------------------------------------

commit;