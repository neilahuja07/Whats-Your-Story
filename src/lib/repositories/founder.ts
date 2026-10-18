import { nowIso } from "@/lib/utils";
import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { FounderProfile } from "@/lib/types";

/**
 * Founder profile repository (Supabase table `founder_profile`, single row id 1).
 *
 * Reads use the ANON client (public pages); writes use the signed-in
 * administrator's session and require the admin allowlist. When the row does
 * not exist yet, reads return the same empty draft defaults the old local
 * database produced on first access — no insert happens on read.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const DEFAULTS = {
  name: "",
  role: "",
  biography: "",
  portrait_url: "",
  portrait_verified: false,
  vision: "",
  motivation: "",
  is_draft: true,
  updated_at: "",
};

function mapFounder(row: Row | null): FounderProfile {
  const r = { ...DEFAULTS, ...(row ?? {}) };
  return {
    id: 1,
    name: r.name ?? "",
    role: r.role ?? "",
    biography: r.biography ?? "",
    portraitUrl: r.portrait_url ?? "",
    portraitVerified: Boolean(r.portrait_verified),
    vision: r.vision ?? "",
    motivation: r.motivation ?? "",
    isDraft: Boolean(r.is_draft),
    updatedAt: r.updated_at ?? "",
  };
}

export async function getFounderProfile(): Promise<FounderProfile> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("founder_profile")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[founder] read failed:", error.message);
      return mapFounder(null);
    }
    return mapFounder((data as Row) ?? null);
  } catch {
    // Supabase not configured yet — present the empty draft.
    return mapFounder(null);
  }
}

export interface FounderInput {
  name: string;
  role: string;
  biography: string;
  portraitUrl: string;
  portraitVerified: boolean;
  vision: string;
  motivation: string;
  isDraft: boolean;
}

export async function updateFounderProfile(
  input: FounderInput,
): Promise<FounderProfile> {
  const supabase = await createSupabaseServerClient();
  const row = {
    id: 1,
    name: input.name.trim(),
    role: input.role.trim(),
    biography: input.biography,
    portrait_url: input.portraitUrl.trim(),
    portrait_verified: input.portraitVerified,
    vision: input.vision,
    motivation: input.motivation,
    is_draft: input.isDraft,
    updated_at: nowIso(),
  };
  const { error } = await supabase
    .from("founder_profile")
    .upsert(row, { onConflict: "id" });
  if (error) {
    throw new Error(
      /could not find the table|does not exist|schema cache/i.test(error.message)
        ? "The founder_profile table is missing in Supabase. Run supabase_migration_persistence.sql in the SQL Editor, then try again."
        : /permission denied|row-level security|violates row-level/i.test(error.message)
          ? "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table."
          : `Could not save the founder profile: ${error.message}`,
    );
  }
  return getFounderProfile();
}
