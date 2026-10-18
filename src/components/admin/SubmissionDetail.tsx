"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  MapPin,
  Linkedin,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileEdit,
} from "lucide-react";
import type { StorySubmission, SubmissionReviewStatus } from "@/lib/types";

/** Shape returned by `getNotificationLog()` on the server. */
export interface NotificationLog {
  submissionId: string;
  status: "sent" | "failed" | "skipped" | null;
  error: string;
  attempts: number;
  updatedAt: string | null;
}

const STATUS_OPTIONS: { value: SubmissionReviewStatus; label: string }[] = [
  { value: "pending_review", label: "Pending review" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved for preparation" },
  { value: "rejected", label: "Reject" },
];

export function SubmissionDetail({
  submission,
  notification,
}: {
  submission: StorySubmission;
  notification: NotificationLog;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionReviewStatus>(submission.reviewStatus);
  const [notes, setNotes] = useState(submission.reviewerNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [converting, setConverting] = useState(false);
  const [notif, setNotif] = useState<NotificationLog>(notification);
  const [resending, setResending] = useState(false);

  // The current form records two consent entries (publishing + authorship).
  const authorshipConfirmed = submission.consentRecords.length >= 2;

  async function resendNotification() {
    setResending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}/notify`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "The notification could not be sent." });
        return;
      }
      setNotif((prev) => ({
        ...prev,
        status: "sent",
        error: "",
        attempts: prev.attempts + 1,
        updatedAt: new Date().toISOString(),
      }));
      setMessage({ type: "ok", text: "Notification e-mail sent." });
      router.refresh();
    } finally {
      setResending(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewerNotes: notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: data.error || "Could not save." });
        return;
      }
      setMessage({ type: "ok", text: "Review status saved." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (
      !window.confirm(
        "Convert this approved submission into a DRAFT story? It will not be public until you publish it from the stories list.",
      )
    )
      return;
    setConverting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submission.id}/convert`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Conversion failed." });
        return;
      }
      setMessage({ type: "ok", text: "Draft story created." });
      router.push(`/admin/stories/${data.story.id}`);
      router.refresh();
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* Main: story content */}
      <div className="space-y-6 lg:col-span-2">
        <section className="border border-line bg-paper p-6">
          <h2 className="font-serif text-h4 text-charcoal">
            Submitted introduction
          </h2>
          <div className="prose-story mt-4 text-[0.98rem]">
            {submission.storyContent.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Older submissions may carry a separate introduction; the current
            public form stores the same text in both fields. */}
        {submission.introduction &&
          submission.introduction !== submission.storyContent && (
            <section className="border border-line bg-paper p-6">
              <h2 className="font-serif text-h4 text-charcoal">
                Introduction about the person
              </h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal-soft">
                {submission.introduction}
              </p>
            </section>
          )}

        {submission.additionalMessage && (
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">
              Message to the editorial team
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal-soft">
              {submission.additionalMessage}
            </p>
          </section>
        )}

        {/* Consent records — audit trail */}
        <section className="border border-line bg-paper p-6">
          <h2 className="font-serif text-h4 text-charcoal">Consent records</h2>
          <ul className="mt-4 space-y-3">
            {submission.consentRecords.map((c, i) => (
              <li key={i} className="border-l-2 border-gold bg-beige/30 p-4">
                <p className="text-[0.85rem] leading-relaxed text-charcoal-soft">
                  {c.text}
                </p>
                <p className="mt-2 text-[0.74rem] text-muted">
                  Version {c.version} · accepted {formatTimestamp(c.acceptedAt)}
                  {c.ip ? ` · IP ${c.ip}` : ""}
                </p>
              </li>
            ))}
            {submission.consentRecords.length === 0 && (
              <li className="text-[0.88rem] text-red-700">
                No consent record found — do not publish this submission.
              </li>
            )}
          </ul>

          <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-[0.88rem]">
            <p className="flex items-center gap-2 text-charcoal-soft">
              <CheckCircle2
                className={`h-4 w-4 ${submission.allowNameDisplay ? "text-emerald-600" : "text-muted"}`}
                aria-hidden="true"
              />
              Consent to publish name / photograph:{" "}
              <strong>{submission.allowNameDisplay ? "confirmed" : "NOT confirmed"}</strong>
            </p>
            <p className="flex items-center gap-2 text-charcoal-soft">
              <CheckCircle2
                className={`h-4 w-4 ${authorshipConfirmed ? "text-emerald-600" : "text-muted"}`}
                aria-hidden="true"
              />
              Authorship / permission to share:{" "}
              <strong>{authorshipConfirmed ? "confirmed" : "NOT confirmed"}</strong>
            </p>
          </div>
        </section>
      </div>

      {/* Sidebar: contact + workflow */}
      <div className="space-y-6">
        <section className="border border-line bg-paper p-6">
          <h2 className="font-serif text-h4 text-charcoal">Contact</h2>
          <ul className="mt-4 space-y-3 text-[0.9rem]">
            <li className="flex items-center gap-2.5 text-charcoal-soft">
              <Mail className="h-4 w-4 text-gold" aria-hidden="true" />
              <a
                href={`mailto:${submission.email}`}
                className="break-all text-gold-deep underline underline-offset-2 hover:text-charcoal"
              >
                {submission.email}
              </a>
            </li>
            {submission.contactNumber && (
              <li className="flex items-center gap-2.5 text-charcoal-soft">
                <Phone className="h-4 w-4 text-gold" aria-hidden="true" />
                <a
                  href={`tel:${submission.contactNumber.replace(/[^\d+]/g, "")}`}
                  className="break-all text-gold-deep underline underline-offset-2 hover:text-charcoal"
                >
                  {submission.contactNumber}
                </a>
              </li>
            )}
            {submission.city && (
              <li className="flex items-center gap-2.5 text-charcoal-soft">
                <MapPin className="h-4 w-4 text-gold" aria-hidden="true" />
                {submission.city}
              </li>
            )}
            {submission.linkedinProfileUrl && (
              <li className="flex items-center gap-2.5">
                <Linkedin className="h-4 w-4 text-gold" aria-hidden="true" />
                <a
                  href={submission.linkedinProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-gold-deep underline underline-offset-2 hover:text-charcoal"
                >
                  LinkedIn profile
                </a>
              </li>
            )}
            {submission.categoryName && (
              <li className="text-muted">Category: {submission.categoryName}</li>
            )}
          </ul>
        </section>

        <section className="border border-line bg-paper p-6">
          <h2 className="font-serif text-h4 text-charcoal">Notification</h2>
          <p className="mt-3 text-[0.85rem] leading-relaxed text-muted">
            {notif.status === "sent" ? (
              <>
                E-mail notification sent
                {notif.updatedAt ? ` ${formatTimestamp(notif.updatedAt)}` : ""}.
                {notif.attempts > 1 ? ` (${notif.attempts} attempts)` : ""}
              </>
            ) : notif.status === "failed" ? (
              <>
                The last notification attempt
                {notif.updatedAt ? ` on ${formatTimestamp(notif.updatedAt)}` : ""}{" "}
                failed. The submission itself is safely stored.
                {notif.error ? (
                  <span className="mt-2 block break-words font-mono text-[0.75rem] text-red-700">
                    {notif.error}
                  </span>
                ) : null}
              </>
            ) : notif.status === "skipped" ? (
              <>Notification was skipped — e-mail is not configured on this server.</>
            ) : (
              <>No notification has been recorded for this submission.</>
            )}
          </p>
          <button
            type="button"
            disabled={resending}
            onClick={resendNotification}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-line bg-paper px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {notif.status === "sent" ? "Resend notification" : "Send notification"}
          </button>
        </section>

        <section className="border border-line bg-paper p-6">
          <h2 className="font-serif text-h4 text-charcoal">Review workflow</h2>

          {message && (
            <div
              role="status"
              className={`mt-4 flex items-start gap-2.5 border p-3 text-[0.85rem] ${
                message.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message.type === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <p>{message.text}</p>
            </div>
          )}

          <label
            htmlFor="review-status"
            className="mt-4 block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
          >
            Status
          </label>
          <select
            id="review-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SubmissionReviewStatus)}
            className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.88rem] focus:border-gold focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label
            htmlFor="reviewer-notes"
            className="mt-4 block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
          >
            Reviewer notes
          </label>
          <textarea
            id="reviewer-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes — not visible to the submitter."
            className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.85rem] focus:border-gold focus:outline-none"
          />

          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            Save review
          </button>

          <div className="mt-5 border-t border-line pt-5">
            {submission.linkedStoryId ? (
              <Link
                href={`/admin/stories/${submission.linkedStoryId}`}
                className="inline-flex w-full items-center justify-center gap-2 border border-line bg-paper px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
              >
                <FileEdit className="h-4 w-4" aria-hidden="true" />
                Open linked draft story
              </Link>
            ) : (
              <>
                <p className="text-[0.8rem] leading-relaxed text-muted">
                  Convert this submission into an editable{" "}
                  <strong>draft story</strong>. It stays private until you
                  publish it.
                </p>
                <button
                  type="button"
                  disabled={converting || status !== "approved"}
                  title={
                    status !== "approved"
                      ? "Mark the submission as approved first."
                      : undefined
                  }
                  onClick={convert}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {converting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileEdit className="h-4 w-4" aria-hidden="true" />
                  )}
                  Convert to draft story
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
