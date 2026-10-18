import { getDb } from "@/lib/db";
import { ensureSampleCategories } from "@/lib/sampleData";
import { SITE_CONTENT_DEFAULTS } from "@/lib/repositories/siteContent";
import { nowIso } from "@/lib/utils";

/**
 * One-time bootstrap, run lazily on first database access:
 *  - seeds default site-content keys so they are admin-editable,
 *  - ensures the founder row exists,
 *  - ensures the starter categories exist (used by the admin editor /
 *    submission form; story content itself lives in Supabase).
 * Safe to call repeatedly.
 */
let bootstrapped = false;

export function bootstrap(): void {
  if (bootstrapped) return;
  const db = getDb();

  // Site content defaults (only when missing — never overwrite admin edits).
  const insert = db.prepare(
    "INSERT OR IGNORE INTO site_content (key, content, updated_at) VALUES (?, ?, ?)",
  );
  const ts = nowIso();
  for (const [key, content] of Object.entries(SITE_CONTENT_DEFAULTS)) {
    insert.run(key, content, ts);
  }

  // Ensure the founder row exists (empty draft).
  db.prepare(
    "INSERT OR IGNORE INTO founder_profile (id, name, role, biography, portrait_url, portrait_verified, vision, motivation, is_draft, updated_at) VALUES (1, '', '', '', '', 0, '', '', 1, ?)",
  ).run(ts);

  // Starter categories for the admin editor and the public submission form.
  ensureSampleCategories();

  bootstrapped = true;
}

/** Call at the top of any repository access from server code. */
export function init(): void {
  bootstrap();
}
