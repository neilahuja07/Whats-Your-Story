import { uid, nowIso } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PortraitImport } from "@/lib/types";

/**
 * Portrait-import audit log (Supabase table `portrait_imports`).
 *
 * All operations use the signed-in administrator's session (RLS: admins
 * only). `story_id` references the Supabase `stories` table directly — a
 * photograph can be imported before it is attached (NULL), and deleting a
 * story keeps the audit row while clearing the link.
 *
 * This is an AUDIT log: the photograph is already in Storage and attached
 * via `stories.cover_image_url` by the time these run. A failure here must
 * never break the upload, so the write helpers return null / warn instead of
 * throwing.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapImport(row: Row): PortraitImport {
  const story = (row.stories ?? null) as Row | null;
  return {
    id: row.id,
    storyId: row.story_id ?? null,
    fileName: row.file_name,
    originalName: row.original_name ?? "",
    sourceNote: row.source_note ?? "",
    personMatch: row.person_match === "confirmed" ? "confirmed" : "unconfirmed",
    permissionOk: Boolean(row.permission_ok),
    importedBy: row.imported_by ?? "",
    createdAt: row.created_at,
    storyTitle: story?.title ?? null,
    personName: story?.person_name ?? null,
  };
}

/** Story fields joined onto an import row (PostgREST resource embedding). */
const WITH_STORY = "*, stories(title, person_name)";

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
 * Returns the stored entry, or null when it could not be written.
 */
export async function recordPortraitImport(
  input: PortraitImportInput,
): Promise<PortraitImport | null> {
  const id = uid();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("portrait_imports").insert({
      id,
      story_id: input.storyId,
      file_name: input.fileName,
      original_name: input.originalName,
      source_note: input.sourceNote,
      person_match: input.personMatch,
      permission_ok: input.permissionOk,
      imported_by: input.importedBy,
      created_at: nowIso(),
    });
    if (error) {
      console.warn("[portrait-imports] audit entry not written:", error.message);
      return null;
    }
  } catch (err) {
    console.warn("[portrait-imports] audit entry not written:", err);
    return null;
  }
  return getPortraitImportById(id);
}

export async function getPortraitImportById(
  id: string,
): Promise<PortraitImport | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portrait_imports")
    .select(WITH_STORY)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[portrait-imports] read failed:", error.message);
    return null;
  }
  return data ? mapImport(data as Row) : null;
}

export async function listPortraitImports(limit = 100): Promise<PortraitImport[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portrait_imports")
    .select(WITH_STORY)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[portrait-imports] read failed:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapImport);
}

export async function findPortraitImportByFileName(
  fileName: string,
): Promise<PortraitImport | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portrait_imports")
    .select(WITH_STORY)
    .eq("file_name", fileName)
    .maybeSingle();
  if (error) {
    console.warn("[portrait-imports] read failed:", error.message);
    return null;
  }
  return data ? mapImport(data as Row) : null;
}

/** Files imported but not yet linked to a story. */
export async function listUnlinkedPortraitImports(): Promise<PortraitImport[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portrait_imports")
    .select(WITH_STORY)
    .is("story_id", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[portrait-imports] read failed:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapImport);
}

/**
 * Record the verification decision (identity + permission) against every
 * import entry for a story. A non-empty note replaces the stored source note,
 * matching the original SQL semantics exactly. Best-effort: failures warn.
 */
export async function updatePortraitVerificationForStory(
  storyId: string,
  input: {
    personMatch: "confirmed" | "unconfirmed";
    permissionOk: boolean;
    note: string;
  },
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, unknown> = {
      person_match: input.personMatch,
      permission_ok: input.permissionOk,
    };
    if (input.note) patch.source_note = input.note;
    const { error } = await supabase
      .from("portrait_imports")
      .update(patch)
      .eq("story_id", storyId);
    if (error) {
      console.warn("[portrait-imports] verification not recorded:", error.message);
    }
  } catch (err) {
    console.warn("[portrait-imports] verification not recorded:", err);
  }
}
