import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase clients (server-side only).
 *
 * The website never talks to Supabase from the browser: every query and every
 * admin operation goes through Next.js server code using the ANON/publishable
 * key. Access is therefore always restricted by Row Level Security, and the
 * service-role key is never used or exposed.
 *
 * Two clients exist on purpose:
 *  - `createSupabasePublicClient()` — no session. Used for public reads and
 *    anonymous submission inserts. It never calls `cookies()`, so it also
 *    works during the static build (generateStaticParams, sitemap).
 *  - `createSupabaseServerClient()` — carries the signed-in administrator's
 *    session from cookies. Used for login, logout and every admin operation.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/** Read the public Supabase configuration, or `null` when it is not set yet. */
export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

const NOT_CONFIGURED =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see SUPABASE_SETUP.md).";

/** Anonymous client: public reads + public story submissions. */
export function createSupabasePublicClient(): SupabaseClient {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error(NOT_CONFIGURED);
  return createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Session-aware client for administrator operations.
 *
 * The session lives in HTTP-only cookies. `setAll` is wrapped in a try/catch
 * because server components cannot write cookies (only route handlers, server
 * actions and middleware can); the refresh there is best-effort and the
 * middleware keeps the session fresh.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error(NOT_CONFIGURED);

  const cookieStore = await cookies();

  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            });
          }
          // Cache headers (if any) are applied by the middleware; server
          // components cannot set response headers.
          void headersToSet;
        } catch {
          /* Called from a server component (read-only) — ignore. */
        }
      },
    },
  });
}
