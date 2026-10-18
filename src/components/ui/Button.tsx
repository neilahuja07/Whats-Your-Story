import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Design-system buttons. Editorial styling: sharp corners, generous
 * padding, restrained gold accents, smooth transitions.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold uppercase tracking-[0.14em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-charcoal text-ivory hover:bg-gold-deep border border-charcoal hover:border-gold-deep",
  secondary:
    "bg-transparent text-charcoal border border-charcoal/30 hover:border-gold-deep hover:text-gold-deep",
  ghost:
    "bg-transparent text-gold-deep border border-transparent hover:text-charcoal",
  danger:
    "bg-transparent text-red-700 border border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[0.68rem]",
  md: "px-6 py-3 text-[0.72rem]",
  lg: "px-8 py-4 text-[0.78rem]",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: BaseProps & { href: string } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}
