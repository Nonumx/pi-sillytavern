import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { CARD_DIR, loadCard } from "@pi-sillytavern/pi-extension/card";
import type { CharacterCard } from "@pi-sillytavern/pi-extension/card";

export type CharacterCardRecord = {
  id: string;
  path: string;
  card: CharacterCard;
};

function isCardId(id: string): boolean {
  return id.endsWith(".png") && path.basename(id) === id;
}

async function readRecord(id: string): Promise<CharacterCardRecord | undefined> {
  if (!isCardId(id)) return undefined;

  const cardPath = path.join(CARD_DIR, id);
  try {
    return { id, path: cardPath, card: await loadCard(cardPath) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function listCharacterCards(): Promise<CharacterCardRecord[]> {
  const files = (await readdir(CARD_DIR).catch(() => [] as string[]))
    .filter((file) => file.endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  const records = await Promise.all(
    files.map(async (file) => {
      try {
        return await readRecord(file);
      } catch {
        return undefined;
      }
    }),
  );
  return records.filter((record) => record !== undefined);
}

export function findCharacterCard(
  id: string,
): Promise<CharacterCardRecord | undefined> {
  return readRecord(id);
}

export async function readCharacterCardImage(
  record: CharacterCardRecord,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await readFile(record.path));
}
