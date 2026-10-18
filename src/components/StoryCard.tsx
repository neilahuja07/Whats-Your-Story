import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Portrait } from "@/components/Portrait";
import { Reveal } from "@/components/motion/Reveal";
import { formatDate } from "@/lib/utils";
import type { Story } from "@/lib/types";

/**
 * StoryCard — the signature editorial card.
 *
 * Portrait, person's name, story title, excerpt, category and optional date.
 * The whole card is one link; hovering gently zooms the portrait and slides
 * in a gold accent rule. Cards reveal themselves with a small stagger when
 * they scroll into view.
 *
 * `aspect` lets collections break the grid up with varied card proportions
 * instead of making every card identical.
 */
export function StoryCard({
  story,
  showDate = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  aspect = "aspect-square",
  revealIndex = 0,
  excerptLines = 3,
}: {
  story: Story;
  showDate?: boolean;
  sizes?: string;
  priority?: boolean;
  aspect?: string;
  revealIndex?: number;
  excerptLines?: 1 | 2 | 3;
}) {
  const lineClamp =
    excerptLines === 1
      ? "line-clamp-1"
      : excerptLines === 2
        ? "line-clamp-2"
        : "line-clamp-3";

  return (
    <Reveal delay={Math.min(revealIndex, 5) * 80} className="h-full">
      <Link
        href={`/stories/${story.slug}`}
        className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <article className="flex h-full flex-col">
          <div
            className={`zoom-frame relative overflow-hidden bg-beige ${aspect}`}
          >
            <Portrait
              src={story.portraitUrl}
              name={story.personName}
              verified={story.portraitVerified}
              alt={story.imageAlt}
              sizes={sizes}
              priority={priority}
              className="h-full w-full"
            />
            {/* Hover accent: thin gold rule sliding in from the left */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-[3px] w-0 bg-gold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full"
            />
            {story.isSample && (
              <span className="absolute left-0 top-0 bg-beige-deep px-2.5 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-charcoal-soft">
                Sample
              </span>
            )}
            {story.categoryName && (
              <span className="absolute bottom-0 right-0 translate-y-2 bg-ivory/95 px-3 py-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-gold-deep opacity-0 backdrop-blur-sm transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                {story.categoryName}
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col pt-5">
            {story.categoryName && (
              <div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <span>{story.categoryName}</span>
              </div>
            )}

            <h3 className="mt-2.5 font-serif text-[1.32rem] leading-snug text-charcoal transition-colors duration-300 group-hover:text-gold-deep">
              {story.personName}
            </h3>

            {story.excerpt && (
              <p className={`mt-2.5 ${lineClamp} text-[0.94rem] leading-relaxed text-muted`}>
                {story.excerpt}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-4">
              <span className="inline-flex items-center gap-1.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors duration-300 group-hover:text-gold-deep">
                Read Story
                <ArrowUpRight
                  className="h-3.5 w-3.5 text-gold transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </span>
              {showDate && story.publicationDate && (
                <time
                  dateTime={story.publicationDate}
                  className="text-[0.72rem] whitespace-nowrap text-muted"
                >
                  {formatDate(story.publicationDate)}
                </time>
              )}
            </div>
          </div>
        </article>
      </Link>
    </Reveal>
  );
}

/** Loading placeholder shown while stories are being fetched. */
export function StoryCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-beige" />
      <div className="mt-4 h-3 w-24 bg-beige" />
      <div className="mt-3 h-5 w-3/4 bg-beige" />
      <div className="mt-2 h-3 w-full bg-beige" />
      <div className="mt-1.5 h-3 w-2/3 bg-beige" />
    </div>
  );
}
