#!/usr/bin/env node
/**
 * import-portrait — manually import a real photograph for a story.
 *
 * Use this after you have downloaded the actual photograph from the original
 * source (e.g. the person's LinkedIn post) and have confirmed:
 *   1. the photograph is of the person named in the story, and
 *   2. you have permission to publish it on the website.
 *
 * The file is copied into public/images/portraits/imported/ under a
 * descriptive, person-based filename (e.g. "amara-okafor.jpg") and the story
 * record is updated. The photograph is stored as UNVERIFIED; verify it in the
 * admin panel (Stories → [story] → Portrait) to make it visible on the site
 * until then a neutral placeholder is displayed.
 *
 * Usage:
 *   npm run import-portrait -- --story <slug> --file <path-to-image> [options]
 *
 * Options:
 *   --story <slug>       Story slug to attach the photo to (see /admin/stories)
 *   --file <path>        Path of the photograph on your computer
 *   --person <name>      Person's name (defaults to the story's person_name)
 *   --alt <text>         Alt text (defaults to "Portrait of <person>")
 *   --note <text>        Source note, e.g. "Downloaded from LinkedIn post ..."
 *   --verified           Mark the photograph as verified and visible immediately
 *                        (only use after confirming identity + permission)
 *   --link <url>         Original source URL to record
 *   --dry-run            Show what would happen without writing anything
 *
 * Examples:
 *   npm run import-portrait -- --story journey-of-amara --file C:\photos\amara.jpg
 *   npm run import-portrait -- --story rebuilding-after-loss --file ~/amara.jpg --verified --note "From LinkedIn post 7123..."
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "whatsyourstory.db");
const UPLOAD_SUBDIR = path.join("public", "images", "portraits", "imported");
// Web path Next.js serves for that folder. Must start with "/" — a value like
// "public/images/..." is rejected by next/image and breaks public pages.
const UPLOAD_WEB_DIR = "/images/portraits/imported";

function fail(msg) {
  console.error(`\x1b[31mError:\x1b[0m ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function detectImageFormat(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return "webp";
  return null;
}

function slugifyPerson(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "portrait"
  );
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.story && !args["list-stories"])) {
  console.log(
    fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0] + "*/",
  );
  process.exit(0);
}

if (!fs.existsSync(DB_FILE)) {
  fail(
    `No database found at ${DB_FILE}.\nStart the website once (npm run dev) so the database is created, then re-run this command.`,
  );
}

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA foreign_keys = ON;");

if (args["list-stories"]) {
  const rows = db
    .prepare(
      "SELECT slug, person_name, title, status, portrait_url FROM stories ORDER BY updated_at DESC",
    )
    .all();
  if (rows.length === 0) {
    console.log("No stories yet.");
  } else {
    console.log("\nAvailable stories:\n");
    for (const r of rows) {
      const photo = r.portrait_url ? `photo: ${r.portrait_url}` : "NO PHOTOGRAPH";
      console.log(`  ${r.slug}`);
      console.log(`    ${r.person_name} — ${r.title} [${r.status}] (${photo})\n`);
    }
  }
  process.exit(0);
}

const slug = String(args.story);
const filePath = String(args.file || "");

const story = db
  .prepare(
    "SELECT id, slug, person_name, title, portrait_url FROM stories WHERE slug = ?",
  )
  .get(slug);
if (!story) {
  const close = db
    .prepare("SELECT slug FROM stories WHERE slug LIKE ? LIMIT 5")
    .all(`%${slug}%`);
  fail(
    `No story with slug "${slug}".` +
      (close.length
        ? `\nDid you mean:\n${close.map((c) => `  - ${c.slug}`).join("\n")}`
        : "\nRun with --list-stories to see available slugs."),
  );
}

if (!filePath || !fs.existsSync(filePath)) {
  fail(`Image file not found: "${filePath}".`);
}

const buf = fs.readFileSync(filePath);
const maxBytes = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;
if (buf.length > maxBytes) {
  fail(`Image is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
}
const format = detectImageFormat(buf);
if (!format) {
  fail("Only real JPEG, PNG, or WebP photographs are accepted.");
}

const personName = String(args.person || story.person_name);
const ext = format === "jpeg" ? "jpg" : format;
const base = slugifyPerson(personName);
const root = path.join(process.cwd(), UPLOAD_SUBDIR);

let fileName = `${base}.${ext}`;
let n = 2;
while (fs.existsSync(path.join(root, fileName))) {
  const existing = fs.readFileSync(path.join(root, fileName));
  if (existing.equals(buf)) {
    console.log(`\nAlready imported as ${fileName} — no changes made.`);
    applyToStory(story.id, `${UPLOAD_WEB_DIR}/${fileName}`);
    process.exit(0);
  }
  fileName = `${base}-${n}.${ext}`;
  n++;
}

const publicUrl = `${UPLOAD_WEB_DIR}/${fileName}`;
const verified = Boolean(args.verified);
const note = args.note ? String(args.note) : "";

console.log("\nPortrait import");
console.log("---------------");
console.log(`  Story:        ${story.slug} (${story.title})`);
console.log(`  Person:       ${personName}`);
console.log(`  Source file:  ${filePath} (${(buf.length / 1024).toFixed(0)} KB, ${format})`);
console.log(`  Will save as: ${publicUrl}`);
console.log(`  Verified:     ${verified ? "YES — will be visible immediately" : "no — placeholder shown until verified in the admin panel"}`);
if (args.link) console.log(`  Source link:  ${args.link}`);
if (args["dry-run"]) {
  console.log("\nDry run — nothing was written.\n");
  process.exit(0);
}

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, fileName), buf);
console.log(`\n✓ Photograph copied to ${publicUrl}`);

applyToStory(story.id, publicUrl, verified, note, personName, args.link);

function applyToStory(storyId, url, verify = false, sourceNote = "", person = "", link = "") {
  const alt = args.alt
    ? String(args.alt)
    : `Portrait of ${person || story.person_name}`;

  if (verify) {
    db.prepare(
      `UPDATE stories SET portrait_url = ?, image_alt = ?, portrait_verified = 1, updated_at = datetime('now') WHERE id = ?`,
    ).run(url, alt, storyId);
    console.log("✓ Story updated — photograph verified and will display on the site.");
  } else {
    db.prepare(
      `UPDATE stories SET portrait_url = ?, image_alt = ?, portrait_verified = 0, updated_at = datetime('now') WHERE id = ?`,
    ).run(url, alt, storyId);
    console.log(
      "✓ Story updated — photograph stored as UNVERIFIED (neutral placeholder shows until you verify it in the admin panel).",
    );
  }

  db.prepare(
    `INSERT INTO portrait_imports
      (id, story_id, file_name, original_name, source_note, person_match, permission_ok, imported_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(
    crypto.randomUUID(),
    storyId,
    fileName ?? path.basename(url),
    path.basename(String(args.file || url)),
    [sourceNote, link].filter(Boolean).join(" | "),
    verify ? "confirmed" : "unconfirmed",
    verify ? 1 : 0,
    "cli",
  );
  console.log(
    "\nNext step: open /admin/stories, open the story, and confirm the photograph\nmatches the person and that publication is permitted, then save.\n",
  );
}
