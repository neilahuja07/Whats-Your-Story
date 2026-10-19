"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Discover Stories" },
  { href: "/about", label: "About Us" },
  { href: "/founder", label: "The Founder" },
];

/**
 * Typographic wordmark. The brand name only — the tagline is intentionally
 * not repeated here; it lives on the homepage hero and the footer.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-baseline leading-none ${className}`}
      aria-label="What's Your Story — home"
    >
      <span className="font-serif text-[1.22rem] tracking-tight text-charcoal transition-colors duration-300 group-hover:text-gold-deep md:text-[1.32rem]">
        What&apos;s Your Story
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Dismiss the mobile menu on Escape, for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-line bg-ivory/92 shadow-[0_1px_20px_rgba(37,37,37,0.05)] backdrop-blur-md"
          : "border-line/60 bg-ivory"
      }`}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-[4.5rem] md:px-10"
        aria-label="Main"
      >
        <Wordmark />

        {/* Desktop */}
        <ul className="hidden items-center gap-9 lg:flex">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link ${
                    active ? "text-gold-deep" : "text-charcoal hover:text-gold-deep"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
          <li>
            <ButtonLink href="/share" size="sm">
              Share Your Story
            </ButtonLink>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center text-charcoal transition-colors hover:text-gold-deep lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile panel — always mounted so it can fade and slide. */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-ivory transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          open
            ? "pointer-events-auto visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
      >
        <ul className="flex flex-col px-6 py-6">
          {LINKS.map((l, i) => {
            const active = isActive(l.href);
            return (
              <li key={l.href} className="border-b border-line/70">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  style={{ transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }}
                  className={`block py-5 font-serif text-2xl transition-[color,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  } ${active ? "text-gold-deep" : "text-charcoal"}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
          <li className="pt-8">
            <ButtonLink href="/share" size="lg" className="w-full">
              Share Your Story
            </ButtonLink>
          </li>
        </ul>
      </div>
    </header>
  );
}
