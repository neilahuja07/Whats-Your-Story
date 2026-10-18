import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  sanitizeRichText,
  sanitizePlainText,
  sanitizeMultilineText,
} from "@/lib/sanitize";
import {
  getStoryById,
  patchStory,
  deleteStory,
  setStoryStatus,
  setStoryFeatured,
  ensureUniqueSlug,
  type StoryInput,
} from "@/lib/repositories/stories";
import { ensureCategoryByName, getCategoryById } from "@/lib/repositories/categories";
import { isTrueFlag, slugify } from "@/lib/utils";
import type { StoryStatus } from "@/lib/types";

/**
 * Admin story API (single story).
 * GET    — fetch
 * PATCH  — update (full form save)
 * DELETE — delete (with confirmation in the UI)
 *
 * Special PATCH actions: { action: "publish" | "unpublish" | "archive" | "feature" | "unfeature" }
 */

async function guard() {
  return getCurrentAdmin();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  return NextResponse.json({ story });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await getStoryById(id);
  if (!existing) return NextResponse.json({ error: "Story not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  /* -------- simple actions -------- */
  const action = typeof body.action === "string" ? body.action : null;
  if (action) {
    // Every action performs a database WRITE. If Supabase refuses the change,
    // report it plainly — never `{ ok: true }` when nothing was saved.
    try {
      switch (action) {
        case "publish":
          // Guardrail: a story can only be published once any attached
          // photograph has been verified (identity + permission).
          if (existing.portraitUrl && !existing.portraitVerified) {
            return NextResponse.json(
              {
                error:
                  "Verify the attached photograph (identity + permission) before publishing this story.",
              },
              { status: 422 },
            );
          }
          if (!(await setStoryStatus(id, "published"))) {
            return NextResponse.json(
              { error: "Story not found." },
              { status: 404 },
            );
          }
          logActivity(admin.id, "story.published", "story", id);
          return NextResponse.json({ ok: true, status: "published" });
        case "unpublish":
          if (!(await setStoryStatus(id, "draft"))) {
            return NextResponse.json(
              { error: "Story not found." },
              { status: 404 },
            );
          }
          logActivity(admin.id, "story.unpublished", "story", id);
          return NextResponse.json({ ok: true, status: "draft" });
        case "archive":
          if (!(await setStoryStatus(id, "archived"))) {
            return NextResponse.json(
              { error: "Story not found." },
              { status: 404 },
            );
          }
          logActivity(admin.id, "story.archived", "story", id);
          return NextResponse.json({ ok: true, status: "archived" });
        case "feature":
          if (!(await setStoryFeatured(id, true))) {
            return NextResponse.json(
              { error: "Story not found." },
              { status: 404 },
            );
          }
          logActivity(admin.id, "story.featured", "story", id);
          return NextResponse.json({ ok: true, isFeatured: true });
        case "unfeature":
          if (!(await setStoryFeatured(id, false))) {
            return NextResponse.json(
              { error: "Story not found." },
              { status: 404 },
            );
          }
          logActivity(admin.id, "story.unfeatured", "story", id);
          return NextResponse.json({ ok: true, isFeatured: false });
        default:
          return NextResponse.json({ error: "Unknown action." }, { status: 400 });
      }
    } catch (err) {
      console.error(`[admin/stories] action "${action}" failed:`, err);
      return NextResponse.json(
        {
          error:
            err instanceof Error && err.message
              ? err.message
              : "The change could not be saved. Please try again.",
        },
        { status: 500 },
      );
    }
  }

  /* -------- full / partial form save --------
   * Only fields actually present in the body are written. This keeps partial
   * saves (status toggle, portrait verification, etc.) from clearing the
   * other fields, which previously made the publish controls fail validation.
   */
  const patch: Partial<StoryInput> = {};
  const errors: Record<string, string> = {};

  const has = (k: string) =>
    Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined;

  if (has("title")) {
    patch.title = sanitizePlainText(body.title, 200);
  }
  if (has("personName")) {
    patch.personName = sanitizePlainText(body.personName, 150);
  }
  if (has("excerpt")) {
    patch.excerpt = sanitizeMultilineText(body.excerpt, 600);
  }
  if (has("body")) {
    patch.body = sanitizeRichText(typeof body.body === "string" ? body.body : "");
  }
  if (has("portraitUrl")) {
    patch.portraitUrl = sanitizePlainText(body.portraitUrl, 500);
  }
  if (has("imageAlt")) {
    patch.imageAlt = sanitizePlainText(body.imageAlt, 300);
  }
  if (has("portraitVerified")) {
    patch.portraitVerified = isTrueFlag(body.portraitVerified);
  }
  if (has("publicationDate")) {
    patch.publicationDate =
      typeof body.publicationDate === "string" && body.publicationDate
        ? body.publicationDate
        : null;
  }
  if (has("status")) {
    const s = body.status as StoryStatus;
    patch.status = (["draft", "published", "archived"] as const).includes(s)
      ? s
      : existing.status;
  }
  if (has("isFeatured")) {
    patch.isFeatured = isTrueFlag(body.isFeatured);
  }
  if (has("sourceLinkedinUrl")) {
    patch.sourceLinkedinUrl = sanitizePlainText(body.sourceLinkedinUrl, 500);
  }
  if (has("seoTitle")) {
    patch.seoTitle = sanitizePlainText(body.seoTitle, 200);
  }
  if (has("seoDescription")) {
    patch.seoDescription = sanitizePlainText(body.seoDescription, 300);
  }
  if (has("authorCredit")) {
    patch.authorCredit = sanitizePlainText(body.authorCredit, 150);
  }
  if (has("categoryId") || has("categoryName")) {
    const rawId =
      typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
    const categoryName =
      typeof body.categoryName === "string"
        ? sanitizePlainText(body.categoryName, 80)
        : "";
    if (rawId && getCategoryById(rawId)) {
      patch.categoryId = rawId;
    } else {
      patch.categoryId = categoryName ? ensureCategoryByName(categoryName) : null;
    }
  }

  // Resolve the slug from the incoming person's name (or an explicit slug),
  // else keep the current one. Validate only the fields being changed.
  const nameForSlug = patch.personName ?? existing.personName;
  if (has("slug") || has("personName")) {
    const desiredSlug = slugify(
      typeof body.slug === "string" && body.slug.trim() ? body.slug : nameForSlug,
    );
    if (!desiredSlug) {
      errors.slug = "A valid slug could not be generated.";
    } else {
      patch.slug = await ensureUniqueSlug(desiredSlug, id);
    }
  }

  if (has("personName") && !patch.personName)
    errors.personName = "The person's name is required.";
  if (has("body") && !patch.body) errors.body = "The story content is required.";

  // A photograph can only be verified if one is attached.
  const willHavePortrait =
    (patch.portraitUrl ?? existing.portraitUrl) !== "";
  if (patch.portraitVerified && !willHavePortrait) {
    errors.portraitVerified =
      "There is no photograph attached to this story yet.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", errors },
      { status: 422 },
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, story: existing });
  }

  let story;
  try {
    story = await patchStory(id, patch);
  } catch (err) {
    console.error("[admin/stories] save failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The story could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  logActivity(admin.id, "story.updated", "story", id);

  return NextResponse.json({ ok: true, story });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  let deleted: boolean;
  try {
    deleted = await deleteStory(id);
  } catch (err) {
    console.error("[admin/stories] delete failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The story could not be deleted. Please try again.",
      },
      { status: 500 },
    );
  }
  if (!deleted) return NextResponse.json({ error: "Story not found." }, { status: 404 });

  logActivity(admin.id, "story.deleted", "story", id);
  return NextResponse.json({ ok: true });
}
