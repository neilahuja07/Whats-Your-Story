import Link from "next/link";
import { Pencil, Eye, Star } from "lucide-react";
import { init } from "@/lib/bootstrap";
import { listAllStories } from "@/lib/repositories/stories";
import { formatDate } from "@/lib/utils";
import { StoryRowActions } from "@/components/admin/StoryRowActions";
import { StoriesToolbar } from "@/components/admin/StoriesToolbar";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-beige text-muted border-line",
};

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  init();
  const params = await searchParams;
  const status = (typeof params.status === "string" ? params.status : "all") as
    | "all"
    | "draft"
    | "published"
    | "archived";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listAllStories({ status, q, page, pageSize: 20 });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">Stories</h1>
          <p className="mt-1 text-[0.9rem] text-muted">
            {result.total} {result.total === 1 ? "story" : "stories"} in the library.
          </p>
        </div>
        <Link
          href="/admin/stories/new"
          className="border border-charcoal bg-charcoal px-5 py-2.5 text-center font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep"
        >
          + New story
        </Link>
      </div>

      <StoriesToolbar currentStatus={status} currentQ={q} />

      {result.items.length === 0 ? (
        <div className="mt-8 border border-line bg-paper p-12 text-center">
          <p className="font-serif text-h4 text-charcoal">No stories found</p>
          <p className="mt-2 text-[0.9rem] text-muted">
            {q || status !== "all"
              ? "Try adjusting the filters, or create a new story."
              : "Create your first story to get started."}
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden border border-line bg-paper">
          {/* Table (desktop) */}
          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="border-b border-line bg-beige/40 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3">Story</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.items.map((s) => (
                <tr key={s.id} className="align-top transition-colors hover:bg-beige/20">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden bg-beige">
                        {s.portraitUrl && s.portraitVerified ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.portraitUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[0.6rem] text-muted">
                            {s.portraitUrl ? "unverified" : "no photo"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-charcoal">
                          {s.isSample && (
                            <span className="mr-2 bg-beige-deep px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide">
                              Sample
                            </span>
                          )}
                          {s.personName}
                        </p>
                        <p className="mt-0.5 text-[0.82rem] text-muted">
                          {s.categoryName ?? ""}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.7rem] text-muted/70">
                          /stories/{s.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block border px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-wide ${
                        STATUS_STYLES[s.status] ?? STATUS_STYLES.archived
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.isFeatured && s.status === "published" && (
                      <span className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-gold-deep">
                        <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[0.82rem] text-muted">
                    {formatDate(s.updatedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <StoryRowActions story={s} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards (mobile) */}
          <ul className="divide-y divide-line md:hidden">
            {result.items.map((s) => (
              <li key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal">{s.personName}</p>
                    <p className="mt-0.5 text-[0.82rem] text-muted">{s.categoryName ?? ""}</p>
                    <p className="mt-1">
                      <span
                        className={`inline-block border px-2 py-0.5 text-[0.66rem] uppercase tracking-wide ${
                          STATUS_STYLES[s.status] ?? STATUS_STYLES.archived
                        }`}
                      >
                        {s.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/stories/${s.id}`}
                    className="border border-line px-3 py-1.5 text-[0.7rem] font-medium"
                  >
                    <Pencil className="mr-1 inline h-3 w-3" aria-hidden="true" /> Edit
                  </Link>
                  {s.status === "published" && (
                    <Link
                      href={`/stories/${s.slug}`}
                      target="_blank"
                      className="border border-line px-3 py-1.5 text-[0.7rem] font-medium"
                    >
                      <Eye className="mr-1 inline h-3 w-3" aria-hidden="true" /> View
                    </Link>
                  )}
                  <StoryRowActions story={s} compact />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[0.82rem] text-muted">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/admin/stories?status=${status}&q=${encodeURIComponent(q)}&page=${result.page - 1}`}
                className="border border-line bg-paper px-4 py-2 text-[0.78rem]"
              >
                ← Previous
              </Link>
            )}
            {result.hasMore && (
              <Link
                href={`/admin/stories?status=${status}&q=${encodeURIComponent(q)}&page=${result.page + 1}`}
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
