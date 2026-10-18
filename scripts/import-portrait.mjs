#!/usr/bin/env node
/**
 * import-portrait — manually import a real photograph for a story.
 *
 * Use this after you have downloaded the actual photograph from the original
 * source (e.g. the person's LinkedIn post) and have confirmed:
 *   1. the photograph is of the person named in the story, and
 *   2. you have permission to publish it on the website.
 *
 * The file is uploaded to the public Supabase Storage bucket `story-images`
 * under stories/<storyId>/<person-slug>.<ext> and the story record is
 * updated. The photograph is stored as UNVERIFIED; verify it in the admin
 * panel (Stories → [story] → Portrait) to make it visible on the site —
 * until then a neutral placeholder is displayed.
 *
 * Nothing is written to the local filesystem (Vercel has no persistent disk).
 *
 * Setup (same as the website):
 *   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are read
 *     from the environment or from .env.local.
 *   - Your administrator e-mail/password are asked for interactively (or set
 *     SUPABASE_ADMIN_EMAIL / SUPABASE_ADMIN_PASSWORD). They are used ONLY to
 *     obtain a Supabase Auth session — the same allowlist check (is_admin)
 *     as the admin panel applies. No service-role key is ever used.
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
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const STORAGE_BUCKET = "story-images";

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

/** Minimal .env.local reader (no extra dependency). */
function loadEnvFile() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
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

loadEnvFile();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set " +
      "in the environment or in .env.local (see SUPABASE_SETUP.md).",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function signIn() {
  let email = process.env.SUPABASE_ADMIN_EMAIL?.trim();
  let password = process.env.SUPABASE_ADMIN_PASSWORD?.trim();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (!email) email = (await rl.question("Admin e-mail: ")).trim();
  if (!password) password = await rl.question("Admin password: ");
  rl.close();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail(`Sign-in failed: ${error?.message ?? "unknown error"}`);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    fail("This account is not in the admin_users allowlist (see SUPABASE_SETUP.md).");
  }
  return data.user;
}

const user = await signIn();

if (args["list-stories"]) {
  const { data, error } = await supabase
    .from("stories")
    .select("slug, person_name, title, is_published, cover_image_url")
    .order("updated_at", { ascending: false });
  if (error) fail(`Could not list stories: ${error.message}`);
  if (!data || data.length === 0) {
    console.log("No stories yet.");
  } else {
    console.log("\nAvailable stories:\n");
    for (const r of data) {
      const photo = r.cover_image_url ? `photo: ${r.cover_image_url}` : "NO PHOTOGRAPH";
      const status = r.is_published ? "published" : "draft";
      console.log(`  ${r.slug}`);
      console.log(`    ${r.person_name} — ${r.title} [${status}] (${photo})\n`);
    }
  }
  process.exit(0);
}

const slug = String(args.story);
const filePath = String(args.file || "");

const { data: story, error: storyError } = await supabase
  .from("stories")
  .select("id, slug, person_name, title, cover_image_url")
  .eq("slug", slug)
  .maybeSingle();
if (storyError) fail(`Could not load the story: ${storyError.message}`);
if (!story) {
  const { data: close } = await supabase
    .from("stories")
    .select("slug")
    .like("slug", `%${slug}%`)
    .limit(5);
  fail(
    `No story with slug "${slug}".` +
      (close && close.length
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
const objectPath = `stories/${story.id}/${slugifyPerson(personName)}.${ext}`;
const contentType =
  format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

console.log("\nPortrait import");
console.log("---------------");
console.log(`  Signed in as:  ${user.email}`);
console.log(`  Story:         ${story.slug} (${story.title})`);
console.log(`  Person:        ${personName}`);
console.log(`  Source file:   ${filePath} (${(buf.length / 1024).toFixed(0)} KB, ${format})`);
console.log(`  Will store as: ${objectPath} (bucket ${STORAGE_BUCKET})`);
const verified = Boolean(args.verified);
console.log(`  Verified:      ${verified ? "YES — will be visible immediately" : "no — placeholder shown until verified in the admin panel"}`);
if (args.link) console.log(`  Source link:   ${args.link}`);
if (args["dry-run"]) {
  console.log("\nDry run — nothing was written.\n");
  process.exit(0);
}

const upload = await supabase.storage
  .from(STORAGE_BUCKET)
  .upload(objectPath, buf, { contentType, upsert: true });
if (upload.error) fail(`Upload failed: ${upload.error.message}`);
console.log(`\n✓ Photograph uploaded to ${STORAGE_BUCKET}/${objectPath}`);

const { data: publicUrlData } = supabase.storage
  .from(STORAGE_BUCKET)
  .getPublicUrl(objectPath);
const publicUrl = publicUrlData.publicUrl;

const alt = args.alt ? String(args.alt) : `Portrait of ${personName}`;
const { error: updateError } = await supabase
  .from("stories")
  .update({
    cover_image_url: publicUrl,
    image_alt: alt,
    portrait_verified: verified,
  })
  .eq("id", story.id);
if (updateError) fail(`Could not update the story: ${updateError.message}`);

console.log(
  verified
    ? "✓ Story updated — photograph verified and will display on the site."
    : "✓ Story updated — photograph stored as UNVERIFIED (neutral placeholder shows until you verify it in the admin panel).",
);

const sourceNote = [args.note ? String(args.note) : "", args.link ? String(args.link) : ""]
  .filter(Boolean)
  .join(" | ");
const { error: auditError } = await supabase.from("portrait_imports").insert({
  story_id: story.id,
  file_name: objectPath,
  original_name: path.basename(String(args.file || "")),
  source_note: sourceNote,
  person_match: verified ? "confirmed" : "unconfirmed",
  permission_ok: verified,
  imported_by: `cli (${user.email})`,
});
if (auditError) {
  console.warn(`⚠ Audit entry not written: ${auditError.message}`);
}

await supabase.auth.signOut();
console.log(
  "\nNext step: open /admin/stories, open the story, and confirm the photograph\nmatches the person and that publication is permitted, then save.\n",
);
