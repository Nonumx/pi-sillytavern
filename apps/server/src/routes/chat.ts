import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createPiChatSession } from "../pi/chat-session.js";

const modelMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatRequestSchema = z
  .object({
    messages: z.array(modelMessageSchema).min(1, "至少需要一条消息"),
  })
  .refine(({ messages }) => messages.at(-1)?.role === "user", {
    message: "最后一条消息必须来自用户",
  });

const chat = new Hono();

function chatChunk(delta: {
  content?: string;
  reasoning_content?: string;
}): string {
  return JSON.stringify({ choices: [{ delta }] });
}

chat.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "请求体必须是合法的 JSON" }, 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "聊天请求格式不正确", issues: parsed.error.issues },
      400,
    );
  }

  let piChat: Awaited<ReturnType<typeof createPiChatSession>>;
  try {
    piChat = await createPiChatSession(parsed.data.messages);
  } catch (error) {
    console.error("Pi 会话创建失败", error);
    return c.json({ error: "Pi 会话创建失败" }, 502);
  }

  const { session, prompt } = piChat;
  return streamSSE(c, async (stream) => {
    let writes = Promise.resolve();
    let aborted = false;

    stream.onAbort(() => {
      aborted = true;
      void session.abort();
    });

    const unsubscribe = session.subscribe((event) => {
      if (event.type !== "message_update") return;

      const assistantEvent = event.assistantMessageEvent;
      if (
        assistantEvent.type !== "text_delta" &&
        assistantEvent.type !== "thinking_delta"
      ) {
        return;
      }

      const delta =
        assistantEvent.type === "text_delta"
          ? { content: assistantEvent.delta }
          : { reasoning_content: assistantEvent.delta };
      writes = writes.then(() =>
        stream.writeSSE({ data: chatChunk(delta) }),
      );
    });

    try {
      await session.prompt(prompt);
      const finalMessage = session.messages.at(-1);
      if (
        finalMessage?.role === "assistant" &&
        finalMessage.stopReason === "error"
      ) {
        throw new Error(finalMessage.errorMessage ?? "Pi 聊天请求失败");
      }
      await writes;
      if (!aborted) await stream.writeSSE({ data: "[DONE]" });
    } catch (error) {
      if (!aborted) {
        console.error("Pi 聊天请求失败", error);
        await writes;
        await stream.writeSSE({
          data: JSON.stringify({ error: "Pi 聊天请求失败" }),
        });
      }
    } finally {
      unsubscribe();
      session.dispose();
    }
  });
});

export default chat;
