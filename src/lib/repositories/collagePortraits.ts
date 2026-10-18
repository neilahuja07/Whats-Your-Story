import { getDb } from "@/lib/db";
import { uid, nowIso, COLLAGE_MAX } from "@/lib/utils";
import type { CollagePortrait } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Homepage hero collage portraits.
 *
 * Metadata lives in the local SQLite database (like the site content and
 * audit tables); the image files live in the existing public Supabase
 * Storage bucket `story-images` under `collage/`. At most COLLAGE_MAX
 * portraits may be ENABLED for the homepage at any time — there is no hard
 * cap on the total number of records, so extra uploads are simply stored
 * hidden until something is disabled.
 */

function mapCollage(row: any): CollagePortrait {
  return {
    id: row.id,
    storagePath: row.storage_path,
    url: row.url,
    originalName: row.original_name ?? "",
    verified: row.verified === 1,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_BY = "ORDER BY sort_order ASC, created_at ASC";

export function listCollagePortraits(): CollagePortrait[] {
  const rows = getDb()
    .prepare(`SELECT * FROM collage_portraits ${ORDER_BY}`)
    .all();
  return rows.map(mapCollage);
}

export function getCollagePortrait(id: string): CollagePortrait | null {
  const row = getDb()
    .prepare("SELECT * FROM collage_portraits WHERE id = ?")
    .get(id);
  return row ? mapCollage(row) : null;
}

/**
 * The public homepage selection: verified AND enabled portraits, in the
 * administrator's chosen order. Returns only what the collage needs.
 */
export function listHomeCollagePortraits(): CollagePortrait[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM collage_portraits
       WHERE verified = 1 AND enabled = 1
       ${ORDER_BY}`,
    )
    .all();
  return rows.map(mapCollage);
}

export function countEnabledCollagePortraits(): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM collage_portraits WHERE enabled = 1",
    )
    .get() as { n: number } | undefined;
  return row?.n ?? 0;
}

/**
 * Appends a new portrait. When the homepage selection is already full the
 * record is stored DISABLED and `clamped` is true, so the caller can tell
 * the administrator instead of silently exceeding the 30-portrait limit.
 */
export function addCollagePortrait(input: {
  storagePath: string;
  url: string;
  originalName: string;
  verified: boolean;
}): { portrait: CollagePortrait; clamped: boolean } {
  const db = getDb();
  const id = uid();
  const now = nowIso();

  const nextOrder =
    ((
      db.prepare("SELECT MAX(sort_order) AS m FROM collage_portraits").get() as
        | { m: number | null }
        | undefined
    )?.m ?? -1) + 1;

  const clamped = countEnabledCollagePortraits() >= COLLAGE_MAX;

  db.prepare(
    `INSERT INTO collage_portraits
       (id, storage_path, url, original_name, verified, enabled, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.storagePath,
    input.url,
    input.originalName,
    input.verified ? 1 : 0,
    clamped ? 0 : 1,
    nextOrder,
    now,
    now,
  );

  return { portrait: getCollagePortrait(id)!, clamped };
}

/** Enable/disable a portrait for the homepage, enforcing COLLAGE_MAX. */
export function setCollagePortraitEnabled(
  id: string,
  enabled: boolean,
): { ok: true; portrait: CollagePortrait } | { ok: false; error: string } {
  const existing = getCollagePortrait(id);
  if (!existing) return { ok: false, error: "Portrait not found." };

  if (enabled && !existing.enabled && countEnabledCollagePortraits() >= COLLAGE_MAX) {
    return {
      ok: false,
      error: `The homepage collage already has ${COLLAGE_MAX} portraits selected. Disable one before enabling another.`,
    };
  }

  getDb()
    .prepare(
      "UPDATE collage_portraits SET enabled = ?, updated_at = ? WHERE id = ?",
    )
    .run(enabled ? 1 : 0, nowIso(), id);

  return { ok: true, portrait: getCollagePortrait(id)! };
}

export function setCollagePortraitVerified(
  id: string,
  verified: boolean,
): CollagePortrait | null {
  const existing = getCollagePortrait(id);
  if (!existing) return null;
  getDb()
    .prepare(
      "UPDATE collage_portraits SET verified = ?, updated_at = ? WHERE id = ?",
    )
    .run(verified ? 1 : 0, nowIso(), id);
  return getCollagePortrait(id);
}

/** Swap a portrait with its neighbour in the display order. */
export function moveCollagePortrait(
  id: string,
  direction: "up" | "down",
): CollagePortrait[] {
  const list = listCollagePortraits();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return list;

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return list;

  const db = getDb();
  const a = list[idx];
  const b = list[swapWith];
  const update = db.prepare(
    "UPDATE collage_portraits SET sort_order = ?, updated_at = ? WHERE id = ?",
  );
  const now = nowIso();
  update.run(b.sortOrder, now, a.id);
  update.run(a.sortOrder, now, b.id);

  return listCollagePortraits();
}

/** Point an existing collage record at a newly uploaded file. */
export function replaceCollagePortrait(
  id: string,
  input: { storagePath: string; url: string; verified: boolean },
): CollagePortrait | null {
  const existing = getCollagePortrait(id);
  if (!existing) return null;
  getDb()
    .prepare(
      `UPDATE collage_portraits
       SET storage_path = ?, url = ?, verified = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.storagePath,
      input.url,
      input.verified ? 1 : 0,
      nowIso(),
      id,
    );
  return getCollagePortrait(id);
}

export function deleteCollagePortrait(id: string): boolean {
  const res = getDb()
    .prepare("DELETE FROM collage_portraits WHERE id = ?")
    .run(id);
  return res.changes > 0;
}
