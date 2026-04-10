import { Hono } from "hono";
import { parseSDL } from "@archflow/sdl";
import {
  loadSDL,
  reloadSDL,
  extractEndpoints,
  summarizeSDL,
} from "../lib/sdl-loader";

export const sdlRouter = new Hono();

// ─── GET /api/v1/sdl ─ Full SDL document ─────────────────────────────────────
sdlRouter.get("/", (c) => {
  const sdl = loadSDL();
  return c.json({ success: true, data: sdl });
});

// ─── GET /api/v1/sdl/summary ─ High-level stats ──────────────────────────────
sdlRouter.get("/summary", (c) => {
  const sdl = loadSDL();
  const summary = summarizeSDL(sdl);
  return c.json({ success: true, data: summary });
});

// ─── GET /api/v1/sdl/endpoints ─ All endpoints flattened ─────────────────────
sdlRouter.get("/endpoints", (c) => {
  const sdl = loadSDL();
  const endpoints = extractEndpoints(sdl);

  // Optional query filters
  const method = c.req.query("method")?.toUpperCase();
  const serviceId = c.req.query("service");
  const auth = c.req.query("auth");

  const filtered = endpoints.filter((ep) => {
    if (method && ep.method !== method) return false;
    if (serviceId && ep.serviceId !== serviceId) return false;
    if (auth && ep.auth !== auth) return false;
    return true;
  });

  return c.json({
    success: true,
    data: {
      total: filtered.length,
      endpoints: filtered,
    },
  });
});

// ─── GET /api/v1/sdl/services ─ All services ─────────────────────────────────
sdlRouter.get("/services", (c) => {
  const sdl = loadSDL();
  const services = sdl.services ?? {};

  return c.json({
    success: true,
    data: {
      total: Object.keys(services).length,
      services: Object.entries(services).map(([id, svc]) => ({
        id,
        name: svc.displayName ?? id,
        type: svc.type,
        owned: svc.owned,
        team: svc.team,
        endpointCount: Object.keys(svc.endpoints ?? {}).length,
        environments: Object.keys(svc.environments ?? {}),
      })),
    },
  });
});

// ─── GET /api/v1/sdl/services/:serviceId ─ Single service ────────────────────
sdlRouter.get("/services/:serviceId", (c) => {
  const { serviceId } = c.req.param();
  const sdl = loadSDL();
  const service = sdl.services?.[serviceId];

  if (!service) {
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Service "${serviceId}" not found in SDL`,
          available: Object.keys(sdl.services ?? {}),
        },
      },
      404,
    );
  }

  return c.json({ success: true, data: { id: serviceId, ...service } });
});

// ─── GET /api/v1/sdl/types ─ All shared types ────────────────────────────────
sdlRouter.get("/types", (c) => {
  const sdl = loadSDL();
  return c.json({
    success: true,
    data: {
      total: Object.keys(sdl.types ?? {}).length,
      types: sdl.types ?? {},
    },
  });
});

// ─── POST /api/v1/sdl/validate ─ Validate a raw SDL payload  ─────────────────
sdlRouter.post("/validate", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(
      {
        success: false,
        error: { code: "INVALID_BODY", message: "Request body must be valid JSON" },
      },
      400,
    );
  }

  try {
    parseSDL(body);
    return c.json({ success: true, data: { valid: true } });
  } catch (err) {
    return c.json(
      {
        success: false,
        data: { valid: false },
        error: {
          code: "VALIDATION_FAILED",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      422,
    );
  }
});

// ─── POST /api/v1/sdl/reload ─ Bust the SDL cache ────────────────────────────
sdlRouter.post("/reload", (c) => {
  const sdl = reloadSDL();
  const summary = summarizeSDL(sdl);
  return c.json({
    success: true,
    data: { message: "SDL reloaded from disk", summary },
  });
});
