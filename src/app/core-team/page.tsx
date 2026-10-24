import type { Metadata } from "next";
import { Linkedin } from "lucide-react";
import Image from "next/image";
import {
  Container,
  WideContainer,
  SectionHeading,
  Eyebrow,
} from "@/components/ui/Layout";
import { Reveal } from "@/components/motion/Reveal";
import { BackToTop } from "@/components/motion/BackToTop";
import { RichText } from "@/components/RichText";
import { init } from "@/lib/bootstrap";
import { listPublishedTeamMembers } from "@/lib/repositories/teamMembers";

export const metadata: Metadata = {
  title: "Core Team",
  description:
    "Meet the core team behind What's Your Story — the people bringing stories to life through creativity, connection, and community.",
  alternates: { canonical: "/core-team" },
};

export const dynamic = "force-dynamic";

export default async function CoreTeamPage() {
  init();
  const members = await listPublishedTeamMembers();

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-line bg-beige/30">
        <Container className="py-16 md:py-24">
          <Eyebrow>Core Team</Eyebrow>
          <h1 className="anim-in anim-fade-up mt-4 max-w-3xl font-serif text-display-sm text-charcoal">
            Meet the Core Team
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
            The people behind What&apos;s Your Story, bringing stories to life
            through creativity, connection, and community.
          </p>
        </Container>
      </section>

      {members.length === 0 ? (
        /* ---------------- EMPTY STATE ---------------- */
        <section className="py-20 md:py-24">
          <Container>
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow className="mb-5">Coming soon</Eyebrow>
              <h2 className="font-serif text-h2 text-charcoal">
                Our team will be introduced here.
              </h2>
              <span aria-hidden="true" className="rule-gold mx-auto mt-6" />
              <p className="mx-auto mt-6 max-w-lg text-[1.02rem] leading-relaxed text-muted">
                We are putting together the core team behind What&apos;s Your
                Story. Please check back soon to meet the people who make this
                platform possible.
              </p>
            </Reveal>
          </Container>
        </section>
      ) : (
        /* ---------------- TEAM GRID ---------------- */
        <section className="py-16 md:py-24">
          <WideContainer>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m, i) => (
                <Reveal key={m.id} delay={(i % 3) * 100}>
                  <article className="group flex h-full flex-col border border-line bg-paper transition-colors duration-500 hover:border-gold/50">
                    {/* Portrait — consistent 4:5 crop frame */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-beige">
                      {m.imageUrl ? (
                        <Image
                          src={m.imageUrl}
                          alt={m.imageAlt || `Portrait of ${m.name}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                          loading={i < 3 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif text-5xl text-gold-deep/40">
                          {getInitials(m.name)}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="font-serif text-h4 text-charcoal">
                        {m.name}
                      </h2>
                      {m.role && (
                        <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-gold-deep">
                          {m.role}
                        </p>
                      )}

                      {m.bio && (
                        <div className="mt-4 flex-1">
                          <RichText
                            html={m.bio}
                            className="space-y-3 text-[0.95rem] leading-relaxed text-muted"
                          />
                        </div>
                      )}

                      {m.linkedinUrl && (
                        <a
                          href={m.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 text-[0.78rem] font-medium text-gold-deep transition-colors hover:text-charcoal"
                        >
                          <Linkedin className="h-4 w-4" aria-hidden="true" />
                          Connect on LinkedIn
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </WideContainer>
        </section>
      )}

      <BackToTop />
    </>
  );
}

/** "Amara Diallo" → "AD" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
