import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite database (Node's built-in `node:sqlite` — zero native dependencies).
 * The file lives in `data/` which is gitignored.
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "whatsyourstory.db");

declare global {
  var __wysDb: DatabaseSync | undefined;
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS stories (
    id                       TEXT PRIMARY KEY,
    slug                     TEXT NOT NULL UNIQUE,
    title                    TEXT NOT NULL,
    person_name              TEXT NOT NULL,
    excerpt                  TEXT NOT NULL DEFAULT '',
    body                     TEXT NOT NULL DEFAULT '',
    portrait_url             TEXT NOT NULL DEFAULT '',
    image_alt                TEXT NOT NULL DEFAULT '',
    portrait_verified        INTEGER NOT NULL DEFAULT 0,
    category_id              TEXT REFERENCES categories(id) ON DELETE SET NULL,
    publication_date         TEXT,
    status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','published','archived')),
    is_featured              INTEGER NOT NULL DEFAULT 0,
    is_sample                INTEGER NOT NULL DEFAULT 0,
    source_linkedin_url      TEXT NOT NULL DEFAULT '',
    source_linkedin_post_id  TEXT NOT NULL DEFAULT '',
    seo_title                TEXT NOT NULL DEFAULT '',
    seo_description          TEXT NOT NULL DEFAULT '',
    author_credit            TEXT NOT NULL DEFAULT '',
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL,
    published_at             TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stories_status      ON stories(status);
  CREATE INDEX IF NOT EXISTS idx_stories_featured    ON stories(is_featured);
  CREATE INDEX IF NOT EXISTS idx_stories_category    ON stories(category_id);
  CREATE INDEX IF NOT EXISTS idx_stories_published   ON stories(publication_date);
  CREATE INDEX IF NOT EXISTS idx_stories_linkedin_id ON stories(source_linkedin_post_id);

  CREATE TABLE IF NOT EXISTS story_submissions (
    id                     TEXT PRIMARY KEY,
    submitter_name         TEXT NOT NULL,
    email                  TEXT NOT NULL,
    story_title            TEXT NOT NULL,
    story_content          TEXT NOT NULL,
    introduction           TEXT NOT NULL DEFAULT '',
    category_id            TEXT REFERENCES categories(id) ON DELETE SET NULL,
    portrait_url           TEXT NOT NULL DEFAULT '',
    linkedin_profile_url   TEXT NOT NULL DEFAULT '',
    city                   TEXT NOT NULL DEFAULT '',
    additional_message     TEXT NOT NULL DEFAULT '',
    allow_name_display     INTEGER NOT NULL DEFAULT 0,
    allow_portrait_display INTEGER NOT NULL DEFAULT 0,
    consent_records        TEXT NOT NULL DEFAULT '[]',
    review_status          TEXT NOT NULL DEFAULT 'pending_review'
                            CHECK (review_status IN
                              ('pending_review','under_review','approved',
                               'needs_revision','rejected','archived')),
    reviewer_notes         TEXT NOT NULL DEFAULT '',
    linked_story_id        TEXT REFERENCES stories(id) ON DELETE SET NULL,
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_submissions_status  ON story_submissions(review_status);
  CREATE INDEX IF NOT EXISTS idx_submissions_created ON story_submissions(created_at);

  CREATE TABLE IF NOT EXISTS founder_profile (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    name         TEXT NOT NULL DEFAULT '',
    role         TEXT NOT NULL DEFAULT '',
    biography    TEXT NOT NULL DEFAULT '',
    portrait_url TEXT NOT NULL DEFAULT '',
    portrait_verified INTEGER NOT NULL DEFAULT 0,
    vision       TEXT NOT NULL DEFAULT '',
    motivation   TEXT NOT NULL DEFAULT '',
    is_draft     INTEGER NOT NULL DEFAULT 1,
    updated_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_content (
    key        TEXT PRIMARY KEY,
    content    TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  -- Stores details of manually imported photographs (admin panel / CLI).
  CREATE TABLE IF NOT EXISTS portrait_imports (
    id             TEXT PRIMARY KEY,
    story_id       TEXT REFERENCES stories(id) ON DELETE CASCADE,
    file_name      TEXT NOT NULL,
    original_name  TEXT NOT NULL DEFAULT '',
    source_note    TEXT NOT NULL DEFAULT '',
    person_match   TEXT NOT NULL DEFAULT 'unconfirmed',
    permission_ok  INTEGER NOT NULL DEFAULT 0,
    imported_by    TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_portrait_imports_story ON portrait_imports(story_id);

  CREATE TABLE IF NOT EXISTS admins (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    admin_id   TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);

  CREATE TABLE IF NOT EXISTS activity_log (
    id          TEXT PRIMARY KEY,
    admin_id    TEXT REFERENCES admins(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

  CREATE TABLE IF NOT EXISTS rate_limits (
    bucket     TEXT NOT NULL,
    window_start TEXT NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket, window_start)
  );

  -- Tracks the admin notification email for each public submission so a
  -- failed send can be retried from the admin panel. Local-only (like the
  -- rate limiter and activity log); no Supabase schema change required.
  CREATE TABLE IF NOT EXISTS submission_notifications (
    id            TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL UNIQUE,
    fingerprint   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('sent','failed','skipped')),
    error         TEXT NOT NULL DEFAULT '',
    attempts      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_submission_notifications_fingerprint
    ON submission_notifications(fingerprint);
  `,

  // Homepage hero collage. Metadata only — the image files live in the
  // existing public Supabase Storage bucket (story-images, collage/ folder).
  // Local like the site content and audit tables, so no Supabase schema
  // change is required.
  `
  CREATE TABLE IF NOT EXISTS collage_portraits (
    id            TEXT PRIMARY KEY,
    storage_path  TEXT NOT NULL,
    url           TEXT NOT NULL,
    original_name TEXT NOT NULL DEFAULT '',
    verified      INTEGER NOT NULL DEFAULT 0,
    enabled       INTEGER NOT NULL DEFAULT 1,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_collage_portraits_order ON collage_portraits(sort_order);
  `,
];

function openDatabase(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const sql of MIGRATIONS) {
    db.exec(sql);
  }
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__wysDb) {
    globalThis.__wysDb = openDatabase();
  }
  return globalThis.__wysDb;
}
