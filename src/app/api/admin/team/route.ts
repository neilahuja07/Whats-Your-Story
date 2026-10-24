import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  listAllTeamMembers,
  createTeamMember,
} from "@/lib/repositories/teamMembers";
import { sanitizePlainText, sanitizeRichText, safeImageUrl } from "@/lib/sanitize";
import { isValidLinkedInUrl, isTrueFlag } from "@/lib/utils";

/**
 * GET /api/admin/team
 * Returns all team members (published and unpublished) for the admin list.
 */
export async function GET() {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const members = await listAllTeamMembers();
  return NextResponse.json({ members });
}

/**
 * POST /api/admin/team
 * Create a new team member.
 */
export async function POST(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = sanitizePlainText(body.name, 150);
  if (!name) {
    return NextResponse.json(
      { error: "Name is required." },
      { status: 422 },
    );
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

  try {
    const member = await createTeamMember({
      name,
      role,
      bio: sanitizeRichText(typeof body.bio === "string" ? body.bio : ""),
      imageUrl: safeImageUrl(body.imageUrl),
      imageAlt: sanitizePlainText(body.imageAlt, 300),
      linkedinUrl: rawLinkedin,
      isPublished: isTrueFlag(body.isPublished),
    });

    await logActivity(admin, "team.member.created", "team_member", member.id);
    return NextResponse.json({ ok: true, member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
