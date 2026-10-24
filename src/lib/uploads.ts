import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uid } from "@/lib/utils";

/**
 * Image upload handling for portraits — Supabase Storage only.
 *
 * All photographs live in the public Supabase Storage bucket `story-images`
 * (policies in supabase_setup.sql):
 *   stories/<storyId>/<person-slug>.<ext>  — story cover photographs
 *   collage/<uid>-<person-slug>.<ext>      — homepage hero collage
 *   founder/<uid>-<person-slug>.<ext>      — the founder portrait
 * Nothing is ever written to the local filesystem: Vercel's filesystem is
 * read-only outside the build and not persistent application storage.
 *
 * Security:
 *  - Only real JPEG/PNG/WebP files are accepted (validated by magic bytes,
 *    not by the declared content type or extension).
 *  - File size is capped (MAX_UPLOAD_MB, default 5).
 *  - Object names are sanitised; original names are kept only as metadata.
 *  - A uid keeps every upload collision-free.
 */

const STORAGE_BUCKET = "story-images";

const MAX_BYTES = () =>
  Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;

export interface UploadedImage {
  buffer: Buffer;
  declaredName: string;
  mimeType: string;
}

export type ImageFormat = "jpeg" | "png" | "webp";

export class UploadError extends Error {}

/** Detect the real image format from file magic bytes. */
export function detectImageFormat(buf: Buffer): ImageFormat | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "webp";
  return null;
}

/**
 * Build a descriptive filename from a person's name:
 * "Amara Okafor-Diallo" → "amara-okafor-diallo.jpg"
 */
export function descriptiveFileName(personName: string, format: ImageFormat): string {
  const ext = format === "jpeg" ? "jpg" : format;
  const slug = personName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "portrait"}.${ext}`;
}

/** Shared byte validation used by every upload path. Validated bytes → format. */
export function validateImageBytes(buffer: Buffer, originalName: string): ImageFormat {
  if (!buffer?.length) throw new UploadError("The uploaded file is empty.");
  if (buffer.length > MAX_BYTES()) {
    throw new UploadError(
      `The image is larger than the ${Math.round(MAX_BYTES() / 1024 / 1024)} MB limit.`,
    );
  }
  const format = detectImageFormat(buffer);
  if (!format) {
    throw new UploadError(
      `"${originalName}" is not a JPEG, PNG, or WebP photograph.`,
    );
  }
  return format;
}

/** Turn a Supabase Storage upload error into a message the admin can act on. */
export function storageUploadError(err: { message: string }): UploadError {
  return new UploadError(
    /Bucket not found/i.test(err.message)
      ? "The image storage bucket is missing. Run supabase_setup.sql (see SUPABASE_SETUP.md)."
      : /row-level security|permission denied/i.test(err.message)
        ? "Supabase refused the upload (Row Level Security). Confirm your account is listed in admin_users."
        : `The photograph could not be uploaded: ${err.message}`,
  );
}

/**
 * Validate a portrait and store it in Supabase Storage under `founder/`
 * (used for the founder photograph, which is not attached to a story).
 *
 * @returns the public URL and the Storage object path
 * @throws UploadError with a user-safe message when validation/upload fails
 */
export async function saveFounderPortraitToStorage(
  file: UploadedImage,
  personName: string,
): Promise<{ publicUrl: string; fileName: string; format: ImageFormat }> {
  const format = validateImageBytes(file.buffer, file.declaredName || "portrait");

  const supabase = await createSupabaseServerClient();
  const objectPath = `founder/${uid()}-${descriptiveFileName(personName, format)}`;
  const contentType =
    format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, file.buffer, { contentType, upsert: false });
  if (upload.error) throw storageUploadError(upload.error);

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return { publicUrl: data.publicUrl, fileName: objectPath, format };
}

/**
 * Validate a portrait and store it in Supabase Storage under `team/`
 * (used for Core Team member photographs).
 *
 * @returns the public URL and the Storage object path
 * @throws UploadError with a user-safe message when validation/upload fails
 */
export async function saveTeamPortraitToStorage(
  file: UploadedImage,
  personName: string,
): Promise<{ publicUrl: string; fileName: string; format: ImageFormat }> {
  const format = validateImageBytes(file.buffer, file.declaredName || "portrait");

  const supabase = await createSupabaseServerClient();
  const objectPath = `team/${uid()}-${descriptiveFileName(personName, format)}`;
  const contentType =
    format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, file.buffer, { contentType, upsert: false });
  if (upload.error) throw storageUploadError(upload.error);

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return { publicUrl: data.publicUrl, fileName: objectPath, format };
}
