import Link from "next/link";
import { notFound } from "next/navigation";
import { init } from "@/lib/bootstrap";
import { getSubmissionById } from "@/lib/repositories/submissions";
import { getNotificationLog } from "@/lib/email";
import { formatDate } from "@/lib/utils";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  init();
  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission) notFound();

  // Local record of the admin notification e-mail (sent / failed / never).
  const notification = await getNotificationLog(submission.id);

  return (
    <div>
      <Link
        href="/admin/submissions"
        className="inline-flex items-center gap-2 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:text-gold-deep"
      >
        ← Back to submissions
      </Link>

      <div className="mt-6">
        <h1 className="font-serif text-h2 text-charcoal">{submission.storyTitle}</h1>
        <p className="mt-2 text-[0.9rem] text-muted">
          Interest entry received {formatDate(submission.createdAt)} from{" "}
          {submission.submitterName}
        </p>
      </div>

      <SubmissionDetail submission={submission} notification={notification} />
    </div>
  );
}
