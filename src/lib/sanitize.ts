import sanitizeHtml from "sanitize-html";

/**
 * Rich-text sanitisation for story bodies and other editorial content.
 *
 * The admin editor can only produce a small, safe subset of HTML; this
 * allow-list is enforced again on the way IN (before storing) and on the way
 * OUT (before rendering), so even a compromised admin session cannot inject
 * scripts.
 */

const ALLOWED_TAGS = [
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "span",
];

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      span: ["class"],
    },
    allowedClasses: {
      span: ["dropcap"],
    },
    // Links: http(s) and mailto only; force safe rel/target.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });
}

/** Plain-text fields: strip tags, collapse whitespace, cap length. */
export function sanitizePlainText(input: unknown, maxLength = 500): string {
  const raw = typeof input === "string" ? input : "";
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Longer plain text (excerpts, bios): preserve paragraph breaks. */
export function sanitizeMultilineText(input: unknown, maxLength = 5000): string {
  const raw = typeof input === "string" ? input : "";
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Strip tags and return a plain-text preview (for meta descriptions). */
export function richTextToPlain(input: string, maxLength = 160): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Validate a stored image URL/path before rendering. */
export function safeImageUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return trimmed.includes("..") ? "" : trimmed;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {
    /* fall through */
  }
  return "";
}
