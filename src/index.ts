import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type {
    ExtensionAPI,
    ExtensionCommandContext,
    ExtensionContext,
    SessionManager,
} from "@earendil-works/pi-coding-agent"
import Type from "typebox"
import { characterCardSchema, type CharacterCard } from "./types"
import { parseCharacterCardPng } from "./utils"

const ENTRY_TYPE = "pi_tavern"

const DATA_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../data",
)
const CARD_DIR = path.join(DATA_DIR, "character_cards")

const MISSING_CARD = "尚未选择角色卡，请先执行 /card"

type TavernData = {
    card?: string
}

type TavernState = {
    data: TavernData
    card: CharacterCard
}

function readLastTavernData(
    ctx: ExtensionContext,
): TavernData | undefined {
    const branch = ctx.sessionManager.getBranch()

    for (let i = branch.length - 1; i >= 0; i -= 1) {
        const entry = branch[i]
        if (entry?.type !== "custom" || entry.customType !== ENTRY_TYPE) {
            continue
        }
        return entry.data as TavernData | undefined
    }

    return undefined
}

function preview(text: string, maxLength = 80): string {
    const flat = text.replace(/\s+/g, " ").trim()
    const chars = [...flat]
    return chars.length > maxLength
        ? `${chars.slice(0, maxLength).join("")}…`
        : flat
}

async function loadCard(cardPath: string): Promise<CharacterCard> {
    const bytes = await readFile(cardPath)
    return characterCardSchema.parse(parseCharacterCardPng(bytes))
}

async function loadPreset(): Promise<void> {}

async function loadLorebooks(): Promise<void> {}

async function loadTavernState(
    data: TavernData,
): Promise<TavernState | undefined> {
    const cardPath = data.card
    if (typeof cardPath !== "string") return undefined

    const card = await loadCard(cardPath)
    await loadPreset()
    await loadLorebooks()

    return { data, card }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function appendAssistantMessage(
    sessionManager: SessionManager,
    text: string,
    model: NonNullable<ExtensionContext["model"]>,
): void {
    sessionManager.appendMessage({
        role: "assistant",
        content: [{ type: "text", text }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
            },
        },
        stopReason: "stop",
        timestamp: Date.now(),
    })
}

type CardChoice = {
    cardPath: string
    card: CharacterCard
}

async function pickCard(
    ctx: ExtensionCommandContext,
): Promise<CardChoice | undefined> {
    const files = (await readdir(CARD_DIR).catch(() => [] as string[])).filter(
        (file) => file.endsWith(".png"),
    )
    if (files.length === 0) {
        ctx.ui.notify(`未在 ${CARD_DIR} 找到角色卡`, "error")
        return undefined
    }

    const entries = (
        await Promise.all(
            files.map(async (file): Promise<CardChoice | undefined> => {
                const cardPath = path.join(CARD_DIR, file)
                try {
                    return { cardPath, card: await loadCard(cardPath) }
                } catch {
                    return undefined
                }
            }),
        )
    ).filter((entry): entry is CardChoice => entry !== undefined)

    if (entries.length === 0) {
        ctx.ui.notify("未找到可用的角色卡", "error")
        return undefined
    }
    if (entries.length < files.length) {
        ctx.ui.notify(
            `已跳过 ${files.length - entries.length} 张无法加载的角色卡`,
            "warning",
        )
    }

    const chosen = await ctx.ui.select(
        "选择角色卡",
        entries.map((entry) => entry.card.name),
    )
    if (chosen === undefined) return undefined

    const matches = entries.filter((entry) => entry.card.name === chosen)
    if (matches.length > 1) {
        ctx.ui.notify(
            `存在多张名为《${chosen}》的角色卡，请重命名后再选择`,
            "error",
        )
        return undefined
    }
    return matches[0]
}

export default function (pi: ExtensionAPI) {
    let state: TavernState | undefined

    pi.on("session_start", async (_event, ctx) => {
        const data = readLastTavernData(ctx)
        if (data === undefined) return

        try {
            state = await loadTavernState(data)
        } catch (error) {
            state = undefined
            ctx.ui.notify(`角色卡加载失败：${errorMessage(error)}`, "error")
        }
    })

    pi.registerCommand("card", {
        description: "选择角色卡并新建会话",
        handler: async (_args, ctx) => {
            const selected = await pickCard(ctx)
            if (selected === undefined) return
            if (!ctx.model) {
                ctx.ui.notify("当前没有可用模型，无法新建会话", "error")
                return
            }

            const { cardPath, card } = selected
            const data: TavernData = { card: cardPath }
            const model = ctx.model
            const result = await ctx.newSession({
                setup: async (sessionManager) => {
                    sessionManager.appendCustomEntry(ENTRY_TYPE, data)
                    if (card.first_mes.trim().length > 0) {
                        appendAssistantMessage(
                            sessionManager,
                            card.first_mes,
                            model,
                        )
                    }
                },
                withSession: async (nextCtx) => {
                    state = { data, card }
                    nextCtx.ui.notify(`已载入《${card.name}》`, "info")
                },
            })

            if (result.cancelled) ctx.ui.notify("新建会话已取消", "info")
        },
    })

    pi.registerTool({
        name: "get_lorebook",
        label: "世界书",
        description:
            "不带参数时返回世界书目录，每项为 { index, comment }。传入 index 返回该条完整 content。",
        parameters: Type.Object({
            index: Type.Optional(
                Type.Integer({
                    minimum: 0,
                    description: "世界书条目索引，省略则返回目录",
                }),
            ),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
        async execute(_toolCallId, params) {
            if (!state) {
                return {
                    content: [{ type: "text" as const, text: MISSING_CARD }],
                    details: undefined,
                    isError: true,
                }
            }

            const book =
                state.card.data.character_book ?? state.card.character_book
            const lore = book?.entries ?? []

            if (params.index === undefined) {
                const index = lore.map((entry, i) => ({
                    index: i,
                    comment: entry.comment,
                }))
                return {
                    content: [
                        { type: "text" as const, text: JSON.stringify(index) },
                    ],
                    details: undefined,
                }
            }

            const entry = lore[params.index]
            if (!entry) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `索引 ${params.index} 不存在，有效范围 0-${lore.length - 1}`,
                        },
                    ],
                    details: undefined,
                    isError: true,
                }
            }

            return {
                content: [{ type: "text" as const, text: entry.content }],
                details: undefined,
            }
        },
    })

    pi.registerCommand("opening", {
        description: "选择角色开局（新建会话）",
        handler: async (_args, ctx) => {
            if (!state) {
                ctx.ui.notify(MISSING_CARD, "error")
                return
            }
            const greetings = [
                state.card.first_mes,
                ...state.card.data.alternate_greetings,
            ].filter((text) => text.trim().length > 0)
            if (greetings.length === 0) {
                ctx.ui.notify("角色卡没有可用的开局文本", "error")
                return
            }
            if (!ctx.model) {
                ctx.ui.notify("当前没有可用模型，无法新建会话", "error")
                return
            }

            const options = greetings.map(
                (greeting, index) => `${index}  ${preview(greeting)}`,
            )
            const chosen = await ctx.ui.select("选择开局", options)
            if (chosen === undefined) return

            const index = Number(chosen.slice(0, chosen.indexOf("  ")))
            const greeting = greetings[index]
            if (greeting === undefined) return

            const hasConversation = ctx.sessionManager
                .getBranch()
                .some(
                    (entry) =>
                        entry.type === "message" &&
                        (entry.message.role === "user" ||
                            entry.message.role === "assistant"),
                )

            const confirmed = await ctx.ui.confirm(
                `开局 ${index}`,
                [
                    ...(hasConversation
                        ? ["将新建会话并丢弃当前对话。", ""]
                        : []),
                    greeting,
                ].join("\n"),
            )
            if (!confirmed) {
                ctx.ui.notify("已取消", "info")
                return
            }

            const model = ctx.model
            const data = state.data
            const result = await ctx.newSession({
                setup: async (sessionManager) => {
                    sessionManager.appendCustomEntry(ENTRY_TYPE, data)
                    appendAssistantMessage(sessionManager, greeting, model)
                },
                withSession: async (nextCtx) => {
                    nextCtx.ui.notify("开局已载入", "info")
                },
            })

            if (result.cancelled) ctx.ui.notify("新建会话已取消", "info")
        },
    })
}
