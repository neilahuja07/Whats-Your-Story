import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { init } from "@/lib/bootstrap";
import { getSiteContentValue } from "@/lib/repositories/siteContent";
import { listCategories } from "@/lib/repositories/categories";
import { SubmissionForm } from "@/components/share/SubmissionForm";

export const metadata: Metadata = {
  title: "Share Your Story",
  description:
    "Submit your story to What's Your Story. Every submission is read by our editorial team before anything is published.",
  alternates: { canonical: "/share" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default function SharePage() {
  init();
  const intro = getSiteContentValue("share.page_intro");
  const consentText = getSiteContentValue("share.consent_text");
  const categories = listCategories();

  return (
    <>
      {/* Header */}
      <section className="border-b border-line bg-beige/30">
        <Container className="py-16 md:py-24">
          <span className="eyebrow">Contribute</span>
          <h1 className="anim-in anim-fade-up mt-4 max-w-3xl font-serif text-display-sm text-charcoal">
            Share Your Story
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
            {intro}
          </p>
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
              <SubmissionForm
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                consentText={consentText}
              />
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
                        You receive a confirmation that your submission arrived.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 font-serif text-gold">2</span>
                      <span>
                        A member of our editorial team reads your story.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 font-serif text-gold">3</span>
                      <span>
                        If it is selected, we contact you to confirm the
                        permissions needed before anything is published.
                      </span>
                    </li>
                  </ol>
                  <p className="mt-5 border-t border-line pt-4 text-[0.84rem] italic text-muted">
                    Submitting a story does not guarantee publication, and your
                    story is never published automatically.
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
                    Prefer to write at length?
                  </h2>
                  <p className="mt-4 text-[0.9rem] leading-relaxed text-muted">
                    There is no word limit. Take as much space as your story
                    needs — we will shape it together during editing.
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
