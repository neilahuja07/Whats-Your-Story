import Image from "next/image";
import { User } from "lucide-react";

/**
 * Portrait
 *
 * Renders a person's photograph when one has been imported and verified.
 * When no photograph is available, it renders a NEUTRAL PLACEHOLDER
 * (initials on a beige field) — never a stock, generated, or unrelated
 * person's photograph.
 *
 * Props:
 *  - src: stored portrait URL ("" when none imported yet)
 *  - name: person's name, used for initials + alt text
 *  - verified: set true once the photograph has been confirmed to be the
 *    named person and its usage has been permitted. Unverified photographs
 *    fall back to the placeholder.
 *  - className: wrapper classes (the image always uses object-cover and
 *    fills its container, so the wrapper controls the aspect ratio).
 */
export function Portrait({
  src,
  name,
  verified = true,
  alt,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: {
  src?: string | null;
  name: string;
  verified?: boolean;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const initials = getInitials(name);
  const hasImage = Boolean(src) && verified;

  if (!hasImage) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-beige ${className}`}
        role="img"
        aria-label={
          src
            ? `Photograph for ${name} pending verification`
            : `No photograph available for ${name}`
        }
      >
        {/* Quiet editorial texture: thin gold rules, no imagery of people */}
        <div className="absolute inset-0 opacity-60" aria-hidden="true">
          <div className="absolute inset-x-6 top-6 h-px bg-gold/25" />
          <div className="absolute inset-x-6 bottom-6 h-px bg-gold/25" />
        </div>
        <span className="relative font-serif text-4xl tracking-wide text-gold-deep/70 select-none">
          {initials}
        </span>
        {!src && (
          <User
            className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted/50"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-beige ${className}`}>
      {/*
        Single, consistent crop frame. object-cover + object-top keeps the
        subject's face and head in frame regardless of the source ratio, and
        the placeholder branch above uses this same frame, so cards never
        change shape between "photo" and "no photo".
        No hover scale is applied here — the card's own subtle scale lives on
        this wrapper, so zooming happens inside the overflow box and can never
        shave the top of the head.
      */}
      <Image
        src={src as string}
        alt={alt?.trim() || `Portrait of ${name}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-top"
      />
    </div>
  );
}

/** "Amara Diallo" → "AD" */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
