import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { sanitizeRichText, sanitizePlainText, sanitizeMultilineText } from "@/lib/sanitize";
import {
  createStory,
  listAllStories,
  ensureUniqueSlug,
} from "@/lib/repositories/stories";
import { ensureCategoryByName, getCategoryById } from "@/lib/repositories/categories";
import { isTrueFlag, slugify } from "@/lib/utils";
import type { StoryStatus } from "@/lib/types";

/**
 * Admin stories API.
 * GET  — list all stories (any status) with search + filter
 * POST — create a story (draft by default)
 * All routes are guarded server-side by session cookie.
 */

async function guard() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return admin;
}

export async function GET(req: NextRequest) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") as StoryStatus | "all") || "all";
  const q = sp.get("q") || "";
  const page = Number(sp.get("page")) || 1;

  const result = await listAllStories({ status, q, page, pageSize: 20 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  const title = sanitizePlainText(body.title, 200);
  const personName = sanitizePlainText(body.personName, 150);
  const excerpt = sanitizeMultilineText(body.excerpt, 600);
  const bodyHtml = sanitizeRichText(typeof body.body === "string" ? body.body : "");
  const portraitUrl = sanitizePlainText(body.portraitUrl, 500);
  const imageAlt = sanitizePlainText(body.imageAlt, 300);
  const portraitVerified = isTrueFlag(body.portraitVerified) && Boolean(portraitUrl);
  const publicationDate =
    typeof body.publicationDate === "string" && body.publicationDate
      ? body.publicationDate
      : null;
  const status = (["draft", "published", "archived"] as const).includes(
    body.status as StoryStatus,
  )
    ? (body.status as StoryStatus)
    : "draft";
  const isFeatured = isTrueFlag(body.isFeatured);
  const sourceLinkedinUrl = sanitizePlainText(body.sourceLinkedinUrl, 500);
  const seoTitle = sanitizePlainText(body.seoTitle, 200);
  const seoDescription = sanitizePlainText(body.seoDescription, 300);
  const authorCredit = sanitizePlainText(body.authorCredit, 150);
  const categoryName =
    typeof body.categoryName === "string" ? sanitizePlainText(body.categoryName, 80) : "";
  const rawCategoryId =
    typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;

  if (!personName) errors.personName = "The person's name is required.";
  if (!bodyHtml) errors.body = "The story content is required.";

  // The slug falls back to the person's name (no separate title is entered).
  const desiredSlug = slugify(
    typeof body.slug === "string" && body.slug.trim() ? body.slug : personName,
  );
  if (!desiredSlug) errors.slug = "A valid slug could not be generated.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", errors },
      { status: 422 },
    );
  }

  const slug = await ensureUniqueSlug(desiredSlug);
  // The editor sends categoryId; categoryName is accepted as a fallback.
  const categoryId =
    rawCategoryId && (await getCategoryById(rawCategoryId))
      ? rawCategoryId
      : categoryName
        ? await ensureCategoryByName(categoryName)
        : null;

  let story;
  try {
    story = await createStory({
      slug,
      title,
      personName,
      excerpt,
      body: bodyHtml,
      portraitUrl,
      imageAlt: imageAlt || (portraitUrl ? `Portrait of ${personName}` : ""),
      portraitVerified,
      categoryId,
      publicationDate,
      status,
      isFeatured,
      isSample: false,
      sourceLinkedinUrl,
      sourceLinkedinPostId: sanitizePlainText(body.sourceLinkedinPostId, 120),
      seoTitle,
      seoDescription,
      authorCredit,
    });
  } catch (err) {
    console.error("[admin/stories] create failed:", err);
    return NextResponse.json(
      { error: "The story could not be saved. Please try again." },
      { status: 500 },
    );
  }

  await logActivity(admin, "story.created", "story", story.id);

  return NextResponse.json({ ok: true, story }, { status: 201 });
}
