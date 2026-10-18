"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * BackToTop — a refined return-to-top control that fades in once the reader
 * has moved down the page. It is keyboard accessible, labelled, and never
 * covers content on small screens (it hides below the `sm` breakpoint where
 * it would compete with the thumb).
 */
export function BackToTop({ threshold = 640 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior:
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
        })
      }
      className={`back-to-top pointer-events-auto ${
        visible ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
