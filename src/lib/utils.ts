/**
 * UUID generation.
 *
 * Uses the Web Crypto global (`crypto.randomUUID`) rather than the
 * `node:crypto` module. That global exists in Node 19+ AND in every modern
 * browser, which keeps this module isomorphic — important because client
 * components (e.g. StoryEditor) import `slugify` from here, and a top-level
 * `node:crypto` import cannot be bundled for the browser and fails
 * `next build` with "Unhandled scheme: node:crypto".
 */
function uuid(): string {
  return crypto.randomUUID();
}

export function uid(): string {
  return uuid();
}

/** UTC ISO-8601 timestamp. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || `story-${uuid().slice(0, 8)}`;
}

/** Append -2, -3 … until the slug is unique (used by callers with a uniqueness check). */
export function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  let candidate = base;
  let n = 2;
  while (exists(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

/** "2026-04-01T10:00:00.000Z" → "1 April 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidLinkedInUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return false;
    return ["linkedin.com", "www.linkedin.com"].includes(u.hostname);
  } catch {
    return false;
  }
}

export function isTrueFlag(v: unknown): boolean {
  return v === true || v === "true" || v === "on" || v === "1" || v === 1;
}
