import { uid, slugify } from "@/lib/utils";
import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

/**
 * Categories repository (Supabase table `categories`).
 *
 * Reference data for the admin editors: stories and submissions store the
 * category NAME, and these helpers supply the id ⇄ name mapping.
 * Reads use the ANON client; writes use the administrator's session.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapCategory(r: Row): Category {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? "",
  };
}

function warnReadFailed(label: string, message: string): void {
  console.error(`[categories] ${label}:`, message);
}

/** Anonymous client for public reads, or `null` when Supabase is not set up. */
function publicClient() {
  try {
    return createSupabasePublicClient();
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<Category[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    warnReadFailed("listCategories", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    warnReadFailed("getCategoryBySlug", error.message);
    return null;
  }
  return data ? mapCategory(data as Row) : null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    warnReadFailed("getCategoryById", error.message);
    return null;
  }
  return data ? mapCategory(data as Row) : null;
}

export async function createCategory(
  name: string,
  description = "",
): Promise<Category> {
  const supabase = await createSupabaseServerClient();

  let slug = slugify(name);
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .limit(1);
  if ((existing ?? []).length > 0) slug = `${slug}-${uid().slice(0, 6)}`;

  const id = uid();
  const { error } = await supabase
    .from("categories")
    .insert({ id, name: name.trim(), slug, description });
  if (error) {
    throw new Error(
      /permission denied|row-level security|violates row-level/i.test(error.message)
        ? "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table."
        : `Could not create the category: ${error.message}`,
    );
  }
  return { id, name: name.trim(), slug, description };
}

/** Find-or-create by name; returns the category id (or null for empty input). */
export async function ensureCategoryByName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const all = await listCategories();
  const found = all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  return (await createCategory(trimmed)).id;
}
