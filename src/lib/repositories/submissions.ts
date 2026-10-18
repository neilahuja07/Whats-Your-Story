import { nowIso, uid } from "@/lib/utils";
import { listCategories } from "@/lib/repositories/categories";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type {
  ConsentRecord,
  Paginated,
  StorySubmission,
  SubmissionReviewStatus,
} from "@/lib/types";

/**
 * Story submissions repository — backed by Supabase (table `story_submissions`).
 *
 * Members of the public may only INSERT, and every inserted row is forced to
 * `status = 'pending_review'` by Row Level Security, so a submission can never
 * publish itself. Reading, updating and deleting require an administrator.
 *
 * Column mapping (Supabase column ← app field):
 *   name ← submitterName   title ← storyTitle   content ← storyContent
 *   status ← reviewStatus  consent_given ← consentRecords.length > 0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function log(label: string, error: unknown): void {
  if (error) console.error(`[submissions] ${label}:`, error);
}

/**
 * Build an error for a failed database WRITE.
 *
 * Read errors are logged and degrade to empty results, but a write that fails
 * must never look like a success to the user, so these always throw.
 */
type PostgrestErrorLike = { message?: string };

function submissionWriteError(verb: string, error: PostgrestErrorLike): Error {
  const message = error?.message ?? "unknown error";
  if (/could not find the table|does not exist|schema cache/i.test(message)) {
    return new Error(
      "The submissions table is missing in Supabase. Run supabase_setup.sql in the SQL Editor, then try again.",
    );
  }
  if (/permission denied|row-level security|violates row-level/i.test(message)) {
    return new Error(
      "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table.",
    );
  }
  return new Error(`Could not ${verb} the submission: ${message}`);
}

let warnedAboutConfig = false;

function warnNotConfigured(): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;
  console.warn(
    "[submissions] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
      "submissions cannot be loaded. See SUPABASE_SETUP.md.",
  );
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

function parseConsent(row: Row): ConsentRecord[] {
  if (Array.isArray(row.consent_records)) return row.consent_records as ConsentRecord[];
  if (typeof row.consent_records === "string") {
    try {
      const parsed = JSON.parse(row.consent_records);
      if (Array.isArray(parsed)) return parsed as ConsentRecord[];
    } catch {
      /* fall through */
    }
  }
  // Fall back to a minimal record when only the boolean was stored.
  if (row.consent_given) {
    return [
      {
        text: "Consent to publish was given when this story was submitted.",
        version: "1",
        acceptedAt: row.created_at ?? "",
        ip: null,
        userAgent: null,
      },
    ];
  }
  return [];
}

function mapSubmission(row: Row, byName: Map<string, string>): StorySubmission {
  const category = row.category ? String(row.category) : "";
  return {
    id: row.id,
    submitterName: row.name ?? "",
    email: row.email ?? "",
    storyTitle: row.title ?? "",
    storyContent: row.content ?? "",
    introduction: row.introduction ?? "",
    categoryId: category ? byName.get(category.toLowerCase()) ?? null : null,
    portraitUrl: row.portrait_url ?? "",
    linkedinProfileUrl: row.linkedin_profile_url ?? "",
    contactNumber: row.contact_number ?? "",
    city: row.city ?? "",
    additionalMessage: row.additional_message ?? "",
    allowNameDisplay: Boolean(row.allow_name_display),
    allowPortraitDisplay: Boolean(row.allow_portrait_display),
    consentRecords: parseConsent(row),
    reviewStatus: row.status as SubmissionReviewStatus,
    reviewerNotes: row.reviewer_notes ?? "",
    linkedStoryId: row.linked_story_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    categoryName: category || null,
  };
}

async function categoryNameMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const c of listCategories()) map.set(c.name.toLowerCase(), c.id);
  return map;
}

function categoryNameFor(id: string | null): string {
  if (!id) return "";
  const found = listCategories().find((c) => c.id === id);
  return found?.name ?? "";
}

export interface SubmissionInput {
  submitterName: string;
  email: string;
  storyTitle: string;
  storyContent: string;
  introduction: string;
  categoryId: string | null;
  portraitUrl: string;
  linkedinProfileUrl: string;
  contactNumber: string;
  city: string;
  additionalMessage: string;
  allowNameDisplay: boolean;
  allowPortraitDisplay: boolean;
  consentRecords: ConsentRecord[];
}

/** Public create — always enters the queue as `pending_review`. */
export async function createSubmission(
  input: SubmissionInput,
): Promise<StorySubmission | null> {
  const supabase = createSupabasePublicClient();
  const ts = nowIso();
  const id = uid();

  // NOTE: no `.select()` here. The anonymous role may INSERT but has no SELECT
  // policy on story_submissions, so `INSERT ... RETURNING` would fail. The row
  // is rebuilt from the input instead.
  const { error } = await supabase.from("story_submissions").insert({
    id,
    name: input.submitterName,
    email: input.email,
    title: input.storyTitle,
    content: input.storyContent,
    introduction: input.introduction,
    category: categoryNameFor(input.categoryId),
    portrait_url: input.portraitUrl,
    linkedin_profile_url: input.linkedinProfileUrl,
    contact_number: input.contactNumber,
    city: input.city,
    additional_message: input.additionalMessage,
    allow_name_display: input.allowNameDisplay,
    allow_portrait_display: input.allowPortraitDisplay,
    consent_given: input.consentRecords.length > 0,
    consent_records: input.consentRecords,
    status: "pending_review",
    reviewer_notes: "",
    created_at: ts,
    updated_at: ts,
  });

  if (error) {
    log("createSubmission", error);
    // The contact_number column was added by a later migration — surface a
    // specific, actionable message instead of a generic failure.
    if (/contact_number/i.test(error.message ?? "")) {
      throw new Error(
        "The contact_number column is missing in Supabase. Run supabase_migration_contact_number.sql in the SQL Editor, then try again.",
      );
    }
    return null;
  }

  const byName = await categoryNameMap();
  return mapSubmission(
    {
      id,
      name: input.submitterName,
      email: input.email,
      title: input.storyTitle,
      content: input.storyContent,
      introduction: input.introduction,
      category: categoryNameFor(input.categoryId),
      portrait_url: input.portraitUrl,
      linkedin_profile_url: input.linkedinProfileUrl,
      contact_number: input.contactNumber,
      city: input.city,
      additional_message: input.additionalMessage,
      allow_name_display: input.allowNameDisplay,
      allow_portrait_display: input.allowPortraitDisplay,
      consent_given: input.consentRecords.length > 0,
      consent_records: input.consentRecords,
      status: "pending_review",
      reviewer_notes: "",
      linked_story_id: null,
      created_at: ts,
      updated_at: ts,
    },
    byName,
  );
}

/* ------------------------------------------------------------------ */
/* Admin queries                                                       */
/* ------------------------------------------------------------------ */

export async function getSubmissionById(
  id: string,
): Promise<StorySubmission | null> {
  const supabase = await adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("story_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) log("getSubmissionById", error);
  if (!data) return null;
  const byName = await categoryNameMap();
  return mapSubmission(data as Row, byName);
}

/** Strip characters that would break a PostgREST `or()` filter expression. */
function searchTerm(q: string): string {
  return q.trim().replace(/[,()%*]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listSubmissions(
  opts: {
    status?: SubmissionReviewStatus | "all";
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Paginated<StorySubmission>> {
  const { status = "all", q = "", page = 1, pageSize = 20 } = opts;
  const supabase = await adminClient();
  if (!supabase) {
    return {
      items: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
      hasMore: false,
    };
  }
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("story_submissions")
    .select("*", { count: "exact" });
  if (status !== "all") query = query.eq("status", status);

  const term = searchTerm(q);
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,title.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) log("listSubmissions", error);

  const rows = (data ?? []) as Row[];
  const byName = await categoryNameMap();
  const total = count ?? rows.length;
  return {
    items: rows.map((r) => mapSubmission(r, byName)),
    page: safePage,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: safePage * pageSize < total,
  };
}

export async function countSubmissionsByStatus(): Promise<Record<string, number>> {
  const supabase = await adminClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("story_submissions")
    .select("status");
  if (error) log("countSubmissionsByStatus", error);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as Row[]) {
    const key = String(row.status);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export async function updateSubmissionStatus(
  id: string,
  reviewStatus: SubmissionReviewStatus,
  reviewerNotes?: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_submissions")
    .update({
      status: reviewStatus,
      reviewer_notes: reviewerNotes ?? "",
      updated_at: nowIso(),
    })
    .eq("id", id)
    .select("id");
  // A write that fails must never be reported as success upstream.
  if (error) throw submissionWriteError("update", error);
  return (data ?? []).length > 0;
}

export async function setSubmissionReviewerNotes(
  id: string,
  notes: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_submissions")
    .update({ reviewer_notes: notes, updated_at: nowIso() })
    .eq("id", id)
    .select("id");
  if (error) throw submissionWriteError("update", error);
  return (data ?? []).length > 0;
}

export async function linkSubmissionToStory(
  submissionId: string,
  storyId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_submissions")
    .update({ linked_story_id: storyId, updated_at: nowIso() })
    .eq("id", submissionId)
    .select("id");
  if (error) throw submissionWriteError("update", error);
  return (data ?? []).length > 0;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_submissions")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw submissionWriteError("delete", error);
  return (data ?? []).length > 0;
}
