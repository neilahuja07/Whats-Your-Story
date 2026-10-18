import { getDb } from "@/lib/db";
import { uid, nowIso } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
 * Brute-force protection (local, filesystem-backed counter).
 *
 * Failures are counted in NAMED BUCKETS over a fixed 15-minute window:
 *   - one bucket per email address;
 *   - one bucket per client IP.
 *
 * Only FAILED attempts consume an attempt, and a successful sign-in clears
 * the buckets — an administrator who signs in repeatedly is never locked out
 * by their own success, while an attacker gets no free guesses.
 */

const RATE_WINDOW_MS = 15 * 60_000;

function currentWindow(): string {
  return new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
}

/** True when this bucket still has attempts left (does NOT consume one). */
export function attemptAllowed(bucket: string, limit: number): boolean {
  const row = getDb()
    .prepare(
      "SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?",
    )
    .get(bucket, currentWindow()) as { count: number } | undefined;
  return !row || row.count < limit;
}

/** Record one FAILED attempt against a bucket. */
export function recordFailure(bucket: string): void {
  getDb()
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1`,
    )
    .run(bucket, currentWindow());
}

/** Clear all failure history for a bucket (called after a successful sign-in). */
export function clearAttempts(bucket: string): void {
  const db = getDb();
  db.prepare("DELETE FROM rate_limits WHERE bucket = ?").run(bucket);
  db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(
    new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
  );
}

/**
 * Best-effort client IP for rate limiting.
 *
 * Prefers `x-real-ip` (set by a trusted reverse proxy), otherwise the first
 * entry of `x-forwarded-for`.
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
 * Local editorial activity log (used by the admin dashboard only).
 *
 * Admin IDs are now Supabase user UUIDs, which do not exist in the legacy
 * local `admins` table, so the id is only stored when it is known locally
 * (avoids a foreign-key error); the action is always recorded.
 */
export function logActivity(
  adminId: string | null,
  action: string,
  entityType: string,
  entityId: string | null = null,
): void {
  let safeAdminId: string | null = null;
  if (adminId) {
    const known = getDb()
      .prepare("SELECT 1 AS x FROM admins WHERE id = ?")
      .get(adminId);
    if (known) safeAdminId = adminId;
  }

  getDb()
    .prepare(
      "INSERT INTO activity_log (id, admin_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(uid(), safeAdminId, action, entityType, entityId, nowIso());
}
