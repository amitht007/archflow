import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";

import { healthRouter } from "./routes/health";
import { sdlRouter } from "./routes/sdl";

import { websocketHandlers } from "./websocket";

// ─── App Bootstrap ───────────────────────────────────────────────────────────

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use("*", prettyJSON());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route("/health", healthRouter);
app.route("/api/v1/sdl", sdlRouter);

// ─── 404 fallback ────────────────────────────────────────────────────────────

app.notFound((c) =>
  c.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

app.onError((err, c) => {
  console.error(err);
  return c.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
    500,
  );
});

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env["PORT"] ?? 3001);

console.log(`🚀 ArchFlow API running at http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch(req: Request, server: any) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/ws/")) {
      const room = url.pathname.slice(4);
      if (server.upgrade(req, { data: { room } })) {
        return;
      }
    }
    return app.fetch(req);
  },
  websocket: websocketHandlers,
};
