import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { init } from "@/lib/bootstrap";
import { createSubmission } from "@/lib/repositories/submissions";
import { sanitizeMultilineText, sanitizePlainText } from "@/lib/sanitize";
import { isValidEmail, isValidLinkedInUrl, nowIso } from "@/lib/utils";
import type { ConsentRecord } from "@/lib/types";

/**
 * POST /api/submissions — public story submission endpoint.
 *
 * Security:
 *  - server-side validation of every field (client checks are UX only)
 *  - per-IP rate limiting (fixed window, stored in SQLite)
 *  - consent text + timestamp recorded with the submission
 *  - no mass assignment: only whitelisted fields are read from the body
 *  - submissions are stored with status "pending_review" — never published
 */

const RATE_LIMIT_PER_HOUR = 5;
const CONSENT_VERSION = "2026-01";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(bucket: string): boolean {
  const db = getDb();
  const windowStart = new Date(
    Math.floor(Date.now() / 3_600_000) * 3_600_000,
  ).toISOString();
  const row = db
    .prepare(
      "SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?",
    )
    .get(bucket, windowStart) as { count: number } | undefined;

  if (row && row.count >= RATE_LIMIT_PER_HOUR) return false;

  db.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1`,
  ).run(bucket, windowStart);
  return true;
}

export async function POST(req: NextRequest) {
  init();

  const ip = clientIp(req);
  if (!checkRateLimit(`submit:${ip}`)) {
    return NextResponse.json(
      {
        error:
          "Too many submissions from this device. Please try again later.",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  /* ------------------------- validation ------------------------- */
  const errors: Record<string, string> = {};

  const submitterName = sanitizePlainText(body.submitterName, 120);
  const email = sanitizePlainText(body.email, 254);
  const storyTitle = sanitizePlainText(body.storyTitle, 200);
  const storyContent = sanitizeMultilineText(body.storyContent, 60_000);
  const introduction = sanitizeMultilineText(body.introduction, 2000);
  const city = sanitizePlainText(body.city, 120);
  const linkedinProfileUrl = sanitizePlainText(body.linkedinProfileUrl, 300);
  const additionalMessage = sanitizeMultilineText(body.additionalMessage, 3000);
  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const allowNameDisplay = body.allowNameDisplay === true;
  const allowPortraitDisplay = body.allowPortraitDisplay === true;
  const consentGiven = body.consent === true;

  if (!submitterName) errors.submitterName = "Please tell us your name.";
  if (!email) errors.email = "Please add your email address.";
  else if (!isValidEmail(email)) errors.email = "That email address doesn't look right.";
  if (!storyTitle) errors.storyTitle = "Please give your story a title.";
  if (!storyContent) errors.storyContent = "Please write your story.";
  else if (storyContent.length > 60_000)
    errors.storyContent = "Your story is too long — please keep it under 60,000 characters.";
  if (linkedinProfileUrl && !isValidLinkedInUrl(linkedinProfileUrl))
    errors.linkedinProfileUrl = "Please enter a valid LinkedIn profile URL.";
  if (!consentGiven)
    errors.consent = "Please confirm you have the right to submit this story.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", errors },
      { status: 422 },
    );
  }

  /* --------------------------- consent --------------------------- */
  const consentRecords: ConsentRecord[] = [
    {
      text: `Consent to submission (v${CONSENT_VERSION}): I confirm that I have the right to submit this story and its contents, and I agree that What's Your Story may review my submission and contact me about it. I understand that submitting a story does not automatically publish it or grant permission for public publication.`,
      version: CONSENT_VERSION,
      acceptedAt: nowIso(),
      ip,
      userAgent: sanitizePlainText(req.headers.get("user-agent"), 300) || null,
    },
  ];

  /* --------------------------- storage --------------------------- */
  try {
    // Validate the category exists (prevents arbitrary FK values).
    let safeCategoryId: string | null = null;
    if (categoryId) {
      const cat = getDb()
        .prepare("SELECT id FROM categories WHERE id = ?")
        .get(categoryId) as { id: string } | undefined;
      safeCategoryId = cat?.id ?? null;
    }

    const submission = await createSubmission({
      submitterName,
      email,
      storyTitle,
      storyContent,
      introduction,
      categoryId: safeCategoryId,
      portraitUrl: "", // Photographs are only accepted via admin review.
      linkedinProfileUrl,
      city,
      additionalMessage,
      allowNameDisplay,
      allowPortraitDisplay,
      consentRecords,
    });

    if (!submission) {
      return NextResponse.json(
        {
          error:
            "We couldn't save your story just now. Please try again in a moment.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, id: submission.id },
      { status: 201 },
    );
  } catch (err) {
    console.error("[submissions] store failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't save your story just now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
