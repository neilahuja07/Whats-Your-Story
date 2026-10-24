import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  getTeamMemberById,
  updateTeamMember,
  deleteTeamMember,
  moveTeamMember,
  listAllTeamMembers,
  type TeamMemberInput,
} from "@/lib/repositories/teamMembers";
import { sanitizePlainText, sanitizeRichText, safeImageUrl } from "@/lib/sanitize";
import { isValidLinkedInUrl, isTrueFlag } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin Core Team API (single member).
 * GET    — fetch one member
 * PATCH  — update (full form save) or action: "moveUp" | "moveDown" | "publish" | "unpublish"
 * DELETE — delete (with confirmation in the UI)
 */

const STORAGE_BUCKET = "story-images";

async function guard() {
  return getCurrentAdmin();
}

/** Best-effort removal of a team member's portrait from Storage. */
async function removeFromStorage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;
  // Extract the object path from the public URL.
  // Public URL format: https://<ref>.supabase.co/storage/v1/object/public/story-images/team/<file>
  const marker = `/story-images/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;
  const objectPath = imageUrl.slice(idx + marker.length);
  if (!objectPath.startsWith("team/")) return;
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.storage.from(STORAGE_BUCKET).remove([objectPath]);
  } catch (err) {
    console.warn("[team] could not remove storage object:", err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const member = await getTeamMemberById(id);
  if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await getTeamMemberById(id);
  if (!existing)
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  /* -------- simple actions -------- */
  const action = typeof body.action === "string" ? body.action : null;
  if (action) {
    try {
      switch (action) {
        case "moveUp":
        case "moveDown": {
          const members = await moveTeamMember(id, action === "moveUp" ? "up" : "down");
          await logActivity(admin, "team.member.reordered", "team_member", id);
          return NextResponse.json({ ok: true, members });
        }
        case "publish": {
          const member = await updateTeamMember(id, {
            name: existing.name,
            role: existing.role,
            bio: existing.bio,
            imageUrl: existing.imageUrl,
            imageAlt: existing.imageAlt,
            linkedinUrl: existing.linkedinUrl,
            isPublished: true,
          });
          await logActivity(admin, "team.member.published", "team_member", id);
          return NextResponse.json({ ok: true, member });
        }
        case "unpublish": {
          const member = await updateTeamMember(id, {
            name: existing.name,
            role: existing.role,
            bio: existing.bio,
            imageUrl: existing.imageUrl,
            imageAlt: existing.imageAlt,
            linkedinUrl: existing.linkedinUrl,
            isPublished: false,
          });
          await logActivity(admin, "team.member.unpublished", "team_member", id);
          return NextResponse.json({ ok: true, member });
        }
        default:
          return NextResponse.json({ error: "Unknown action." }, { status: 400 });
      }
    } catch (err) {
      console.error(`[admin/team] action "${action}" failed:`, err);
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

  /* -------- full form save -------- */
  const name = sanitizePlainText(body.name, 150);
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }

  const role = sanitizePlainText(body.role, 200);
  if (!role) {
    return NextResponse.json(
      { error: "Role / designation is required." },
      { status: 422 },
    );
  }

  const rawLinkedin = sanitizePlainText(body.linkedinUrl, 500);
  if (rawLinkedin && !isValidLinkedInUrl(rawLinkedin)) {
    return NextResponse.json(
      { error: "LinkedIn URL must be a valid https://linkedin.com/… address." },
      { status: 422 },
    );
  }

  // If a new image URL is provided, clean up the old one from storage.
  const newImageUrl = safeImageUrl(body.imageUrl);
  if (newImageUrl && existing.imageUrl && newImageUrl !== existing.imageUrl) {
    await removeFromStorage(existing.imageUrl);
  }

  const input: TeamMemberInput = {
    name,
    role,
    bio: sanitizeRichText(typeof body.bio === "string" ? body.bio : ""),
    imageUrl: newImageUrl || existing.imageUrl,
    imageAlt: sanitizePlainText(body.imageAlt, 300),
    linkedinUrl: rawLinkedin,
    isPublished: isTrueFlag(body.isPublished),
  };

  try {
    const member = await updateTeamMember(id, input);
    await logActivity(admin, "team.member.updated", "team_member", id);
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await guard();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await getTeamMemberById(id);
  if (!existing)
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  let deleted: boolean;
  try {
    deleted = await deleteTeamMember(id);
  } catch (err) {
    console.error("[admin/team] delete failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The team member could not be deleted. Please try again.",
      },
      { status: 500 },
    );
  }
  if (!deleted)
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  // Clean up the portrait from storage (best-effort).
  await removeFromStorage(existing.imageUrl);

  await logActivity(admin, "team.member.deleted", "team_member", id);

  // Return the updated list so the UI can refresh immediately.
  const members = await listAllTeamMembers();
  return NextResponse.json({ ok: true, members });
}
