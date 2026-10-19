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

/**
 * Matches real tag shapes only ("<p>", "</a>", "<a href=…>"), never
 * comparisons like "a < b > c" (which need "<" immediately followed by a
 * letter). Non-text elements (script/style/…) are deliberately excluded so
 * sanitize-html still sees them and discards their *contents* as before.
 */
const TAG_BOUNDARY =
  /<\/?(?!script\b|style\b|textarea\b|option\b)[a-z][a-z0-9]*\b[^>]*>/gi;

/** Undo the entities sanitize-html writes when serialising text nodes. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&"); // last: "&amp;lt;" must become "&lt;", not "<"
}

/**
 * Shared plain-text conversion for every field stored and rendered as text.
 *
 * Tag boundaries become spaces first so adjacent blocks don't glue their
 * text together after stripping ("</p><p>" → "Story Every", never
 * "StoryEvery"), and the serialisation entities are decoded again: callers
 * render these values through React, which escapes text on its own — a
 * literal "Tom & Jerry" must not end up displaying as "Tom &amp; Jerry".
 */
function toPlainText(input: unknown): string {
  const raw = typeof input === "string" ? input : "";
  return decodeEntities(
    sanitizeHtml(raw.replace(TAG_BOUNDARY, " "), {
      allowedTags: [],
      allowedAttributes: {},
    }),
  );
}

/** Plain-text fields: strip tags, collapse whitespace, cap length. */
export function sanitizePlainText(input: unknown, maxLength = 500): string {
  return toPlainText(input)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Longer plain text (excerpts, bios): preserve paragraph breaks. */
export function sanitizeMultilineText(input: unknown, maxLength = 5000): string {
  return toPlainText(input)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Strip tags and return a plain-text preview (for meta descriptions). */
export function richTextToPlain(input: string, maxLength = 160): string {
  return toPlainText(input)
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
