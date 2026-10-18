import { createHash } from "node:crypto";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { StorySubmission, SubmissionReviewStatus } from "@/lib/types";

/**
 * Admin e-mail notifications for new public submissions, delivered by
 * Resend (https://resend.com).
 *
 * - Server-side only: the API key never reaches the browser. There is no
 *   NEXT_PUBLIC_ variable involved.
 * - Uses the Resend REST API directly via fetch, so no extra dependency is
 *   required.
 * - Delivery is best-effort: the submission is ALWAYS saved first; a failed
 *   e-mail never rolls anything back and never reaches the visitor.
 * - Every send is recorded in the Supabase `submission_notifications` table
 *   (see supabase_migration_persistence.sql) so an administrator can retry a
 *   failed notification from the admin panel.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const SUBJECT = "New Interest Entry — What's Your Story";
const PREVIEW_CHARS = 600;
/** Cap on stored error text so a pathological upstream response cannot bloat the log. */
const MAX_ERROR_CHARS = 1000;

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

/** Read the Resend configuration, or `null` when it is not set up yet. */
export function emailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.STORY_NOTIFICATION_FROM?.trim();
  const to = process.env.STORY_NOTIFICATION_EMAIL?.trim();
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

export function isEmailConfigured(): boolean {
  return emailConfig() !== null;
}

/** True once any of the three variables is present but the set is incomplete. */
export function isEmailPartiallyConfigured(): boolean {
  const vars = [
    process.env.RESEND_API_KEY?.trim(),
    process.env.STORY_NOTIFICATION_FROM?.trim(),
    process.env.STORY_NOTIFICATION_EMAIL?.trim(),
  ];
  const set = vars.filter(Boolean).length;
  return set > 0 && set < 3;
}

let warnedMissingConfig = false;

function warnMissingConfig(): void {
  if (warnedMissingConfig || process.env.NODE_ENV === "production") return;
  warnedMissingConfig = true;
  const missing = [
    !process.env.RESEND_API_KEY?.trim() && "RESEND_API_KEY",
    !process.env.STORY_NOTIFICATION_FROM?.trim() && "STORY_NOTIFICATION_FROM",
    !process.env.STORY_NOTIFICATION_EMAIL?.trim() && "STORY_NOTIFICATION_EMAIL",
  ].filter(Boolean);
  console.warn(
    `[email] Submission notifications are disabled — missing: ${missing.join(", ")}. ` +
      "Add them to .env.local and restart the dev server (see README → “Email notifications”).",
  );
}

/* ------------------------------ HTML helpers ----------------------------- */

/** Escape text for safe inclusion in the HTML e-mail body. */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_LABELS: Record<SubmissionReviewStatus, string> = {
  pending_review: "Pending review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

/** A short, single-paragraph preview of the submitted story. */
export function storyPreview(content: string, max = PREVIEW_CHARS): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trimEnd()}…`;
}

/** Public URL of the admin submissions page (needs SITE_URL in production). */
export function adminSubmissionsUrl(): string {
  const base = (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  return `${base}/admin/submissions`;
}

/* ------------------------------ e-mail body ------------------------------ */

function buildSubject(submission: StorySubmission): string {
  const title = submission.storyTitle.slice(0, 120);
  return `${SUBJECT}: “${title}”`;
}

function buildText(submission: StorySubmission): string {
  const when = formatTimestamp(submission.createdAt);
  return [
    "A new expression of interest has arrived on What's Your Story.",
    "",
    `Name:     ${submission.submitterName}`,
    `Email:    ${submission.email}`,
    `Contact:  ${submission.contactNumber}`,
    `LinkedIn: ${submission.linkedinProfileUrl}`,
    `City:     ${submission.city}`,
    `Received: ${when}`,
    `Status:   ${STATUS_LABELS[submission.reviewStatus] ?? submission.reviewStatus}`,
    "",
    "Permission confirmations:",
    `  • Publishing consent (name / photograph): ${
      submission.allowNameDisplay ? "confirmed" : "NOT confirmed"
    }`,
    `  • Authorship / permission to share: ${
      submission.consentRecords.length >= 2 ? "confirmed" : "NOT confirmed"
    }`,
    "",
    "Introduction:",
    "-------------------------------",
    storyPreview(submission.introduction || submission.storyContent),
    "-------------------------------",
    "",
    `Review it here: ${adminSubmissionsUrl()}`,
    "",
    "This is an editorial notification from What's Your Story. The entry " +
      "is private until an administrator publishes it.",
  ].join("\n");
}

function buildHtml(submission: StorySubmission): string {
  const e = escapeHtml;
  const authorshipConfirmed = submission.consentRecords.length >= 2;
  const rows: [string, string][] = [
    ["Submitter", submission.submitterName],
    ["Email", submission.email],
    ["Contact number", submission.contactNumber],
    ["LinkedIn", submission.linkedinProfileUrl],
    ["City / State", submission.city],
    ["Received", formatTimestamp(submission.createdAt)],
    ["Status", STATUS_LABELS[submission.reviewStatus] ?? submission.reviewStatus],
    [
      "Publishing consent",
      submission.allowNameDisplay ? "Confirmed" : "NOT confirmed",
    ],
    [
      "Authorship / permission",
      authorshipConfirmed ? "Confirmed" : "NOT confirmed",
    ],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:8px 16px 8px 0;color:#8a8378;font-size:13px;white-space:nowrap;vertical-align:top;">${e(label)}</td>
              <td style="padding:8px 0;color:#1f1c17;font-size:14px;">${e(value)}</td>
            </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f6f2e9;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f2e9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#fffdf8;border:1px solid #e6dfcf;">
            <tr>
              <td style="padding:28px 32px;border-bottom:2px solid #b6955b;">
                <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#b6955b;">What&rsquo;s Your Story</p>
                <h1 style="margin:8px 0 0;font-size:22px;color:#1f1c17;">New interest entry</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${detailRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8378;">Introduction</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;">
                <div style="border-left:2px solid #b6955b;padding:12px 16px;background-color:#faf6ec;color:#4a453c;font-size:14px;line-height:1.7;">
                  ${e(storyPreview(submission.introduction || submission.storyContent))}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="${e(adminSubmissionsUrl())}"
                   style="display:inline-block;padding:12px 24px;background-color:#1f1c17;color:#f6f2e9;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;">
                  Review in the admin panel
                </a>
                <p style="margin:16px 0 0;font-size:12px;color:#8a8378;">
                  The entry is private and stays unpublished until an administrator
                  approves and publishes it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} (${iso})`;
}

/* ------------------------------ delivery -------------------------------- */

export interface NotifyResult {
  status: "sent" | "failed" | "skipped";
  /** Safe, human-readable reason when the send did not succeed. */
  error: string | null;
}

/**
 * Send the notification for a submission and record the outcome locally.
 *
 * Never throws: callers (the public submission route and the admin resend
 * route) must not fail their own request because of an e-mail problem.
 */
export async function notifyAdminOfSubmission(
  submission: StorySubmission,
): Promise<NotifyResult> {
  const cfg = emailConfig();
  if (!cfg) {
    warnMissingConfig();
    await recordNotification(submission, "skipped", "Email is not configured.");
    return { status: "skipped", error: "Email is not configured." };
  }

  let result: NotifyResult;
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [cfg.to],
        subject: buildSubject(submission),
        html: buildHtml(submission),
        text: buildText(submission),
        // Helps spot duplicate deliveries in the Resend dashboard.
        headers: { "X-Entity-Ref-ID": submission.id },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) detail += ` — ${body.message}`;
      } catch {
        /* non-JSON error body */
      }
      result = { status: "failed", error: `Resend rejected the request: ${detail}` };
    } else {
      result = { status: "sent", error: null };
    }
  } catch (err) {
    // The error message is safe to log/show: it never contains the API key.
    result = {
      status: "failed",
      error: err instanceof Error ? err.message : "Network error while calling Resend.",
    };
  }

  if (result.status === "failed") {
    // Server-side only diagnostic — never shown to the visitor.
    console.error(
      `[email] Notification failed for submission ${submission.id}: ${result.error}`,
    );
  }

  await recordNotification(submission, result.status, result.error);
  return result;
}

/* ------------------------- delivery log (Supabase) ---------------------- */

/**
 * Record (or update) the delivery outcome for a submission, via the
 * SECURITY DEFINER RPC so it works for the ANON public-submission route too.
 * Best-effort: a logging failure is warned about and never affects the caller.
 */
async function recordNotification(
  submission: StorySubmission,
  status: NotifyResult["status"],
  error: string | null,
): Promise<void> {
  try {
    const supabase = createSupabasePublicClient();
    const { error: rpcError } = await supabase.rpc(
      "record_submission_notification",
      {
        p_submission_id: submission.id,
        p_fingerprint: submissionFingerprint(
          submission.email,
          submission.storyTitle,
          submission.storyContent,
        ),
        p_status: status,
        p_error: (error ?? "").slice(0, MAX_ERROR_CHARS),
      },
    );
    if (rpcError) {
      console.error("[email] Could not record notification outcome:", rpcError.message);
    }
  } catch (err) {
    console.error("[email] Could not record notification outcome:", err);
  }
}

export interface NotificationLog {
  submissionId: string;
  status: "sent" | "failed" | "skipped" | null;
  error: string;
  attempts: number;
  updatedAt: string | null;
}

/** The recorded delivery outcome for a submission (admin display / resend). */
export async function getNotificationLog(
  submissionId: string,
): Promise<NotificationLog> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("submission_notifications")
      .select("submission_id, status, error, attempts, updated_at")
      .eq("submission_id", submissionId)
      .maybeSingle();
    if (error) {
      console.warn("[email] notification log read failed:", error.message);
      return { submissionId, status: null, error: "", attempts: 0, updatedAt: null };
    }
    const row = data as {
      submission_id: string;
      status: string;
      error: string;
      attempts: number;
      updated_at: string;
    } | null;
    if (!row) {
      return { submissionId, status: null, error: "", attempts: 0, updatedAt: null };
    }
    return {
      submissionId: row.submission_id,
      status: row.status as NotificationLog["status"],
      error: row.error ?? "",
      attempts: row.attempts,
      updatedAt: row.updated_at,
    };
  } catch {
    // Supabase not configured yet — report "never sent".
    return { submissionId, status: null, error: "", attempts: 0, updatedAt: null };
  }
}

/* --------------------------- duplicate defence -------------------------- */

/**
 * Stable fingerprint of a submission's core content, used to suppress
 * duplicate e-mails when a visitor accidentally submits the same story twice
 * (double click, browser retry, impatient refresh).
 */
export function submissionFingerprint(
  email: string,
  title: string,
  content: string,
): string {
  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = `${normalise(email)}|${normalise(title)}|${normalise(content)}`;
  return createHash("sha256").update(raw).digest("hex");
}

const DUPLICATE_WINDOW_MS = 10 * 60_000; // 10 minutes

/**
 * True when an identical submission (same person + title + content) already
 * produced a notification within the duplicate window. Checked through the
 * SECURITY DEFINER RPC so the ANON public-submission route can use it too.
 * Fails OPEN (returns false) so a logging problem never blocks delivery.
 */
export async function recentlyNotified(fingerprint: string): Promise<boolean> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("recent_notification_sent", {
      p_fingerprint: fingerprint,
      p_since: since,
    });
    if (error) {
      console.warn("[email] duplicate check failed (failing open):", error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}
