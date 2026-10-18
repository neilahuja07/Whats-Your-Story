import { getDb } from "@/lib/db";
import { uid, slugify } from "@/lib/utils";
import type { Story, StoryStatus } from "@/lib/types";

/**
 * Safe sample content used to demonstrate the layout before real, approved
 * stories are imported.
 *
 * IMPORTANT: every entry is clearly labelled as sample content
 * (is_sample = 1 → shown with a "Sample" badge on the public site) and every
 * portrait is EMPTY so a neutral placeholder is displayed. No stock, generated,
 * or fabricated photographs of people are used anywhere.
 *
 * To replace the samples with real content:
 *   1. Import real photographs:  npm run import-portrait -- --list-stories
 *   2. Edit stories in /admin/stories
 *   3. Delete the sample stories from /admin/stories (they are labelled "Sample")
 */

interface SampleStory {
  slug: string;
  title: string;
  personName: string;
  excerpt: string;
  body: string;
  category: string;
  featured: boolean;
  daysAgo: number;
}

const SAMPLE_STORIES: SampleStory[] = [
  {
    slug: "sample-a-new-beginning",
    title: "Sample: A New Beginning, One Small Step at a Time",
    personName: "Sample Person One",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>Every real story begins with a single moment — a decision made quietly, often without knowing it will matter. The person who lives it may not recognise its significance until years later, looking back over a road they never expected to walk.</p>
<h2>The turning point</h2>
<p>Change rarely arrives dramatically. More often it is a series of small, unremarkable choices: one phone call, one letter, one conversation that reorders everything that follows.</p>
<p>The stories we publish are told in the first person, with all the honesty that requires. They are edited only for clarity, length, and readability — never in a way that changes their meaning.</p>
<blockquote>Sample blockquote: this element demonstrates how a pulled quote appears inside a published story.</blockquote>
<p>When you are ready to share your own story, the submission form takes only a few minutes, and every submission is read by a person before anything is published.</p>`,
    category: "New Beginnings",
    featured: true,
    daysAgo: 12,
  },
  {
    slug: "sample-the-long-road-back",
    title: "Sample: The Long Road Back",
    personName: "Sample Person Two",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>Some journeys are measured in years rather than miles. This sample demonstrates how a longer, more reflective story reads on the page: clear paragraph rhythm, comfortable line length, and headings that break the narrative into natural chapters.</p>
<h2>Facing the difficult part</h2>
<p>Real accounts of hardship are published only with the knowledge and permission of the person who lived them. Our editorial team reviews every submission carefully before anything appears on this site.</p>
<h3>What comes after</h3>
<p>Recovery, rebuilding, and reinvention are common threads in the stories people choose to share here — though no two are ever the same.</p>`,
    category: "Resilience",
    featured: true,
    daysAgo: 26,
  },
  {
    slug: "sample-a-craft-learned-over-decades",
    title: "Sample: A Craft Learned Over Decades",
    personName: "Sample Person Three",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>Mastery is rarely sudden. It accumulates quietly, in thousands of ordinary hours that no one else sees. This sample shows how a story about work, craft, or vocation can be presented on the platform.</p>
<p>Every published story includes the person's name (where they have given permission), a publication date, and a category, so readers can find the accounts that speak to them.</p>`,
    category: "Craft & Vocation",
    featured: false,
    daysAgo: 40,
  },
  {
    slug: "sample-distance-and-home",
    title: "Sample: Distance, Home, and What Stays With Us",
    personName: "Sample Person Four",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>Leaving one life behind and beginning another is one of the most shared of human experiences, and one of the least understood by those who have not lived it. This sample demonstrates a story filed under the Journeys category.</p>
<p>Long-form stories use generous paragraph spacing and a comfortable reading width, so that the writing — not the interface — carries the experience.</p>`,
    category: "Journeys",
    featured: false,
    daysAgo: 55,
  },
  {
    slug: "sample-quiet-courage",
    title: "Sample: The Quiet Courage of Ordinary Days",
    personName: "Sample Person Five",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>Not every story worth telling involves a single dramatic moment. Some are built from the steady, unglamorous effort of getting through difficult days — and this sample exists to show that such stories have a home here too.</p>`,
    category: "Everyday Lives",
    featured: false,
    daysAgo: 70,
  },
  {
    slug: "sample-listening-across-generations",
    title: "Sample: Listening Across Generations",
    personName: "Sample Person Six",
    excerpt:
      "A sample story demonstrating the reading layout. Replace this with a real, approved story from the What's Your Story collection.",
    body: `<p><em>This is sample content created to demonstrate the layout of a story page. It is not a real account and should be replaced with an approved story from the What's Your Story collection.</em></p>
<p>When one generation speaks honestly to another, both are changed. This sample demonstrates how stories about family, memory, and inheritance can be presented on the platform.</p>
<p>Related stories appear at the foot of every published account, so readers can continue exploring once they have finished.</p>`,
    category: "Family & Memory",
    featured: false,
    daysAgo: 88,
  },
];

const SAMPLE_CATEGORIES = [
  { name: "New Beginnings", description: "Stories about starting again." },
  { name: "Resilience", description: "Stories about enduring hardship." },
  { name: "Craft & Vocation", description: "Stories about work and mastery." },
  { name: "Journeys", description: "Stories about leaving, arriving, and belonging." },
  { name: "Everyday Lives", description: "Stories from ordinary days." },
  { name: "Family & Memory", description: "Stories about generations and inheritance." },
];

export function ensureSampleCategories(): Map<string, string> {
  const db = getDb();
  const out = new Map<string, string>();
  for (const c of SAMPLE_CATEGORIES) {
    const existing = db
      .prepare("SELECT id FROM categories WHERE name = ?")
      .get(c.name) as { id: string } | undefined;
    if (existing) {
      out.set(c.name, existing.id);
    } else {
      const id = uid();
      db.prepare(
        "INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)",
      ).run(id, c.name, slugify(c.name), c.description);
      out.set(c.name, id);
    }
  }
  return out;
}

/** Insert sample stories once (idempotent: skipped when any sample exists). */
export function seedSampleStories(): { created: number } {
  const db = getDb();
  const existing = db
    .prepare("SELECT COUNT(*) AS n FROM stories WHERE is_sample = 1")
    .get() as { n: number };
  if (existing.n > 0) return { created: 0 };

  const categories = ensureSampleCategories();
  let created = 0;

  for (const s of SAMPLE_STORIES) {
    const ts = new Date(Date.now() - s.daysAgo * 86_400_000).toISOString();
    db.prepare(
      `INSERT INTO stories (
        id, slug, title, person_name, excerpt, body, portrait_url, image_alt,
        portrait_verified, category_id, publication_date, status, is_featured,
        is_sample, source_linkedin_url, source_linkedin_post_id, seo_title,
        seo_description, author_credit, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, '', '', 0, ?, ?, 'published', ?, 1, '', '', ?, ?, '', ?, ?, ?)`,
    ).run(
      uid(),
      s.slug,
      s.title,
      s.personName,
      s.excerpt,
      s.body,
      categories.get(s.category) ?? null,
      ts,
      s.featured ? 1 : 0,
      s.title,
      s.excerpt,
      ts,
      ts,
      ts,
    );
    created += 1;
  }
  return { created };
}

/** Remove every sample story (never touches real content). */
export function clearSampleStories(): number {
  const db = getDb();
  const res = db.prepare("DELETE FROM stories WHERE is_sample = 1").run();
  return Number(res.changes);
}

export function hasSampleStories(): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM stories WHERE is_sample = 1")
    .get() as { n: number };
  return row.n > 0;
}

export type { Story, StoryStatus };
