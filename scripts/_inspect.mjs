import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/whatsyourstory.db");
for (const t of ["linkedin_imports", "stories"]) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name);
  console.log(t + ": " + cols.join(", "));
}
