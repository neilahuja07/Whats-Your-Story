import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  detectImageFormat,
  descriptiveFileName,
  UploadError,
  type ImageFormat,
} from "@/lib/uploads";
import { sanitizePlainText } from "@/lib/sanitize";
import { recordPortraitImport } from "@/lib/repositories/portraitImports";
import { getStoryById, patchStory } from "@/lib/repositories/stories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/portraits/upload
 *
 * Upload a REAL cover photograph for a story (multipart/form-data) to the
 * public Supabase Storage bucket `story-images`.
 *  - validates the actual file bytes (JPEG/PNG/WebP magic numbers)
 *  - stores it under a descriptive, person-based object name
 *  - records the import (source note, verification state)
 *  - the photograph is stored as UNVERIFIED; verify it in the UI
 *
 * Only administrators may upload: the storage policies in supabase_setup.sql
 * restrict writes to members of the `admin_users` allowlist.
 *
 * Fields: file (required), storyId (required), personName, sourceNote,
 *         link (original source URL), verified ("on" to publish immediately).
 */

const STORAGE_BUCKET = "story-images";

const MAX_BYTES = () => Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;

const CONTENT_TYPE: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Stable storage path for one story: `stories/<storyId>/<person-slug>.<ext>`.
 *
 * Namespacing by story id guarantees two stories can never overwrite each
 * other's photograph, even when they are about the same person, and re-opening
 * the same story always resolves to the same object.
 */
function storyObjectPath(
  storyId: string,
  personName: string,
  format: ImageFormat,
): string {
  return `stories/${storyId}/${descriptiveFileName(personName, format)}`;
}

/** Extract the bucket-relative object path from a stored public URL. */
function objectPathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  // Never delete anything outside this bucket or its stories/ folder.
  if (!path.startsWith("stories/")) return null;
  return path;
}

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
  const storyId = sanitizePlainText(formData.get("storyId"), 64);
  if (!storyId) {
    return NextResponse.json({ error: "Select a story first." }, { status: 422 });
  }

  const story = await getStoryById(storyId);
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a photograph to import." },
      { status: 422 },
    );
  }

  const personName =
    sanitizePlainText(formData.get("personName"), 150) || story.personName;
  const sourceNote = sanitizePlainText(formData.get("sourceNote"), 500);
  const sourceLink = sanitizePlainText(formData.get("link"), 500);
  const verified = formData.get("verified") === "on";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    /* ---------------- validate the actual bytes ---------------- */
    if (!buffer.length) throw new UploadError("The uploaded file is empty.");
    if (buffer.length > MAX_BYTES()) {
      throw new UploadError(
        `The image is larger than the ${Math.round(MAX_BYTES() / 1024 / 1024)} MB limit.`,
      );
    }
    const format = detectImageFormat(buffer);
    if (!format) {
      throw new UploadError(
        "Only JPEG, PNG, or WebP photographs can be imported.",
      );
    }

    /* ------------------- upload to Storage ---------------------- */
    const supabase = await createSupabaseServerClient();
    const objectPath = storyObjectPath(storyId, personName, format);
    const contentType = CONTENT_TYPE[format];

    // `upsert: true` is safe here: the path already contains the story id, so
    // this can only ever replace THIS story's own photograph (which is the
    // intended behaviour when re-uploading), never another story's file.
    const upload = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, buffer, { contentType, upsert: true });

    if (upload.error) {
      throw new UploadError(
        /Bucket not found/i.test(upload.error.message)
          ? "The image storage bucket is missing. Run supabase_setup.sql (see SUPABASE_SETUP.md)."
          : /row-level security|permission denied/i.test(upload.error.message)
            ? "Supabase refused the upload (Row Level Security). Confirm your account is listed in admin_users."
            : `The photograph could not be uploaded: ${upload.error.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(objectPath);
    const publicUrl = publicUrlData.publicUrl;

    // Photographs are attached UNVERIFIED by default; verification is an
    // explicit, separate confirmation of identity + permission.
    const updated = await patchStory(storyId, {
      portraitUrl: publicUrl,
      imageAlt: story.imageAlt || `Portrait of ${story.personName}`,
      portraitVerified: verified,
    });
    if (!updated) {
      throw new UploadError(
        "The photograph uploaded, but it could not be attached to the story. Please try again.",
      );
    }

    // Best-effort tidy-up: drop the previous object when the file type changed
    // (e.g. .jpg -> .png), so the folder does not accumulate orphans. The new
    // file is already saved, so a failure here never affects the story.
    const previousPath = objectPathFromUrl(story.portraitUrl ?? "");
    if (previousPath && previousPath !== objectPath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([previousPath]);
    }

    await recordPortraitImport({
      storyId,
      fileName: objectPath,
      originalName: file.name,
      sourceNote: [sourceNote, sourceLink].filter(Boolean).join(" | "),
      personMatch: verified ? "confirmed" : "unconfirmed",
      permissionOk: verified,
      importedBy: admin.email,
    });

    await logActivity(
      admin,
      verified ? "portrait.verified" : "portrait.imported",
      "story",
      storyId,
    );

    return NextResponse.json({
      ok: true,
      portraitUrl: publicUrl,
      fileName: objectPath,
      verified,
    });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[portrait-upload] failed:", err);
    return NextResponse.json(
      {
        error: "The photograph could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }
}
