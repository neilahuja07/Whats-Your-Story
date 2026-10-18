import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Key/value store for editable public-page content (Supabase table
 * `site_content`).
 *
 * Reads use the ANON client, so Row Level Security's public-read policy
 * guarantees only this table's own content is visible. Writes use the
 * signed-in administrator's session and require the admin allowlist.
 *
 * Any missing key (fresh database, Supabase not configured yet) falls back to
 * the built-in defaults below, so the public pages always render.
 */

export const SITE_CONTENT_KEYS = {
  homeHeadline: "home.headline",
  homeSupportingText: "home.supporting_text",
  homeAboutHeading: "home.about_heading",
  homeAboutBody: "home.about_body",
  aboutPageBody: "about.page_body",
  aboutVision: "about.vision",
  sharePageIntro: "share.page_intro",
  footerDescription: "footer.description",
  contactEmail: "contact.email",
  linkedinPageUrl: "social.linkedin_url",
  siteMetaTitle: "site.meta_title",
  siteMetaDescription: "site.meta_description",
  privacyPageBody: "privacy.page_body",
  termsPageBody: "terms.page_body",
  submissionConsentText: "share.consent_text",
} as const;

export type SiteContentKey =
  (typeof SITE_CONTENT_KEYS)[keyof typeof SITE_CONTENT_KEYS];

export const SITE_CONTENT_DEFAULTS: Record<SiteContentKey, string> = {
  "home.headline": "Every Life Has a Story Worth Telling.",
  "home.supporting_text":
    "Behind every face is a journey. Discover the experiences, struggles, and triumphs that remind us what it means to be human.",
  "home.about_heading": "Why We Exist",
  "home.about_body":
    "What's Your Story exists because we believe every individual carries a story worth hearing. The quiet ones. The difficult ones. The ones that changed a life.\n\nPersonal experiences, honestly told, can inspire someone standing at the same crossroads years later. They create understanding where there was once distance, and connection where there was once silence.\n\nThis platform is a place for untold stories to be heard — told with dignity, published with care, and shared with the world.",
  "about.page_body":
    "What's Your Story is a storytelling initiative with a simple belief: behind every face is a journey worth hearing.\n\nWe publish real-life stories about people — their experiences, struggles, achievements, personal journeys, and moments that deserve to be heard. Every story we share is submitted by an individual and reviewed by our editorial team before publication.\n\nWe are not interested in spectacle. We are interested in truth: the quiet courage of ordinary people, the turning points that reshape a life, and the lessons that only come from lived experience.\n\nEvery story published here belongs to the person who lived it. We publish only with their knowledge and permission.",
  "about.vision":
    "A world where no meaningful human experience goes unheard — and where reading someone's story makes the world feel a little smaller, and a little kinder.",
  "share.page_intro":
    "Your story matters. If you have lived something — a struggle, a turning point, an achievement, a quiet journey — and believe it could mean something to someone else, we would be honoured to read it.",
  "footer.description":
    "What's Your Story publishes real-life stories about people, their experiences, struggles, and triumphs. The voice of untold stories.",
  "contact.email": "",
  "social.linkedin_url": "https://www.linkedin.com/company/whatsyourstoryy/",
  "site.meta_title": "What's Your Story — The Voice of Untold Stories",
  "site.meta_description":
    "Discover real-life stories about people, their experiences, struggles, achievements, and personal journeys. Share your own story with What's Your Story.",
  "privacy.page_body":
    "DRAFT — requires legal review before launch.\n\nWe collect the personal information you choose to share when you submit a story, including your name, email address, and the content of your submission. We use this information only to review your submission and contact you about it.\n\nWe do not publish submitted stories automatically. A story becomes public only after our editorial team has reviewed it and confirmed the necessary permissions with you.\n\nYou may request access to, correction of, or deletion of your submission at any time by contacting us.",
  "terms.page_body":
    "DRAFT — requires legal review before launch.\n\nBy submitting a story to What's Your Story you confirm that you have the right to share the content you are submitting and that it does not infringe the rights of others.\n\nSubmission does not guarantee publication. Our editorial team reviews every submission and decides whether to publish it.\n\nWe will contact you before publishing your story and will confirm the permissions required to display your name, photograph, and story.",
  "share.consent_text":
    "I confirm that I have the right to submit this story and its contents, and I agree that What's Your Story may review my submission and contact me about it. I understand that submitting a story does not automatically publish it or grant permission for public publication.",
};

let warnedAboutConfig = false;

function warnNotConfigured(): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;
  console.warn(
    "[site-content] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
      "using built-in default content. See SUPABASE_SETUP.md.",
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Read all site content as a plain object (missing keys fall back to defaults). */
export async function getSiteContent(): Promise<
  Partial<Record<SiteContentKey, string>>
> {
  const out: Record<string, string> = { ...SITE_CONTENT_DEFAULTS };
  const supabase = publicClient();
  if (!supabase) return out as Partial<Record<SiteContentKey, string>>;

  const { data, error } = await supabase
    .from("site_content")
    .select("key, content");
  if (error) {
    // A missing table (migration SQL not run yet) degrades to defaults.
    console.error("[site-content] read failed:", error.message);
    return out as Partial<Record<SiteContentKey, string>>;
  }
  for (const row of (data ?? []) as Row[]) {
    if (row.key in SITE_CONTENT_DEFAULTS) {
      out[row.key] = String(row.content ?? "");
    }
  }
  return out as Partial<Record<SiteContentKey, string>>;
}

export async function getSiteContentValue(key: SiteContentKey): Promise<string> {
  const supabase = publicClient();
  if (!supabase) return SITE_CONTENT_DEFAULTS[key];

  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[site-content] read failed:", error.message);
    return SITE_CONTENT_DEFAULTS[key];
  }
  const content = (data as Row | null)?.content;
  if (content) return String(content);
  return SITE_CONTENT_DEFAULTS[key];
}

/**
 * Upsert a subset of site-content keys (admin save). Unknown keys are
 * ignored, exactly as before. `updated_at` is maintained by a database
 * trigger.
 */
export async function setSiteContent(
  entries: Record<string, string>,
): Promise<void> {
  const rows = Object.entries(entries)
    .filter(([key]) => key in SITE_CONTENT_DEFAULTS)
    .map(([key, content]) => ({ key, content }));
  if (rows.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_content")
    .upsert(rows, { onConflict: "key" });
  if (error) {
    throw new Error(
      /could not find the table|does not exist|schema cache/i.test(error.message)
        ? "The site_content table is missing in Supabase. Run supabase_migration_persistence.sql in the SQL Editor, then try again."
        : /permission denied|row-level security|violates row-level/i.test(error.message)
          ? "Supabase refused the change (Row Level Security). Confirm your account is listed in the admin_users table."
          : `Could not save the site content: ${error.message}`,
    );
  }
}
