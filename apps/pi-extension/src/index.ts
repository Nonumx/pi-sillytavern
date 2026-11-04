import { writeFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"
import type {
    ExtensionAPI,
    ExtensionCommandContext,
    ExtensionContext,
    SessionManager,
} from "@earendil-works/pi-coding-agent"
import Type from "typebox"
import {
    CARD_DIR,
    loadCard,
    TAVERN_ENTRY_TYPE,
} from "./card"
import type { CharacterCard } from "./types"

const ENTRY_TYPE = TAVERN_ENTRY_TYPE

const MISSING_CARD = "尚未选择角色卡，请先执行 /card"
const CORE_INSTRUCTIONS = `You are running in Pi Tavern, a roleplay agent.
Your goal is to portray all characters faithfully and advance the roleplay while remaining consistent with the established setting.`

const toolDefinitions: string[] = []

function registerToolDefinition(name: string, description: string): void {
    toolDefinitions.push(`- ${name}: ${description}`)
}

function buildAvailableTools(): string {
    return ["Available tools:", ...toolDefinitions].join("\n")
}

registerToolDefinition(
    "get_lorebook",
    "Read character definitions, setting details, and style guidance.",
)

type TavernData = {
    card?: string
}

type TavernState = {
    data: TavernData
    card: CharacterCard
}

type PromptSegment = {
    id: string
    content: string
}

class SystemPromptBuilder {
    private segments: PromptSegment[] = []

    add(id: string, content: string): void {
        if (this.segments.some((segment) => segment.id === id)) {
            throw new Error(`Duplicate prompt segment: ${id}`)
        }
        if (content.trim().length === 0) return
        this.segments.push({ id, content })
    }

    build(): string {
        return this.segments
            .map((segment) => segment.content.trim())
            .join("\n\n")
    }
}

function buildSystemPrompt(state?: TavernState): string {
    const builder = new SystemPromptBuilder()
    builder.add("core", CORE_INSTRUCTIONS)
    builder.add("core.tools", buildAvailableTools())

    if (state) {
        builder.add("character.description", state.card.description)
        const lore = state.card.data.character_book?.entries ?? []
        for (const [index, entry] of lore.entries()) {
            if (entry.constant !== true) continue
            builder.add(`character.lorebook.${index}`, entry.content)
        }
    }

    const systemPrompt = builder.build()
    writeFileSync("system-prompt-debug.txt", systemPrompt)
    return systemPrompt
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

function toolError(text: string) {
    return {
        content: [{ type: "text" as const, text }],
        details: undefined,
        isError: true,
    }
}

function getLorebookCatalog(card: CharacterCard) {
    const lore = card.data.character_book?.entries ?? []
    const catalog = lore.map((entry, index) => ({
        index,
        comment: entry.comment,
    }))
    return {
        content: [{ type: "text" as const, text: JSON.stringify(catalog) }],
        details: undefined,
    }
}

function createLorebookCatalogExchange(
    card: CharacterCard,
    model: NonNullable<ExtensionContext["model"]>,
) {
    const toolCallId = "initial-lorebook-catalog"
    return [
        {
            role: "assistant" as const,
            content: [
                {
                    type: "toolCall" as const,
                    id: toolCallId,
                    name: "get_lorebook",
                    arguments: {},
                },
            ],
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
            stopReason: "toolUse" as const,
            timestamp: Date.now(),
        },
        {
            role: "toolResult" as const,
            toolCallId,
            toolName: "get_lorebook",
            content: getLorebookCatalog(card).content,
            isError: false,
            timestamp: Date.now(),
        },
    ]
}

function getLorebookEntry(card: CharacterCard, index: number) {
    const lore = card.data.character_book?.entries ?? []
    const entry = lore[index]
    if (!entry) {
        return toolError(
            `Lorebook entry ${index} does not exist. Valid range: 0-${lore.length - 1}.`,
        )
    }

    return {
        content: [{ type: "text" as const, text: entry.content }],
        details: undefined,
    }
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

    pi.on("before_agent_start", async (_event, ctx) => {
        const data = readLastTavernData(ctx)
        if (data?.card !== state?.data.card) {
            try {
                state = data ? await loadTavernState(data) : undefined
            } catch (error) {
                state = undefined
                ctx.ui.notify(`角色卡加载失败：${errorMessage(error)}`, "error")
            }
        }
        return { systemPrompt: buildSystemPrompt(state) }
    })

    pi.on("context", (event, ctx) => {
        if (!state || !ctx.model) return
        if (event.messages.at(-1)?.role !== "user") return
        if (
            event.messages.filter((message) => message.role === "user")
                .length !== 1
        ) {
            return
        }
        if ((state.card.data.character_book?.entries.length ?? 0) === 0) {
            return
        }

        return {
            messages: [
                ...event.messages,
                ...createLorebookCatalogExchange(state.card, ctx.model),
            ],
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
        label: "Lorebook",
        description:
            "Read lorebook entries before writing. Before writing about any character, including newly introduced characters, read every entry relevant to that character; do not limit lookups to the opening character or a perceived protagonist. Before composing a scene, read all entries relevant to its setting and required writing style. Use index to read an entry, or omit it to return the catalog. Never invent entry content from catalog comments.",
        parameters: Type.Object({
            index: Type.Optional(
                Type.Integer({
                    minimum: 0,
                    description: "Lorebook entry index. Omit to return the catalog.",
                }),
            ),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
        async execute(_toolCallId, params) {
            if (!state) return toolError(MISSING_CARD)
            if (params.index === undefined) {
                return getLorebookCatalog(state.card)
            }
            return getLorebookEntry(state.card, params.index)
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
