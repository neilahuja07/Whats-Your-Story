import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { saveFounderPortraitToStorage, UploadError } from "@/lib/uploads";
import { sanitizePlainText } from "@/lib/sanitize";
import { recordPortraitImport } from "@/lib/repositories/portraitImports";

/**
 * POST /api/admin/portraits/upload-direct
 *
 * Same validation as the story upload, but stores the file WITHOUT
 * attaching it to a story (used for the founder portrait). The bytes go to
 * the public Supabase Storage bucket `story-images` under `founder/` —
 * nothing is ever written to the local filesystem. The caller then saves
 * the returned URL through the founder API, where the verification flag is
 * set separately.
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
      { error: "Choose a photograph to import." },
      { status: 422 },
    );
  }

  const personName = sanitizePlainText(formData.get("personName"), 150) || "founder";
  const sourceNote = sanitizePlainText(formData.get("sourceNote"), 500);
  const sourceLink = sanitizePlainText(formData.get("link"), 500);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveFounderPortraitToStorage(
      { buffer, declaredName: file.name, mimeType: file.type },
      personName,
    );

    await recordPortraitImport({
      storyId: null,
      fileName: saved.fileName,
      originalName: file.name,
      sourceNote: [sourceNote, sourceLink].filter(Boolean).join(" | "),
      personMatch: "unconfirmed",
      permissionOk: false,
      importedBy: admin.email,
    });

    await logActivity(admin, "portrait.imported", "founder", null);

    return NextResponse.json({
      ok: true,
      portraitUrl: saved.publicUrl,
      fileName: saved.fileName,
    });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[portrait-upload-direct] failed:", err);
    return NextResponse.json(
      { error: "The photograph could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
