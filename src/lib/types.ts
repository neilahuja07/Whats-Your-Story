/* Domain types shared across the app. */

export type StoryStatus = "draft" | "published" | "archived";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  personName: string;
  excerpt: string;
  /** Sanitised rich text (paragraphs, headings, lists, links). */
  body: string;
  portraitUrl: string;
  imageAlt: string;
  /**
   * True only once an administrator has confirmed that the photograph is of
   * the named person and that publication has been permitted. Unverified
   * photographs are never rendered publicly.
   */
  portraitVerified: boolean;
  categoryId: string | null;
  publicationDate: string | null;
  status: StoryStatus;
  isFeatured: boolean;
  /** True for development sample content — clearly labelled on the site. */
  isSample: boolean;
  sourceLinkedinUrl: string;
  sourceLinkedinPostId: string;
  seoTitle: string;
  seoDescription: string;
  authorCredit: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /** Joined */
  categoryName?: string | null;
  categorySlug?: string | null;
}

/**
 * Review states for a public submission. The database enforces exactly these
 * four values (see supabase_setup.sql); nothing else can be stored.
 */
export type SubmissionReviewStatus =
  | "pending_review"
  | "under_review"
  | "approved"
  | "rejected";

export interface ConsentRecord {
  text: string;
  version: string;
  acceptedAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface StorySubmission {
  id: string;
  submitterName: string;
  email: string;
  storyTitle: string;
  storyContent: string;
  introduction: string;
  categoryId: string | null;
  portraitUrl: string;
  linkedinProfileUrl: string;
  contactNumber: string;
  city: string;
  additionalMessage: string;
  allowNameDisplay: boolean;
  allowPortraitDisplay: boolean;
  consentRecords: ConsentRecord[];
  reviewStatus: SubmissionReviewStatus;
  reviewerNotes: string;
  linkedStoryId: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null;
}

export interface FounderProfile {
  id: number;
  name: string;
  role: string;
  biography: string;
  portraitUrl: string;
  /** True only once the real founder photograph has been verified. */
  portraitVerified: boolean;
  vision: string;
  motivation: string;
  /** While true, the public site presents the profile as a clearly-marked draft. */
  isDraft: boolean;
  updatedAt: string;
}

export interface SiteContent {
  key: string;
  content: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  adminId: string | null;
  adminEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

/**
 * A photograph that was manually imported (via the admin panel or the
 * `import-portrait` CLI). Photographs are stored in the public Supabase
 * Storage bucket `story-images` under a descriptive, person-based object
 * name (e.g. stories/<storyId>/amara-okafor.jpg) and are only rendered
 * once verified.
 */
export interface PortraitImport {
  id: string;
  storyId: string | null;
  fileName: string;
  originalName: string;
  sourceNote: string;
  personMatch: "confirmed" | "unconfirmed";
  permissionOk: boolean;
  importedBy: string;
  createdAt: string;
  storyTitle?: string | null;
  personName?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * One photograph in the homepage hero collage (Admin → Portraits).
 *
 * The image file lives in the public Supabase Storage bucket; this record
 * holds the metadata the collage needs: verification state, whether it is
 * enabled for the homepage (at most COLLAGE_MAX at once) and the
 * administrator's display order.
 */
export interface CollagePortrait {
  id: string;
  storagePath: string;
  url: string;
  originalName: string;
  verified: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  publishedStories: number;
  draftStories: number;
  archivedStories: number;
  featuredStories: number;
  pendingSubmissions: number;
  underReviewSubmissions: number;
  recentActivity: ActivityLogEntry[];
}

export type SortOption = "newest" | "featured" | "oldest";

export interface StoryQueryOptions {
  q?: string;
  category?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}
