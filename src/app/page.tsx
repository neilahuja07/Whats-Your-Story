import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  Container,
  WideContainer,
  SectionHeading,
  Eyebrow,
} from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { StoryCard } from "@/components/StoryCard";
import { Portrait } from "@/components/Portrait";
import { Reveal } from "@/components/motion/Reveal";
import { BackToTop } from "@/components/motion/BackToTop";
import { HeroCollage } from "@/components/home/HeroCollage";
import { init } from "@/lib/bootstrap";
import {
  listPublishedStories,
  listFeaturedStories,
} from "@/lib/repositories/stories";
import { listHomeCollagePortraits } from "@/lib/repositories/collagePortraits";
import { getFounderProfile } from "@/lib/repositories/founder";
import { getSiteContentValue } from "@/lib/repositories/siteContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  init();

  const headline = getSiteContentValue("home.headline");
  const supportingText = getSiteContentValue("home.supporting_text");
  const aboutHeading = getSiteContentValue("home.about_heading");
  const aboutBody = getSiteContentValue("home.about_body");

  const featured = await listFeaturedStories(3);
  const latest = await listPublishedStories({ pageSize: 6, sort: "newest" });
  const founder = getFounderProfile();

  // Homepage hero collage: only photographs the admin selected in
  // Admin → Portraits (verified + enabled), in the admin's order.
  const collagePortraits = listHomeCollagePortraits();

  // Sample content is detected from the returned stories (is_sample flag).
  const samples = [...featured, ...latest.items].some((s) => s.isSample);

  // Featured stories when available, otherwise the newest.
  const showcase = featured.length > 0 ? featured : latest.items.slice(0, 3);
  const storyCount = latest.total;
  const hasStories = storyCount > 0;

  /** Alternating card proportions so a row of three never reads as a template. */
  const FEATURED_ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[4/5]"];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-line">
        <Container className="grid items-center gap-14 py-16 md:grid-cols-12 md:gap-12 md:py-24 lg:py-28">
          <div className="md:col-span-7">
            <Reveal delay={0}>
              <Eyebrow className="mb-6">Real people. Real stories.</Eyebrow>
            </Reveal>

            <h1 className="anim-in anim-fade-up font-serif text-display text-charcoal">
              {headline}
            </h1>

            <span
              aria-hidden="true"
              className="rule-gold anim-in anim-rule-in mt-8"
              style={{ animationDelay: "180ms" }}
            />

            <p
              className="anim-in anim-fade-up mt-7 max-w-xl text-[1.08rem] leading-relaxed text-muted"
              style={{ animationDelay: "260ms" }}
            >
              {supportingText}
            </p>

            <div
              className="anim-in anim-fade-up mt-10 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: "380ms" }}
            >
              <ButtonLink href="/stories" size="lg">
                Discover Stories{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/share" variant="secondary" size="lg">
                Share Your Story
              </ButtonLink>
            </div>
          </div>

          <div className="md:col-span-5">
            <HeroCollage portraits={collagePortraits} />
          </div>
        </Container>

        {samples && (
          <div className="border-t border-line bg-beige/50">
            <Container className="py-3">
              <p className="text-center text-[0.78rem] text-muted">
                <span className="font-semibold uppercase tracking-[0.16em] text-gold-deep">
                  Preview content
                </span>{" "}
                — the stories below are clearly-labelled samples that demonstrate
                the layout. Real stories are added through the admin panel after
                review.
              </p>
            </Container>
          </div>
        )}
      </section>

      {/* ================= A. FEATURED STORIES ================= */}
      {showcase.length > 0 && (
        <section id="featured" className="scroll-mt-24 py-20 md:py-28">
          <WideContainer>
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <SectionHeading
                eyebrow="Featured"
                title="Stories That Stay With You"
                description="A curated selection of journeys, told by the people who lived them."
              />
              <Link
                href="/stories"
                className="group inline-flex shrink-0 items-center gap-2 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold-deep"
              >
                View all stories
                <ArrowUpRight
                  className="h-4 w-4 text-gold transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((story, i) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  showDate
                  priority={i < 3}
                  aspect={FEATURED_ASPECTS[i % FEATURED_ASPECTS.length]}
                  revealIndex={i}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ))}
            </div>
          </WideContainer>
        </section>
      )}

      {/* ================= B. LATEST STORIES ================= */}
      {latest.items.length > 0 && (
        <section className="border-y border-line bg-beige/30 py-20 md:py-28">
          <WideContainer>
            <SectionHeading
              eyebrow="Latest"
              title="More Stories to Explore"
              description="Search by name or title, filter by category, and read at your own pace."
              className="mx-auto text-center"
            />
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {latest.items.slice(0, 6).map((story, i) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  showDate
                  revealIndex={i}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ))}
            </div>
            <div className="mt-12 text-center">
              <ButtonLink href="/stories" variant="secondary" size="lg">
                Explore all stories{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </WideContainer>
        </section>
      )}

      {/* Empty state: no published stories yet */}
      {!hasStories && (
        <section className="border-y border-line bg-beige/30 py-20 md:py-24">
          <Container>
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow className="mb-5">Just getting started</Eyebrow>
              <h2 className="font-serif text-h2 text-charcoal">
                The first stories are on their way.
              </h2>
              <span aria-hidden="true" className="rule-gold mx-auto mt-6" />
              <p className="mx-auto mt-6 max-w-lg text-[1.02rem] leading-relaxed text-muted">
                Our editorial team is reviewing submissions. In the meantime,
                you can be among the first to share yours.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                <ButtonLink href="/share" size="lg">
                  Share Your Story
                </ButtonLink>
                <ButtonLink href="/about" variant="secondary" size="lg">
                  Why we exist
                </ButtonLink>
              </div>
            </Reveal>
          </Container>
        </section>
      )}

      {/* ================= C. WHY WE EXIST ================= */}
      <section className="py-20 md:py-28">
        <Container className="grid items-center gap-14 md:grid-cols-2 md:gap-16">
          <Reveal>
            <SectionHeading eyebrow="Why we exist" title={aboutHeading} />
            <div className="mt-7 space-y-4 text-[1.02rem] leading-relaxed text-muted">
              {aboutBody.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={140} className="relative">
            <div className="zoom-frame aspect-[4/5] w-full overflow-hidden bg-beige">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/editorial/about-01.jpg"
                alt="A fountain pen writing on paper"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute -bottom-5 -left-5 hidden h-32 w-32 border-b-2 border-l-2 border-gold md:block"
            />
          </Reveal>
        </Container>
      </section>

      {/* ================= D. THE FOUNDER ================= */}
      <section className="border-y border-line bg-beige/30 py-20 md:py-28">
        <Container className="grid items-center gap-14 md:grid-cols-12 md:gap-16">
          <Reveal className="md:col-span-4">
            <Portrait
              src={founder.portraitUrl}
              name={founder.name || "Our Founder"}
              verified={founder.portraitVerified}
              className="aspect-[4/5] w-full"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </Reveal>

          <Reveal delay={140} className="md:col-span-8">
            <SectionHeading
              eyebrow="Our Founder"
              title="The Person Behind the Platform"
            />
            {founder.isDraft || !founder.name ? (
              <>
                <p className="mt-6 font-serif text-h4 italic text-charcoal-soft">
                  A message from our founder
                </p>
                <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-muted">
                  What&apos;s Your Story began with one simple belief: that
                  every person is living a story worth recording, and that most
                  of those stories go unheard simply because nobody asked.
                </p>
                <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-muted">
                  The complete founder profile, including the name,
                  photograph, and biography, will appear here once it has been
                  reviewed and approved.
                </p>
              </>
            ) : (
              <>
                <p className="mt-6 font-serif text-h4 text-charcoal">
                  {founder.name}
                </p>
                {founder.role && (
                  <p className="mt-1 text-[0.82rem] font-medium uppercase tracking-[0.16em] text-gold-deep">
                    {founder.role}
                  </p>
                )}
                <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-muted">
                  {founder.motivation ||
                    founder.biography.split("\n\n")[0] ||
                    ""}
                </p>
              </>
            )}
            <ButtonLink href="/founder" variant="secondary" className="mt-8">
              Meet the founder <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </Reveal>
        </Container>
      </section>

      {/* ================= E. SHARE YOUR STORY ================= */}
      <section className="relative overflow-hidden bg-charcoal py-24 md:py-32">
        <Container className="relative z-10 text-center">
          <Reveal>
            <Eyebrow className="!text-gold">Contribute</Eyebrow>
            <h2 className="mx-auto mt-5 max-w-3xl font-serif text-display-sm text-ivory">
              Your Story Deserves to Be Heard.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ivory/70">
              Your experiences might be exactly what someone else needs to hear.
            </p>
            <div className="mt-10">
              <ButtonLink
                href="/share"
                size="lg"
                className="!border-gold !bg-gold !text-charcoal hover:!border-ivory hover:!bg-ivory"
              >
                Share Your Story <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
        {/* Restrained gold accent lines */}
        <span aria-hidden="true" className="absolute left-0 top-0 h-px w-full bg-gold/20" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-full bg-gold/20" />
      </section>

      {/* F. Footer is rendered globally in the root layout. */}
      <BackToTop />
    </>
  );
}
