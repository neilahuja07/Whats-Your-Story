import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { createSubmission } from "@/lib/repositories/submissions";
import { sanitizeMultilineText, sanitizePlainText } from "@/lib/sanitize";
import {
  countWords,
  isValidEmail,
  isValidLinkedInUrl,
  isValidPhone,
  nowIso,
} from "@/lib/utils";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import {
  notifyAdminOfSubmission,
  recentlyNotified,
  submissionFingerprint,
} from "@/lib/email";
import type { ConsentRecord } from "@/lib/types";

/**
 * POST /api/submissions — public story submission endpoint.
 *
 * The public form collects exactly six required fields plus two mandatory
 * permission confirmations. Security:
 *  - server-side validation of every field (client checks are UX only)
 *  - per-IP rate limiting (fixed hourly window, counted in Supabase via the
 *    SECURITY DEFINER RPC bump_rate_limit — the rate_limits table has no
 *    direct API access at all)
 *  - request-size cap before parsing
 *  - consent text + timestamp recorded with the submission
 *  - no mass assignment: only whitelisted fields are read from the body
 *  - submissions are stored with status "pending_review" — never published
 *
 * Notification:
 *  - after the row is safely stored, an e-mail notification is sent to the
 *    administrator via Resend (best effort — an e-mail failure never fails
 *    the submission and is recorded for retry from the admin panel)
 *  - identical repeated submissions inside a short window do not send a
 *    second notification
 */

const RATE_LIMIT_PER_HOUR = 5;
/** Bumped when the recorded consent wording changes (2026-10: interest-entry wording). */
const CONSENT_VERSION = "2026-10";
/** Reject oversized requests before parsing. */
const MAX_BODY_BYTES = 20_000;
const MAX_INTRO_WORDS = 150;

const CONSENT_PUBLISH_TEXT =
  "I agree to the use of my name and, if separately confirmed, my photograph if my story is published.";
const CONSENT_AUTHORSHIP_TEXT =
  "I confirm that this is my experience, or I have permission to share it, and agree to its editorial review.";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Consume one attempt from the IP's hourly bucket and report whether the
 * request may proceed. Counted atomically by the bump_rate_limit RPC.
 * Fails OPEN (allows) when Supabase is unreachable, so a database blip can
 * never take the public submission form offline.
 */
async function checkRateLimit(bucket: string): Promise<boolean> {
  try {
    const supabase = createSupabasePublicClient();
    const windowStart = new Date(
      Math.floor(Date.now() / 3_600_000) * 3_600_000,
    ).toISOString();
    const { data, error } = await supabase.rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_window_start: windowStart,
    });
    if (error) {
      console.warn("[submissions] rate limit check failed (failing open):", error.message);
      return true;
    }
    return Number(data ?? 1) <= RATE_LIMIT_PER_HOUR;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  init();

  const ip = clientIp(req);
  if (!(await checkRateLimit(`submit:${ip}`))) {
    return NextResponse.json(
      {
        error:
          "Too many submissions from this device. Please try again later.",
      },
      { status: 429 },
    );
  }

  // Reject oversized payloads before doing any work.
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Your introduction is too long — please keep it under 150 words." },
      { status: 413 },
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
  const contactNumber = sanitizePlainText(body.contactNumber, 40);
  const linkedinProfileUrl = sanitizePlainText(body.linkedinProfileUrl, 300);
  const city = sanitizePlainText(body.city, 120);
  const introduction = sanitizeMultilineText(body.introduction, 8000);
  const consentPublish = body.consentPublish === true;
  const consentAuthorship = body.consentAuthorship === true;

  if (!submitterName) errors.submitterName = "Please tell us your full name.";
  if (!email) errors.email = "Please add your email address.";
  else if (!isValidEmail(email)) errors.email = "That email address doesn't look right.";
  if (!contactNumber)
    errors.contactNumber = "Please add a contact number.";
  else if (!isValidPhone(contactNumber))
    errors.contactNumber =
      "That phone number doesn't look right — include the country code if it's international (e.g. +44 20 7946 0958).";
  if (!linkedinProfileUrl)
    errors.linkedinProfileUrl = "Please add your LinkedIn profile URL.";
  else if (!isValidLinkedInUrl(linkedinProfileUrl))
    errors.linkedinProfileUrl =
      "Please enter a valid LinkedIn profile URL (https://www.linkedin.com/in/…).";
  if (!city) errors.city = "Please add your city or state.";

  if (!introduction)
    errors.introduction =
      "Please write a brief introduction about yourself.";
  else if (countWords(introduction) > MAX_INTRO_WORDS)
    errors.introduction = `Please keep your introduction to ${MAX_INTRO_WORDS} words or fewer (currently ${countWords(introduction)}).`;

  if (!consentPublish)
    errors.consentPublish =
      "Please confirm the permission to use your name so we can review your entry.";
  if (!consentAuthorship)
    errors.consentAuthorship =
      "Please confirm that this is your experience or that you have permission to share it.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", errors },
      { status: 422 },
    );
  }

  /* --------------------------- consent --------------------------- */
  const acceptedAt = nowIso();
  const userAgent = sanitizePlainText(req.headers.get("user-agent"), 300) || null;
  const consentRecords: ConsentRecord[] = [
    { text: CONSENT_PUBLISH_TEXT, version: CONSENT_VERSION, acceptedAt, ip, userAgent },
    { text: CONSENT_AUTHORSHIP_TEXT, version: CONSENT_VERSION, acceptedAt, ip, userAgent },
  ];

  /* --------------------------- storage --------------------------- */
  try {
    // The public form has no title/story-body fields, but the table requires
    // both. Derive them from the introduction — no schema change needed.
    const storyTitle =
      introduction.split(/\s+/).slice(0, 10).join(" ").replace(/[.,;:!?-]*$/, "") +
      (countWords(introduction) > 10 ? "…" : "");

    const submission = await createSubmission({
      submitterName,
      email,
      storyTitle,
      storyContent: introduction,
      introduction,
      categoryId: null, // No category field on the public form.
      portraitUrl: "", // Photographs are only accepted via admin review.
      linkedinProfileUrl,
      contactNumber,
      city,
      additionalMessage: "",
      allowNameDisplay: consentPublish,
      allowPortraitDisplay: consentPublish,
      consentRecords,
    });

    if (!submission) {
      return NextResponse.json(
        {
          error:
            "We couldn't save your entry just now. Please try again in a moment.",
        },
        { status: 500 },
      );
    }

    // ---- Notification (best effort, AFTER the submission is safe) ----
    // An e-mail failure must never undo or jeopardise the saved submission,
    // so any error is swallowed here and recorded server-side for retry.
    const fingerprint = submissionFingerprint(email, storyTitle, introduction);
    try {
      if (await recentlyNotified(fingerprint)) {
        // Same story submitted again moments ago (double submit / retry):
        // the submission is stored, but no second notification is sent.
        console.info(
          `[email] Duplicate submission ${submission.id} — notification suppressed.`,
        );
      } else {
        await notifyAdminOfSubmission(submission);
      }
    } catch (err) {
      console.error("[email] Notification step failed:", err);
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
          err instanceof Error && /contact_number/i.test(err.message)
            ? err.message
            : "We couldn't save your entry just now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
