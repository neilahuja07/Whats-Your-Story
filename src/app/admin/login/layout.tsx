import type { Metadata } from "next";

/**
 * Layout for /admin/login.
 *
 * Lives OUTSIDE the (panel) route group so an unauthenticated visitor can
 * reach it, but still needs two things the panel layout does not give it:
 *  - a centred, padded frame so the form sits in the page like the rest of
 *    the premium light design rather than flush against the left edge;
 *  - `noindex`, so the administrator sign-in form is never listed in search
 *    results (the panel itself already sets this).
 */
export const metadata: Metadata = {
  title: { default: "Admin sign-in", template: "%s | What's Your Story" },
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[72vh] w-full items-center justify-center px-6 py-16 md:px-10">
      {children}
    </div>
  );
}
