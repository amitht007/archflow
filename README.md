# ArchFlow

> AI-driven microservice scaffolding platform powered by a Service Definition Language (SDL).

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/runtime-Bun-fbf0df?logo=bun)](https://bun.sh)
[![Hono](https://img.shields.io/badge/api-Hono-E36002)](https://hono.dev)
[![Vite](https://img.shields.io/badge/web-Vite+React-646CFF?logo=vite)](https://vitejs.dev)

---

## Monorepo Structure

```
arch_flow/
├── apps/
│   ├── web/          — Vite + React + TypeScript (port 5173)
│   └── api/          — Bun + Hono REST API      (port 3001)
├── packages/
│   ├── types/        — Shared TypeScript interfaces
│   └── sdl/          — SDL parser & shared logic
├── docker-compose.yml
├── tsconfig.base.json
└── package.json
```

## Prerequisites

| Tool   | Version  |
|--------|----------|
| [Bun](https://bun.sh)    | ≥ 1.1  |
| [Docker](https://docker.com) | ≥ 24 |

---

## Quick Start

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your secrets
```

### 3. Start infrastructure

```bash
bun run docker:up
```

### 4. Run everything in dev mode

```bash
bun run dev
```

Or run services individually:

```bash
bun run dev:web   # http://localhost:5173
bun run dev:api   # http://localhost:3001
```

---

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Run all apps concurrently in watch mode |
| `bun run dev:web` | Run only the web app |
| `bun run dev:api` | Run only the API server |
| `bun run build` | Build all packages |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |
| `bun run docker:up` | Start PostgreSQL + Redis |
| `bun run docker:down` | Stop all Docker services |
| `bun run docker:logs` | Tail Docker compose logs |

---

## Infrastructure (Docker)

| Service    | Host Port | Notes |
|------------|-----------|-------|
| PostgreSQL | `5432`    | DB: `archflow` |
| Redis      | `6379`    | Auth required |
| pgAdmin    | `5050`    | `--profile tools` only |

Start pgAdmin:
```bash
docker compose --profile tools up -d
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check |
| `GET`  | `/api/v1/sdl/endpoints` | List all SDL endpoints |
| `POST` | `/api/v1/sdl/validate` | Validate a raw SDL payload |

---

## TypeScript

All packages use **strict mode** via `tsconfig.base.json`:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`

---

## Packages

### `@archflow/types`
Shared TypeScript interfaces — `SDLRoot`, `ServiceDefinition`, `EndpointDefinition`, `ApiResponse`, `User`, etc.

### `@archflow/sdl`
SDL parser (`parseSDL`, `validateSDL`, `resolveService`), shared response helpers (`ok`, `fail`).

---

## Roadmap

- [ ] SDL-to-Hono route code generator
- [ ] SDL-to-Drizzle schema generator
- [ ] Web SDL editor with live validation
- [ ] Auth middleware (JWT)
- [ ] Drizzle ORM integration with migrations
