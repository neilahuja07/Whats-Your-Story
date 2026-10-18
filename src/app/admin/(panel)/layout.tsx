import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Inbox,
  UserRound,
  FileText,
  LogOut,
  Image as ImageIcon,
} from "lucide-react";
import { getCurrentAdmin, signOutAdmin } from "@/lib/auth";
import { Wordmark } from "@/components/Navbar";

export const metadata = {
  title: { template: "%s | Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/stories", label: "Stories", icon: BookOpen },
  { href: "/admin/submissions", label: "Interest entries", icon: Inbox },
  { href: "/admin/portraits", label: "Portraits", icon: ImageIcon },
  { href: "/admin/founder", label: "Founder", icon: UserRound },
  { href: "/admin/content", label: "Site Content", icon: FileText },
];

/**
 * Admin panel layout — SERVER-SIDE AUTHENTICATION GATE.
 * Any request to an /admin route (except /admin/login, which lives outside
 * this route group) is redirected here without a valid session cookie.
 * The admin UI is never rendered for unauthenticated visitors.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  async function logout() {
    "use server";
    await signOutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:px-10">
      {/* Sidebar */}
      <aside className="w-full shrink-0 md:w-64">
        <div className="border border-line bg-paper p-5">
          <Wordmark />
          <p className="mt-4 border-t border-line pt-4 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Editorial Admin
          </p>
          <p className="mt-1 truncate text-[0.8rem] text-muted">{admin.email}</p>

          <nav className="mt-6" aria-label="Admin">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 font-sans text-[0.86rem] text-charcoal-soft transition-colors hover:bg-beige/60 hover:text-gold-deep"
                  >
                    <item.icon className="h-4 w-4 text-gold" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <form action={logout} className="mt-6 border-t border-line pt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 font-sans text-[0.86rem] text-charcoal-soft transition-colors hover:bg-beige/60 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 text-gold" aria-hidden="true" />
              Sign out
            </button>
          </form>

          <Link
            href="/"
            className="mt-2 block px-3 py-2 font-sans text-[0.78rem] text-muted transition-colors hover:text-gold-deep"
          >
            ← View public site
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
