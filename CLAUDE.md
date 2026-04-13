# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run the server (uses tsx to execute TypeScript directly)
```

No build step required — `tsx` executes `index.ts` directly.

## Environment Variables

- `PORT` — HTTP port (default: `4000`)
- `API_KEY` — Optional Bearer token for authentication; if unset, auth is disabled
- `NODE_ENV` — Environment name sent to Sentry (default: `development`)

## Architecture

MCP server for Global Fishing Watch data. Each tool lives in its own file.

**Transport:** `StreamableHTTPServerTransport` — a new transport instance is created per request at `POST /mcp`.

**Stack:** Express 5 + `@modelcontextprotocol/sdk` + Zod for schema validation.

### Structure

```
index.ts            # Entry point: Express setup + server startup
mcp-server.ts       # Creates McpServer and registers all tools
middleware/auth.ts  # Bearer/X-API-Key authentication middleware
tools/              # One file per tool; each exports register(server)
lib/response.ts     # createToolResponse() / createErrorResponse() helpers
```

### Registered Tools

| Tool | File | Purpose |
|---|---|---|
| `add` | [tools/add.ts](tools/add.ts) | Trivial addition (demo/test tool) |
| `vessel-search` | [tools/vessel-search.ts](tools/vessel-search.ts) | Search vessels by name, MMSI, IMO, flag, gear type, date range |
| `vessel-events` | [tools/vessel-events.ts](tools/vessel-events.ts) | Retrieve events (port visits, encounters, detections) for a vessel ID |
| `region-id-lookup` | [tools/region-id-lookup.ts](tools/region-id-lookup.ts) | Resolve MPA or EEZ names to canonical region IDs |
| `mpa-vessel-report` | [tools/mpa-vessel-report.ts](tools/mpa-vessel-report.ts) | Calculate fishing hours in a region; returns GFW map URL |

All tools use **mock data** — real backend integration is marked with `// TODO` comments in each tool file.

### Response helpers

All tool handlers use `createToolResponse(text, structured)` for success (`isError: false`) and `createErrorResponse(message)` for execution errors (`isError: true`), per MCP best practices.

### Authentication

[middleware/auth.ts](middleware/auth.ts) reads `API_KEY` from the environment. Accepts credentials via `Authorization: Bearer <token>` or `X-API-Key` header. If the env var is not set, all requests pass through unauthenticated.
