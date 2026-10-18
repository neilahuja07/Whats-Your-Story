import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { getSubmissionById } from "@/lib/repositories/submissions";
import { emailConfig, notifyAdminOfSubmission } from "@/lib/email";

/**
 * POST /api/admin/submissions/[id]/notify — (re)send the notification e-mail
 * for an existing submission.
 *
 * Used to retry a notification that failed when the submission first
 * arrived, or to re-send one that was lost. Requires a signed-in,
 * allow-listed administrator — the same gate as every other admin route.
 */
export async function POST(
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

  if (!emailConfig()) {
    return NextResponse.json(
      {
        error:
          "Email notifications are not configured. Set RESEND_API_KEY, STORY_NOTIFICATION_FROM and STORY_NOTIFICATION_EMAIL in .env.local, then restart the server.",
      },
      { status: 503 },
    );
  }

  const result = await notifyAdminOfSubmission(submission);
  logActivity(admin.id, "submission.notify", "submission", id);

  if (result.status === "sent") {
    return NextResponse.json({ ok: true, status: "sent" });
  }
  return NextResponse.json(
    {
      ok: false,
      status: result.status,
      error:
        result.status === "skipped"
          ? "Email is not configured."
          : "The notification could not be sent. Check the server logs for details, then try again.",
    },
    { status: 502 },
  );
}
