import { getDb } from "@/lib/db";
import { uid, nowIso } from "@/lib/utils";
import type { PortraitImport } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapImport(row: any): PortraitImport {
  return {
    id: row.id,
    storyId: row.story_id,
    fileName: row.file_name,
    originalName: row.original_name,
    sourceNote: row.source_note,
    personMatch: row.person_match,
    permissionOk: row.permission_ok === 1,
    importedBy: row.imported_by,
    createdAt: row.created_at,
    storyTitle: row.story_title ?? null,
    personName: row.person_name ?? null,
  };
}

export interface PortraitImportInput {
  storyId: string | null;
  fileName: string;
  originalName: string;
  sourceNote: string;
  personMatch: "confirmed" | "unconfirmed";
  permissionOk: boolean;
  importedBy: string;
}

/**
 * Records an audit entry for an imported portrait photograph.
 *
 * Stories now live in Supabase, so a story's id is a Supabase UUID. The
 * legacy local `portrait_imports.story_id` column is a foreign key to the
 * LOCAL `stories` table, which no longer holds real stories. Storing a
 * Supabase UUID there raises "FOREIGN KEY constraint failed", so the id is
 * only kept when the story is known locally (same guard as `logActivity`).
 *
 * This is an AUDIT log: the photograph is already uploaded to Storage and
 * attached via `stories.portrait_url` by the time this runs. A failure here
 * must never break the upload, so it returns null instead of throwing.
 */
export function recordPortraitImport(
  input: PortraitImportInput,
): PortraitImport | null {
  const db = getDb();
  const id = uid();

  let safeStoryId: string | null = null;
  if (input.storyId) {
    const known = db
      .prepare("SELECT 1 AS x FROM stories WHERE id = ?")
      .get(input.storyId);
    if (known) safeStoryId = input.storyId;
  }

  try {
    db.prepare(
      `INSERT INTO portrait_imports
        (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      safeStoryId,
      input.fileName,
      input.originalName,
      input.sourceNote,
      input.personMatch,
      input.permissionOk ? 1 : 0,
      input.importedBy,
      nowIso(),
    );
  } catch (err) {
    console.warn("[portrait-imports] audit entry not written:", err);
    return null;
  }

  return getPortraitImportById(id);
}

export function getPortraitImportById(id: string): PortraitImport | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT pi.*, s.title AS story_title, s.person_name AS person_name
       FROM portrait_imports pi
       LEFT JOIN stories s ON s.id = pi.story_id
       WHERE pi.id = ?`,
    )
    .get(id);
  return row ? mapImport(row) : null;
}

export function listPortraitImports(limit = 100): PortraitImport[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pi.*, s.title AS story_title, s.person_name AS person_name
       FROM portrait_imports pi
       LEFT JOIN stories s ON s.id = pi.story_id
       ORDER BY pi.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
  return rows.map(mapImport);
}

export function findPortraitImportByFileName(
  fileName: string,
): PortraitImport | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM portrait_imports WHERE file_name = ?")
    .get(fileName);
  return row ? mapImport(row) : null;
}

/** Files imported but not yet linked to a story. */
export function listUnlinkedPortraitImports(): PortraitImport[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM portrait_imports WHERE story_id IS NULL ORDER BY created_at DESC",
    )
    .all();
  return rows.map(mapImport);
}
