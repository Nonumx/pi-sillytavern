import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir, db } from "./index.js";

export type CharacterCardRecord = {
  id: string;
  path: string;
};

const insertStatement = db.prepare("INSERT INTO character_cards (id, path) VALUES (?, ?)");
const listStatement = db.prepare("SELECT id, path FROM character_cards ORDER BY rowid DESC");
const findStatement = db.prepare("SELECT id, path FROM character_cards WHERE id = ?");

export function createCharacterCard(bytes: Uint8Array): CharacterCardRecord {
  const id = randomUUID();
  const path = `images/${id}.png`;

  writeFileSync(resolve(dataDir, path), bytes);
  insertStatement.run(id, path);

  return { id, path };
}

export function listCharacterCards(): CharacterCardRecord[] {
  return listStatement.all() as CharacterCardRecord[];
}

export function findCharacterCard(id: string): CharacterCardRecord | undefined {
  return findStatement.get(id) as CharacterCardRecord | undefined;
}

export function readCharacterCardImage(
  record: CharacterCardRecord,
): Uint8Array<ArrayBuffer> | undefined {
  try {
    return new Uint8Array(readFileSync(resolve(dataDir, record.path)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
