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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uid, COLLAGE_MAX } from "@/lib/utils";
import {
  addCollagePortrait,
  deleteCollagePortrait,
  getCollagePortrait,
  listCollagePortraits,
  moveCollagePortrait,
  replaceCollagePortrait,
  setCollagePortraitEnabled,
  setCollagePortraitVerified,
} from "@/lib/repositories/collagePortraits";

/**
 * Admin API for the homepage hero collage (Admin → Portraits).
 *
 *   POST   /api/admin/collage  — upload one or many photographs
 *                                (multipart: files[], confirm, replaceId?)
 *   PATCH  /api/admin/collage  — enable/disable, verify, reorder (JSON)
 *   DELETE /api/admin/collage  — delete a photograph (JSON { id })
 *
 * Files go to the existing public Supabase Storage bucket `story-images`
 * under `collage/`; metadata lives in the local `collage_portraits` table.
 * Uploads are validated by magic bytes (JPEG/PNG/WebP) and size. At most
 * COLLAGE_MAX (30) portraits can be ENABLED for the homepage at once.
 */

const STORAGE_BUCKET = "story-images";
const MAX_FILES_PER_REQUEST = COLLAGE_MAX;

const MAX_BYTES = () => Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;

const CONTENT_TYPE: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Validate the bytes and upload one file to Storage under collage/. */
async function uploadToStorage(
  file: File,
): Promise<{ storagePath: string; url: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new UploadError("The uploaded file is empty.");
  if (buffer.length > MAX_BYTES()) {
    throw new UploadError(
      `"${file.name}" is larger than the ${Math.round(MAX_BYTES() / 1024 / 1024)} MB limit.`,
    );
  }
  const format = detectImageFormat(buffer);
  if (!format) {
    throw new UploadError(
      `"${file.name}" is not a JPEG, PNG, or WebP photograph.`,
    );
  }

  const supabase = await createSupabaseServerClient();
  // A unique uid keeps every upload collision-free; the (sanitised) original
  // name is kept alongside it so the object stays understandable in Storage.
  const base = file.name.replace(/\.[^.]+$/, "") || "portrait";
  const storagePath = `collage/${uid()}-${descriptiveFileName(base, format)}`;

  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: CONTENT_TYPE[format],
      upsert: false,
    });

  if (upload.error) {
    throw new UploadError(
      /Bucket not found/i.test(upload.error.message)
        ? "The image storage bucket is missing. Run supabase_setup.sql (see SUPABASE_SETUP.md)."
        : /row-level security|permission denied/i.test(upload.error.message)
          ? "Supabase refused the upload (Row Level Security). Confirm your account is listed in admin_users."
          : `The photograph could not be uploaded: ${upload.error.message}`,
    );
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return { storagePath, url: data.publicUrl };
}

/** Best-effort removal of a collage object (never touches other folders). */
async function removeFromStorage(storagePath: string): Promise<void> {
  if (!storagePath.startsWith("collage/")) return;
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  } catch (err) {
    console.warn("[collage] could not remove storage object:", err);
  }
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

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);
  const confirmed = formData.get("confirm") === "on";
  const replaceId = sanitizePlainText(formData.get("replaceId"), 64);

  /* ------------------------- replace one file ------------------------- */
  if (replaceId) {
    const existing = getCollagePortrait(replaceId);
    if (!existing) {
      return NextResponse.json({ error: "Portrait not found." }, { status: 404 });
    }
    if (files.length !== 1) {
      return NextResponse.json(
        { error: "Choose exactly one photograph to replace the current one." },
        { status: 422 },
      );
    }

    try {
      const up = await uploadToStorage(files[0]);
      const updated = replaceCollagePortrait(replaceId, {
        storagePath: up.storagePath,
        url: up.url,
        verified: confirmed,
      });
      if (!updated) {
        return NextResponse.json(
          { error: "The photograph uploaded, but it could not be saved. Please try again." },
          { status: 500 },
        );
      }
      // The new file is stored; only then drop the old object.
      await removeFromStorage(existing.storagePath);
      logActivity(admin.id, "collage.updated", "collage", replaceId);
      return NextResponse.json({
        ok: true,
        portrait: updated,
        portraits: listCollagePortraits(),
      });
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      console.error("[collage] replace failed:", err);
      return NextResponse.json(
        { error: "The photograph could not be saved. Please try again." },
        { status: 500 },
      );
    }
  }

  /* --------------------------- new uploads ---------------------------- */
  if (files.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one photograph to upload." },
      { status: 422 },
    );
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_FILES_PER_REQUEST} photographs at a time.` },
      { status: 422 },
    );
  }

  const warnings: string[] = [];
  let created = 0;

  for (const file of files) {
    try {
      const up = await uploadToStorage(file);
      const { clamped } = addCollagePortrait({
        storagePath: up.storagePath,
        url: up.url,
        originalName: file.name,
        verified: confirmed,
      });
      created += 1;
      if (clamped) {
        warnings.push(
          `"${file.name}" was added but hidden — the homepage collage already has ${COLLAGE_MAX} portraits selected.`,
        );
      }
    } catch (err) {
      if (err instanceof UploadError) {
        warnings.push(err.message);
      } else {
        console.error("[collage] upload failed:", err);
        warnings.push(`"${file.name}" could not be saved. Please try again.`);
      }
    }
  }

  if (created === 0) {
    return NextResponse.json(
      { error: warnings[0] || "None of the photographs could be uploaded." },
      { status: 422 },
    );
  }

  if (!confirmed) {
    warnings.push(
      "Photographs were stored unverified — confirm permission on each one before it can appear on the homepage.",
    );
  }

  logActivity(admin.id, "collage.uploaded", "collage", null);

  return NextResponse.json({
    ok: true,
    portraits: listCollagePortraits(),
    warnings,
  });
}

export async function PATCH(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = sanitizePlainText(body.id, 64);
  const action = typeof body.action === "string" ? body.action : "";
  if (!id) {
    return NextResponse.json({ error: "Portrait id is required." }, { status: 422 });
  }

  switch (action) {
    case "enable":
    case "disable": {
      const res = setCollagePortraitEnabled(id, action === "enable");
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 409 });
      }
      break;
    }
    case "verify":
      if (!setCollagePortraitVerified(id, true)) {
        return NextResponse.json({ error: "Portrait not found." }, { status: 404 });
      }
      break;
    case "unverify":
      if (!setCollagePortraitVerified(id, false)) {
        return NextResponse.json({ error: "Portrait not found." }, { status: 404 });
      }
      break;
    case "moveUp":
    case "moveDown":
      moveCollagePortrait(id, action === "moveUp" ? "up" : "down");
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 422 });
  }

  logActivity(admin.id, "collage.updated", "collage", id);
  return NextResponse.json({ ok: true, portraits: listCollagePortraits() });
}

export async function DELETE(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = sanitizePlainText(body.id, 64);
  if (!id) {
    return NextResponse.json({ error: "Portrait id is required." }, { status: 422 });
  }

  const existing = getCollagePortrait(id);
  if (!existing) {
    return NextResponse.json({ error: "Portrait not found." }, { status: 404 });
  }

  deleteCollagePortrait(id);
  // The record is gone; removing the file is best-effort.
  await removeFromStorage(existing.storagePath);
  logActivity(admin.id, "collage.deleted", "collage", id);

  return NextResponse.json({ ok: true, portraits: listCollagePortraits() });
}
