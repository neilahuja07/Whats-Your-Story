import { sanitizeRichText } from "@/lib/sanitize";

/**
 * RichText — renders stored editorial rich text (founder biography,
 * motivation, vision).
 *
 * The admin's RichTextEditor stores HTML (`p`, `strong`, `em`, headings,
 * lists, links), so rendering it as a React text node would show the tags
 * literally ("<p><i>…</i></p>"). This component instead:
 *
 *  1. Detects whether the content contains markup. Rich content is
 *     sanitised again server-side (the same belt-and-suspenders pattern
 *     the story pages use) and rendered as HTML.
 *  2. Legacy plain text written before the editor existed (blank-line
 *     paragraphs, no tags) is split into `<p>` React text nodes — React
 *     escapes them, so no markup can ever be injected through this path.
 */
export function RichText({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const raw = html ?? "";
  if (!raw.trim()) return null;

  // No tags → plain-text content: keep it as escaped text nodes.
  if (!/<\/?[a-z][^>]*>/i.test(raw)) {
    const paras = raw.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    if (paras.length === 0) return null;
    return (
      <div className={className}>
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }

  // Rich content → sanitise (allow-listed tags only) and render as HTML.
  const sanitized = sanitizeRichText(raw);
  if (!sanitized.trim()) return null;
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}
