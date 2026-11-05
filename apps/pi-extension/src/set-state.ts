import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import Type from "typebox"

const pointer = Type.String({
	description:
		"JSON Pointer (RFC 6901). An empty string addresses the whole document. '-' appends to an array. Escape '~' as '~0' and '/' as '~1'.",
})

const value = Type.Unknown({ description: "JSON value" })

export function registerSetStateTool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "set_state",
		label: "State",
		description:
			"Apply one JSON Patch (RFC 6902) to the conversation state. Call this in an mvu_update turn: the mvu_plot reply for this beat is already written, and this turn only records the state changes that plot caused. Call it once, and let that call be the whole update. In an mvu_plot turn, write the story and do not call this tool; do not put a state update in the plot reply. Before writing json_patch, name every state path the plot could affect and decide whether that path changes. Include only the paths that change, in application order. Operations are add, remove, replace, move, copy, and test. A changed number is a replace with the resulting value; test can check the previous value first. add creates a missing key or inserts into an array, and path '/物品/-' appends. remove deletes a path. move and copy read from, then write path. Do not call this tool to read lore, to invent paths the plot did not change, or more than once in the same mvu_update turn.",
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
		async execute(_toolCallId, params) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Received ${params.json_patch.length} JSON Patch operation(s). Persistence is not connected yet.`,
					},
				],
				details: undefined,
			}
		},
	})
}
