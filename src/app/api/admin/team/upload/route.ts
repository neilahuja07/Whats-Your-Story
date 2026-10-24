import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { saveTeamPortraitToStorage, UploadError } from "@/lib/uploads";
import { sanitizePlainText } from "@/lib/sanitize";

/**
 * POST /api/admin/team/upload
 *
 * Upload a portrait photograph for a Core Team member. The image is stored
 * in the public Supabase Storage bucket `story-images` under `team/` —
 * nothing is written to the local filesystem. Returns the public URL
 * which the caller saves through the team member API.
 */
export async function POST(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a photograph to upload." },
      { status: 422 },
    );
  }

  const personName = sanitizePlainText(formData.get("personName"), 150) || "team-member";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveTeamPortraitToStorage(
      { buffer, declaredName: file.name, mimeType: file.type },
      personName,
    );

    await logActivity(admin, "team.portrait.uploaded", "team_member", null);

    return NextResponse.json({
      ok: true,
      imageUrl: saved.publicUrl,
      fileName: saved.fileName,
    });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[team-upload] failed:", err);
    return NextResponse.json(
      { error: "The photograph could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
