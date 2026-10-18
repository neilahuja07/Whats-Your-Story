import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { getSubmissionById, linkSubmissionToStory, updateSubmissionStatus } from "@/lib/repositories/submissions";
import { createStory, ensureUniqueSlug } from "@/lib/repositories/stories";
import { sanitizeRichText, sanitizePlainText, sanitizeMultilineText } from "@/lib/sanitize";

/**
 * POST /api/admin/submissions/[id]/convert
 *
 * Converts an APPROVED submission into a DRAFT story.
 * The draft is never publicly visible until an admin explicitly publishes it,
 * and publishing requires confirmed permissions (handled in the story editor).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  // Only approved submissions can be converted to a draft.
  if (submission.reviewStatus !== "approved") {
    return NextResponse.json(
      {
        error:
          "Only submissions marked as approved can be converted to a story draft.",
      },
      { status: 422 },
    );
  }

  // Build a plain-text body from the submission content.
  const paragraphs = submission.storyContent
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${sanitizePlainText(p, 4000).replace(/</g, "&lt;")}</p>`)
    .join("\n");

  const bodyHtml = sanitizeRichText(paragraphs);

  const slug = await ensureUniqueSlug(subtitleSlug(submission.submitterName));

  let story;
  try {
    story = await createStory({
      slug,
      // Stories are identified by the person's name; any submitted title is
      // kept on the record for reference but is never displayed.
      title: submission.storyTitle || "",
      personName: submission.submitterName,
      excerpt: sanitizeMultilineText(submission.storyContent, 240).slice(0, 240),
      body: bodyHtml,
      portraitUrl: "", // Photographs are attached + verified separately.
      imageAlt: "",
      portraitVerified: false,
      categoryId: submission.categoryId,
      publicationDate: null,
      status: "draft",
      isFeatured: false,
      isSample: false,
      sourceLinkedinUrl: submission.linkedinProfileUrl || "",
      sourceLinkedinPostId: "",
      seoTitle: "",
      seoDescription: "",
      authorCredit: "",
    });
  } catch (err) {
    console.error("[submissions/convert] create failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The draft story could not be created. Please try again.",
      },
      { status: 500 },
    );
  }

  // The draft is saved from here on. If the follow-up linking fails, the story
  // still exists — say so honestly instead of reporting a total failure.
  let warning: string | null = null;
  try {
    await linkSubmissionToStory(id, story.id);
    await updateSubmissionStatus(id, "approved", submission.reviewerNotes);
  } catch (err) {
    console.error("[submissions/convert] linking failed:", err);
    warning =
      "The draft story was created, but this submission could not be linked to it. Update the submission manually.";
  }
  await logActivity(admin, "submission.converted", "story", story.id);

  return NextResponse.json(
    warning ? { ok: true, story, warning } : { ok: true, story },
    { status: 201 },
  );
}

function subtitleSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
