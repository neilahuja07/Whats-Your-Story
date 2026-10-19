import { Feather } from "lucide-react";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import type { CollagePortrait } from "@/lib/types";

/**
 * Hero collage — the administrator-selected homepage portraits arranged
 * as an asymmetrical editorial mosaic (Admin → Portraits → Homepage
 * collage). Only verified, enabled photographs reach this component; they
 * are fetched server-side in the order the admin chose.
 *
 * A repeating pattern of spans gives the wall its rhythm: a few larger
 * photographs surrounded by smaller ones. Every tile is purely visual — no
 * names, captions or quotations. When nothing is selected, a neutral
 * typographic composition is shown instead (never stock or dummy images).
 */

/** Span pattern (repeating): large, tall, plain, wide, plain, plain, plain. */
function tileClass(i: number): { cls: string; large: boolean } {
  switch (i % 7) {
    case 0:
      return { cls: "col-span-2 row-span-3", large: true };
    case 3:
      return { cls: "row-span-3", large: false };
    case 5:
      return { cls: "col-span-2 row-span-2", large: true };
    default:
      return { cls: "row-span-2", large: false };
  }
}

function tileSizes(large: boolean): string {
  return large
    ? "(max-width: 640px) 44vw, (max-width: 768px) 22vw, (max-width: 1280px) 18vw, 11vw"
    : "(max-width: 640px) 21vw, (max-width: 768px) 11vw, (max-width: 1280px) 9vw, 5vw";
}

/**
 * Small walls (fewer photographs than one full pattern cycle) get equal
 * 4:5 tiles instead of the mosaic: the fixed span pattern assumes a full
 * wall and would leave large empty holes around a handful of portraits.
 */
function smallWallClass(count: number): string {
  const base = "grid gap-2 sm:gap-3";
  switch (count) {
    case 1:
      return `${base} mx-auto grid-cols-1 max-w-[340px]`;
    case 3:
      // Two tiles, then a full-width third on phones; three across from md.
      return `${base} grid-cols-2 md:grid-cols-3`;
    default:
      return `${base} grid-cols-2 md:grid-cols-4`;
  }
}

export function HeroCollage({ portraits }: { portraits: CollagePortrait[] }) {
  if (portraits.length === 0) return <HeroTypographic />;
  // The span pattern needs a critical mass of tiles to avoid interior holes.
  const mosaic = portraits.length >= 5;

  return (
    <div className="relative">
      {/* Soft editorial backdrop */}
      <span
        aria-hidden="true"
        className="absolute -inset-4 -z-10 hidden bg-[radial-gradient(circle_at_70%_30%,rgba(182,149,91,0.12),transparent_62%)] md:block"
      />

      <div
        className={
          mosaic
            ? "grid auto-rows-[52px] grid-flow-dense grid-cols-4 gap-2 sm:auto-rows-[58px] sm:grid-cols-6 md:auto-rows-[46px] md:grid-cols-3 lg:auto-rows-[46px] lg:grid-cols-4 xl:auto-rows-[42px] xl:grid-cols-6"
            : smallWallClass(portraits.length)
        }
        aria-hidden="true"
      >
        {portraits.map((p, i) => {
          const { cls, large } = tileClass(i);
          const lastOdd =
            !mosaic && portraits.length % 2 === 1 && i === portraits.length - 1;
          return (
            <figure
              key={p.id}
              className={`zoom-frame anim-in anim-fade-up relative overflow-hidden bg-beige ${
                mosaic ? cls : "aspect-[4/5]"
              }${
                // Full-width last tile on phones only when the count is odd.
                lastOdd ? " col-span-2 md:col-span-1" : ""
              }`}
              style={{ animationDelay: `${180 + Math.min(i, 10) * 50}ms` }}
            >
              <Image
                src={p.url}
                alt=""
                fill
                sizes={
                  mosaic
                    ? tileSizes(large)
                    : "(max-width: 768px) 92vw, 23vw"
                }
                className="object-cover object-top"
                priority={i < 4}
              />
            </figure>
          );
        })}
      </div>
    </div>
  );
}

/** No selected portraits: an abstract editorial composition instead of photographs. */
function HeroTypographic() {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="absolute -inset-4 -z-10 hidden bg-[radial-gradient(circle_at_70%_30%,rgba(182,149,91,0.12),transparent_62%)] md:block"
      />
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        <Reveal as="div" delay={260} className="col-span-7">
          <div className="flex aspect-[3/4] flex-col justify-between border border-line bg-paper p-7">
            <Feather className="h-6 w-6 text-gold" aria-hidden="true" />
            <div>
              <p className="font-serif text-[3.4rem] leading-none text-gold/45 md:text-[4.4rem]">
                &ldquo;
              </p>
              <p className="mt-3 font-serif text-[1.15rem] leading-snug italic text-charcoal">
                Every life carries something worth passing on.
              </p>
              <span aria-hidden="true" className="rule-gold mt-5" />
            </div>
          </div>
        </Reveal>
        <div className="col-span-5 flex flex-col gap-3 pt-8 md:gap-4 md:pt-12">
          <Reveal as="div" delay={400}>
            <div className="border border-line bg-beige/40 p-6">
              <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gold-deep">
                First person
              </p>
              <p className="mt-2 font-serif text-[1.05rem] leading-snug text-charcoal">
                Told by the people who lived them.
              </p>
            </div>
          </Reveal>
          <Reveal as="div" delay={520}>
            <div className="border border-line bg-paper p-6">
              <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gold-deep">
                With permission
              </p>
              <p className="mt-2 font-serif text-[1.05rem] leading-snug text-charcoal">
                Nothing is published without consent.
              </p>
            </div>
          </Reveal>
          <Reveal as="div" delay={640}>
            <div className="rule-diamond py-2">
              <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
