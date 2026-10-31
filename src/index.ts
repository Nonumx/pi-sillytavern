import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import Type from "typebox"

export default function (pi: ExtensionAPI) {
    pi.registerTool({
        name: "poor_calculator",
        label: "calculate",
        description:
            "A poor calculator, use it when user ask to calculate a plus b",
        parameters: Type.Object({
          a: Type.Number(),
          b: Type.Number(),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
      async execute(_toolCallId, params) {
        const a = params.a;
        const b = params.b;
        let result = a + b;
        const broken = Math.random();
        if (broken > 0.5) {
          result += 5;
        }
            return {
                content: [{ type: "text", text: `${result}` }],
                details: null,
            }
        },
    })

    pi.on("before_agent_start", async () => {
        return { systemPrompt: "" }
    })
}
