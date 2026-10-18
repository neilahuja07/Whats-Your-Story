#!/usr/bin/env node
/**
 * create-admin — create (or update the password of) an admin account.
 *
 * There is no "sign up" flow on the website on purpose: admin accounts are
 * created deliberately from the command line on the server, so nobody can
 * self-register into the editorial panel.
 *
 * Usage:
 *   npm run create-admin                          # interactive (prompts)
 *   npm run create-admin -- --email a@b.c         # password prompted
 *   npm run create-admin -- --email a@b.c --password <pw>
 *   npm run create-admin -- --email a@b.c --password <pw> --show
 *
 * Options:
 *   --email <email>      Admin email (required unless interactive)
 *   --password <pw>      Password (min 10 chars). Omitted → prompted.
 *   --show               Print the password back (off by default for safety)
 *   --help               Show this help
 *
 * Notes:
 *   - Passwords are hashed with scrypt + a per-user random salt, exactly the
 *     same format the login route verifies against (see src/lib/auth.ts).
 *   - If the account already exists, its password is replaced.
 *   - AUTH_SECRET is not needed here: it only signs session cookies at runtime.
 */
import { createInterface } from "node:readline/promises";
import { randomBytes, scryptSync, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "whatsyourstory.db");
const MIN_PASSWORD = 10;

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

// Must match hashPassword() in src/lib/auth.ts byte-for-byte:
//   `scrypt:<salt-hex>:<hash-hex>` with a 16-byte salt and 64-byte hash.
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0] + "*/");
  process.exit(0);
}

// The app creates the database (and its schema) the first time it runs.
// Running this script before that would fail, so we give a clear message.
if (!fs.existsSync(DB_FILE)) {
  fail(
    `No database found at ${DB_FILE}.\n` +
      `Start the website once so the database + schema are created:\n` +
      `    npm run dev\n` +
      `Then stop it and re-run this command.`,
  );
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  let email = typeof args.email === "string" ? args.email.trim() : "";
  while (!isValidEmail(email)) {
    if (args.email) fail(`"${args.email}" is not a valid email address.`); // explicit flag → don't loop
    email = (await rl.question("Admin email: ")).trim();
    if (!isValidEmail(email)) console.log("  Please enter a valid email address.");
  }
  email = email.toLowerCase();

  let password = typeof args.password === "string" ? args.password : "";
  if (!password) {
    password = await rl.question(
      `Password for ${email} (min ${MIN_PASSWORD} chars): `,
    );
    // NOTE: readline cannot suppress echo portably; for a fully private
    // prompt, pass --password or pipe the password in via stdin.
  }
  rl.close();

  if (password.length < MIN_PASSWORD) {
    fail(`Password must be at least ${MIN_PASSWORD} characters long.`);
  }

  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA foreign_keys = ON;");

  const existing = db
    .prepare("SELECT id FROM admins WHERE lower(email) = lower(?)")
    .get(email);

  const ts = new Date().toISOString();
  const passwordHash = hashPassword(password);

  if (existing) {
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(passwordHash, existing.id);
    console.log(`\n✓ Updated the password for ${email}.`);
  } else {
    db.prepare(
      "INSERT INTO admins (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    ).run(randomUUID(), email, passwordHash, ts);
    console.log(`\n✓ Created admin account ${email}.`);
  }

  const total = db.prepare("SELECT COUNT(*) AS n FROM admins").get().n;
  console.log(`  Total admin accounts: ${total}`);
  console.log(`\nSign in at: /admin/login\n`);
  if (!args.show) {
    console.log("(Password hidden. Pass --show to echo it back.)\n");
  } else {
    console.log(`  Password: ${password}\n`);
  }
  db.close();
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
