import type { SDLRoot, ServiceDefinition } from "@archflow/types";

// ─── Parsed Types ─────────────────────────────────────────────────────────────

export interface ParsedSDL extends SDLRoot {
  _parsed: true;
}

export interface ServiceResolved extends ServiceDefinition {
  _serviceName: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseSDL(raw: unknown): ParsedSDL {
  validateSDL(raw);
  return { ...(raw as SDLRoot), _parsed: true };
}

export function validateSDL(raw: unknown): asserts raw is SDLRoot {
  if (!raw || typeof raw !== "object") {
    throw new Error("SDL must be a non-null object");
  }

  const sdl = raw as Record<string, unknown>;

  if (typeof sdl["version"] !== "string")
    throw new Error('SDL missing required field: "version"');

  if (typeof sdl["project"] !== "string")
    throw new Error('SDL missing required field: "project"');

  if (!sdl["services"] || typeof sdl["services"] !== "object")
    throw new Error('SDL missing required field: "services"');
}

export function resolveService(
  sdl: ParsedSDL,
  serviceName: string,
): ServiceResolved {
  const service = sdl.services[serviceName];
  if (!service) {
    throw new Error(
      `Service "${serviceName}" not found in SDL. Available: ${Object.keys(sdl.services).join(", ")}`,
    );
  }
  return { ...service, _serviceName: serviceName };
}

// ─── Utility: List all endpoints across all services ─────────────────────────

export function listAllEndpoints(
  sdl: ParsedSDL,
): Array<{ service: string; name: string; method: string; path: string }> {
  const results: Array<{
    service: string;
    name: string;
    method: string;
    path: string;
  }> = [];

  for (const [serviceName, service] of Object.entries(sdl.services)) {
    for (const [endpointName, endpoint] of Object.entries(service.endpoints)) {
      results.push({
        service: serviceName,
        name: endpointName,
        method: endpoint.method,
        path: `${service.basePath}${endpoint.path}`,
      });
    }
  }

  return results;
}
