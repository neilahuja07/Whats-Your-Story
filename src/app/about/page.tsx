import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Feather, HandHeart, ShieldCheck, Compass } from "lucide-react";
import {
  Container,
  WideContainer,
  SectionHeading,
  Eyebrow,
  GoldRule,
} from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { BackToTop } from "@/components/motion/BackToTop";
import { init } from "@/lib/bootstrap";
import { getSiteContentValue } from "@/lib/repositories/siteContent";

export const metadata: Metadata = {
  title: "About Us",
  description: "Why What's Your Story exists — and why personal storytelling matters.",
  alternates: { canonical: "/about" },
};

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  {
    title: "Every person has a story",
    body: "Not only the famous, the extraordinary, or the decorated. The quiet, difficult, ordinary, and hard-won days of real lives are exactly what this platform exists to hold.",
    icon: Feather,
  },
  {
    title: "Experience can inspire",
    body: "Someone, somewhere, is standing where you once stood. A story told honestly can be the thing that helps them take the next step.",
    icon: Compass,
  },
  {
    title: "Stories create understanding",
    body: "Reading a life unlike your own builds empathy in a way that argument never can. That is why we publish with care, and why we let people speak for themselves.",
    icon: HandHeart,
  },
  {
    title: "Permission before publication",
    body: "No story appears here without the knowledge and approval of the person who lived it. Every submission is reviewed by a human editor before anything is published.",
    icon: ShieldCheck,
  },
];

/** Short statements for the editorial strip under the hero. */
const PILLARS = [
  { k: "First person", v: "Written by the people who lived it." },
  { k: "Human reviewed", v: "Every submission is read by an editor." },
  { k: "Permission led", v: "Nothing is published without consent." },
];

export default function AboutPage() {
  init();
  const body = getSiteContentValue("about.page_body");
  const vision = getSiteContentValue("about.vision");

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-line bg-beige/30">
        <Container className="py-16 md:py-24">
          <Eyebrow>About Us</Eyebrow>
          <h1 className="anim-in anim-fade-up mt-4 max-w-3xl font-serif text-display-sm text-charcoal">
            A Place for Untold Stories to Be Heard
          </h1>
          <span
            aria-hidden="true"
            className="rule-gold anim-in anim-rule-in mt-7"
            style={{ animationDelay: "160ms" }}
          />
          <p
            className="anim-in anim-fade-up mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-muted"
            style={{ animationDelay: "240ms" }}
          >
            What&apos;s Your Story is an editorial home for real, first-person
            accounts — published carefully, and always with permission.
          </p>
        </Container>
      </section>

      {/* Editorial pillars strip */}
      <section className="border-b border-line bg-paper">
        <Container>
          <dl className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {PILLARS.map((p, i) => (
              <Reveal key={p.k} delay={i * 100} className="px-0 py-7 md:px-8">
                <dt className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-gold-deep">
                  {p.k}
                </dt>
                <dd className="mt-2 font-serif text-[1.12rem] leading-snug text-charcoal">
                  {p.v}
                </dd>
              </Reveal>
            ))}
          </dl>
        </Container>
      </section>

      {/* Body */}
      <section className="py-16 md:py-24">
        <Container className="grid gap-12 md:grid-cols-12 md:gap-16">
          <Reveal className="md:col-span-7">
            <div className="max-w-[640px] space-y-5 text-[1.05rem] leading-[1.85] text-charcoal-soft">
              {body.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </Reveal>

          <aside className="md:col-span-5">
            <Reveal>
              <div className="border-l-2 border-gold bg-beige/40 p-8">
                <Eyebrow>Our vision</Eyebrow>
                <p className="mt-4 font-serif text-[1.45rem] italic leading-relaxed text-charcoal">
                  {vision}
                </p>
              </div>
            </Reveal>
            <Reveal delay={140} className="mt-8">
              <div className="zoom-frame aspect-[4/5] w-full overflow-hidden bg-beige">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/editorial/about-01.jpg"
                  alt="A fountain pen writing on lined paper"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </aside>
        </Container>
      </section>

      {/* Principles */}
      <section className="border-y border-line bg-beige/30 py-16 md:py-24">
        <WideContainer>
          <SectionHeading
            eyebrow="What we believe"
            title="Why Personal Storytelling Matters"
            className="mx-auto text-center"
          />
          <div className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.title} delay={i * 90}>
                  <div className="group h-full bg-paper p-8 transition-colors duration-500 md:p-10">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-serif text-[2rem] leading-none text-gold/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon
                        className="h-5 w-5 shrink-0 text-gold/70 transition-transform duration-500 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mt-4 font-serif text-h4 text-charcoal">
                      {p.title}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="mt-3 block h-px w-8 bg-gold transition-all duration-500 group-hover:w-16"
                    />
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </WideContainer>
      </section>

      {/* The kind of stories we share */}
      <section className="py-16 md:py-24">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="Our editorial promise"
            title="The Kind of Stories We Share"
            description="We are not interested in spectacle. We are interested in truth."
          />
          <div className="mt-8 space-y-5 text-[1.02rem] leading-[1.85] text-charcoal-soft">
            <p>
              We publish first-person accounts of experience, struggle,
              achievement, and change — the turning points that reshape a life,
              and the quiet courage of getting through ordinary difficult days.
            </p>
            <p>
              Every story is read by a member of our editorial team. We edit
              only for clarity, length, and readability, and never in a way
              that changes the meaning of what someone has said. Where a story
              is not the right fit, we say so.
            </p>
            <p>
              And because a story belongs to the person who lived it, nothing is
              published automatically. We confirm permissions before anything
              appears on this site.
            </p>
          </div>

          <div className="rule-diamond mt-12">
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          </div>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-muted">
                Read
              </p>
              <Link
                href="/stories"
                className="link-sweep mt-1 inline-flex items-center gap-2 font-serif text-[1.15rem] text-charcoal hover:text-gold-deep"
              >
                Discover stories <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div>
              <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-muted">
                Meet
              </p>
              <Link
                href="/founder"
                className="link-sweep mt-1 inline-flex items-center gap-2 font-serif text-[1.15rem] text-charcoal hover:text-gold-deep"
              >
                Our founder <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Invitation */}
      <section className="border-t border-line bg-beige/30 py-16 md:py-24">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <GoldRule className="mx-auto mb-6" />
            <h2 className="font-serif text-h2 text-charcoal">
              Your Story Belongs Here Too
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-muted">
              If you have lived something you believe could matter to someone
              else, we would be honoured to read it. Submission takes only a few
              minutes.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <ButtonLink href="/share" size="lg">
                Share Your Story
              </ButtonLink>
              <ButtonLink href="/stories" variant="secondary" size="lg">
                Read stories first
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      <BackToTop />
    </>
  );
}
