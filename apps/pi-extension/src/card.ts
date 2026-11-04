import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { characterCardSchema, type CharacterCard } from "./types/index.js"
import { parseCharacterCardPng } from "./utils/index.js"

export type { CharacterCard } from "./types/index.js"

export const TAVERN_ENTRY_TYPE = "pi_tavern"

const DATA_DIR = path.resolve(
    process.env.TAVERN_DATA_DIR ??
        path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../../../data",
        ),
)

export const CARD_DIR = path.join(DATA_DIR, "character_cards")

export async function loadCard(cardPath: string): Promise<CharacterCard> {
    const bytes = await readFile(cardPath)
    return characterCardSchema.parse(parseCharacterCardPng(bytes))
}
