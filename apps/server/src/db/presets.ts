import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir, db } from "./index.js";

export type PresetRecord = {
  id: string;
  path: string;
};

const insertStatement = db.prepare("INSERT INTO presets (id, path) VALUES (?, ?)");
const listStatement = db.prepare("SELECT id, path FROM presets ORDER BY rowid DESC");
const findStatement = db.prepare("SELECT id, path FROM presets WHERE id = ?");

export function createPreset(text: string): PresetRecord {
  const id = randomUUID();
  const path = `presets/${id}.json`;

  writeFileSync(resolve(dataDir, path), text);
  insertStatement.run(id, path);

  return { id, path };
}

export function listPresets(): PresetRecord[] {
  return listStatement.all() as PresetRecord[];
}

export function findPreset(id: string): PresetRecord | undefined {
  return findStatement.get(id) as PresetRecord | undefined;
}

export function readPresetFile(record: PresetRecord): string | undefined {
  try {
    return readFileSync(resolve(dataDir, record.path), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
