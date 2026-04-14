# gfw-mcp-js

Access [Global Fishing Watch](https://globalfishingwatch.org) data from any MCP-compatible AI assistant or directly from the terminal. Search vessels, retrieve fishing and port-visit events, look up Marine Protected Areas, Exclusive Economic Zones and RFMOs, calculate fishing activity hours within any region, and compute aggregate event statistics.

This package can be used in two modes:

- **MCP server** — connect any MCP-compatible AI assistant (Claude, Cursor, Windsurf, VS Code…) to GFW data
- **CLI** — query GFW data directly from the terminal

## Requirements

- Node.js 18+
- A [GFW API key](https://globalfishingwatch.org/our-apis/) — if not yet available, request one at https://globalfishingwatch.org/our-apis/tokens

---

## MCP Server

### Quick start (no install)

```bash
npx gfw-mcp-js mcp
```

Set your API key via the `GFW_TOKEN` environment variable (or `API_KEY` for compatibility).

### Client configuration

#### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "gfw-mcp-js", "mcp"],
      "env": {
        "GFW_TOKEN": "your_gfw_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add gfw -- npx -y gfw-mcp-js mcp
export GFW_TOKEN=your_gfw_api_key_here
```

#### Cursor

`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "gfw-mcp-js", "mcp"],
      "env": { "GFW_TOKEN": "your_gfw_api_key_here" }
    }
  }
}
```

#### Windsurf

`~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "gfw-mcp-js", "mcp"],
      "env": { "GFW_TOKEN": "your_gfw_api_key_here" }
    }
  }
}
```

#### VS Code (Copilot)

`.vscode/mcp.json`

```json
{
  "servers": {
    "gfw": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "gfw-mcp-js", "mcp"],
      "env": { "GFW_TOKEN": "your_gfw_api_key_here" }
    }
  }
}
```

#### OpenClaw

`~/.openclaw/openclaw.json`

```json
{
  "tools": {
    "mcp": {
      "servers": {
        "gfw": {
          "command": "npx",
          "args": ["-y", "gfw-mcp-js", "mcp"],
          "env": { "GFW_TOKEN": "your_gfw_api_key_here" }
        }
      }
    }
  }
}
```

#### Gemini CLI

`~/.gemini/settings.json` (global) or `.gemini/settings.json` (per project)

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "gfw-mcp-js", "mcp"],
      "env": { "GFW_TOKEN": "your_gfw_api_key_here" }
    }
  }
}
```

### Alternative: local clone

```bash
git clone https://github.com/globalfishingwatch/gfw-mcp
cd gfw-mcp
npm install && npm run build
```

Then replace `npx -y gfw-mcp-js` with `node /absolute/path/to/gfw-mcp/dist/bin.js` in any config above.

### Available MCP tools

| Tool | Description |
|------|-------------|
| `vessel-search` | Search vessels by name, MMSI, IMO, callsign, flag, or gear type |
| `vessel-by-id` | Fetch full vessel profile(s) by GFW vessel ID(s); returns metadata and a map URL |
| `vessel-events` | Retrieve fishing, encounter, port visit, or loitering events; filter by vessel, region, date, confidence, and encounter type |
| `events-stats` | Compute aggregate statistics (total events, unique vessels, flag breakdown) over a date range, optionally filtered by region and grouped by flag or gear type |
| `region-id-lookup` | Resolve MPA, EEZ, or RFMO names to canonical region IDs |
| `region-geometry` | Get the URL to fetch the GeoJSON geometry of a specific MPA, EEZ, or RFMO |
| `vessel-report` | Calculate fishing or presence hours in a region (MPA, EEZ, RFMO) with optional flag, gear type, vessel type, and speed filters; supports groupBy flag/geartype |

---

## CLI

### Install

```bash
# Run without installing
npx gfw-mcp-js --help

# Or install globally
npm install -g gfw-mcp-js
gfw-mcp-js --help
```

### Authentication

Token resolution order:

1. `GFW_TOKEN` environment variable
2. `API_KEY` environment variable (compatibility alias)
3. `~/.gfw/config.json` (saved via `auth login`)

```bash
# Save token interactively (stored in ~/.gfw/config.json)
npx gfw-mcp-js auth login

# Check which token source is active
npx gfw-mcp-js auth status

# Remove stored token
npx gfw-mcp-js auth logout
```

Or pass the token inline for a single command:

```bash
GFW_TOKEN=your_key npx gfw-mcp-js vessel-search --name "Maria"
```

### Commands

#### `vessel-search`

Search vessels by name, MMSI, IMO, callsign, flag, or activity date range.

```bash
npx gfw-mcp-js vessel-search [--name <name>] [--mmsi <mmsi>] [--imo <imo>]
  [--callsign <cs>] [--flag <ISO3>] [--active-from <YYYY-MM-DD>]
  [--active-to <YYYY-MM-DD>] [--limit <n>]
```

At least one filter must be provided.

| Parameter | Format / values |
|-----------|----------------|
| `--mmsi` | 9-digit string |
| `--imo` | 7-digit string |
| `--flag` | ISO 3166-1 alpha-3 code (e.g. `ESP`, `CHN`, `USA`) |
| `--active-from` / `--active-to` | `YYYY-MM-DD` |
| `--limit` | 1–50 (default 10) |

```bash
npx gfw-mcp-js vessel-search --name "Maria" --flag CHN
npx gfw-mcp-js vessel-search --mmsi 123456789
npx gfw-mcp-js vessel-search --flag ESP --active-from 2024-01-01 --active-to 2024-12-31 --limit 20
```

#### `vessel-by-id`

Fetch full vessel profile(s) by GFW vessel ID.

```bash
npx gfw-mcp-js vessel-by-id --ids <id> [<id2> ...]
```

```bash
npx gfw-mcp-js vessel-by-id --ids abc123
npx gfw-mcp-js vessel-by-id --ids abc123 def456 ghi789
```

#### `vessel-events`

Retrieve fishing, encounter, port visit, or loitering events.

```bash
npx gfw-mcp-js vessel-events --event-type <type>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--vessel-id <id>] [--limit <n>] [--offset <n>]
  [--confidence <2|3|4> ...]          # port_visit only
  [--encounter-types <type> ...]      # encounter only
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
```

| Parameter | Format / values |
|-----------|----------------|
| `--event-type` | `fishing` \| `encounter` \| `port_visit` \| `loitering` |
| `--start-date` / `--end-date` | `YYYY-MM-DD` |
| `--limit` | 1–100 (default 20) |
| `--confidence` | `2`, `3`, `4` (one or more; port_visit only; default `4`) |
| `--encounter-types` | `CARRIER-FISHING` \| `CARRIER-BUNKER` \| `FISHING-BUNKER` \| `FISHING-FISHING` \| `SUPPORT-FISHING` (encounter only; default `CARRIER-FISHING SUPPORT-FISHING`) |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |

```bash
npx gfw-mcp-js vessel-events --event-type fishing --start-date 2024-01-01 --end-date 2024-06-01
npx gfw-mcp-js vessel-events --event-type port_visit --vessel-id abc123 --start-date 2024-01-01 --end-date 2024-12-31
npx gfw-mcp-js vessel-events --event-type encounter --start-date 2024-01-01 --end-date 2024-12-31 --encounter-types CARRIER-FISHING SUPPORT-FISHING
npx gfw-mcp-js vessel-events --event-type fishing --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-06-01
```

#### `events-stats`

Compute aggregate event statistics over a date range.

```bash
npx gfw-mcp-js events-stats --event-type <type>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--group-by <FLAG|GEARTYPE>]
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
  [--confidence <levels> ...] [--encounter-types <types> ...]
```

| Parameter | Format / values |
|-----------|----------------|
| `--event-type` | `fishing` \| `encounter` \| `port_visit` \| `loitering` |
| `--start-date` / `--end-date` | `YYYY-MM-DD` |
| `--group-by` | `FLAG` \| `GEARTYPE` (default `FLAG`) |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |
| `--confidence` | `2`, `3`, `4` (one or more; port_visit only; default `4`) |
| `--encounter-types` | `CARRIER-FISHING` \| `CARRIER-BUNKER` \| `FISHING-BUNKER` \| `FISHING-FISHING` \| `SUPPORT-FISHING` (encounter only; default `CARRIER-FISHING SUPPORT-FISHING`) |

```bash
npx gfw-mcp-js events-stats --event-type fishing --start-date 2024-01-01 --end-date 2024-12-31
npx gfw-mcp-js events-stats --event-type fishing --start-date 2024-01-01 --end-date 2024-12-31 --group-by GEARTYPE
npx gfw-mcp-js events-stats --event-type encounter --start-date 2024-01-01 --end-date 2024-12-31 --region-type RFMO --region-id WCPFC
```

#### `region-id-lookup`

Resolve an MPA, EEZ, or RFMO name to its canonical ID.

```bash
npx gfw-mcp-js region-id-lookup --region-type <MPA|EEZ|RFMO> --query <name> [--limit <n>]
```

Use this before `vessel-report` or `vessel-events` when you only know the human-readable name of a region.

| Parameter | Format / values |
|-----------|----------------|
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |
| `--limit` | 1–20 (default 5) |

```bash
npx gfw-mcp-js region-id-lookup --region-type MPA --query "Galapagos"
npx gfw-mcp-js region-id-lookup --region-type EEZ --query "Patagonia" --limit 10
npx gfw-mcp-js region-id-lookup --region-type RFMO --query "WCPFC"
```

#### `region-geometry`

Get the GeoJSON URL for a specific region (no API token required).

```bash
npx gfw-mcp-js region-geometry --region-type <MPA|EEZ|RFMO> --id <id>
```

| Parameter | Format / values |
|-----------|----------------|
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |

```bash
npx gfw-mcp-js region-geometry --region-type EEZ --id 8386
npx gfw-mcp-js region-geometry --region-type MPA --id 12345
```

#### `vessel-report`

Calculate fishing or presence hours inside a region. Date range must not exceed 1 year.

> **Important:** This command must never be run in parallel. If multiple reports are needed, run them sequentially — one at a time, waiting for each to complete before starting the next.

```bash
npx gfw-mcp-js vessel-report --region-type <MPA|EEZ|RFMO> --region-id <id>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--type <FISHING|PRESENCE>]
  [--flags <ISO3> ...]
  [--geartypes <type> ...]    # FISHING only
  [--vessel-types <type> ...] # PRESENCE only
  [--speeds <range> ...]      # PRESENCE only
  [--group-by <VESSEL_ID|FLAG|GEARTYPE|FLAGANDGEARTYPE>]
```

| Parameter | Format / values |
|-----------|----------------|
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |
| `--start-date` / `--end-date` | `YYYY-MM-DD` (max range: 1 year) |
| `--type` | `FISHING` (default) \| `PRESENCE` |
| `--flags` | ISO 3166-1 alpha-3 codes (e.g. `ESP`, `CHN`); up to 10 |
| `--geartypes` | `tuna_purse_seines` \| `driftnets` \| `trollers` \| `set_longlines` \| `purse_seines` \| `pots_and_traps` \| `other_fishing` \| `dredge_fishing` \| `set_gillnets` \| `fixed_gear` \| `trawlers` \| `fishing` \| `seiners` \| `other_purse_seines` \| `other_seines` \| `squid_jigger` \| `pole_and_line` \| `drifting_longlines` (FISHING only) |
| `--vessel-types` | `carrier` \| `seismic_vessel` \| `passenger` \| `other` \| `support` \| `bunker` \| `gear` \| `cargo` \| `fishing` \| `discrepancy` (PRESENCE only) |
| `--speeds` | `2-4` \| `4-6` \| `6-10` \| `10-15` \| `15-25` \| `>25` (PRESENCE only) |
| `--group-by` | `VESSEL_ID` (default) \| `FLAG` \| `GEARTYPE` \| `FLAGANDGEARTYPE` (`GEARTYPE`/`FLAGANDGEARTYPE` only valid with `--type FISHING`) |

```bash
npx gfw-mcp-js vessel-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31
npx gfw-mcp-js vessel-report --region-type MPA --region-id 12345 --start-date 2024-01-01 --end-date 2024-12-31 --flags CHN ESP
npx gfw-mcp-js vessel-report --region-type RFMO --region-id WCPFC --start-date 2024-01-01 --end-date 2024-12-31 --type FISHING --group-by FLAG
npx gfw-mcp-js vessel-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type PRESENCE --vessel-types fishing cargo
```

### Output

All commands output JSON to stdout, ready to pipe to `jq`:

```bash
npx gfw-mcp-js vessel-search --name "Maria" | jq '.results[].name'
npx gfw-mcp-js vessel-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 | jq '.fishingHours'
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GFW_TOKEN` | — | GFW API bearer token |
| `API_KEY` | — | Alias for `GFW_TOKEN` (backwards compatibility) |
| `PORT` | `4000` | HTTP port (only used with the optional HTTP transport) |
| `NODE_ENV` | `development` | Environment name sent to Sentry |

---

## Project structure

```
bin.ts              # Dispatcher: routes to MCP server or CLI
index.ts            # MCP server entry point (stdio transport)
mcp-server.ts       # McpServer creation and tool registration
cli/
  index.ts          # CLI entry point (commander)
  auth.ts           # Token resolution and auth commands
middleware/
  auth.ts           # Bearer / X-API-Key authentication middleware
tools/              # One file per tool; each exports register() + a pure handler
lib/
  api.ts            # gfwFetch() — GFW API client
  response.ts       # createToolResponse() / createErrorResponse()
  types.ts          # Shared TypeScript types and dataset constants
```
