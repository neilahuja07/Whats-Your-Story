import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { init } from "@/lib/bootstrap";
import { SubmissionForm } from "@/components/share/SubmissionForm";

export const metadata: Metadata = {
  title: "Share Your Story",
  description:
    "Show your interest at What's Your Story. Introduce yourself briefly and our editorial team will contact you if your experience is a good fit.",
  alternates: { canonical: "/share" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default function SharePage() {
  init();

  return (
    <>
      {/* Header */}
      <section className="border-b border-line bg-beige/30">
        <Container className="py-16 md:py-24">
          <span className="eyebrow">Contribute</span>
          <h1 className="anim-in anim-fade-up mt-4 max-w-3xl font-serif text-display-sm text-charcoal">
            Every Story Begins With a Conversation
          </h1>
          <span
            aria-hidden="true"
            className="rule-gold anim-in anim-rule-in mt-7"
            style={{ animationDelay: "160ms" }}
          />
          <div
            className="anim-in anim-fade-up mt-7 max-w-2xl space-y-4 text-[1.05rem] leading-relaxed text-muted"
            style={{ animationDelay: "240ms" }}
          >
            <p>Have an experience worth sharing? We&apos;d love to hear from you.</p>
            <p>
              Tell us a little about yourself and what makes your journey unique.
              This is just an expression of interest, not your complete story. If
              your entry interests our editorial team, we&apos;ll contact you to
              discuss your story and explore the possibility of featuring it on
              What&apos;s Your Story.
            </p>
          </div>
          <p
            className="anim-in anim-fade-up mt-5 inline-flex items-center gap-2 border border-gold/40 bg-paper px-4 py-2 text-[0.82rem] text-charcoal-soft"
            style={{ animationDelay: "320ms" }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden="true" />
            Every submission is read by a human editor before anything is
            published.
          </p>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            {/* Form */}
            <div className="md:col-span-8">
              <SubmissionForm />
            </div>
            {/* Sidebar: what happens next + privacy */}
            <aside className="md:col-span-4">
              <div className="sticky top-24 space-y-8">
                <div className="border border-line bg-paper p-7">
                  <h2 className="font-serif text-h4 text-charcoal">
                    What happens next
                  </h2>
                  <ol className="mt-5 space-y-4 text-[0.92rem] leading-relaxed text-muted">
                    <li className="flex gap-3">
                      <span className="mt-0.5 font-serif text-gold">1</span>
                      <span>
                        <strong className="font-semibold text-charcoal-soft">
                          Share your interest
                        </strong>
                        . Tell us a little about yourself using the short form.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 font-serif text-gold">2</span>
                      <span>
                        <strong className="font-semibold text-charcoal-soft">
                          Our team reviews your entry
                        </strong>
                        . Our editorial team will review your introduction and
                        consider whether your experience would be a good fit for
                        the platform.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 font-serif text-gold">3</span>
                      <span>
                        <strong className="font-semibold text-charcoal-soft">
                          Let&apos;s talk
                        </strong>
                        . If we&apos;re interested in featuring your story,
                        we&apos;ll contact you to discuss your experience and the
                        next steps.
                      </span>
                    </li>
                  </ol>
                  <p className="mt-5 border-t border-line pt-4 text-[0.84rem] italic text-muted">
                    Submitting an entry does not guarantee publication. Nothing
                    will be published without your explicit permission.
                  </p>
                </div>

                <div className="border-l-2 border-gold bg-beige/40 p-7">
                  <h2 className="font-serif text-h4 text-charcoal">Your privacy</h2>
                  <p className="mt-4 text-[0.9rem] leading-relaxed text-muted">
                    We collect only what we need to review your story and contact
                    you. Your email address and any unpublished story content are
                    never shown publicly. You can read more in our{" "}
                    <a
                      href="/privacy"
                      className="text-gold-deep underline underline-offset-2 hover:text-charcoal"
                    >
                      privacy notice
                    </a>
                    .
                  </p>
                </div>

                <div className="border border-line bg-paper p-7">
                  <h2 className="font-serif text-h4 text-charcoal">
                    Keep it brief
                  </h2>
                  <p className="mt-4 text-[0.9rem] leading-relaxed text-muted">
                    There&apos;s no need to write your full story now. A short
                    introduction of up to 150 words is all we need to get
                    started.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
