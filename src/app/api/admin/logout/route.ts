import { NextResponse } from "next/server";
import { getCurrentAdmin, logActivity, signOutAdmin } from "@/lib/auth";

export async function POST() {
  const admin = await getCurrentAdmin();
  // Record the sign-out BEFORE clearing the session — the activity insert
  // needs the authenticated client that signOut() is about to drop.
  if (admin) await logActivity(admin, "admin.logout", "admin", admin.id);
  await signOutAdmin();
  return NextResponse.json({ ok: true });
}
