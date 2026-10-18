import fs from "node:fs";
import path from "node:path";

/**
 * Image upload handling for portraits.
 *
 * Photographs are stored in public/images/portraits/imported/ using
 * DESCRIPTIVE, PERSON-BASED filenames (e.g. "amara-diallo.jpg") so that the
 * files remain understandable when browsing the folder directly.
 *
 * Security:
 *  - Only real JPEG/PNG/WebP files are accepted (validated by magic bytes,
 *    not by the declared content type or extension).
 *  - File size is capped (MAX_UPLOAD_MB, default 5).
 *  - Filenames are sanitised; original names are kept only as metadata.
 *  - Files are written with a collision-safe name.
 */

export const UPLOAD_SUBDIR = path.join("public", "images", "portraits", "imported");

/**
 * The same folder as a WEB path (what a browser fetches).
 *
 * `UPLOAD_SUBDIR` is a filesystem path under `public/`, e.g.
 * "public/images/portraits/imported". Next.js serves everything inside
 * `public/` at the site root, so the corresponding URL is
 * "/images/portraits/imported". This MUST start with a leading slash — a
 * value like "public/images/..." is rejected by `next/image` and crashes any
 * public page that renders the portrait.
 */
export const UPLOAD_WEB_DIR = "/images/portraits/imported";

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

function uploadsRoot(): string {
  return path.join(process.cwd(), UPLOAD_SUBDIR);
}

/**
 * Validate and store a portrait image.
 *
 * @param file      raw upload
 * @param personName used to build the descriptive filename
 * @returns the public URL path and stored file name
 * @throws UploadError with a user-safe message when validation fails
 */
export function savePortraitImage(
  file: UploadedImage,
  personName: string,
): { publicUrl: string; fileName: string; format: ImageFormat } {
  if (!file.buffer?.length) {
    throw new UploadError("The uploaded file is empty.");
  }
  if (file.buffer.length > MAX_BYTES()) {
    throw new UploadError(
      `The image is larger than the ${Math.round(MAX_BYTES() / 1024 / 1024)} MB limit.`,
    );
  }
  const format = detectImageFormat(file.buffer);
  if (!format) {
    throw new UploadError(
      "Only JPEG, PNG, or WebP photographs can be imported.",
    );
  }

  const base = descriptiveFileName(personName, format);
  const root = uploadsRoot();
  fs.mkdirSync(root, { recursive: true });

  // Avoid overwriting a different person's photograph.
  let fileName = base;
  const stem = base.replace(/\.[^.]+$/, "");
  let n = 2;
  while (fs.existsSync(path.join(root, fileName))) {
    fileName = `${stem}-${n}.${format === "jpeg" ? "jpg" : format}`;
    n += 1;
    if (n > 200) {
      fileName = `${stem}-${Date.now()}.${format === "jpeg" ? "jpg" : format}`;
      break;
    }
  }

  fs.writeFileSync(path.join(root, fileName), file.buffer);
  return {
    publicUrl: `${UPLOAD_WEB_DIR}/${fileName}`,
    fileName,
    format,
  };
}

/** Remove a previously imported image file (only within the import folder). */
export function deletePortraitImage(fileName: string): boolean {
  const safe = path.basename(fileName);
  const full = path.join(uploadsRoot(), safe);
  if (!full.startsWith(uploadsRoot())) return false;
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  return true;
}

/**
 * Check that an existing public image path still resolves on disk.
 *
 * `publicUrl` is a web path such as "/images/portraits/imported/x.jpg", which
 * Next.js serves from the "public" directory. So we resolve it against
 * cwd()/public, NOT against cwd() directly.
 */
export function publicImageExists(publicUrl: string): boolean {
  if (!publicUrl || publicUrl.startsWith("http")) return false;
  if (publicUrl.includes("..")) return false;
  // Strip any leading slashes, then resolve inside the public folder.
  const rel = publicUrl.replace(/^\/+/, "");
  const full = path.join(process.cwd(), "public", rel);
  return fs.existsSync(full);
}
