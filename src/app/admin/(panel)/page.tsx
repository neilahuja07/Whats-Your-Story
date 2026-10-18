import Link from "next/link";
import {
  BookOpen,
  FileEdit,
  Inbox,
  Star,
  Clock,
  Archive,
} from "lucide-react";
import { init } from "@/lib/bootstrap";
import { getDashboardMetrics } from "@/lib/repositories/metrics";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "admin.login": "Signed in",
  "admin.logout": "Signed out",
  "story.created": "Created a story",
  "story.updated": "Updated a story",
  "story.published": "Published a story",
  "story.unpublished": "Unpublished a story",
  "story.archived": "Archived a story",
  "story.deleted": "Deleted a story",
  "story.featured": "Featured a story",
  "story.unfeatured": "Removed featured flag",
  "submission.status": "Changed submission status",
  "submission.created": "Received a submission",
  "submission.converted": "Converted submission to draft",
  "portrait.imported": "Imported a photograph",
  "portrait.verified": "Verified a photograph",
  "founder.updated": "Updated founder profile",
  "content.updated": "Updated site content",
};

export default async function AdminDashboard() {
  init();
  const m = await getDashboardMetrics();

  const cards = [
    {
      label: "Published stories",
      value: m.publishedStories,
      icon: BookOpen,
      href: "/admin/stories?status=published",
      tone: "text-emerald-700",
    },
    {
      label: "Draft stories",
      value: m.draftStories,
      icon: FileEdit,
      href: "/admin/stories?status=draft",
      tone: "text-gold-deep",
    },
    {
      label: "Featured stories",
      value: m.featuredStories,
      icon: Star,
      href: "/admin/stories?status=published",
      tone: "text-gold-deep",
    },
    {
      label: "Pending submissions",
      value: m.pendingSubmissions,
      icon: Inbox,
      href: "/admin/submissions?status=pending_review",
      tone: "text-amber-700",
    },
    {
      label: "Under review",
      value: m.underReviewSubmissions,
      icon: Clock,
      href: "/admin/submissions?status=under_review",
      tone: "text-blue-700",
    },
    {
      label: "Archived stories",
      value: m.archivedStories,
      icon: Archive,
      href: "/admin/stories?status=archived",
      tone: "text-muted",
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">Dashboard</h1>
          <p className="mt-1 text-[0.9rem] text-muted">
            Editorial overview — all figures come from live records.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/stories/new"
            className="border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep"
          >
            + New story
          </Link>
          <Link
            href="/admin/submissions"
            className="border border-line bg-paper px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
          >
            Review submissions
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex items-center justify-between bg-paper p-6 transition-colors hover:bg-beige/40"
          >
            <div>
              <p className={`font-serif text-[2.2rem] leading-none ${c.tone}`}>
                {c.value}
              </p>
              <p className="mt-2 font-sans text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-muted">
                {c.label}
              </p>
            </div>
            <c.icon
              className="h-6 w-6 text-gold/40 transition-colors group-hover:text-gold"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="font-serif text-h4 text-charcoal">Recent editorial activity</h2>
        <div className="mt-4 border border-line bg-paper">
          {m.recentActivity.length === 0 ? (
            <p className="p-6 text-[0.9rem] text-muted">
              No activity recorded yet. Actions appear here as you manage
              stories and submissions.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {m.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-[0.9rem] text-charcoal-soft">
                      {ACTION_LABELS[a.action] ?? a.action}
                      {a.entityId && (
                        <span className="ml-2 font-mono text-[0.72rem] text-muted">
                          {a.entityType}
                        </span>
                      )}
                    </p>
                    {a.adminEmail && (
                      <p className="text-[0.76rem] text-muted">{a.adminEmail}</p>
                    )}
                  </div>
                  <time
                    dateTime={a.createdAt}
                    className="shrink-0 text-[0.76rem] text-muted"
                  >
                    {formatDate(a.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
