import { slugify, nowIso } from "@/lib/utils";
import { listCategories, getCategoryById } from "@/lib/repositories/categories";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type {
  Category,
  Paginated,
  Story,
  StoryQueryOptions,
  StoryStatus,
} from "@/lib/types";

/**
 * Stories repository — backed by Supabase (table `stories`).
 *
 * Public functions use the anonymous client, so Row Level Security guarantees
 * that only published, non-archived stories are ever returned.
 * Administrative functions use the signed-in administrator's session.
 *
 * Column mapping (Supabase column ← app field):
 *   content            ← body            cover_image_url ← portraitUrl
 *   published_at       ← publicationDate is_published    ← status === "published"
 *   is_archived        ← status === "archived"
 *   image_alt, portrait_verified, is_sample, seo_title, seo_description,
 *   author_credit, source_linkedin_post_id, source_linkedin_url, category
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function categoryMaps(): {
  byId: Map<string, Category>;
  byName: Map<string, Category>;
} {
  const byId = new Map<string, Category>();
  const byName = new Map<string, Category>();
  for (const c of listCategories()) {
    byId.set(c.id, c);
    byName.set(c.name.toLowerCase(), c);
  }
  return { byId, byName };
}

function mapStory(row: Row, byName: Map<string, Category>): Story {
  const cat = row.category
    ? byName.get(String(row.category).toLowerCase())
    : undefined;
  const status: StoryStatus = row.is_archived
    ? "archived"
    : row.is_published
      ? "published"
      : "draft";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    personName: row.person_name,
    excerpt: row.excerpt ?? "",
    body: row.content ?? "",
    portraitUrl: row.cover_image_url ?? "",
    imageAlt: row.image_alt ?? "",
    portraitVerified: Boolean(row.portrait_verified),
    categoryId: cat?.id ?? null,
    publicationDate: row.published_at ?? null,
    status,
    isFeatured: Boolean(row.is_featured),
    isSample: Boolean(row.is_sample),
    sourceLinkedinUrl: row.source_linkedin_url ?? "",
    sourceLinkedinPostId: row.source_linkedin_post_id ?? "",
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    authorCredit: row.author_credit ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? null,
    categoryName: cat?.name ?? row.category ?? null,
    categorySlug:
      cat?.slug ?? (row.category ? slugify(String(row.category)) : null),
  };
}

function mapRows(rows: Row[]): Story[] {
  const { byName } = categoryMaps();
  return rows.map((r) => mapStory(r, byName));
}

function log(label: string, error: unknown): void {
  if (error) console.error(`[stories] ${label}:`, error);
}

/**
 * Build an error for a failed database WRITE.
 *
 * Writes are different from reads: if Supabase cannot save, delete or change a
 * story, the caller must tell the user that NOTHING was saved. Read errors are
 * logged and degrade to empty results; write errors always throw so no route
 * can accidentally reply `{ ok: true }` when nothing happened.
 */
type PostgrestErrorLike = { code?: string; message?: string };

function storyWriteError(verb: string, error: PostgrestErrorLike): Error {
  const message = error?.message ?? "unknown error";
  // The bucket/table genuinely is not set up yet — the user can fix this by
  // running the SQL in Supabase, so surface a specific, actionable message.
  if (/could not find the table|does not exist|schema cache/i.test(message)) {
    return new Error(
      "The stories table is missing in Supabase. Run supabase_setup.sql in the SQL Editor, then try again.",
    );
  }
  if (/permission denied|row-level security|violates row-level/i.test(message)) {
    return new Error(
      "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table, then try again.",
    );
  }
  return new Error(`Could not ${verb} the story: ${message}`);
}

/* ------------------------- client helpers ------------------------- */

let warnedAboutConfig = false;

function warnNotConfigured(): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;
  console.warn(
    "[stories] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
      "no stories can be loaded. See SUPABASE_SETUP.md.",
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

/** Session client for admin operations, or `null` when Supabase is not set up. */
async function adminClient() {
  try {
    return await createSupabaseServerClient();
  } catch {
    warnNotConfigured();
    return null;
  }
}

const EMPTY_PAGE = <T,>(pageSize: number): Paginated<T> => ({
  items: [],
  page: 1,
  pageSize,
  total: 0,
  totalPages: 1,
  hasMore: false,
});

/* ------------------------------------------------------------------ */
/* Public queries                                                      */
/* ------------------------------------------------------------------ */

/** Distinct categories that have at least one published story. */
export async function listPublishedCategories(): Promise<Category[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("category")
    .eq("is_published", true)
    .eq("is_archived", false)
    .not("category", "is", null)
    .neq("category", "");

  if (error) {
    log("listPublishedCategories", error);
    return [];
  }

  const seen = new Set<string>();
  const out: Category[] = [];
  for (const row of (data ?? []) as Row[]) {
    const name = String(row.category);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: slugify(name), name, slug: slugify(name), description: "" });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Map a category slug back to the stored category name (for filtering). */
async function categoryNameForSlug(slug: string): Promise<string | null> {
  const categories = await listPublishedCategories();
  const match = categories.find((c) => c.slug === slug || c.id === slug);
  return match?.name ?? null;
}

/** Strip characters that would break a PostgREST `or()` filter expression. */
function searchTerm(q: string): string {
  return q.trim().replace(/[,()%*]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listPublishedStories(
  opts: StoryQueryOptions = {},
): Promise<Paginated<Story>> {
  const {
    q = "",
    category = "",
    sort = "newest",
    page = 1,
    pageSize = 12,
  } = opts;

  const supabase = publicClient();
  if (!supabase) return EMPTY_PAGE<Story>(pageSize);
  const safePage = Math.max(1, Math.min(page, 10_000));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("stories")
    .select("*", { count: "exact" })
    .eq("is_published", true)
    .eq("is_archived", false);

  const term = searchTerm(q);
  if (term) {
    query = query.or(`person_name.ilike.%${term}%,excerpt.ilike.%${term}%`);
  }
  if (category.trim()) {
    const name = await categoryNameForSlug(category.trim());
    if (!name) {
      return {
        items: [],
        page: safePage,
        pageSize,
        total: 0,
        totalPages: 1,
        hasMore: false,
      };
    }
    query = query.eq("category", name);
  }

  if (sort === "featured") {
    query = query
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("published_at", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) log("listPublishedStories", error);

  const rows = (data ?? []) as Row[];
  const total = count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: mapRows(rows),
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasMore: safePage < totalPages,
  };
}

export async function listFeaturedStories(limit = 6): Promise<Story[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("is_published", true)
    .eq("is_archived", false)
    .eq("is_featured", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) log("listFeaturedStories", error);
  return mapRows((data ?? []) as Row[]);
}

export async function getPublishedStoryBySlug(slug: string): Promise<Story | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("is_archived", false)
    .maybeSingle();
  if (error) log("getPublishedStoryBySlug", error);
  return data ? mapRows([data as Row])[0] : null;
}

export async function getRelatedStories(
  story: Story,
  limit = 3,
): Promise<Story[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("is_published", true)
    .eq("is_archived", false)
    .neq("id", story.id)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 4);
  if (error) log("getRelatedStories", error);

  const rows = (data ?? []) as Row[];
  const same = rows.filter(
    (r) => story.categoryName && r.category === story.categoryName,
  );
  const others = rows.filter(
    (r) => !(story.categoryName && r.category === story.categoryName),
  );
  return mapRows([...same, ...others].slice(0, limit));
}

export async function getPublishedSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("slug, updated_at")
    .eq("is_published", true)
    .eq("is_archived", false);
  if (error) log("getPublishedSlugs", error);
  return ((data ?? []) as Row[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}

/* ------------------------------------------------------------------ */
/* Admin queries                                                       */
/* ------------------------------------------------------------------ */

/** Any story regardless of status — admin use only. */
export async function getStoryById(id: string): Promise<Story | null> {
  const supabase = await adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) log("getStoryById", error);
  return data ? mapRows([data as Row])[0] : null;
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const supabase = await adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) log("getStoryBySlug", error);
  return data ? mapRows([data as Row])[0] : null;
}

export async function listAllStories(
  opts: {
    status?: StoryStatus | "all";
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Paginated<Story>> {
  const { status = "all", q = "", page = 1, pageSize = 20 } = opts;
  const supabase = await adminClient();
  if (!supabase) return EMPTY_PAGE<Story>(pageSize);
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("stories").select("*", { count: "exact" });

  if (status === "draft") {
    query = query.eq("is_published", false).eq("is_archived", false);
  } else if (status === "published") {
    query = query.eq("is_published", true).eq("is_archived", false);
  } else if (status === "archived") {
    query = query.eq("is_archived", true);
  }

  const term = searchTerm(q);
  if (term) {
    query = query.or(`person_name.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (error) log("listAllStories", error);

  const rows = (data ?? []) as Row[];
  const total = count ?? rows.length;
  return {
    items: mapRows(rows),
    page: safePage,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: safePage * pageSize < total,
  };
}

export async function countStoriesByStatus(): Promise<Record<StoryStatus, number>> {
  const supabase = await adminClient();
  if (!supabase) return { draft: 0, published: 0, archived: 0 };
  const [draft, published, archived] = await Promise.all([
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false)
      .eq("is_archived", false),
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("is_archived", false),
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", true),
  ]);
  return {
    draft: draft.count ?? 0,
    published: published.count ?? 0,
    archived: archived.count ?? 0,
  };
}

export async function countFeaturedStories(): Promise<number> {
  const supabase = await adminClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("is_featured", true);
  if (error) log("countFeaturedStories", error);
  return count ?? 0;
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await adminClient();
  if (!supabase) return false;
  let query = supabase.from("stories").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) log("slugExists", error);
  return (data ?? []).length > 0;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface StoryInput {
  slug: string;
  title: string;
  personName: string;
  excerpt: string;
  body: string;
  portraitUrl: string;
  imageAlt: string;
  portraitVerified: boolean;
  categoryId: string | null;
  publicationDate: string | null;
  status: StoryStatus;
  isFeatured: boolean;
  isSample: boolean;
  sourceLinkedinUrl: string;
  sourceLinkedinPostId: string;
  seoTitle: string;
  seoDescription: string;
  authorCredit: string;
}

function categoryNameFor(id: string | null): string {
  if (!id) return "";
  return getCategoryById(id)?.name ?? "";
}

function toRow(input: StoryInput, publishedAt: string | null): Row {
  return {
    slug: input.slug,
    title: input.title,
    person_name: input.personName,
    excerpt: input.excerpt,
    content: input.body,
    cover_image_url: input.portraitUrl,
    image_alt: input.imageAlt,
    portrait_verified: input.portraitVerified,
    category: categoryNameFor(input.categoryId),
    source_linkedin_url: input.sourceLinkedinUrl,
    source_linkedin_post_id: input.sourceLinkedinPostId,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    author_credit: input.authorCredit,
    is_sample: input.isSample,
    is_featured: input.isFeatured,
    is_published: input.status === "published",
    is_archived: input.status === "archived",
    published_at: publishedAt,
    updated_at: nowIso(),
  };
}

export async function createStory(input: StoryInput): Promise<Story> {
  const supabase = await createSupabaseServerClient();
  const ts = nowIso();
  const publishedAt =
    input.status === "published" ? input.publicationDate ?? ts : null;

  const { data, error } = await supabase
    .from("stories")
    .insert({ ...toRow(input, publishedAt), created_at: ts })
    .select("*")
    .single();
  if (error) throw storyWriteError("create", error);
  return mapRows([data as Row])[0];
}

export async function updateStory(
  id: string,
  input: StoryInput,
): Promise<Story | null> {
  const existing = await getStoryById(id);
  if (!existing) return null;

  const ts = nowIso();
  const publishedAt =
    input.status === "published"
      ? existing.publishedAt ?? input.publicationDate ?? ts
      : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .update(toRow(input, publishedAt))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw storyWriteError("update", error);
  return mapRows([data as Row])[0];
}

/**
 * Apply a PARTIAL update to a story. Only the keys present in `patch` are
 * written; everything else keeps its current value.
 */
export async function patchStory(
  id: string,
  patch: Partial<StoryInput>,
): Promise<Story | null> {
  const existing = await getStoryById(id);
  if (!existing) return null;

  const next: StoryInput = {
    slug: existing.slug,
    title: existing.title,
    personName: existing.personName,
    excerpt: existing.excerpt,
    body: existing.body,
    portraitUrl: existing.portraitUrl,
    imageAlt: existing.imageAlt,
    portraitVerified: existing.portraitVerified,
    categoryId: existing.categoryId,
    publicationDate: existing.publicationDate,
    status: existing.status,
    isFeatured: existing.isFeatured,
    isSample: existing.isSample,
    sourceLinkedinUrl: existing.sourceLinkedinUrl,
    sourceLinkedinPostId: existing.sourceLinkedinPostId,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    authorCredit: existing.authorCredit,
    ...patch,
  };

  // A photograph can only be "verified" if one is attached.
  if (!next.portraitUrl) next.portraitVerified = false;

  const ts = nowIso();
  const publishedAt =
    next.status === "published"
      ? existing.publishedAt ?? next.publicationDate ?? ts
      : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .update(toRow(next, publishedAt))
    .eq("id", id)
    .select("*")
    .single();
  // A database failure must never be reported as "story not found": the API
  // turns this into a 500 with a useful message instead of a fake success.
  if (error) throw storyWriteError("update", error);
  return mapRows([data as Row])[0];
}

export async function setStoryStatus(
  id: string,
  status: StoryStatus,
): Promise<boolean> {
  const existing = await getStoryById(id);
  if (!existing) return false;

  const ts = nowIso();
  const publishedAt =
    status === "published" ? existing.publishedAt ?? ts : existing.publishedAt;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .update({
      is_published: status === "published",
      is_archived: status === "archived",
      published_at: publishedAt,
      updated_at: ts,
    })
    .eq("id", id)
    .select("id");
  if (error) throw storyWriteError("update", error);
  return (data ?? []).length > 0;
}

export async function setStoryFeatured(
  id: string,
  featured: boolean,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ is_featured: featured, updated_at: nowIso() })
    .eq("id", id)
    .select("id");
  if (error) throw storyWriteError("update", error);
  return (data ?? []).length > 0;
}

export async function deleteStory(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw storyWriteError("delete", error);
  return (data ?? []).length > 0;
}

/** Ensure a unique slug, suffixing -2, -3 … when needed. */
export async function ensureUniqueSlug(
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(desired);
  let candidate = base;
  let n = 2;
  while (await slugExists(candidate, excludeId)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 500) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}
