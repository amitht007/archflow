import type { Context } from "hono";
import type { ApiResponse } from "@archflow/types";

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function ok<T>(c: Context, data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return c.json(body, status as Parameters<typeof c.json>[1]);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const body: ApiResponse = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return c.json(body, status as Parameters<typeof c.json>[1]);
}

// ─── SDL Parser (pure utilities, no Yjs dependency) ───────────────────────────
export { parseSDL, validateSDL, resolveService, listAllEndpoints } from "./sdl/parser";
export type { ParsedSDL, ServiceResolved } from "./sdl/parser";

// ─── SDLParser (Yjs-aware, web/canvas only) ─────────────────────────────────
// NOTE: SDLParser is intentionally NOT exported from this main barrel because
// it imports 'yjs' ESM. Importing it in the API would create a duplicate Yjs
// instance alongside y-websocket's CJS-bundled Yjs.
// Web components should import it directly:
//   import { SDLParser } from '@archflow/sdl/SDLParser'
// Or via the full path:
//   import { SDLParser } from '../../packages/sdl/src/SDLParser'
