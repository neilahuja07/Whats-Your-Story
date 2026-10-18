import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import {
  getSubmissionById,
  updateSubmissionStatus,
} from "@/lib/repositories/submissions";
import { sanitizeMultilineText } from "@/lib/sanitize";
import type { SubmissionReviewStatus } from "@/lib/types";

const VALID_STATUSES: SubmissionReviewStatus[] = [
  "pending_review",
  "under_review",
  "approved",
  "rejected",
];

/** GET — full submission (including contact details) for authorised admins. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  return NextResponse.json({ submission });
}

/** PATCH — change review status and/or reviewer notes. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body.reviewStatus as SubmissionReviewStatus;
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const notes =
    typeof body.reviewerNotes === "string"
      ? sanitizeMultilineText(body.reviewerNotes, 5000)
      : submission.reviewerNotes;

  try {
    await updateSubmissionStatus(id, status ?? submission.reviewStatus, notes);
  } catch (err) {
    console.error("[submissions] status update failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message
            ? err.message
            : "The review status could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }
  await logActivity(admin, "submission.status", "submission", id);

  return NextResponse.json({ ok: true, submission: await getSubmissionById(id) });
}
