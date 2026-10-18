import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  getSiteContent,
  setSiteContent,
  SITE_CONTENT_KEYS,
} from "@/lib/repositories/siteContent";
import { sanitizeMultilineText, sanitizePlainText } from "@/lib/sanitize";

/** GET — all editable site content. */
export async function GET() {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ content: getSiteContent() });
}

/** PATCH — update a subset of site content keys. */
export async function PATCH(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const allowedKeys = Object.values(SITE_CONTENT_KEYS) as string[];
  const entries: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key) || typeof value !== "string") continue;
    // Single-line fields vs long-form fields.
    const isLongForm = [
      "home.supporting_text",
      "home.about_body",
      "about.page_body",
      "about.vision",
      "share.page_intro",
      "share.consent_text",
      "footer.description",
      "privacy.page_body",
      "terms.page_body",
    ].includes(key);
    entries[key] = isLongForm
      ? sanitizeMultilineText(value, 20_000)
      : sanitizePlainText(value, 2000);
  }

  if (Object.keys(entries).length === 0) {
    return NextResponse.json(
      { error: "No valid content fields were provided." },
      { status: 422 },
    );
  }

  setSiteContent(entries);
  logActivity(admin.id, "content.updated", "site_content", null);

  return NextResponse.json({ ok: true, content: getSiteContent() });
}
