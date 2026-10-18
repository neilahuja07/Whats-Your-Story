import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityLogEntry, DashboardMetrics } from "@/lib/types";
import { countStoriesByStatus, countFeaturedStories } from "@/lib/repositories/stories";
import { countSubmissionsByStatus } from "@/lib/repositories/submissions";

/**
 * Admin dashboard metrics. Story/submission counts come from their own
 * repositories; the recent-activity feed is read straight from the
 * `activity_log` table with the administrator's session (RLS: admins only).
 * The admin e-mail is stored on each activity row at write time.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const EMPTY: DashboardMetrics = {
  publishedStories: 0,
  draftStories: 0,
  archivedStories: 0,
  featuredStories: 0,
  pendingSubmissions: 0,
  underReviewSubmissions: 0,
  recentActivity: [],
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const storyCounts = await countStoriesByStatus();
  const submissionCounts = await countSubmissionsByStatus();
  const featuredStories = await countFeaturedStories();

  let activity: Row[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) {
      console.error("[metrics] activity read failed:", error.message);
    } else {
      activity = (data ?? []) as Row[];
    }
  } catch {
    // Supabase not configured — fall through with an empty feed.
  }

  const recentActivity: ActivityLogEntry[] = activity.map((r) => ({
    id: r.id,
    adminId: r.admin_id ?? null,
    adminEmail: r.admin_email ?? null,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id ?? null,
    createdAt: r.created_at,
  }));

  if (recentActivity.length === 0 && storyCounts.published === 0) {
    // Everything failed (e.g. tables not migrated yet) — report honest zeros.
    return { ...EMPTY, recentActivity };
  }

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
