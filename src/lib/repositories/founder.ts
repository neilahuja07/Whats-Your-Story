import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/utils";
import type { FounderProfile } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEFAULTS = {
  name: "",
  role: "",
  biography: "",
  portrait_url: "",
  portrait_verified: 0,
  vision: "",
  motivation: "",
  is_draft: 1,
};

export function getFounderProfile(): FounderProfile {
  const db = getDb();
  const row = db.prepare("SELECT * FROM founder_profile WHERE id = 1").get() as
    | any
    | undefined;

  if (!row) {
    // Create the editable draft row on first access.
    db.prepare(
      `INSERT INTO founder_profile
        (id, name, role, biography, portrait_url, portrait_verified, vision, motivation, is_draft, updated_at)
       VALUES (1, '', '', '', '', 0, '', '', 1, ?)`,
    ).run(nowIso());
    return getFounderProfile();
  }

  return {
    id: 1,
    name: row.name ?? DEFAULTS.name,
    role: row.role ?? DEFAULTS.role,
    biography: row.biography ?? DEFAULTS.biography,
    portraitUrl: row.portrait_url ?? DEFAULTS.portrait_url,
    portraitVerified: row.portrait_verified === 1,
    vision: row.vision ?? DEFAULTS.vision,
    motivation: row.motivation ?? DEFAULTS.motivation,
    isDraft: row.is_draft === 1,
    updatedAt: row.updated_at,
  };
}

export interface FounderInput {
  name: string;
  role: string;
  biography: string;
  portraitUrl: string;
  portraitVerified: boolean;
  vision: string;
  motivation: string;
  isDraft: boolean;
}

export function updateFounderProfile(input: FounderInput): FounderProfile {
  const db = getDb();
  db.prepare(
    `UPDATE founder_profile SET
      name = ?, role = ?, biography = ?, portrait_url = ?, portrait_verified = ?,
      vision = ?, motivation = ?, is_draft = ?, updated_at = ?
     WHERE id = 1`,
  ).run(
    input.name.trim(),
    input.role.trim(),
    input.biography,
    input.portraitUrl.trim(),
    input.portraitVerified ? 1 : 0,
    input.vision,
    input.motivation,
    input.isDraft ? 1 : 0,
    nowIso(),
  );
  return getFounderProfile();
}
