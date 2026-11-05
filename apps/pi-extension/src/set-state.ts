import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import jsonpatch, { type Operation } from "fast-json-patch"
import Type from "typebox"

const STATE_ENTRY_TYPE = "pi_tavern_state"

const pointer = Type.String({
	description:
		"JSON Pointer (RFC 6901). An empty string addresses the whole document. '-' appends to an array. Escape '~' as '~0' and '/' as '~1'.",
})

const value = Type.Unknown({ description: "JSON value" })

type StateChange = {
	path: string
	value?: unknown
}

const removed = Symbol("removed")

function readDocument(
	entries: readonly { type: string; customType?: string; data?: unknown }[],
): unknown {
	for (let i = entries.length - 1; i >= 0; i -= 1) {
		const entry = entries[i]
		if (entry?.type !== "custom" || entry.customType !== STATE_ENTRY_TYPE) {
			continue
		}
		if (entry.data === undefined) continue
		return entry.data
	}
	return {}
}

function parentPointer(pointer: string): string {
	const slash = pointer.lastIndexOf("/")
	return slash <= 0 ? "" : pointer.slice(0, slash)
}

function writtenPointer(pointer: string): string {
	return pointer.endsWith("/-") ? parentPointer(pointer) : pointer
}

function currentValue(document: unknown, pointer: string): unknown {
	return pointer === "" ? document : jsonpatch.getValueByPointer(document, pointer)
}

function changedPaths(
	document: unknown,
	patch: readonly Operation[],
): StateChange[] {
	const slots = new Map<string, unknown | typeof removed>()
	for (const operation of patch) {
		if (operation.op === "test" || operation.op === "_get") continue
		if (operation.op === "remove") {
			slots.set(operation.path, removed)
			continue
		}
		if (operation.op === "move") slots.set(operation.from, removed)
		const path = writtenPointer(operation.path)
		const next = currentValue(document, path)
		slots.set(path, next === undefined ? removed : next)
	}

	const changes: StateChange[] = []
	for (const [path, next] of slots) {
		if (next === removed) changes.push({ path })
		else changes.push({ path, value: next })
	}
	return changes
}

function toolError(text: string) {
	return {
		content: [{ type: "text" as const, text }],
		details: undefined,
		isError: true,
	}
}

export function registerSetStateTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "set_state",
		label: "State",
		description:
			"Apply one JSON Patch (RFC 6902) to the conversation state. Call this in an mvu_update turn: the mvu_plot reply for this beat is already written, and this turn only records the state changes that plot caused. Call it once, and let that call be the whole update. In an mvu_plot turn, write the story and do not call this tool; do not put a state update in the plot reply. Before writing json_patch, name every state path the plot could affect and decide whether that path changes. Include only the paths that change, in application order. Operations are add, remove, replace, move, copy, and test. A changed number is a replace with the resulting value; test can check the previous value first. add sets a key on an existing object or inserts into an existing array; the parent path must already exist, and path '/物品/-' appends. remove deletes a path. move and copy read from, then write path. The result lists each changed path and its value after the patch. A removed path has no value. An append path ending in '/-' is reported at its parent. Do not call this tool to read lore, to invent paths the plot did not change, or more than once in the same mvu_update turn.",
		parameters: Type.Object({
			json_patch: Type.Array(
				Type.Union([
					Type.Object({
						op: Type.Literal("add"),
						path: pointer,
						value,
					}),
					Type.Object({
						op: Type.Literal("remove"),
						path: pointer,
					}),
					Type.Object({
						op: Type.Literal("replace"),
						path: pointer,
						value,
					}),
					Type.Object({
						op: Type.Literal("move"),
						path: pointer,
						from: pointer,
					}),
					Type.Object({
						op: Type.Literal("copy"),
						path: pointer,
						from: pointer,
					}),
					Type.Object({
						op: Type.Literal("test"),
						path: pointer,
						value,
					}),
				]),
				{
					minItems: 1,
					description: "RFC 6902 JSON Patch, applied in order.",
				},
			),
		}),
		annotations: { readOnlyHint: false, openWorldHint: false },
		executionMode: "sequential",
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const patch = structuredClone(params.json_patch) as Operation[]
			try {
				const document = jsonpatch.applyPatch(
					readDocument(ctx.sessionManager.getBranch()),
					patch,
					true,
					false,
				).newDocument
				const changes = changedPaths(document, patch)
				pi.appendEntry(STATE_ENTRY_TYPE, document)
				return {
					content: [{ type: "text" as const, text: JSON.stringify(changes) }],
					details: undefined,
				}
			} catch (error) {
				return toolError(error instanceof Error ? error.message : String(error))
			}
		},
	})
}
