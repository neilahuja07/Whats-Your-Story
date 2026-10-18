import { NextRequest, NextResponse } from "next/server";
import { init } from "@/lib/bootstrap";
import { getCurrentAdmin, logActivity } from "@/lib/auth";
import { listSubmissions } from "@/lib/repositories/submissions";
import type { SubmissionReviewStatus } from "@/lib/types";

/**
 * Mask an email address for the list view: "jane@example.com" → "ja***@example.com".
 * The full address is only shown on the submission detail route.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

/** GET /api/admin/submissions — list submissions (admin only). */
export async function GET(req: NextRequest) {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") as SubmissionReviewStatus | "all") || "all";
  const q = sp.get("q") || "";
  const page = Number(sp.get("page")) || 1;

  const result = await listSubmissions({ status, q, page, pageSize: 20 });

  // Never expose contact details in list view beyond what's needed;
  // the detail view is the authorised place to read them.
  return NextResponse.json({
    ...result,
    items: result.items.map((s) => ({
      id: s.id,
      submitterName: s.submitterName,
      storyTitle: s.storyTitle,
      reviewStatus: s.reviewStatus,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // email is masked in the list; full address shows on the detail page
      emailMasked: maskEmail(s.email),
      linkedStoryId: s.linkedStoryId,
    })),
  });
}

export async function POST() {
  init();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  logActivity(admin.id, "submissions.listed", "submission", null);
  return NextResponse.json({ ok: true });
}
