import { Hono } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/", (c) =>
  c.json({
    success: true,
    data: {
      status: "ok",
      service: "archflow-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  }),
);
