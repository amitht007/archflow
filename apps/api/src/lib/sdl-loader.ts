import { readFileSync } from "fs";
import { join } from "path";

// ─── Types matching the actual sdl.json schema ────────────────────────────────

export interface SDLEndpoint {
  path: string;
  method: string;
  protocol?: string;
  auth?: string;
  request?: unknown;
  responses?: Record<string, unknown>;
  description?: string;
}

export interface SDLService {
  displayName?: string;
  type?: string;
  owned?: boolean;
  team?: string;
  stack?: Record<string, string>;
  repo?: string;
  environments?: Record<string, { baseUrl: string }>;
  endpoints?: Record<string, SDLEndpoint>;
  routes?: unknown[];
  middleware?: string[];
  env?: string[];
}

export interface RawSDL {
  types?: Record<string, unknown>;
  services?: Record<string, SDLService>;
  datastores?: Record<string, unknown>;
  contracts?: Record<string, unknown>;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

const SDL_PATH = join(import.meta.dir, "../../../../sdl.json");

let _cached: RawSDL | null = null;

export function loadSDL(): RawSDL {
  if (_cached) return _cached;

  try {
    const raw = readFileSync(SDL_PATH, "utf-8");
    _cached = JSON.parse(raw) as RawSDL;
    console.log(`[SDL] Loaded from ${SDL_PATH}`);
    return _cached;
  } catch (err) {
    console.error(`[SDL] Failed to load sdl.json: ${err}`);
    return { types: {}, services: {}, datastores: {}, contracts: {} };
  }
}

/** Force a cache bust (useful when sdl.json changes on disk) */
export function reloadSDL(): RawSDL {
  _cached = null;
  return loadSDL();
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

export interface FlatEndpoint {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  endpointId: string;
  method: string;
  path: string;
  auth: string;
  protocol: string;
}

export function extractEndpoints(sdl: RawSDL): FlatEndpoint[] {
  const results: FlatEndpoint[] = [];
  const services = sdl.services ?? {};

  for (const [serviceId, service] of Object.entries(services)) {
    const endpoints = service.endpoints ?? {};
    for (const [endpointId, endpoint] of Object.entries(endpoints)) {
      results.push({
        serviceId,
        serviceName: service.displayName ?? serviceId,
        serviceType: service.type ?? "unknown",
        endpointId,
        method: endpoint.method,
        path: endpoint.path,
        auth: endpoint.auth ?? "none",
        protocol: endpoint.protocol ?? "REST",
      });
    }
  }

  return results;
}

export interface SDLSummary {
  serviceCount: number;
  ownedServiceCount: number;
  endpointCount: number;
  typeCount: number;
  datastoreCount: number;
  contractCount: number;
  services: Array<{
    id: string;
    name: string;
    type: string;
    owned: boolean;
    endpointCount: number;
    team?: string;
  }>;
}

export function summarizeSDL(sdl: RawSDL): SDLSummary {
  const services = sdl.services ?? {};
  let endpointCount = 0;

  const serviceList = Object.entries(services).map(([id, svc]) => {
    const epCount = Object.keys(svc.endpoints ?? {}).length;
    endpointCount += epCount;
    return {
      id,
      name: svc.displayName ?? id,
      type: svc.type ?? "unknown",
      owned: svc.owned ?? false,
      endpointCount: epCount,
      team: svc.team,
    };
  });

  return {
    serviceCount: serviceList.length,
    ownedServiceCount: serviceList.filter((s) => s.owned).length,
    endpointCount,
    typeCount: Object.keys(sdl.types ?? {}).length,
    datastoreCount: Object.keys(sdl.datastores ?? {}).length,
    contractCount: Object.keys(sdl.contracts ?? {}).length,
    services: serviceList,
  };
}
