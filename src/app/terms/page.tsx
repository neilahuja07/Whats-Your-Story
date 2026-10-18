import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { init } from "@/lib/bootstrap";
import { getSiteContentValue } from "@/lib/repositories/siteContent";

export const metadata: Metadata = {
  title: "Terms of Submission",
  description: "The terms that apply when you submit a story.",
  alternates: { canonical: "/terms" },
};

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  init();
  const body = await getSiteContentValue("terms.page_body");
  const isDraft = body.startsWith("DRAFT");

  return (
    <section className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <span className="eyebrow">Legal</span>
        <h1 className="mt-4 font-serif text-display-sm text-charcoal">
          Terms of Submission
        </h1>
        <span aria-hidden="true" className="rule-gold mt-7" />

        {isDraft && (
          <div className="mt-8 border-l-2 border-gold bg-beige/40 p-5">
            <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-deep">
              Draft — requires legal review before launch
            </p>
          </div>
        )}

        <div className="mt-10 space-y-5 text-[1.02rem] leading-[1.85] text-charcoal-soft">
          {body
            .replace(/^DRAFT[^]*?\n\n/, "")
            .split("\n\n")
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      </Container>
    </section>
  );
}
