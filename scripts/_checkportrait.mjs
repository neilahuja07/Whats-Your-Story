import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/whatsyourstory.db");
const rows = db.prepare("SELECT id, slug, title, portrait_url, portrait_verified FROM stories WHERE portrait_url != ''").all();
console.log(JSON.stringify(rows, null, 2));
