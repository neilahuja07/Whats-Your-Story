"use client";

import { useEffect, useState } from "react";

/**
 * ReadingProgress — a thin gold bar pinned to the top of the viewport that
 * fills as the reader moves through a long article. It reads scroll position
 * only (no layout thrash) and is purely decorative, so it is hidden from
 * assistive technology and collapses to nothing under reduced motion.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      const ratio = doc.scrollTop / scrollable;
      setProgress(Math.min(1, Math.max(0, ratio)));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="reading-progress"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
