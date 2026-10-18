import type { Metadata } from "next";
import Link from "next/link";
import { Search, X, SlidersHorizontal, Feather } from "lucide-react";
import { WideContainer, SectionHeading, Eyebrow } from "@/components/ui/Layout";
import { StoryCard } from "@/components/StoryCard";
import { Reveal } from "@/components/motion/Reveal";
import { BackToTop } from "@/components/motion/BackToTop";
import { init } from "@/lib/bootstrap";
import {
  listPublishedStories,
  listFeaturedStories,
  listPublishedCategories,
} from "@/lib/repositories/stories";

export const metadata: Metadata = {
  title: "Discover Stories",
  description:
    "Read real-life stories about people, their experiences, struggles, achievements, and personal journeys.",
  alternates: { canonical: "/stories" },
};

export const dynamic = "force-dynamic";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "featured", label: "Featured" },
  { value: "oldest", label: "Oldest" },
] as const;

/**
 * Varied card proportions on a 3-column rhythm. Cycle length 6 keeps the
 * pattern regular enough to feel intentional rather than random, while
 * breaking up the "identical tiles" look.
 */
const GRID_ASPECTS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-square",
];

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  init();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const sortParam = typeof params.sort === "string" ? params.sort : "newest";
  const sort = (SORTS.find((s) => s.value === sortParam)?.value ?? "newest") as
    | "newest"
    | "featured"
    | "oldest";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 12;

  const result = await listPublishedStories({ q, category, sort, page, pageSize });
  const categories = await listPublishedCategories();
  const featured = await listFeaturedStories(2);
  // Sample content is detected from the returned stories (is_sample flag).
  const samples = [...result.items, ...featured].some((s) => s.isSample);
  const hasFilters = Boolean(q || category || sortParam !== "newest");

  /** Build a URL preserving the current filters. */
  function hrefWith(next: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      q: q || undefined,
      category: category || undefined,
      sort: sortParam !== "newest" ? sortParam : undefined,
      page: undefined,
      ...next,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === "") continue;
      sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `/stories?${s}` : "/stories";
  }

  return (
    <>
      {/* Header */}
      <section className="border-b border-line bg-beige/30">
        <WideContainer className="py-16 md:py-20">
          <Eyebrow>Discover</Eyebrow>
          <h1 className="anim-in anim-fade-up mt-4 font-serif text-display-sm text-charcoal">
            Stories Worth Hearing
          </h1>
          <span
            aria-hidden="true"
            className="rule-gold anim-in anim-rule-in mt-6"
            style={{ animationDelay: "160ms" }}
          />
          <p
            className="anim-in anim-fade-up mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-muted"
            style={{ animationDelay: "240ms" }}
          >
            Real accounts of experience, struggle, and triumph — told by the
            people who lived them, published only with their permission.
          </p>

          {/* Search + sort */}
          <form
            method="get"
            action="/stories"
            className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center"
            role="search"
          >
            <div className="relative flex-1">
              <label htmlFor="q" className="sr-only">
                Search by person&apos;s name or story excerpt
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search by name or excerpt…"
                className="w-full border border-line bg-paper py-3.5 pl-11 pr-4 text-[0.95rem] text-charcoal placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none"
              />
            </div>
            <div className="relative">
              <label htmlFor="sort" className="sr-only">
                Sort stories
              </label>
              <SlidersHorizontal
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <select
                id="sort"
                name="sort"
                defaultValue={sortParam}
                className="w-full appearance-none border border-line bg-paper py-3.5 pl-11 pr-10 text-[0.95rem] text-charcoal transition-colors focus:border-gold focus:outline-none lg:w-auto"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="border border-charcoal bg-charcoal px-8 py-3.5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep"
            >
              Search
            </button>
          </form>

          {/* Category filters */}
          <nav aria-label="Filter by category" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={hrefWith({ category: undefined })}
                  aria-current={!category ? "page" : undefined}
                  className={`inline-block border px-4 py-1.5 font-sans text-[0.76rem] font-medium transition-colors ${
                    !category
                      ? "border-charcoal bg-charcoal text-ivory"
                      : "border-line bg-paper text-charcoal-soft hover:border-gold hover:text-gold-deep"
                  }`}
                >
                  All Stories
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={hrefWith({ category: c.slug })}
                    aria-current={category === c.slug ? "page" : undefined}
                    className={`inline-block border px-4 py-1.5 font-sans text-[0.76rem] font-medium transition-colors ${
                      category === c.slug
                        ? "border-charcoal bg-charcoal text-ivory"
                        : "border-line bg-paper text-charcoal-soft hover:border-gold hover:text-gold-deep"
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Active filter summary */}
          {hasFilters && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[0.82rem] text-muted">
              <span>
                {result.total} {result.total === 1 ? "story" : "stories"} found
                {q && (
                  <>
                    {" "}
                    for{" "}
                    <strong className="font-semibold text-charcoal">
                      &ldquo;{q}&rdquo;
                    </strong>
                  </>
                )}
              </span>
              <Link
                href="/stories"
                className="link-sweep inline-flex items-center gap-1 font-medium text-gold-deep hover:text-charcoal"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear all
              </Link>
            </div>
          )}
        </WideContainer>
      </section>

      {/* Featured strip */}
      {!hasFilters && featured.length > 0 && (
        <section className="border-b border-line py-14">
          <WideContainer>
            <SectionHeading eyebrow="Editor's pick" title="Featured Stories" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {featured.map((story, i) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  showDate
                  aspect="aspect-[16/10]"
                  revealIndex={i}
                  excerptLines={2}
                />
              ))}
            </div>
          </WideContainer>
        </section>
      )}

      {/* Grid */}
      <section className="py-16 md:py-20">
        <WideContainer>
          {samples && (
            <p className="mb-10 border-l-2 border-gold bg-beige/40 px-5 py-4 text-[0.86rem] text-muted">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-deep">
                Preview content
              </span>{" "}
              — stories marked &ldquo;Sample&rdquo; demonstrate the layout and
              will be replaced with approved real stories.
            </p>
          )}

          {result.items.length > 0 ? (
            <>
              <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((story, i) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    showDate
                    priority={i < 3}
                    revealIndex={i % 3}
                    aspect={GRID_ASPECTS[i % GRID_ASPECTS.length]}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-14 flex flex-col items-center gap-6 sm:flex-row sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {result.page > 1 ? (
                      <Link
                        href={hrefWith({ page: result.page - 1 })}
                        className="border border-line bg-paper px-5 py-2.5 font-sans text-[0.76rem] font-medium text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
                      >
                        ← Previous
                      </Link>
                    ) : (
                      <span className="border border-line/60 px-5 py-2.5 font-sans text-[0.76rem] text-muted/50">
                        ← Previous
                      </span>
                    )}
                    <span className="text-[0.84rem] text-muted">
                      Page {result.page} of {result.totalPages}
                    </span>
                    {result.hasMore ? (
                      <Link
                        href={hrefWith({ page: result.page + 1 })}
                        className="border border-line bg-paper px-5 py-2.5 font-sans text-[0.76rem] font-medium text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="border border-line/60 px-5 py-2.5 font-sans text-[0.76rem] text-muted/50">
                        Next →
                      </span>
                    )}
                  </div>
                  <p className="text-[0.8rem] text-muted">
                    Showing {result.items.length} of {result.total} stories
                  </p>
                </nav>
              )}
            </>
          ) : (
            /* Empty state */
            <Reveal className="mx-auto max-w-lg border border-line bg-paper px-8 py-16 text-center">
              <span aria-hidden="true" className="rule-gold mx-auto !w-10" />
              <h2 className="mt-6 font-serif text-h3 text-charcoal">
                {result.total === 0 && !hasFilters
                  ? "The first stories are on their way"
                  : "No stories match your search"}
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-[0.95rem] leading-relaxed text-muted">
                {q ? (
                  <>
                    We couldn&apos;t find a story matching &ldquo;{q}&rdquo;.
                    Try a different name or phrase.
                  </>
                ) : category ? (
                  "There are no published stories in this category yet."
                ) : (
                  <>
                    Our editorial team is reviewing submissions. You can be
                    among the first to share yours.
                  </>
                )}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {result.total === 0 && !hasFilters ? (
                  <>
                    <Link
                      href="/share"
                      className="inline-block border border-charcoal bg-charcoal px-6 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep"
                    >
                      Share Your Story
                    </Link>
                    <Link
                      href="/about"
                      className="inline-flex items-center gap-2 border border-charcoal/30 px-6 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold-deep hover:text-gold-deep"
                    >
                      <Feather className="h-3.5 w-3.5" aria-hidden="true" />
                      Why we exist
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/stories"
                    className="inline-block border border-charcoal bg-charcoal px-6 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep"
                  >
                    View all stories
                  </Link>
                )}
              </div>
            </Reveal>
          )}
        </WideContainer>
      </section>

      <BackToTop />
    </>
  );
}
