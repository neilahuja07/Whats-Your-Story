import { uid, nowIso, COLLAGE_MAX } from "@/lib/utils";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { CollagePortrait } from "@/lib/types";

/**
 * Homepage hero collage portraits (Supabase table `collage_portraits`).
 *
 * Metadata lives in Postgres; the image files live in the public Supabase
 * Storage bucket `story-images` under `collage/`. Reads use the ANON client
 * (the homepage is public); writes use the signed-in administrator's session.
 *
 * At most COLLAGE_MAX portraits may be ENABLED for the homepage at any time —
 * there is no hard cap on the total number of records, so extra uploads are
 * simply stored hidden until something is disabled.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapCollage(row: Row): CollagePortrait {
  return {
    id: row.id,
    storagePath: row.storage_path,
    url: row.url,
    originalName: row.original_name ?? "",
    verified: Boolean(row.verified),
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Anonymous client for public reads, or `null` when Supabase is not set up. */
function publicClient() {
  try {
    return createSupabasePublicClient();
  } catch {
    return null;
  }
}

/** Session client for admin writes, or `null` when Supabase is not set up. */
async function adminClient() {
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

const ORDER_BY = { ascending: true, column: "sort_order" } as const;

export async function listCollagePortraits(): Promise<CollagePortrait[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collage_portraits")
    .select("*")
    .order("sort_order", ORDER_BY)
    .order("created_at", ORDER_BY);
  if (error) {
    console.error("[collage] list failed:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapCollage);
}

export async function getCollagePortrait(
  id: string,
): Promise<CollagePortrait | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("collage_portraits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[collage] read failed:", error.message);
    return null;
  }
  return data ? mapCollage(data as Row) : null;
}

/**
 * The public homepage selection: verified AND enabled portraits, in the
 * administrator's chosen order. Returns only what the collage needs.
 */
export async function listHomeCollagePortraits(): Promise<CollagePortrait[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collage_portraits")
    .select("*")
    .eq("verified", true)
    .eq("enabled", true)
    .order("sort_order", ORDER_BY)
    .order("created_at", ORDER_BY);
  if (error) {
    console.error("[collage] home selection failed:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapCollage);
}

export async function countEnabledCollagePortraits(): Promise<number> {
  const supabase = publicClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("collage_portraits")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true);
  if (error) {
    console.error("[collage] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Appends a new portrait. When the homepage selection is already full the
 * record is stored DISABLED and `clamped` is true, so the caller can tell
 * the administrator instead of silently exceeding the 30-portrait limit.
 */
export async function addCollagePortrait(input: {
  storagePath: string;
  url: string;
  originalName: string;
  verified: boolean;
}): Promise<{ portrait: CollagePortrait | null; clamped: boolean }> {
  const supabase = await adminClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: maxRow } = await supabase
    .from("collage_portraits")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  const nextOrder = ((maxRow as Row[] | null)?.[0]?.sort_order ?? -1) + 1;

  const clamped = (await countEnabledCollagePortraits()) >= COLLAGE_MAX;
  const id = uid();

  const { error } = await supabase.from("collage_portraits").insert({
    id,
    storage_path: input.storagePath,
    url: input.url,
    original_name: input.originalName,
    verified: input.verified,
    enabled: !clamped,
    sort_order: nextOrder,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  if (error) {
    throw new Error(
      /permission denied|row-level security|violates row-level/i.test(error.message)
        ? "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table."
        : `Could not save the portrait: ${error.message}`,
    );
  }

  return { portrait: await getCollagePortrait(id), clamped };
}

/** Enable/disable a portrait for the homepage, enforcing COLLAGE_MAX. */
export async function setCollagePortraitEnabled(
  id: string,
  enabled: boolean,
): Promise<{ ok: true; portrait: CollagePortrait | null } | { ok: false; error: string }> {
  const existing = await getCollagePortrait(id);
  if (!existing) return { ok: false, error: "Portrait not found." };

  if (enabled && !existing.enabled && (await countEnabledCollagePortraits()) >= COLLAGE_MAX) {
    return {
      ok: false,
      error: `The homepage collage already has ${COLLAGE_MAX} portraits selected. Disable one before enabling another.`,
    };
  }

  const supabase = await adminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("collage_portraits")
    .update({ enabled, updated_at: nowIso() })
    .eq("id", id);
  if (error) {
    return { ok: false, error: `Could not save the change: ${error.message}` };
  }

  return { ok: true, portrait: await getCollagePortrait(id) };
}

export async function setCollagePortraitVerified(
  id: string,
  verified: boolean,
): Promise<CollagePortrait | null> {
  const existing = await getCollagePortrait(id);
  if (!existing) return null;
  const supabase = await adminClient();
  if (!supabase) return null;
  const { error } = await supabase
    .from("collage_portraits")
    .update({ verified, updated_at: nowIso() })
    .eq("id", id);
  if (error) console.error("[collage] verify failed:", error.message);
  return getCollagePortrait(id);
}

/** Swap a portrait with its neighbour in the display order. */
export async function moveCollagePortrait(
  id: string,
  direction: "up" | "down",
): Promise<CollagePortrait[]> {
  const list = await listCollagePortraits();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return list;

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return list;

  const supabase = await adminClient();
  if (!supabase) return list;
  const a = list[idx];
  const b = list[swapWith];
  const now = nowIso();
  const updateOne = async (rowId: string, sortOrder: number) => {
    const { error } = await supabase
      .from("collage_portraits")
      .update({ sort_order: sortOrder, updated_at: now })
      .eq("id", rowId);
    if (error) console.error("[collage] reorder failed:", error.message);
  };
  await updateOne(a.id, b.sortOrder);
  await updateOne(b.id, a.sortOrder);

  return listCollagePortraits();
}

/** Point an existing collage record at a newly uploaded file. */
export async function replaceCollagePortrait(
  id: string,
  input: { storagePath: string; url: string; verified: boolean },
): Promise<CollagePortrait | null> {
  const existing = await getCollagePortrait(id);
  if (!existing) return null;
  const supabase = await adminClient();
  if (!supabase) return null;
  const { error } = await supabase
    .from("collage_portraits")
    .update({
      storage_path: input.storagePath,
      url: input.url,
      verified: input.verified,
      updated_at: nowIso(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Could not replace the portrait: ${error.message}`);
  }
  return getCollagePortrait(id);
}

export async function deleteCollagePortrait(id: string): Promise<boolean> {
  const supabase = await adminClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("collage_portraits")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(`Could not delete the portrait: ${error.message}`);
  }
  return (data ?? []).length > 0;
}
