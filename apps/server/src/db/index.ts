import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const dataDir = resolve(import.meta.dirname, "..", "..", "data");

mkdirSync(resolve(dataDir, "images"), { recursive: true });
mkdirSync(resolve(dataDir, "presets"), { recursive: true });

export const db = new DatabaseSync(resolve(dataDir, "app.db"));

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS character_cards (
    id   TEXT PRIMARY KEY,
    path TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS presets (
    id   TEXT PRIMARY KEY,
    path TEXT NOT NULL
  )
`);
