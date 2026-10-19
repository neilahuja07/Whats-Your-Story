import Link from "next/link";
import { Linkedin, Mail, ArrowUpRight } from "lucide-react";
import { getSiteContent } from "@/lib/repositories/siteContent";
import { init } from "@/lib/bootstrap";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Discover Stories" },
  { href: "/about", label: "About Us" },
  { href: "/founder", label: "The Founder" },
  { href: "/share", label: "Share Your Story" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export async function Footer() {
  init();
  // One round trip fetches every footer key (three separate reads before).
  const content = await getSiteContent();
  const description = content["footer.description"] ?? "";
  const contactEmail = content["contact.email"] ?? "";
  const linkedinUrl = content["social.linkedin_url"] ?? "";

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-charcoal text-ivory">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <p className="font-serif text-xl text-ivory">What&apos;s Your Story</p>
            <span aria-hidden="true" className="rule-gold mt-4 block" />
            <p className="mt-5 max-w-sm text-[0.92rem] leading-relaxed text-ivory/60">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-ivory/20 px-4 py-2 font-sans text-[0.74rem] font-medium text-ivory/80 transition-colors hover:border-gold hover:text-gold"
                >
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                  LinkedIn
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 border border-ivory/20 px-4 py-2 font-sans text-[0.74rem] font-medium text-ivory/80 transition-colors hover:border-gold hover:text-gold"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Contact
                </a>
              )}
            </div>
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="mt-4 block font-sans text-[0.82rem] text-ivory/70 transition-colors hover:text-gold"
              >
                {contactEmail}
              </a>
            )}
          </div>

          {/* Nav */}
          <nav className="md:col-span-4" aria-label="Footer">
            <h2 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ivory/65">
              Explore
            </h2>
            <ul className="mt-5 space-y-3">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="link-sweep inline-block text-[0.92rem] text-ivory/75 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Submit + legal */}
          <div className="md:col-span-3">
            <h2 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ivory/65">
              Contribute
            </h2>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/share"
                  className="group inline-flex items-center gap-1.5 font-sans text-[0.86rem] font-medium text-gold transition-colors hover:text-ivory"
                >
                  Submit your story
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="link-sweep inline-block text-[0.92rem] text-ivory/75 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-ivory/15 pt-6 text-[0.78rem] text-ivory/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} What&apos;s Your Story. All rights reserved.</p>
          <p className="italic">Every life has a story worth telling.</p>
        </div>
      </div>
    </footer>
  );
}
