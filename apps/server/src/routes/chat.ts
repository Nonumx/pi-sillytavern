import "dotenv/config";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

const modelMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(modelMessageSchema).min(1, "至少需要一条消息"),
});

const chat = new Hono();

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

  /* 待改造片段，openai to pi chat */
  const client = new OpenAI();
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: parsed.data.messages,
      stream: true,
    });

    return streamSSE(c, async (stream) => {
      for await (const chunk of completion) {
        await stream.writeSSE({ data: JSON.stringify(chunk) });
      }
      await stream.writeSSE({ data: "[DONE]" });
    });
  } catch (error) {
    console.error("OpenAI 聊天请求失败", error);
    return c.json({ error: "OpenAI 聊天请求失败" }, 502);
  }
  /* 待改造片段结束 */
});

export default chat;
