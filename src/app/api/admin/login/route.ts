import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import {
  signInAdmin,
  logActivity,
  attemptAllowed,
  recordFailure,
  clearAttempts,
  clientIp,
} from "@/lib/auth";
import { sanitizePlainText } from "@/lib/sanitize";

/**
 * POST /api/admin/login — email + password authentication via Supabase Auth.
 *
 * Brute-force protection (both buckets, 15-minute windows):
 *   - 10 failed attempts per email address
 *   - 40 failed attempts per client IP
 * Only failures consume an attempt; a successful sign-in clears them.
 *
 * Credentials are never checked here: Supabase Auth verifies the password and
 * the response never distinguishes "unknown email" from "wrong password". A
 * valid sign-in still only grants admin access when the user is in the
 * `admin_users` allowlist (checked inside signInAdmin).
 */

const EMAIL_ATTEMPT_LIMIT = 10;
const IP_ATTEMPT_LIMIT = 40;

export async function POST(req: NextRequest) {
  init();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = sanitizePlainText(body.email, 254).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const ip = clientIp(req.headers);
  const emailBucket = `admin-login:email:${email}`;
  const ipBucket = `admin-login:ip:${ip}`;

  // Check both buckets BEFORE doing any verification work.
  if (
    !attemptAllowed(emailBucket, EMAIL_ATTEMPT_LIMIT) ||
    !attemptAllowed(ipBucket, IP_ATTEMPT_LIMIT)
  ) {
    return NextResponse.json(
      {
        error:
          "Too many sign-in attempts. Please wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  const { admin, error } = await signInAdmin(email, password);
  if (!admin) {
    recordFailure(emailBucket);
    recordFailure(ipBucket);
    const notConfigured = error?.includes("Supabase is not configured");
    return NextResponse.json(
      { error: notConfigured ? error : "Incorrect email or password." },
      { status: notConfigured ? 503 : 401 },
    );
  }

  // Success: clear this account's and this client's failure history.
  clearAttempts(emailBucket);
  clearAttempts(ipBucket);

  logActivity(admin.id, "admin.login", "admin", admin.id);

  return NextResponse.json({ ok: true, email: admin.email });
}
