import { getDb } from "@/lib/db";
import type { ActivityLogEntry, DashboardMetrics } from "@/lib/types";
import { countStoriesByStatus, countFeaturedStories } from "@/lib/repositories/stories";
import { countSubmissionsByStatus } from "@/lib/repositories/submissions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  const storyCounts = await countStoriesByStatus();
  const submissionCounts = await countSubmissionsByStatus();
  const featuredStories = await countFeaturedStories();

  const activity = db
    .prepare(
      `SELECT al.*, a.email AS admin_email
       FROM activity_log al
       LEFT JOIN admins a ON a.id = al.admin_id
       ORDER BY al.created_at DESC
       LIMIT 12`,
    )
    .all() as unknown as any[];

  const recentActivity: ActivityLogEntry[] = activity.map((r) => ({
    id: r.id,
    adminId: r.admin_id,
    adminEmail: r.admin_email ?? null,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    createdAt: r.created_at,
  }));

  return {
    publishedStories: storyCounts.published,
    draftStories: storyCounts.draft,
    archivedStories: storyCounts.archived,
    featuredStories,
    pendingSubmissions: submissionCounts.pending_review ?? 0,
    underReviewSubmissions: submissionCounts.under_review ?? 0,
    recentActivity,
  };
}
