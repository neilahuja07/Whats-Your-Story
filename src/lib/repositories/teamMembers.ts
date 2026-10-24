import { uid, nowIso } from "@/lib/utils";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

/**
 * Core Team repository — backed by Supabase (table `team_members`).
 *
 * Public reads use the ANON client; only published members (is_published=true)
 * are returned via Row Level Security. Admin writes use the signed-in
 * administrator's session and require the admin allowlist.
 *
 * Column mapping (Supabase column ← app field):
 *   name          ← name
 *   role          ← role
 *   bio           ← bio          (rich text HTML)
 *   image_url     ← imageUrl
 *   image_alt     ← imageAlt
 *   linkedin_url  ← linkedinUrl
 *   display_order ← displayOrder
 *   is_published  ← isPublished
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function log(label: string, error: unknown): void {
  if (error) console.error(`[team-members] ${label}:`, error);
}

type PostgrestErrorLike = { message?: string };

function teamWriteError(verb: string, error: PostgrestErrorLike): Error {
  const message = error?.message ?? "unknown error";
  if (/could not find the table|does not exist|schema cache/i.test(message)) {
    return new Error(
      "The team_members table is missing in Supabase. Run supabase_migration_team_members.sql in the SQL Editor, then try again.",
    );
  }
  if (/permission denied|row-level security|violates row-level/i.test(message)) {
    return new Error(
      "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table.",
    );
  }
  return new Error(`Could not ${verb} the team member: ${message}`);
}

let warnedAboutConfig = false;

function warnNotConfigured(): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;
  console.warn(
    "[team-members] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
      "team members cannot be loaded. See SUPABASE_SETUP.md.",
  );
}

/** Anonymous client for public reads, or `null` when Supabase is not set up. */
function publicClient() {
  try {
    return createSupabasePublicClient();
  } catch {
    warnNotConfigured();
    return null;
  }
}

/** Session client for admin writes, or `null` when Supabase is not set up. */
async function adminClient() {
  try {
    return await createSupabaseServerClient();
  } catch {
    warnNotConfigured();
    return null;
  }
}

function mapTeamMember(row: Row): TeamMember {
  return {
    id: row.id,
    name: row.name ?? "",
    role: row.role ?? "",
    bio: row.bio ?? "",
    imageUrl: row.image_url ?? "",
    imageAlt: row.image_alt ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    displayOrder: Number(row.display_order ?? 0),
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns published team members ordered by display_order (for the public page).
 * The anonymous RLS policy guarantees only is_published=true rows are returned.
 */
export async function listPublishedTeamMembers(): Promise<TeamMember[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    log("listPublishedTeamMembers", error);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapTeamMember);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin queries
// ─────────────────────────────────────────────────────────────────────────────

/** Returns ALL team members (published and unpublished) for the admin list. */
export async function listAllTeamMembers(): Promise<TeamMember[]> {
  const supabase = await adminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    log("listAllTeamMembers", error);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapTeamMember);
}

export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const supabase = await adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) log("getTeamMemberById", error);
  if (!data) return null;
  return mapTeamMember(data as Row);
}

export interface TeamMemberInput {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  imageAlt: string;
  linkedinUrl: string;
  isPublished: boolean;
}

/** Create a new team member. display_order is set to max+1 automatically. */
export async function createTeamMember(
  input: TeamMemberInput,
): Promise<TeamMember> {
  const supabase = await adminClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  // Get the current maximum display_order so the new member goes to the end.
  const { data: maxRow } = await supabase
    .from("team_members")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = ((maxRow as Row[] | null)?.[0]?.display_order ?? -1) + 1;

  const id = uid();
  const ts = nowIso();

  const { error } = await supabase.from("team_members").insert({
    id,
    name: input.name.trim(),
    role: input.role.trim(),
    bio: input.bio,
    image_url: input.imageUrl.trim(),
    image_alt: input.imageAlt.trim(),
    linkedin_url: input.linkedinUrl.trim(),
    display_order: nextOrder,
    is_published: input.isPublished,
    created_at: ts,
    updated_at: ts,
  });

  if (error) throw teamWriteError("create", error);

  const created = await getTeamMemberById(id);
  if (!created) throw new Error("Team member was created but could not be read back.");
  return created;
}

export async function updateTeamMember(
  id: string,
  input: TeamMemberInput,
): Promise<TeamMember> {
  const supabase = await adminClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("team_members")
    .update({
      name: input.name.trim(),
      role: input.role.trim(),
      bio: input.bio,
      image_url: input.imageUrl.trim(),
      image_alt: input.imageAlt.trim(),
      linkedin_url: input.linkedinUrl.trim(),
      is_published: input.isPublished,
      updated_at: nowIso(),
    })
    .eq("id", id);

  if (error) throw teamWriteError("update", error);

  const updated = await getTeamMemberById(id);
  if (!updated) throw new Error("Team member was updated but could not be read back.");
  return updated;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const supabase = await adminClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw teamWriteError("delete", error);
  return (data ?? []).length > 0;
}

/**
 * Swap a team member's display_order with its neighbour in the given
 * direction. Returns the updated full list (same pattern as moveCollagePortrait).
 */
export async function moveTeamMember(
  id: string,
  direction: "up" | "down",
): Promise<TeamMember[]> {
  const list = await listAllTeamMembers();
  const idx = list.findIndex((m) => m.id === id);
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
      .from("team_members")
      .update({ display_order: sortOrder, updated_at: now })
      .eq("id", rowId);
    if (error) log("moveTeamMember", error);
  };

  await updateOne(a.id, b.displayOrder);
  await updateOne(b.id, a.displayOrder);

  return listAllTeamMembers();
}
