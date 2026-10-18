import { getDb } from "@/lib/db";
import { uid, slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function listCategories(): Category[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM categories ORDER BY name ASC")
    .all() as unknown[];
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
  }));
}

export function getCategoryBySlug(slug: string): Category | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug) as
    | any
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
  };
}

export function getCategoryById(id: string): Category | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as
    | any
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
  };
}

export function createCategory(
  name: string,
  description = "",
): Category {
  const db = getDb();
  let slug = slugify(name);
  const exists = db.prepare("SELECT 1 AS x FROM categories WHERE slug = ?").get(slug);
  if (exists) slug = `${slug}-${uid().slice(0, 6)}`;
  const id = uid();
  db.prepare(
    "INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)",
  ).run(id, name.trim(), slug, description);
  return getCategoryById(id)!;
}

/** Find-or-create by name; returns the category id (or null for empty input). */
export function ensureCategoryByName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM categories WHERE lower(name) = lower(?)")
    .get(trimmed) as { id: string } | undefined;
  if (row) return row.id;
  return createCategory(trimmed).id;
}
