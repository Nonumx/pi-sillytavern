import { createRequire } from "node:module";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import { TAVERN_ENTRY_TYPE } from "@pi-sillytavern/pi-extension/card";

export type PiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const extensionPath = createRequire(import.meta.url).resolve(
  "@pi-sillytavern/pi-extension",
);

export async function createPiChatSession(
  messages: PiChatMessage[],
  cardPath?: string,
): Promise<{
  session: AgentSession;
  prompt: string;
}> {
  const systemPrompt = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const history = messages.filter((message) => message.role !== "system");
  const lastMessage = history.at(-1);

  if (lastMessage?.role !== "user") {
    throw new Error("最后一条消息必须来自用户");
  }

  const cwd = process.cwd();
  const modelRuntime = await ModelRuntime.create();
  const provider = process.env.PI_PROVIDER;
  const modelId = process.env.PI_MODEL;
  if ((provider === undefined) !== (modelId === undefined)) {
    throw new Error("PI_PROVIDER 和 PI_MODEL 必须同时配置");
  }
  const model =
    provider && modelId ? modelRuntime.getModel(provider, modelId) : undefined;
  if (provider && modelId && !model) {
    throw new Error(`Pi 中不存在模型 ${provider}/${modelId}`);
  }

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: getAgentDir(),
    additionalExtensionPaths: [extensionPath],
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt,
  });
  await resourceLoader.reload();

  const { session, extensionsResult } = await createAgentSession({
    cwd,
    modelRuntime,
    ...(model ? { model } : {}),
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    tools: ["get_lorebook"],
  });

  try {
    if (extensionsResult.errors.length > 0) {
      throw new Error(
        extensionsResult.errors
          .map((error) => `${error.path}: ${error.error}`)
          .join("\n"),
      );
    }
    if (!session.model) throw new Error("Pi 未配置可用模型");

    if (cardPath) {
      session.sessionManager.appendCustomEntry(TAVERN_ENTRY_TYPE, {
        card: cardPath,
      });
    }

    const model = session.model;
    for (const message of history.slice(0, -1)) {
      if (message.role === "user") {
        session.sessionManager.appendMessage({
          role: "user",
          content: [{ type: "text", text: message.content }],
          timestamp: Date.now(),
        });
        continue;
      }

      session.sessionManager.appendMessage({
        role: "assistant",
        content: [{ type: "text", text: message.content }],
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
      });
    }
    session.refreshContext();

    return { session, prompt: lastMessage.content };
  } catch (error) {
    session.dispose();
    throw error;
  }
}
