import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import cards from "./routes/cards.js";
import chat from "./routes/chat.js";

const app = new Hono();
const port = Number(process.env.PORT ?? 3000);

app.route("/api/cards", cards);
app.route("/api/chat", chat);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
