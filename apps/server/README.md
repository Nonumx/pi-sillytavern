Server 使用 Hono 提供 HTTP/SSE 接口，对话由 Pi SDK 执行，模型和认证沿用本机 Pi 配置。

在 monorepo 根目录运行：

```bash
npm install
npm run dev:server
```

聊天接口为 `POST /api/chat`，默认监听 `http://localhost:3000`。
默认使用 Pi 当前模型，也可通过 `PI_PROVIDER` 和 `PI_MODEL` 同时指定模型。
