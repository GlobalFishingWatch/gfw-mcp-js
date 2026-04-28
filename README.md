# @globalfishingwatch/gfw-cli

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
GFW_TOKEN=your_gfw_api_key_here npx @globalfishingwatch/gfw-cli mcp
```

`mcp` is a subcommand of the CLI that starts the MCP stdio server.

### Authentication

The MCP server resolves the API token in this order:

1. `GFW_TOKEN` environment variable (compatibility alias)
2. `API_KEY` environment variable
3. `~/.gfw/config.json` (saved via `gfw auth login`)

If you have already run `gfw auth login` from the CLI, the MCP server will pick up the stored token automatically — no need to set environment variables in your client config.

### Client configuration

#### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
      "env": {
        "GFW_TOKEN": "your_gfw_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add gfw -- npx -y @globalfishingwatch/gfw-cli mcp
export GFW_TOKEN=your_gfw_api_key_here
```

#### Cursor

`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "gfw": {
      "command": "npx",
      "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
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
      "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
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
      "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
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
          "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
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
      "args": ["-y", "@globalfishingwatch/gfw-cli", "mcp"],
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

Then replace `npx -y @globalfishingwatch/gfw-cli` with `node /absolute/path/to/gfw-mcp/dist/bin.js` in any config above.

### Available MCP tools

| Tool               | Description                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vessel-search`    | Search vessels by name, MMSI, IMO, callsign, flag, or gear type                                                                                                |
| `vessel-by-id`     | Fetch full vessel profile(s) by GFW vessel ID(s); returns metadata and a map URL                                                                               |
| `vessel-events`    | Retrieve fishing, encounter, port visit, or loitering events; filter by vessel, region, date, confidence, and encounter type                                   |
| `events-stats`     | Compute aggregate statistics (total events, unique vessels, flag breakdown) over a date range, optionally filtered by region and grouped by flag or gear type; returns a GFW map URL (except for fishing events) |
| `region-id-lookup` | Resolve MPA, EEZ, or RFMO names to canonical region IDs                                                                                                        |
| `region-geometry`  | Get the URL to fetch the GeoJSON geometry of a specific MPA, EEZ, or RFMO                                                                                      |
| `area-report`      | Calculate fishing, SAR, Sentinel-2, or AIS presence hours in a region (MPA, EEZ, RFMO) with optional flag, gear type, vessel type, and speed filters; supports groupBy flag/geartype |
| `vessel-insights`  | Retrieve fishing activity, AIS gap, coverage, and IUU vessel list insights for one or more vessels over a date range; returns a GFW map URL per vessel |

---

## CLI

### Install

```bash
# Run without installing
npx @globalfishingwatch/gfw-cli --help

# Or install globally
npm install -g @globalfishingwatch/gfw-cli
gfw-mcp --help
```

### Authentication

Token resolution order:

1. `GFW_TOKEN` environment variable
2. `API_KEY` environment variable (compatibility alias)
3. `~/.gfw/config.json` (saved via `auth login`)

```bash
# Save token interactively (stored in ~/.gfw/config.json)
npx @globalfishingwatch/gfw-cli auth login

# Check which token source is active
npx @globalfishingwatch/gfw-cli auth status

# Remove stored token
npx @globalfishingwatch/gfw-cli auth logout
```

Or pass the token inline for a single command:

```bash
GFW_TOKEN=your_key npx @globalfishingwatch/gfw-cli vessel-search --name "Maria"
```

### Commands

#### `vessel-search`

Search vessels by name, MMSI, IMO, callsign, flag, or activity date range.

```bash
npx @globalfishingwatch/gfw-cli vessel-search [--name <name>] [--mmsi <mmsi>] [--imo <imo>]
  [--callsign <cs>] [--flag <ISO3>] [--active-from <YYYY-MM-DD>]
  [--active-to <YYYY-MM-DD>] [--limit <n>]
```

At least one filter must be provided.

| Parameter                       | Format / values                                    |
| ------------------------------- | -------------------------------------------------- |
| `--mmsi`                        | 9-digit string                                     |
| `--imo`                         | 7-digit string                                     |
| `--flag`                        | ISO 3166-1 alpha-3 code (e.g. `ESP`, `CHN`, `USA`) |
| `--active-from` / `--active-to` | `YYYY-MM-DD`                                       |
| `--limit`                       | 1–50 (default 10)                                  |

```bash
npx @globalfishingwatch/gfw-cli vessel-search --name "Maria" --flag CHN
npx @globalfishingwatch/gfw-cli vessel-search --mmsi 123456789
npx @globalfishingwatch/gfw-cli vessel-search --flag ESP --active-from 2024-01-01 --active-to 2024-12-31 --limit 20
```

#### `vessel-by-id`

Fetch full vessel profile(s) by GFW vessel ID.

```bash
npx @globalfishingwatch/gfw-cli vessel-by-id --ids <id> [<id2> ...]
```

```bash
npx @globalfishingwatch/gfw-cli vessel-by-id --ids abc123
npx @globalfishingwatch/gfw-cli vessel-by-id --ids abc123 def456 ghi789
```

#### `vessel-events`

Retrieve fishing, encounter, port visit, or loitering events.

```bash
npx @globalfishingwatch/gfw-cli vessel-events --event-type <type>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--vessel-id <id>] [--limit <n>] [--offset <n>]
  [--confidence <2|3|4> ...]          # port_visit only
  [--encounter-types <type> ...]      # encounter only
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
```

| Parameter                     | Format / values                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--event-type`                | `fishing` \| `encounter` \| `port_visit` \| `loitering`                                                                                                         |
| `--start-date` / `--end-date` | `YYYY-MM-DD`                                                                                                                                                    |
| `--limit`                     | 1–100 (default 20)                                                                                                                                              |
| `--confidence`                | `2`, `3`, `4` (one or more; port_visit only; default `4`)                                                                                                       |
| `--encounter-types`           | `CARRIER-FISHING` \| `CARRIER-BUNKER` \| `FISHING-BUNKER` \| `FISHING-FISHING` \| `SUPPORT-FISHING` (encounter only; default `CARRIER-FISHING SUPPORT-FISHING`) |
| `--region-type`               | `MPA` \| `EEZ` \| `RFMO`                                                                                                                                        |

```bash
npx @globalfishingwatch/gfw-cli vessel-events --event-type fishing --start-date 2024-01-01 --end-date 2024-06-01
npx @globalfishingwatch/gfw-cli vessel-events --event-type port_visit --vessel-id abc123 --start-date 2024-01-01 --end-date 2024-12-31
npx @globalfishingwatch/gfw-cli vessel-events --event-type encounter --start-date 2024-01-01 --end-date 2024-12-31 --encounter-types CARRIER-FISHING SUPPORT-FISHING
npx @globalfishingwatch/gfw-cli vessel-events --event-type fishing --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-06-01
```

#### `events-stats`

Compute aggregate event statistics over a date range.

```bash
npx @globalfishingwatch/gfw-cli events-stats --event-type <type>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--group-by <FLAG|GEARTYPE>]
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
  [--confidence <levels> ...] [--encounter-types <types> ...]
```

| Parameter                     | Format / values                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--event-type`                | `fishing` \| `encounter` \| `port_visit` \| `loitering`                                                                                                         |
| `--start-date` / `--end-date` | `YYYY-MM-DD`                                                                                                                                                    |
| `--group-by`                  | `FLAG` \| `GEARTYPE` (default `FLAG`)                                                                                                                           |
| `--region-type`               | `MPA` \| `EEZ` \| `RFMO`                                                                                                                                        |
| `--confidence`                | `2`, `3`, `4` (one or more; port_visit only; default `4`)                                                                                                       |
| `--encounter-types`           | `CARRIER-FISHING` \| `CARRIER-BUNKER` \| `FISHING-BUNKER` \| `FISHING-FISHING` \| `SUPPORT-FISHING` (encounter only; default `CARRIER-FISHING SUPPORT-FISHING`) |

```bash
npx @globalfishingwatch/gfw-cli events-stats --event-type fishing --start-date 2024-01-01 --end-date 2024-12-31
npx @globalfishingwatch/gfw-cli events-stats --event-type fishing --start-date 2024-01-01 --end-date 2024-12-31 --group-by GEARTYPE
npx @globalfishingwatch/gfw-cli events-stats --event-type encounter --start-date 2024-01-01 --end-date 2024-12-31 --region-type RFMO --region-id WCPFC
```

**Returns:** `{ flags[], numEvents, numFlags, numVessels, groups[], mapUrl }` — `groups` contains `{ name, value }` pairs sorted descending by count. `mapUrl` links to the GFW map to visualise the queried events; it is **not present** when `--event-type` is `fishing`.

#### `region-id-lookup`

Resolve an MPA, EEZ, or RFMO name to its canonical ID.

```bash
npx @globalfishingwatch/gfw-cli region-id-lookup --region-type <MPA|EEZ|RFMO> --query <name> [--limit <n>]
```

Use this before `area-report` or `vessel-events` when you only know the human-readable name of a region.

| Parameter       | Format / values          |
| --------------- | ------------------------ |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |
| `--limit`       | 1–20 (default 5)         |

```bash
npx @globalfishingwatch/gfw-cli region-id-lookup --region-type MPA --query "Galapagos"
npx @globalfishingwatch/gfw-cli region-id-lookup --region-type EEZ --query "Patagonia" --limit 10
npx @globalfishingwatch/gfw-cli region-id-lookup --region-type RFMO --query "WCPFC"
```

#### `region-geometry`

Get the GeoJSON URL for a specific region (no API token required).

```bash
npx @globalfishingwatch/gfw-cli region-geometry --region-type <MPA|EEZ|RFMO> --id <id>
```

| Parameter       | Format / values          |
| --------------- | ------------------------ |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |

```bash
npx @globalfishingwatch/gfw-cli region-geometry --region-type EEZ --id 8386
npx @globalfishingwatch/gfw-cli region-geometry --region-type MPA --id 12345
```

#### `area-report`

Calculate fishing, SAR, Sentinel-2, or AIS presence hours inside a region. Date range must not exceed 1 year.

> **Important:** This command must never be run in parallel. If multiple reports are needed, run them sequentially — one at a time, waiting for each to complete before starting the next.

```bash
npx @globalfishingwatch/gfw-cli area-report --region-type <MPA|EEZ|RFMO> --region-id <id>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--type <FISHING|PRESENCE|SAR|SENTINEL2>]
  [--flags <ISO3> ...]
  [--geartypes <type> ...]    # FISHING/SAR/SENTINEL2 only
  [--vessel-types <type> ...] # PRESENCE only
  [--speeds <range> ...]      # PRESENCE only
  [--group-by <VESSEL_ID|FLAG|GEARTYPE|FLAGANDGEARTYPE>]
```

| Parameter                     | Format / values                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--region-type`               | `MPA` \| `EEZ` \| `RFMO`                                                                                                                                                                                                                                                                                                                         |
| `--start-date` / `--end-date` | `YYYY-MM-DD` (max range: 1 year)                                                                                                                                                                                                                                                                                                                 |
| `--type`                      | `FISHING` (default) \| `PRESENCE` \| `SAR` \| `SENTINEL2` — `FISHING`: AIS-based fishing effort hours; `PRESENCE`: AIS vessel presence hours regardless of activity; `SAR`: Synthetic Aperture Radar vessel detection hours (satellite radar, independent of AIS); `SENTINEL2`: Sentinel-2 optical satellite imagery vessel detection hours        |
| `--flags`                     | ISO 3166-1 alpha-3 codes (e.g. `ESP`, `CHN`); up to 10                                                                                                                                                                                                                                                                                           |
| `--geartypes`                 | `tuna_purse_seines` \| `driftnets` \| `trollers` \| `set_longlines` \| `purse_seines` \| `pots_and_traps` \| `other_fishing` \| `dredge_fishing` \| `set_gillnets` \| `fixed_gear` \| `trawlers` \| `fishing` \| `seiners` \| `other_purse_seines` \| `other_seines` \| `squid_jigger` \| `pole_and_line` \| `drifting_longlines` (FISHING/SAR/SENTINEL2 only) |
| `--vessel-types`              | `carrier` \| `seismic_vessel` \| `passenger` \| `other` \| `support` \| `bunker` \| `gear` \| `cargo` \| `fishing` \| `discrepancy` (PRESENCE only)                                                                                                                                                                                              |
| `--speeds`                    | `2-4` \| `4-6` \| `6-10` \| `10-15` \| `15-25` \| `>25` (PRESENCE only)                                                                                                                                                                                                                                                                          |
| `--group-by`                  | `VESSEL_ID` (default) \| `FLAG` \| `GEARTYPE` \| `FLAGANDGEARTYPE` (`GEARTYPE`/`FLAGANDGEARTYPE` only valid with `--type FISHING`, `SAR`, or `SENTINEL2`)                                                                                                                                                                                       |

```bash
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31
npx @globalfishingwatch/gfw-cli area-report --region-type MPA --region-id 12345 --start-date 2024-01-01 --end-date 2024-12-31 --flags CHN ESP
npx @globalfishingwatch/gfw-cli area-report --region-type RFMO --region-id WCPFC --start-date 2024-01-01 --end-date 2024-12-31 --type FISHING --group-by FLAG
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type PRESENCE --vessel-types fishing cargo
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type SAR
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type SENTINEL2
```

**Returns:** `{ regionType, regionId, dateRange, gfwMapUrl }` plus one activity value field:

- `fishingHours` — total fishing hours (present when `--type FISHING`)
- `presenceHours` — total vessel presence hours (present when `--type PRESENCE`)
- `detections` — total SAR or Sentinel-2 vessel detections (present when `--type SAR` or `--type SENTINEL2`)

And optionally:

- `topVessels` — top 10 vessels sorted descending by activity, each with `vesselId`, `shipName`, `mmsi`, `flag`, `geartype`, and `value` (hours for FISHING/PRESENCE; detections for SAR/SENTINEL2). Only present when `--group-by VESSEL_ID`.
- `rows` — aggregated entries sorted descending by activity value, each containing the grouping fields plus `hours`. Only present when `--group-by FLAG`, `GEARTYPE`, or `FLAGANDGEARTYPE`.
- Applied filters (`flags`, `vesselTypes`, `speeds`, `geartypes`) echoed back when provided.

#### `vessel-insights`

Retrieve insights for one or more vessels over a date range.

```bash
npx @globalfishingwatch/gfw-cli vessel-insights --vessel-ids <id> [<id2> ...]
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  --includes <FISHING|GAP|COVERAGE|VESSEL-IDENTITY-IUU-VESSEL-LIST> [...]
```

| Parameter        | Format / values                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--vessel-ids`   | One or more GFW vessel IDs                                                                                                                                                                                         |
| `--start-date`   | `YYYY-MM-DD`                                                                                                                                                                                                       |
| `--end-date`     | `YYYY-MM-DD`                                                                                                                                                                                                       |
| `--includes`     | `FISHING` \| `GAP` \| `COVERAGE` \| `VESSEL-IDENTITY-IUU-VESSEL-LIST` — one or more; `FISHING`: apparent fishing events and RFMO/MPA violations; `GAP`: AIS-off dark activity; `COVERAGE`: AIS reception %; `VESSEL-IDENTITY-IUU-VESSEL-LIST`: IUU list appearances |

**Returns:** `{ period, vesselIdsWithoutIdentity, mapUrls, apparentFishing?, gap?, coverage?, vesselIdentity? }` — only insight fields for requested types are present. `mapUrls` is an object keyed by vessel ID linking each vessel to its GFW map profile for the queried period — always show these URLs to the user in full.

```bash
npx @globalfishingwatch/gfw-cli vessel-insights --vessel-ids abc123 --start-date 2024-01-01 --end-date 2024-12-31 --includes FISHING GAP
npx @globalfishingwatch/gfw-cli vessel-insights --vessel-ids abc123 def456 --start-date 2024-01-01 --end-date 2024-12-31 --includes FISHING GAP COVERAGE VESSEL-IDENTITY-IUU-VESSEL-LIST
```

### Output

All commands output JSON to stdout, ready to pipe to `jq`:

```bash
npx @globalfishingwatch/gfw-cli vessel-search --name "Maria" | jq '.results[].name'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 | jq '.fishingHours'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type PRESENCE | jq '.presenceHours'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 --start-date 2024-01-01 --end-date 2024-12-31 --type SAR | jq '.detections'
```

---

## Environment variables

| Variable    | Default       | Description                                            |
| ----------- | ------------- | ------------------------------------------------------ |
| `GFW_TOKEN` | —             | GFW API bearer token                                   |
| `API_KEY`   | —             | Alias for `GFW_TOKEN` (backwards compatibility)        |
| `PORT`      | `4000`        | HTTP port (only used with the optional HTTP transport) |
| `NODE_ENV`  | `development` | Environment name sent to Sentry                        |

---

## Project structure

```
bin.ts              # Entry point: loads CLI (dist/bin.js registered as "mcp" binary)
index.ts            # MCP server stdio setup (used by the `mcp` CLI command)
mcp-server.ts       # McpServer creation and tool registration
cli/
  index.ts          # CLI entry point (commander); includes the `mcp` subcommand
  auth.ts           # Token resolution and auth commands
middleware/
  auth.ts           # Bearer / X-API-Key authentication middleware
tools/              # One file per tool; each exports register() + a pure handler
lib/
  api.ts            # gfwFetch() — GFW API client
  response.ts       # createToolResponse() / createErrorResponse()
  types.ts          # Shared TypeScript types and dataset constants
```
