import { nowIso } from "@/lib/utils";
import {
  createSupabasePublicClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { AdminUser } from "@/lib/types";

/**
 * Admin authentication — SUPABASE AUTH.
 *
 * - Sign-in/sign-out are handled entirely by Supabase Auth; no custom
 *   password system, no password hashes and no admin_passwords table exist.
 * - The session lives in HTTP-only cookies managed by @supabase/ssr.
 * - AUTHORIZATION is a simple allowlist: only users listed in the
 *   `admin_users` table (checked with the `is_admin()` SQL helper, which is
 *   immune to RLS recursion) may perform administrative operations.
 * - RATE LIMITING and the ACTIVITY LOG live in Supabase Postgres (tables
 *   created by supabase_migration_persistence.sql); the rate-limit table is
 *   only reachable through SECURITY DEFINER RPCs.
 *
 * No credentials are ever hardcoded or exposed to the browser.
 */

/* --------------------------------- admins -------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapUser(user: any): AdminUser {
  return {
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at ?? nowIso(),
  };
}

/**
 * The signed-in administrator, or `null`.
 *
 * Two checks are required: (1) a valid Supabase session, and (2) membership of
 * the `admin_users` allowlist. An ordinary authenticated user who is not in
 * the allowlist is treated as a non-administrator.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return null; // Supabase not configured yet.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;

  return mapUser(user);
}

/** For API routes: returns the admin or null. */
export async function requireAdmin(): Promise<AdminUser | null> {
  return getCurrentAdmin();
}

/** Sign in with email + password through Supabase Auth. */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ admin: AdminUser | null; error: string | null }> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (err) {
    return { admin: null, error: (err as Error).message };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { admin: null, error: error?.message ?? "Sign-in failed." };
  }

  // The session is now stored in cookies. Confirm the user is an admin before
  // reporting success — non-admins are signed out immediately.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return {
      admin: null,
      error:
        "This account is not an administrator. Add its user ID to the admin_users table (see SUPABASE_SETUP.md).",
    };
  }

  return { admin: mapUser(data.user), error: null };
}

/** Sign out and clear the Supabase session cookies. */
export async function signOutAdmin(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    /* Not configured — nothing to do. */
  }
}

/* ------------------------------ rate limiting ---------------------------- */

/**
 * Brute-force protection (Supabase-backed counters, RPC-only table).
 *
 * Failures are counted in NAMED BUCKETS over a fixed 15-minute window:
 *   - one bucket per email address;
 *   - one bucket per client IP.
 *
 * Only FAILED attempts consume an attempt, and a successful sign-in clears
 * the buckets — an administrator who signs in repeatedly is never locked out
 * by their own success, while an attacker gets no free guesses.
 *
 * All three helpers fail OPEN: if Supabase is unreachable or the migration
 * SQL has not been run yet, sign-in is never bricked by the limiter itself.
 */

const RATE_WINDOW_MS = 15 * 60_000;

function currentWindow(): string {
  return new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
}

/** Anonymous client for the rate-limit RPCs (login happens pre-session). */
function limiterClient() {
  try {
    return createSupabasePublicClient();
  } catch {
    return null;
  }
}

/** True when this bucket still has attempts left (does NOT consume one). */
export async function attemptAllowed(bucket: string, limit: number): Promise<boolean> {
  const supabase = limiterClient();
  if (!supabase) return true;
  const { data, error } = await supabase.rpc("rate_limit_count", {
    p_bucket: bucket,
    p_window_start: currentWindow(),
  });
  if (error) {
    console.warn("[auth] rate limit read failed (failing open):", error.message);
    return true;
  }
  return Number(data ?? 0) < limit;
}

/** Record one FAILED attempt against a bucket. */
export async function recordFailure(bucket: string): Promise<void> {
  const supabase = limiterClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("bump_rate_limit", {
    p_bucket: bucket,
    p_window_start: currentWindow(),
  });
  if (error) console.warn("[auth] rate limit write failed:", error.message);
}

/** Clear all failure history for a bucket (called after a successful sign-in). */
export async function clearAttempts(bucket: string): Promise<void> {
  const supabase = limiterClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("clear_rate_limit", {
    p_bucket: bucket,
    p_older_than: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
  });
  if (error) console.warn("[auth] rate limit clear failed:", error.message);
}

/**
 * Best-effort client IP for rate limiting.
 *
 * Prefers `x-real-ip` (set by a trusted reverse proxy), otherwise the first
 * entry in `x-forwarded-for`.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

/* ----------------------------- activity log ------------------------------ */

/**
 * Editorial activity log (Supabase table `activity_log`, admin-only via RLS).
 *
 * The admin's id (Supabase Auth user UUID) and e-mail are stored on the row,
 * so the dashboard never needs access to auth.users. Best-effort by design:
 * an audit-log failure is warned about server-side and never breaks the
 * administrative action that triggered it.
 */
export async function logActivity(
  admin: Pick<AdminUser, "id" | "email"> | null,
  action: string,
  entityType: string,
  entityId: string | null = null,
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("activity_log").insert({
      admin_id: admin?.id ?? null,
      admin_email: admin?.email ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (error) console.warn("[auth] activity log entry not written:", error.message);
  } catch (err) {
    console.warn("[auth] activity log entry not written:", err);
  }
}
