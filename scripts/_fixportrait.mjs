import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/whatsyourstory.db");
const r = db.prepare(
  "UPDATE stories SET portrait_url = '/images/portraits/imported/jane-audit.jpg' WHERE id = ?"
).run("e5add891-5c34-4659-8b8b-d7e1fc2e39c9");
console.log("rows updated:", r.changes);
const after = db.prepare("SELECT slug, portrait_url FROM stories WHERE id = ?").get("e5add891-5c34-4659-8b8b-d7e1fc2e39c9");
console.log(JSON.stringify(after));
