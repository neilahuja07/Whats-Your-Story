"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * IntroOverlay — the first-visit brand emblem on the public site.
 *
 * A circular ivory-and-gold emblem modelled on the original reference:
 * golden ring, stacked "What's Your Story" lettering, vintage microphone,
 * fountain pen drawing an underline beneath "Story", and a heartbeat
 * waveform at the bottom of the ring.
 *
 * Choreography (pure CSS, see globals.css → "Intro overlay"):
 *   1. 0.15–1.0s  the three words fade up together as ONE composition
 *   2. 0.85–1.7s  the golden ring and vintage microphone fade in
 *   3. 1.55–2.6s  the fountain pen glides L→R, drawing the gold underline
 *                 beneath "Story" (pen and stroke share identical timing)
 *   4. 2.6–3.1s   the heartbeat waveform appears at the ring's base
 *   5. 3.2–3.85s  the emblem holds, then fades away to the homepage
 *
 * Rules honoured here:
 *  - plays once per browser session (sessionStorage, set by the inline script
 *    BEFORE first paint so returning visitors never see a flash);
 *  - never displays on /admin or API routes (inline script + pathname effect);
 *  - prefers-reduced-motion hides it entirely via CSS;
 *  - the homepage is rendered underneath the whole time and the overlay ends
 *    `visibility: hidden`, so it is reachable even if JavaScript never runs;
 *  - no hydration mismatch: server and client render identical markup and the
 *    show/hide decision is made outside React (inline script → data attribute).
 */

/** Runs during HTML parsing, before the overlay's first paint. */
const INIT_SCRIPT = `try{var d=document.documentElement;
if(location.pathname.indexOf("/admin")===0){d.setAttribute("data-wys-intro","off")}
else if(sessionStorage.getItem("wys-intro")){d.setAttribute("data-wys-intro","off")}
else{sessionStorage.setItem("wys-intro","1");window.__wysIntroShow=true}}catch(e){}`;

/** Total choreography ≈ 3.85s; unmount just after the fade completes. */
const UNMOUNT_MS = 4200;

/** Heartbeat polyline along the bottom of the ring (viewBox 400×400, r=190). */
const HEARTBEAT_POINTS = "148,390 178,390 185,390 190,379 196,402 202,382 207,390 214,390 252,390";

export function IntroOverlay() {
  const pathname = usePathname();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __wysIntroShow?: boolean };
    if (!w.__wysIntroShow || pathname.startsWith("/admin")) {
      setGone(true);
      return;
    }
    const timer = window.setTimeout(() => setGone(true), UNMOUNT_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Never rendered for visitors who have already seen it this session: the
  // inline script hid it pre-paint and this removes it after hydration.
  if (gone) return null;

  return (
    <div className="wys-intro-overlay" role="presentation" aria-hidden="true">
      <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      <div className="wys-intro-emblem">
        {/* Phase 2 + 4 — golden ring and heartbeat waveform */}
        <svg
          className="wys-intro-ring"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle metallic sheen along the ring stroke */}
            <linearGradient id="wysIntroGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#97793f" />
              <stop offset="28%" stopColor="#d9bf8a" />
              <stop offset="52%" stopColor="#b6955b" />
              <stop offset="74%" stopColor="#f3ecdd" />
              <stop offset="100%" stopColor="#97793f" />
            </linearGradient>
          </defs>

          <g className="wys-intro-ring-group">
            {/* Full, symmetrical ring — thin metallic gold stroke */}
            <circle
              cx="200"
              cy="200"
              r="190"
              stroke="url(#wysIntroGold)"
              strokeWidth="2.6"
            />
            {/* Faint inner hairline for editorial refinement */}
            <circle
              cx="200"
              cy="200"
              r="178"
              stroke="var(--color-gold)"
              strokeWidth="1"
              opacity="0.3"
            />
          </g>

          {/* Phase 4 — heartbeat at the base of the ring */}
          <g className="wys-intro-heartbeat">
            {/* Ivory mask opens a clean gap in the ring for the waveform */}
            <polyline
              className="wys-intro-hb-mask"
              points={HEARTBEAT_POINTS}
              stroke="var(--color-ivory)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              className="wys-intro-hb-line"
              points={HEARTBEAT_POINTS}
              stroke="var(--color-gold)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
          </g>
        </svg>

        {/* Phases 1 + 3 — the lettering, as one unified composition */}
        <div className="wys-intro-text">
          <span className="wys-intro-whats">What&rsquo;s</span>
          <span className="wys-intro-you">Your</span>
          <span className="wys-intro-story">
            Story
            {/* Gold underline, drawn left → right */}
            <svg
              className="wys-intro-underline"
              viewBox="0 0 100 4"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                className="wys-intro-stroke"
                x1="0"
                y1="2"
                x2="100"
                y2="2"
                pathLength={1}
              />
            </svg>
            {/* Fountain pen, gliding in sync with the stroke */}
            <span className="wys-intro-pen-track">
              <svg
                className="wys-intro-pen"
                viewBox="0 0 72 24"
                fill="none"
                aria-hidden="true"
              >
                {/* Barrel with rounded cap */}
                <path
                  d="M12 8 H42 V16 H12 A4 4 0 0 1 12 8 Z"
                  fill="var(--color-charcoal)"
                />
                {/* Cap band */}
                <rect x="15" y="8" width="2.2" height="8" fill="var(--color-gold)" />
                {/* Gold band before the section */}
                <rect x="39" y="7.4" width="3.4" height="9.2" fill="var(--color-gold)" />
                {/* Tapering grip section */}
                <path
                  d="M42.4 8.6 L54 10.3 V13.7 L42.4 15.4 Z"
                  fill="var(--color-charcoal)"
                />
                {/* Fountain pen nib */}
                <path
                  d="M54 10 C60 10.3 66 11.2 70 12 C66 12.8 60 13.7 54 14 Z"
                  fill="var(--color-gold)"
                  stroke="var(--color-gold-deep)"
                  strokeWidth="0.6"
                />
                {/* Nib slit and breather hole */}
                <line
                  x1="58.5"
                  y1="12"
                  x2="68.4"
                  y2="12"
                  stroke="var(--color-charcoal)"
                  strokeWidth="0.7"
                />
                <circle cx="57.8" cy="12" r="1" fill="var(--color-charcoal)" />
              </svg>
            </span>
          </span>
        </div>

        {/* Phase 2 — vintage microphone, upper right of the lettering */}
        <svg
          className="wys-intro-mic"
          viewBox="0 0 64 96"
          fill="none"
          aria-hidden="true"
        >
          {/* Capsule head */}
          <rect
            x="18"
            y="4"
            width="28"
            height="44"
            rx="14"
            fill="var(--color-charcoal)"
            stroke="var(--color-gold)"
            strokeWidth="1.4"
          />
          {/* Grille lines */}
          <line x1="22" y1="15" x2="42" y2="15" stroke="var(--color-gold)" strokeWidth="1.5" />
          <line x1="22" y1="21" x2="42" y2="21" stroke="var(--color-gold)" strokeWidth="1.5" />
          <line x1="22" y1="27" x2="42" y2="27" stroke="var(--color-gold)" strokeWidth="1.5" />
          <line x1="22" y1="33" x2="42" y2="33" stroke="var(--color-gold)" strokeWidth="1.5" />
          <line x1="22" y1="39" x2="42" y2="39" stroke="var(--color-gold)" strokeWidth="1.5" />
          {/* Yoke fork */}
          <path
            d="M13 20 V44 Q13 55 26 57 H38 Q51 55 51 44 V20"
            stroke="var(--color-gold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Stem */}
          <rect x="30" y="57" width="4" height="14" fill="var(--color-charcoal)" stroke="var(--color-gold)" strokeWidth="0.8" />
          {/* Domed base + plate */}
          <path d="M19 79 Q32 69 45 79 Z" fill="var(--color-charcoal)" stroke="var(--color-gold)" strokeWidth="1.2" />
          <rect x="16" y="79" width="32" height="4.4" rx="2.2" fill="var(--color-charcoal)" stroke="var(--color-gold)" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}
