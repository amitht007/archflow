// ─── SDL Core Types ─────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ScalarType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "object"
  | "array";

// ─── JSON Schema Subset ──────────────────────────────────────────────────────

export interface JsonSchemaProperty {
  type: ScalarType;
  format?: string;
  description?: string;
  enum?: (string | number | boolean)[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  nullable?: boolean;
  default?: unknown;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
}

// ─── Endpoint Definition ─────────────────────────────────────────────────────

export interface EndpointDefinition {
  method: HttpMethod;
  path: string;
  description?: string;
  tags?: string[];
  auth?: boolean;
  request?: {
    params?: JsonSchema;
    query?: JsonSchema;
    body?: JsonSchema;
  };
  response?: {
    success?: JsonSchema;
    error?: Record<string, JsonSchema>;
  };
}

// ─── Entity / Model ──────────────────────────────────────────────────────────

export interface EntityField {
  type: ScalarType;
  format?: string;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: unknown;
  references?: {
    entity: string;
    field: string;
  };
}

export interface EntityDefinition {
  description?: string;
  tableName: string;
  fields: Record<string, EntityField>;
}

// ─── Task / Flow ──────────────────────────────────────────────────────────────

export interface TaskDefinition {
  description?: string;
  endpoint?: string;
  steps?: string[];
}

export interface FlowDefinition {
  description?: string;
  tasks: string[];
  trigger?: "manual" | "cron" | "event";
  cronExpression?: string;
}

// ─── Service Definition ───────────────────────────────────────────────────────

export interface ServiceDefinition {
  name: string;
  version: string;
  description?: string;
  basePath: string;
  endpoints: Record<string, EndpointDefinition>;
  entities?: Record<string, EntityDefinition>;
  tasks?: Record<string, TaskDefinition>;
  flows?: Record<string, FlowDefinition>;
}

// ─── Root SDL ────────────────────────────────────────────────────────────────

export interface SDLRoot {
  version: string;
  project: string;
  description?: string;
  services: Record<string, ServiceDefinition>;
  sharedTypes?: Record<string, JsonSchema>;
}

// ─── API Conventions ─────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export type UserRole = "admin" | "developer" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ─── Yjs Collaboration Types ──────────────────────────────────────────────────
// We define a minimal YMap<T> shim here instead of importing from 'yjs'.
// This keeps @archflow/types free of a runtime Yjs dependency, which would
// cause a duplicate-instance warning when the API loads this package alongside
// y-websocket (which bundles its own CJS copy of Yjs).

export interface YMap<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  forEach(callback: (value: T, key: string) => void): void;
  toJSON(): Record<string, T>;
  readonly size: number;
}

export interface YjsStore {
  services: YMap<ServiceDefinition>;
  contracts: YMap<any>;
  types: YMap<JsonSchema>;
  canvasPositions: YMap<{ x: number; y: number; zoom: number }>;
}
