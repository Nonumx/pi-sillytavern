import { Hono } from "hono";
import {
  findCharacterCard,
  listCharacterCards,
  readCharacterCardImage,
} from "../card-store.js";

const cards = new Hono();

cards.get("/", async (c) => {
  try {
    const records = await listCharacterCards();
    return c.json({
      cards: records.map(({ id, card }) => ({
        ...card,
        id,
        imageUrl: `/api/cards/${encodeURIComponent(id)}/image`,
      })),
    });
  } catch (error) {
    console.error("角色卡列表加载失败", error);
    return c.json({ error: "角色卡列表加载失败" }, 500);
  }
});

cards.get("/:id/image", async (c) => {
  try {
    const record = await findCharacterCard(c.req.param("id"));
    if (!record) return c.json({ error: "角色卡不存在" }, 404);

    const image = await readCharacterCardImage(record);
    return c.body(image, 200, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    });
  } catch (error) {
    console.error("角色卡图片加载失败", error);
    return c.json({ error: "角色卡图片加载失败" }, 500);
  }
});

export default cards;
