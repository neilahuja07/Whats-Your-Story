import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session for /admin routes.
 *
 * Supabase access tokens are short-lived; this middleware keeps the session in
 * the cookies up to date so administrators are not signed out mid-session.
 * It performs no authorization decisions — the admin layout and every API
 * route still verify the session and the `admin_users` allowlist server-side.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
          });
        }
        // Prevent one user's freshly-issued session cookies from being cached
        // and served to another user.
        for (const [key, value] of Object.entries(headersToSet ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Touch auth early so any token refresh is written before the response.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
