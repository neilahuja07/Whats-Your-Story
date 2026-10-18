import Link from "next/link";
import { init } from "@/lib/bootstrap";
import { listSubmissions } from "@/lib/repositories/submissions";
import { formatDate } from "@/lib/utils";
import { SubmissionsToolbar } from "@/components/admin/SubmissionsToolbar";
import type { SubmissionReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-50 text-amber-800 border-amber-200",
  under_review: "bg-blue-50 text-blue-800 border-blue-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

const NEUTRAL_BADGE = "bg-beige text-muted border-line";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  init();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listSubmissions({
    status: status as SubmissionReviewStatus | "all",
    q,
    page,
    pageSize: 20,
  });

  return (
    <div>
      <div>
        <h1 className="font-serif text-h2 text-charcoal">Interest entries</h1>
        <p className="mt-1 text-[0.9rem] text-muted">
          {result.total} entr{result.total === 1 ? "y" : "ies"} received.
          Contact details are only shown when an entry is opened.
        </p>
      </div>

      <SubmissionsToolbar currentStatus={status} currentQ={q} />

      {result.items.length === 0 ? (
        <div className="mt-8 border border-line bg-paper p-12 text-center">
          <p className="font-serif text-h4 text-charcoal">No entries yet</p>
          <p className="mt-2 text-[0.9rem] text-muted">
            Interest entries submitted through{" "}
            <Link href="/share" className="text-gold-deep underline underline-offset-2">
              /share
            </Link>{" "}
            will appear here for review.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border border-line bg-paper">
          {result.items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/submissions/${s.id}`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-beige/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal">{s.storyTitle}</p>
                  <p className="mt-0.5 text-[0.84rem] text-muted">
                    {s.submitterName} · {formatDate(s.createdAt)}
                    {s.categoryName ? ` · ${s.categoryName}` : ""}
                  </p>
                </div>
                <span
                  className={`inline-block shrink-0 self-start border px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-wide sm:self-auto ${
                    STATUS_STYLES[s.reviewStatus] ?? NEUTRAL_BADGE
                  }`}
                >
                  {STATUS_LABELS[s.reviewStatus] ?? s.reviewStatus}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[0.82rem] text-muted">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/admin/submissions?status=${status}&q=${encodeURIComponent(q)}&page=${result.page - 1}`}
                className="border border-line bg-paper px-4 py-2 text-[0.78rem]"
              >
                ← Previous
              </Link>
            )}
            {result.hasMore && (
              <Link
                href={`/admin/submissions?status=${status}&q=${encodeURIComponent(q)}&page=${result.page + 1}`}
                className="border border-line bg-paper px-4 py-2 text-[0.78rem]"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
