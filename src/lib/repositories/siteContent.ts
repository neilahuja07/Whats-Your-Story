import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/utils";

/**
 * Key/value store for editable public-page content.
 * Keys are listed in SITE_CONTENT_KEYS with their defaults.
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

/** Read all site content as a plain object (missing keys fall back to defaults). */
export function getSiteContent(): Partial<Record<SiteContentKey, string>> {
  const db = getDb();
  const rows = db.prepare("SELECT key, content FROM site_content").all() as unknown as {
    key: string;
    content: string;
  }[];
  const out: Record<string, string> = { ...SITE_CONTENT_DEFAULTS };
  for (const r of rows) {
    if (r.key in SITE_CONTENT_DEFAULTS) {
      out[r.key] = r.content;
    }
  }
  return out as Partial<Record<SiteContentKey, string>>;
}

export function getSiteContentValue(key: SiteContentKey): string {
  const db = getDb();
  const row = db
    .prepare("SELECT content FROM site_content WHERE key = ?")
    .get(key) as { content: string } | undefined;
  if (row && row.content !== "") return row.content;
  return SITE_CONTENT_DEFAULTS[key];
}

export function setSiteContent(entries: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO site_content (key, content, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
  );
  const ts = nowIso();
  for (const [key, content] of Object.entries(entries)) {
    if (key in SITE_CONTENT_DEFAULTS) {
      stmt.run(key, content, ts);
    }
  }
}
