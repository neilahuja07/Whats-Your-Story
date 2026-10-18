import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { getFounderProfile, updateFounderProfile } from "@/lib/repositories/founder";
import { sanitizeRichText, sanitizePlainText, safeImageUrl } from "@/lib/sanitize";
import { isTrueFlag } from "@/lib/utils";

/** GET — current founder profile (admin view, includes draft state). */
export async function GET() {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ founder: getFounderProfile() });
}

/** PATCH — update the founder profile. */
export async function PATCH(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = getFounderProfile();
  const portraitUrl =
    typeof body.portraitUrl === "string"
      ? safeImageUrl(body.portraitUrl)
      : existing.portraitUrl;

  const founder = updateFounderProfile({
    name: sanitizePlainText(body.name, 120),
    role: sanitizePlainText(body.role, 120),
    biography: sanitizeRichText(typeof body.biography === "string" ? body.biography : ""),
    portraitUrl,
    portraitVerified: isTrueFlag(body.portraitVerified) && Boolean(portraitUrl),
    vision: sanitizeRichText(typeof body.vision === "string" ? body.vision : ""),
    motivation: sanitizeRichText(typeof body.motivation === "string" ? body.motivation : ""),
    isDraft: isTrueFlag(body.isDraft),
  });

  logActivity(admin.id, "founder.updated", "founder", "1");
  return NextResponse.json({ ok: true, founder });
}
