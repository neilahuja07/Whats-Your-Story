import type { Metadata } from "next";
import { Container, Eyebrow, GoldRule } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { Portrait } from "@/components/Portrait";
import { Reveal } from "@/components/motion/Reveal";
import { BackToTop } from "@/components/motion/BackToTop";
import { ArrowRight } from "lucide-react";
import { init } from "@/lib/bootstrap";
import { getFounderProfile } from "@/lib/repositories/founder";

export const metadata: Metadata = {
  title: "Our Founder",
  description:
    "The story behind What's Your Story, a platform built so that untold stories can be heard.",
  alternates: { canonical: "/founder" },
};

export const dynamic = "force-dynamic";

/** Split long-form text into paragraphs, guarding against empty renders. */
function Paragraphs({ text, className }: { text: string; className: string }) {
  const paras = text.split("\n\n").filter((p) => p.trim().length > 0);
  if (paras.length === 0) return null;
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export default function FounderPage() {
  init();
  const founder = getFounderProfile();
  const isDraft = founder.isDraft || !founder.name;

  return (
    <>
      {/* Header */}
      <section className="border-b border-line bg-beige/30">
        <Container className="py-16 md:py-24">
          <Eyebrow>Our Founder</Eyebrow>
          <h1 className="anim-in anim-fade-up mt-4 max-w-3xl font-serif text-display-sm text-charcoal">
            {isDraft ? "The Person Behind the Platform" : founder.name}
          </h1>
          <span
            aria-hidden="true"
            className="rule-gold anim-in anim-rule-in mt-7"
            style={{ animationDelay: "160ms" }}
          />
          {founder.role && (
            <p
              className="anim-in anim-fade-up mt-5 text-[0.82rem] font-medium uppercase tracking-[0.18em] text-gold-deep"
              style={{ animationDelay: "240ms" }}
            >
              {founder.role}
            </p>
          )}
        </Container>
      </section>

      {isDraft ? (
        /* ---------------- DRAFT STATE ---------------- */
        <section className="py-16 md:py-24">
          <Container className="grid gap-12 md:grid-cols-12 md:gap-16">
            <Reveal className="md:col-span-5">
              <Portrait
                src={founder.portraitUrl}
                name="Our Founder"
                verified={founder.portraitVerified}
                className="aspect-[4/5] w-full"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </Reveal>

            <Reveal delay={140} className="md:col-span-7">
              {/* Clear, honest draft notice — no invented biography. */}
              <div className="border-l-2 border-gold bg-beige/40 p-6">
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-deep">
                  Draft profile, pending review
                </p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
                  The founder&apos;s name, photograph, and biography have not
                  been published yet. Rather than publish information that has
                  not been checked, this page will be completed once the real
                  profile has been reviewed and approved by the founder.
                </p>
              </div>

              <div className="mt-10 max-w-[640px] space-y-5 text-[1.05rem] leading-[1.85] text-charcoal-soft">
                <p className="font-serif text-h4 italic text-charcoal">
                  A message from our founder
                </p>
                <p>
                  What&apos;s Your Story began with one simple belief: that
                  every person is living a story worth recording, and that most
                  of those stories go unheard simply because nobody asked.
                </p>
                <p>
                  We built a quiet, editorial home for exactly those accounts.
                  No spectacle, no embellishment. Just a careful reader, an
                  honest conversation, and the space to say what actually
                  happened, in your own words.
                </p>
                <p>
                  The complete founder profile, including the name,
                  photograph, biography, and the personal reason for building
                  this platform, will appear here once it has been reviewed and
                  approved.
                </p>
              </div>

              <div className="mt-10">
                <ButtonLink href="/share" size="lg">
                  Share Your Story
                </ButtonLink>
              </div>
            </Reveal>
          </Container>
        </section>
      ) : (
        /* ---------------- PUBLISHED STATE ---------------- */
        <section className="py-16 md:py-24">
          <Container className="grid gap-12 md:grid-cols-12 md:gap-16">
            {/* Portrait + nameplate */}
            <Reveal className="md:col-span-5">
              <div className="md:sticky md:top-28">
                <div className="anim-in anim-zoom-in">
                  <Portrait
                    src={founder.portraitUrl}
                    name={founder.name}
                    verified={founder.portraitVerified}
                    className="aspect-[4/5] w-full"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                </div>
                <div className="mt-6 border-l-2 border-gold bg-beige/40 p-6">
                  <p className="font-serif text-h4 text-charcoal">{founder.name}</p>
                  {founder.role && (
                    <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-gold-deep">
                      {founder.role}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Biography + motivation + vision */}
            <div className="md:col-span-7">
              <Reveal>
                <Paragraphs
                  text={founder.biography}
                  className="max-w-[640px] space-y-5 text-[1.05rem] leading-[1.85] text-charcoal-soft"
                />
              </Reveal>

              {founder.motivation && (
                <Reveal delay={120} className="mt-12">
                  <Eyebrow>Motivation</Eyebrow>
                  <h2 className="mt-3 font-serif text-h3 text-charcoal">
                    Why This Platform Exists
                  </h2>
                  <span aria-hidden="true" className="rule-gold mt-4" />
                  <Paragraphs
                    text={founder.motivation}
                    className="mt-6 max-w-[640px] space-y-5 text-[1.02rem] leading-[1.85] text-charcoal-soft"
                  />
                </Reveal>
              )}

              {founder.vision && (
                <Reveal delay={160} className="mt-12 border-l-2 border-gold bg-beige/40 p-8">
                  <Eyebrow>The founder&apos;s vision</Eyebrow>
                  <p className="mt-4 font-serif text-[1.4rem] italic leading-relaxed text-charcoal">
                    {founder.vision}
                  </p>
                </Reveal>
              )}

              <Reveal delay={200} className="mt-12">
                <GoldRule className="mb-8" />
                <p className="max-w-[640px] text-[1.02rem] leading-relaxed text-muted">
                  Every story on this platform begins the same way: someone
                  decides that what happened to them might matter to somebody
                  else.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <ButtonLink href="/share" size="lg">
                    Share Your Story
                  </ButtonLink>
                  <ButtonLink href="/stories" variant="secondary" size="lg">
                    Read the stories <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      )}

      <BackToTop />
    </>
  );
}
