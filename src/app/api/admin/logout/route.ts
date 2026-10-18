import { NextResponse } from "next/server";
import { getCurrentAdmin, logActivity, signOutAdmin } from "@/lib/auth";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (admin) logActivity(admin.id, "admin.logout", "admin", admin.id);
  await signOutAdmin();
  return NextResponse.json({ ok: true });
}
