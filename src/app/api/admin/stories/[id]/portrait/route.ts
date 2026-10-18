import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { getStoryById, patchStory } from "@/lib/repositories/stories";
import { updatePortraitVerificationForStory } from "@/lib/repositories/portraitImports";
import { sanitizePlainText } from "@/lib/sanitize";

/**
 * PATCH /api/admin/stories/[id]/portrait
 *
 * Explicitly confirm (or revoke) that a stored photograph is of the named
 * person AND that publication has been permitted. Unverified photographs are
 * never rendered on the public site — the neutral placeholder is shown instead.
 *
 * Body: { verified: boolean, note?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const verified = body.verified === true;
  const note = sanitizePlainText(body.note, 500);

  if (verified && !story.portraitUrl) {
    return NextResponse.json(
      { error: "There is no photograph attached to this story yet." },
      { status: 422 },
    );
  }

  // Only the verification flag (and a generated alt if missing) is touched;
  // nothing else about the story is altered.
  try {
    const updated = await patchStory(id, {
      portraitVerified: verified,
      imageAlt:
        story.imageAlt ||
        (story.portraitUrl ? `Portrait of ${story.personName}` : ""),
    });
    if (!updated) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }
  } catch (err) {
    console.error("[portrait-verify] failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The verification could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }

  // Record the verification decision against the imported photograph.
  await updatePortraitVerificationForStory(id, {
    personMatch: verified ? "confirmed" : "unconfirmed",
    permissionOk: verified,
    note,
  });

  await logActivity(admin, "portrait.verified", "story", id);

  return NextResponse.json({ ok: true, verified });
}
