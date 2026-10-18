import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { WideContainer } from "@/components/ui/Layout";
import { Portrait } from "@/components/Portrait";
import { StoryCard } from "@/components/StoryCard";
import { ShareButton } from "@/components/ShareButton";
import { ReadingProgress } from "@/components/motion/ReadingProgress";
import { BackToTop } from "@/components/motion/BackToTop";
import { init } from "@/lib/bootstrap";
import {
  getPublishedStoryBySlug,
  getRelatedStories,
  getPublishedSlugs,
} from "@/lib/repositories/stories";
import { formatDate } from "@/lib/utils";
import { sanitizeRichText, safeImageUrl } from "@/lib/sanitize";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Static params for published stories (used with force-dynamic as a hint). */
export async function generateStaticParams() {
  try {
    init();
    return (await getPublishedSlugs()).map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  init();
  const { slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  if (!story) return { title: "Story not found" };

  const title = story.seoTitle || story.personName;
  const description =
    story.seoDescription || story.excerpt || `A story told by ${story.personName}.`;
  const url = `${SITE_URL}/stories/${story.slug}`;
  const image = safeImageUrl(story.portraitUrl);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "What's Your Story",
      ...(image
        ? {
            images: [
              {
                url: image,
                width: 900,
                height: 900,
                alt: story.imageAlt || story.personName,
              },
            ],
          }
        : {}),
      publishedTime: story.publicationDate ?? undefined,
      authors: [story.personName],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  init();
  const { slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  if (!story) notFound();

  const related = await getRelatedStories(story, 3);
  const bodyHtml = sanitizeRichText(story.body);
  const canonical = `${SITE_URL}/stories/${story.slug}`;
  const portrait = safeImageUrl(story.portraitUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.personName,
    description: story.excerpt,
    datePublished: story.publicationDate ?? undefined,
    author: { "@type": "Person", name: story.personName },
    publisher: {
      "@type": "Organization",
      name: "What's Your Story",
      url: SITE_URL,
    },
    mainEntityOfPage: canonical,
    ...(portrait
      ? {
          image: [
            portrait.startsWith("http") ? portrait : `${SITE_URL}${portrait}`,
          ],
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Reading progress */}
      <ReadingProgress />

      {/* Header */}
      <section className="border-b border-line bg-beige/30">
        <WideContainer className="py-12 md:py-16">
          <Link
            href="/stories"
            className="group inline-flex items-center gap-2 font-sans text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold-deep"
          >
            <ArrowLeft
              className="h-4 w-4 text-gold transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            />
            Back to all stories
          </Link>

          <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-12">
            {/* Cover photograph */}
            <div className="md:col-span-4">
              <div className="anim-in anim-zoom-in">
                <Portrait
                  src={story.portraitUrl}
                  name={story.personName}
                  verified={story.portraitVerified}
                  alt={story.imageAlt}
                  className="aspect-square w-full"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
            </div>

            {/* Title block */}
            <div className="flex flex-col justify-center md:col-span-8">
              <div className="anim-in anim-fade-up flex flex-wrap items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
                {story.categoryName && (
                  <span className="text-muted">{story.categoryName}</span>
                )}
                {story.isSample && (
                  <span className="bg-beige-deep px-2 py-0.5 text-[0.6rem] text-charcoal-soft">
                    Sample
                  </span>
                )}
              </div>

              <h1
                className="anim-in anim-fade-up mt-4 font-serif text-display-sm text-charcoal"
                style={{ animationDelay: "120ms" }}
              >
                {story.personName}
              </h1>

              {story.publicationDate && (
                <p
                  className="anim-in anim-fade-up mt-5 flex items-center gap-2 text-[0.86rem] text-muted"
                  style={{ animationDelay: "220ms" }}
                >
                  <CalendarDays className="h-4 w-4 text-gold" aria-hidden="true" />
                  <time dateTime={story.publicationDate}>
                    Published {formatDate(story.publicationDate)}
                  </time>
                </p>
              )}

              {story.authorCredit && (
                <p
                  className="anim-in anim-fade-up mt-2 text-[0.86rem] text-muted"
                  style={{ animationDelay: "280ms" }}
                >
                  Told by {story.personName} · Edited by {story.authorCredit}
                </p>
              )}

              <div
                className="anim-in anim-fade-up mt-8"
                style={{ animationDelay: "360ms" }}
              >
                <ShareButton
                  title={story.personName}
                  text={`${story.personName} — a story on What's Your Story`}
                  url={canonical}
                />
              </div>
            </div>
          </div>
        </WideContainer>
      </section>

      {/* Body */}
      <article className="py-16 md:py-20">
        <WideContainer>
          <div className="mx-auto max-w-[680px]">
            {story.excerpt && (
              <p className="mb-10 border-l-2 border-gold pl-6 font-serif text-[1.3rem] italic leading-relaxed text-charcoal-soft">
                {story.excerpt}
              </p>
            )}

            <div
              className="prose-story"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            <div className="mt-14 border-t border-line pt-8">
              <p className="text-[0.9rem] leading-relaxed text-muted">
                This story was told by{" "}
                <strong className="font-semibold text-charcoal">
                  {story.personName}
                </strong>{" "}
                and published with their permission by the What&apos;s Your Story
                editorial team.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ShareButton
                  title={story.personName}
                  text={`${story.personName} — a story on What's Your Story`}
                  url={canonical}
                  compact
                />
                <Link
                  href="/share"
                  className="inline-flex items-center gap-2 border border-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:bg-charcoal hover:text-ivory"
                >
                  Share your own story
                </Link>
              </div>
            </div>
          </div>
        </WideContainer>
      </article>

      {/* Related stories — published only, fetched from Supabase. */}
      {related.length > 0 && (
        <section className="border-t border-line bg-beige/30 py-16 md:py-20">
          <WideContainer>
            <h2 className="font-serif text-h3 text-charcoal">Related Stories</h2>
            <span aria-hidden="true" className="rule-gold mt-4" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((s, i) => (
                <StoryCard
                  key={s.id}
                  story={s}
                  showDate
                  revealIndex={i}
                  aspect={i % 2 === 0 ? "aspect-[4/5]" : "aspect-square"}
                />
              ))}
            </div>
          </WideContainer>
        </section>
      )}

      <BackToTop />
    </>
  );
}
