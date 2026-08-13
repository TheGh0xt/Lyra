# Lyra

Web client for the **Prediction Market Intelligence Engine (PMIE)** — a system that explains *why* prices move on Polymarket prediction markets, rather than just showing that they moved.

Lyra is presentation only. It holds no agentic, signal, or memory code and talks solely to the Cygnus HTTP API.

## Architecture

```
Browser  →  Lyra (/api routes)  →  Cygnus /v1  →  Sagittarius MCP  →  Polymarket
```

The browser never reaches Cygnus, Gemini, MCP, or Sagittarius directly. Every request goes through this app's route handlers, which keeps the API address — and any auth header — out of the client bundle.

| Repo | Role |
|---|---|
| [Sagittarius](https://github.com/TheGh0xt/Sagittarius) | Go MCP server over Polymarket data + deterministic signal engine |
| [Cygnus](https://github.com/TheGh0xt/Cygnus) | Python/ADK reasoning agent, memory layer, evaluation engine, `/v1` API |
| **Lyra** | This repo — the web client |

## Getting started

```bash
npm install
cp .env.example .env.local     # point CYGNUS_API_URL at a running Cygnus
npm run dev
```

Cygnus must be running, and Sagittarius must be running before Cygnus. Without a reachable API, the UI renders but every analysis fails with a "service unreachable" error.

## The API contract

`lib/api/schema.d.ts` is **generated** from `openapi.json` — never hand-edit either.

```bash
npm run generate:api
```

`openapi.json` is a snapshot of the contract Cygnus publishes. CI fails if the checked-in types have drifted from it, so a contract change breaks the build loudly instead of failing silently at runtime.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (also runs TypeScript) |
| `npm test` | Unit tests (vitest) |
| `npm run lint` | ESLint |
| `npm run generate:api` | Regenerate API types from `openapi.json` |

## Streaming

A full analysis runs four sequential stages and can take a couple of minutes, so progress arrives over Server-Sent Events rather than a single blocking response. `app/api/analyses/[id]/events` pipes the upstream body through untouched — buffering there would reduce a live progress view back to a spinner.

The SSE frame parser handles the case where a network read ends mid-frame; that partial-chunk path is covered by tests, because it is where naive SSE readers drop events.

## Conventions

- `main` is protected. All changes go through PRs, and CI must be green.
- Errors are rendered from the RFC 9457 `type` slug, never the server's prose — a reworded `detail` must not change what users are told.
- Every view carries the research-only disclaimer. This is not financial, investment, betting, or trading advice, and it never places trades.
