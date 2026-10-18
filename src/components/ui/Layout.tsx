import type { ReactNode } from "react";

/** Page-width container. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-6 md:px-10 ${className}`}>
      {children}
    </div>
  );
}

/** Wide container for grids. */
export function WideContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-6 md:px-10 ${className}`}>
      {children}
    </div>
  );
}

/** Small uppercase eyebrow label above a heading. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`eyebrow block ${className}`}>{children}</span>
  );
}

/** Section heading with the gold rule accent. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}>
      {eyebrow && <Eyebrow className={centered ? "mb-4" : "mb-3"}>{eyebrow}</Eyebrow>}
      <h2 className="font-serif text-h2 text-charcoal">{title}</h2>
      <span
        aria-hidden="true"
        className={`rule-gold mt-5 ${centered ? "mx-auto" : ""}`}
      />
      {description && (
        <p className="mt-5 text-[1.02rem] leading-relaxed text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

/** Short horizontal gold rule. */
export function GoldRule({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`rule-gold block ${className}`} />;
}
