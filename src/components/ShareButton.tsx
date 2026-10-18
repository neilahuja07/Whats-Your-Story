"use client";

import { useState } from "react";
import { Share2, Link2, Check, Linkedin } from "lucide-react";

/**
 * ShareButton — uses the Web Share API when available, with a
 * clipboard-copy fallback. Fully functional, no fake controls.
 */
export function ShareButton({
  title,
  text,
  url,
  compact = false,
}: {
  title: string;
  text: string;
  url: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled the share sheet — fall through to copy.
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Share2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Link copied" : "Share"}
        </button>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
        >
          <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
          LinkedIn
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-6 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Link copied to clipboard" : "Share this story"}
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 border border-line bg-paper px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        Copy link
      </button>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 border border-line bg-paper px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
      >
        <Linkedin className="h-4 w-4" aria-hidden="true" />
        LinkedIn
      </a>
    </div>
  );
}
