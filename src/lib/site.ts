/** Site-wide constants. */

/**
 * Normalise SITE_URL into a valid absolute URL.
 *
 * Environment variables are free-text: a value like "www.example.com"
 * (no protocol) would otherwise crash `new URL(SITE_URL)` in the root
 * metadata during `next build` (ERR_INVALID_URL → "Failed to collect page
 * data"), failing the whole deploy. A missing or malformed value now
 * degrades to localhost with a console warning instead of throwing.
 */
function normalizeSiteUrl(): string {
  const fallback = "http://localhost:3000";
  const raw = (process.env.SITE_URL || "").trim();
  if (!raw) return fallback;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  // Local values ("localhost:3000", "127.0.0.1:3000") are http, not https.
  const scheme = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(raw)
    ? "http://"
    : "https://";
  const withScheme = hasScheme ? raw : `${scheme}${raw}`;

  try {
    const url = new URL(withScheme).toString().replace(/\/+$/, "");
    if (!hasScheme) {
      console.warn(
        `[site] SITE_URL was missing a protocol; using "${url}". ` +
          `Set SITE_URL=${url} to silence this warning.`,
      );
    }
    return url;
  } catch {
    console.warn(
      `[site] SITE_URL "${raw}" is not a valid URL; falling back to ${fallback}.`,
    );
    return fallback;
  }
}

export const SITE_URL = normalizeSiteUrl();

export const COMPANY_NAME = "What's Your Story";
export const TAGLINE = "The Voice of Untold Stories";
