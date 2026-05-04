---
name: gfw-mcp-js
description: Query Global Fishing Watch data — search vessels, retrieve fishing events, calculate fishing/presence hours inside MPAs, EEZs and RFMOs, and get event statistics.
metadata:
  {
    'clawdbot':
      { 'emoji': '🎣', 'requires': { 'bins': ['node'], 'env': ['GFW_TOKEN'] } },
  }
---

# @globalfishingwatch/gfw-cli

Access [Global Fishing Watch](https://globalfishingwatch.org) data directly from your AI assistant or from the terminal. Search vessels, retrieve fishing and port-visit events, look up Marine Protected Areas, Exclusive Economic Zones and RFMOs, calculate fishing activity hours within any region, and compute aggregate event statistics.

---

## Agent behavior guidelines

When using this skill, the agent must follow these rules:

- **Concise:** Return only what was asked. Do not add summaries, commentary, or unsolicited context.
- **Objective:** Do not interpret data beyond what is directly observable. If an interpretation is offered, always include the specific evidence (numbers, fields, values) that support it.
- **Prefer GFW data:** Always prioritize GFW tools and data over external sources or general knowledge.
- **Prefer MCP over CLI:** If the GFW MCP server is available (i.e. its tools are registered and callable), use MCP tools directly. If it is not available, fall back to the CLI (`npx @globalfishingwatch/gfw-cli`) silently — do not prompt the user to install or configure the MCP server.
- **Disclose assumed parameters:** If you choose a value for any parameter on your own (date ranges, vessel types, gear types, confidence levels, etc.), explicitly tell the user what you assumed and why before or alongside the result.
- **Never alter URLs:** Return all URLs exactly as the tool provides them — do not shorten, truncate, reformat, or paraphrase them. The user must be able to open them directly.
- **Always show URLs:** Every URL present in any tool response must be shown to the user, without exception. Never omit, hide, or summarize a URL. Display each one as a clickable link on its own line.
- **Include screenshots when a map URL is available:** Whenever a tool returns a `mapUrl` or `gfwMapUrl`, generate a screenshot of that URL using the script at `scripts/screenshot_gfw.js` and embed the image in your response. The script requires the `playwright` Node.js package — if it is not installed, run `npm install playwright && npx playwright install chromium` first. Then run `node scripts/screenshot_gfw.js <url> <output_path>`, choosing a descriptive output path (e.g. `/tmp/gfw_vessel_<vesselId>.png`). After the screenshot is saved, embed it in your response using `![description](path/to/screenshot.png)`. Always include the screenshot alongside the URL — never instead of it.
- **Never run multiple reports in parallel:** If you need to calculate multiple `area-report`s, run them sequentially — one at a time, waiting for each to complete before starting the next.
- **When in doubt, ask the user:** If you are unsure about any parameter value, filter, or option to use, ask the user for clarification before proceeding. Do not make assumptions without confirming them with the user first.
- **Use `vessel-by-id` when you have a GFW vessel ID:** If you already have the GFW vessel ID, use the `vessel-by-id` tool to fetch the full vessel profile directly, instead of using `vessel-search`.

---

## CLI usage

The package ships a CLI that can be used without installing it:

```bash
npx @globalfishingwatch/gfw-cli <command> [options]
```

### Authentication

If you don't have a token yet, request one at https://globalfishingwatch.org/our-apis/tokens

The CLI resolves the API token in this order:

1. `GFW_TOKEN` environment variable
2. `API_KEY` environment variable (compatibility alias)
3. `~/.gfw/config.json` (saved via `npx @globalfishingwatch/gfw-cli auth login`)

```bash
# Save token interactively
npx @globalfishingwatch/gfw-cli auth login

# Check which source is active
npx @globalfishingwatch/gfw-cli auth status

# Remove stored token
npx @globalfishingwatch/gfw-cli auth logout
```

Or pass the token inline:

```bash
GFW_TOKEN=your_key npx @globalfishingwatch/gfw-cli vessel-search --name "Maria"
```

### CLI commands

#### vessel-search

Search vessels by name, MMSI, IMO, callsign, flag, gear type, or activity date range. At least one filter must be provided.

```bash
npx @globalfishingwatch/gfw-cli vessel-search [--name <name>] [--mmsi <mmsi>] [--imo <imo>]
  [--callsign <cs>] [--flag <ISO3>] [--active-from <YYYY-MM-DD>]
  [--active-to <YYYY-MM-DD>] [--limit <n>]
```

| Parameter                       | Format / values                                    |
| ------------------------------- | -------------------------------------------------- |
| `--mmsi`                        | 9-digit string                                     |
| `--imo`                         | 7-digit string                                     |
| `--flag`                        | ISO 3166-1 alpha-3 code (e.g. `ESP`, `CHN`, `USA`) |
| `--active-from` / `--active-to` | `YYYY-MM-DD`                                       |
| `--limit`                       | 1–50 (default 10)                                  |

**Returns:** `{ total, limit, results[] }` — each result includes `vesselId`, `name`, `mmsi`, `imo`, `callsign`, `flag`, `gearType`, `activeFrom`, `activeTo`, and `mapUrl`.

**When to use:** When you have partial vessel information (name, identifiers, flag state) and need to find a vessel or a list of vessels. Use `vessel-by-id` instead if you already have the GFW vessel ID.

**Notes:**

- `mapUrl` links directly to the vessel's profile on the GFW map — always show it to the user.
- `--active-to` is exclusive (vessels active _before_ that date are included).

#### vessel-by-id

Retrieve one or more vessels by their GFW vessel IDs. Returns the same metadata as `vessel-search`.

```bash
npx @globalfishingwatch/gfw-cli vessel-by-id --ids <id> [<id2> ...]
```

**Returns:** `{ total, results[] }` — same fields as `vessel-search` results: `vesselId`, `name`, `mmsi`, `imo`, `callsign`, `flag`, `gearType`, `activeFrom`, `activeTo`, `mapUrl`.

**When to use:** When you already know the GFW vessel ID(s) and want to fetch their full profiles directly, without a search query.

#### vessel-insights

Retrieve fishing activity, AIS gap, coverage, and IUU vessel list insights for one or more vessels.

```bash
npx @globalfishingwatch/gfw-cli vessel-insights --vessel-ids <id> [<id2> ...]
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  --includes <FISHING|GAP|COVERAGE|VESSEL-IDENTITY-IUU-VESSEL-LIST> [...]
```

| Parameter      | Format / values                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--vessel-ids` | One or more GFW vessel IDs                                                                                                                                                                                                                                          |
| `--start-date` | `YYYY-MM-DD`                                                                                                                                                                                                                                                        |
| `--end-date`   | `YYYY-MM-DD`                                                                                                                                                                                                                                                        |
| `--includes`   | `FISHING` \| `GAP` \| `COVERAGE` \| `VESSEL-IDENTITY-IUU-VESSEL-LIST` — one or more; `FISHING`: apparent fishing events and RFMO/MPA violations; `GAP`: AIS-off dark activity; `COVERAGE`: AIS reception %; `VESSEL-IDENTITY-IUU-VESSEL-LIST`: IUU list appearances |

**Returns:** `{ period, vesselIdsWithoutIdentity, mapUrls, apparentFishing?, gap?, coverage?, vesselIdentity? }` — only fields for requested types are present. `mapUrls` is an object keyed by vessel ID — each value is a GFW map URL for that vessel's profile during the queried period. Always show these URLs to the user in full.

**When to use:** When you need vessel-level behavioural insights — fishing activity counts, suspected dark activity gaps, satellite tracking quality, or IUU listing history. Use alongside `vessel-by-id` or `vessel-search` to first obtain vessel IDs.

#### vessel-events

Retrieve individual fishing, encounter, port visit, or loitering events. Filter by vessel, region, date range, confidence, and encounter type.

```bash
npx @globalfishingwatch/gfw-cli vessel-events --event-type <fishing|encounter|port_visit|loitering>
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

**Returns:** `{ total, limit, offset, nextOffset, entries[], mapUrl }` — each entry includes `id`, `type`, `start`, `end`, `lat`, `lon`, `vesselId`, and `regions` (lists of intersecting MPA, EEZ, RFMO, and FAO IDs). Port visit events additionally include a `port` object (`name`, `id`, `flag`); encounter events additionally include an `encounteredVessel` object (`name`, `id`, `flag`, `ssvid`). `mapUrl` links to the vessel's profile on the GFW map for the queried period.

**When to use:** When you need to see _individual_ events (exact time, position, details) for a vessel or inside a region. Use `events-stats` instead when you only need aggregate counts or breakdowns.

**Notes:**

- Results are sorted by start date descending (most recent first).
- `--region-type` and `--region-id` must always be provided together.
- `--confidence` is only valid for `port_visit`; default is `4` (highest confidence). Only change this if the user explicitly requests lower confidence levels.
- `--encounter-types` is only valid for `encounter`; default is `CARRIER-FISHING SUPPORT-FISHING`. Only change this if the user explicitly requests other types.
- Use `--offset` and `--limit` to paginate through large result sets.

#### events-stats

Compute aggregate statistics for events over a date range. Optionally filter by region and group results by flag state or gear type.

```bash
npx @globalfishingwatch/gfw-cli events-stats --event-type <fishing|encounter|port_visit|loitering>
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

**Returns:** `{ flags[], numEvents, numFlags, numVessels, groups[], mapUrl }` — `groups` contains `{ name, value }` pairs sorted descending by count, where `name` is the flag state or gear type and `value` is the event count. `mapUrl` links to the GFW map to visualise the queried events; it is **not present** when `--event-type` is `fishing`.

**When to use:** When you need aggregate counts, rankings by flag or gear type, or a summary of how many events/vessels are involved — without needing individual event details. Use `vessel-events` when you need the actual events.

**Notes:**

- `--group-by` defaults to `FLAG`. Use `GEARTYPE` to break down by fishing method.
- `--region-type` and `--region-id` must always be provided together.
- Same `--confidence` and `--encounter-types` restrictions as `vessel-events`.
- `mapUrl` is only present for `encounter`, `port_visit`, and `loitering` event types — always show it to the user when available.

#### region-id-lookup

Resolve a human-readable MPA, EEZ, or RFMO name to its canonical region ID. Uses word-overlap matching (case-insensitive).

```bash
npx @globalfishingwatch/gfw-cli region-id-lookup --region-type <MPA|EEZ|RFMO> --query <name> [--limit <n>]
```

| Parameter       | Format / values          |
| --------------- | ------------------------ |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |
| `--limit`       | 1–20 (default 5)         |

**Returns:** `{ regionType, query, limit, matches[] }` — each match includes `id`, `name`, `country` (ISO 3166-1 alpha-3, if available), and `source`.

**When to use:** Always run this first when you only have the human-readable name of a region and need to call `area-report`, `vessel-events`, or `events-stats` with a `regionId`.

**Notes:**

- If more than one match is returned, ask the user which region they meant before proceeding.
- The `id` from a match is what you pass as `--region-id` in other commands.

#### region-geometry

Returns the URL to fetch the GeoJSON geometry of a specific MPA, EEZ, or RFMO. No API token required to fetch the geometry itself.

```bash
npx @globalfishingwatch/gfw-cli region-geometry --region-type <MPA|EEZ|RFMO> --id <id>
```

| Parameter       | Format / values          |
| --------------- | ------------------------ |
| `--region-type` | `MPA` \| `EEZ` \| `RFMO` |

**Returns:** `{ regionType, id, url }` — the `url` is the endpoint from which you can fetch the region's GeoJSON geometry directly (no authentication required).

**When to use:** When the user wants to visualize or programmatically use the geographic boundary of a region. Run `region-id-lookup` first to obtain the `--id` if you only have the region name.

#### area-report

Calculate fishing or vessel presence hours inside a region (MPA, EEZ, or RFMO) for a given date range. Optionally filter by flag, gear type, vessel type, or speed, and group results by vessel, flag, or gear type.

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
  [--top-vessels-limit <n>]   # VESSEL_ID group-by only (default 10)
```

Date range must not exceed 1 year.

| Parameter                     | Format / values                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--region-type`               | `MPA` \| `EEZ` \| `RFMO`                                                                                                                                                                                                                                                                                                                                       |
| `--start-date` / `--end-date` | `YYYY-MM-DD` (max range: 1 year)                                                                                                                                                                                                                                                                                                                               |
| `--type`                      | `FISHING` (default) \| `PRESENCE` \| `SAR` \| `SENTINEL2` — `FISHING`: AIS-based fishing effort hours; `PRESENCE`: AIS vessel presence hours regardless of activity; `SAR`: Synthetic Aperture Radar vessel detection hours (satellite radar, independent of AIS); `SENTINEL2`: Sentinel-2 optical satellite imagery vessel detection hours                    |
| `--flags`                     | ISO 3166-1 alpha-3 codes (e.g. `ESP`, `CHN`); up to 10                                                                                                                                                                                                                                                                                                         |
| `--geartypes`                 | `tuna_purse_seines` \| `driftnets` \| `trollers` \| `set_longlines` \| `purse_seines` \| `pots_and_traps` \| `other_fishing` \| `dredge_fishing` \| `set_gillnets` \| `fixed_gear` \| `trawlers` \| `fishing` \| `seiners` \| `other_purse_seines` \| `other_seines` \| `squid_jigger` \| `pole_and_line` \| `drifting_longlines` (FISHING/SAR/SENTINEL2 only) |
| `--vessel-types`              | `carrier` \| `seismic_vessel` \| `passenger` \| `other` \| `support` \| `bunker` \| `gear` \| `cargo` \| `fishing` \| `discrepancy` (PRESENCE only)                                                                                                                                                                                                            |
| `--speeds`                    | `2-4` \| `4-6` \| `6-10` \| `10-15` \| `15-25` \| `>25` (PRESENCE only)                                                                                                                                                                                                                                                                                        |
| `--group-by`                  | `VESSEL_ID` (default) \| `FLAG` \| `GEARTYPE` \| `FLAGANDGEARTYPE` (`GEARTYPE`/`FLAGANDGEARTYPE` only valid with `--type FISHING`, `SAR`, or `SENTINEL2`)                                                                                                                                                                                                      |
| `--top-vessels-limit`         | Integer 1–100; default `10`. Number of top vessels to return when `--group-by VESSEL_ID`. Ignored for other group-by values.                                                                                                                                                                                                                                   |

**Returns:** `{ regionType, regionId, dateRange, gfwMapUrl }` plus one activity value field:

- `fishingHours` — total fishing hours (present when `--type FISHING`)
- `presenceHours` — total vessel presence hours (present when `--type PRESENCE`)
- `detections` — total SAR or Sentinel-2 vessel detections (present when `--type SAR` or `--type SENTINEL2`)

And optionally:

- `topVessels` (top N sorted descending, where N = `--top-vessels-limit`, default 10; each with `vesselId`, `shipName`, `mmsi`, `flag`, `geartype`, `value`) — only when `--group-by VESSEL_ID`. `value` is hours for FISHING/PRESENCE, detections for SAR/SENTINEL2.
- `rows` (aggregated and sorted descending by hours) — only when `--group-by FLAG`, `GEARTYPE`, or `FLAGANDGEARTYPE`.
- Applied filters (`flags`, `vesselTypes`, `speeds`, `geartypes`) echoed back when provided.

**When to use:**

- Use `--type FISHING` (default) for questions about fishing activity, fishing pressure, or fishing hours inside a region. Based on AIS movement patterns classified as fishing.
- Use `--type PRESENCE` for questions about vessel traffic, vessel transit, or total time any vessel spent in the area, regardless of whether they were fishing.
- Use `--type SAR` for questions about SAR-detected vessel activity — satellite radar detections independent of AIS, useful for detecting vessels not broadcasting AIS.
- Use `--type SENTINEL2` for questions about Sentinel-2 optically detected vessel activity — satellite optical imagery detections independent of AIS.

**Notes:**

- Run `region-id-lookup` first if you only have the region name.
- `gfwMapUrl` must always be shown to the user in full — never truncate or shorten it.
- `--geartypes` and `GEARTYPE`/`FLAGANDGEARTYPE` group-by are only valid with `--type FISHING`, `--type SAR`, or `--type SENTINEL2`.
- `--vessel-types` and `--speeds` are only valid with `--type PRESENCE`.

### Output

All commands output JSON to stdout. Pipe to `jq` for filtering:

```bash
npx @globalfishingwatch/gfw-cli vessel-search --name "Maria" | jq '.results[].name'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 \
  --start-date 2024-01-01 --end-date 2024-12-31 | jq '.fishingHours'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 \
  --start-date 2024-01-01 --end-date 2024-12-31 --type PRESENCE | jq '.presenceHours'
npx @globalfishingwatch/gfw-cli area-report --region-type EEZ --region-id 8386 \
  --start-date 2024-01-01 --end-date 2024-12-31 --type SAR | jq '.detections'
```

---

## MCP tools

When used as an MCP server, the same capabilities are available as tools:

### vessel-search

**Purpose:** Search vessels by name, MMSI, IMO, callsign, flag state, or activity date range. At least one filter must be provided.

**Returns:** `{ total, limit, results[] }` — each result includes `vesselId`, `name`, `mmsi`, `imo`, `callsign`, `flag`, `gearType`, `activeFrom`, `activeTo`, and `mapUrl` (link to the vessel's profile on the GFW map — always show it to the user).

**When to use:** When you have partial vessel information and need to find a vessel or a list of vessels. Prefer `vessel-by-id` if you already have the GFW vessel ID.

---

### vessel-by-id

**Purpose:** Retrieve one or more full vessel profiles by their GFW vessel IDs.

**Returns:** `{ total, results[] }` — same fields as `vessel-search` results, including `mapUrl`.

**When to use:** When you already know the GFW vessel ID(s) and want to skip a search query.

---

### vessel-insights

**Purpose:** Retrieve fishing activity, AIS gap (dark activity), coverage, and IUU vessel list insights for one or more vessels over a date range. All four parameters are required. Multiple insight types can be requested in a single call.

**Returns:** `{ period, vesselIdsWithoutIdentity, mapUrls, apparentFishing?, gap?, coverage?, vesselIdentity? }` — only fields corresponding to the requested `includes` types are present. `mapUrls` is an object keyed by vessel ID linking each vessel to its GFW map profile for the queried period — always show these URLs to the user in full, never truncate or shorten them.

- `apparentFishing` (FISHING): `{ datasets, periodSelectedCounters: { events, eventsInRFMOWithoutKnownAuthorization, eventsInNoTakeMPAs }, eventsInRfmoWithoutKnownAuthorization[], eventsInNoTakeMpas[] }`
- `gap` (GAP): `{ datasets, periodSelectedCounters: { events, eventsGapOff }, aisOff[] }`
- `coverage` (COVERAGE): `{ blocks, blocksWithPositions, percentage }`
- `vesselIdentity` (VESSEL-IDENTITY-IUU-VESSEL-LIST): `{ datasets, iuuVesselList: { valuesInThePeriod[], totalTimesListed, totalTimesListedInThePeriod } }`

**When to use:**

- Use `FISHING` to assess apparent fishing activity, including potential violations inside RFMOs without known authorization or inside no-take MPAs.
- Use `GAP` to detect suspected dark activity — periods where the vessel stopped broadcasting AIS.
- Use `COVERAGE` to assess how reliably the vessel was tracked via satellite AIS reception.
- Use `VESSEL-IDENTITY-IUU-VESSEL-LIST` to check if the vessel appeared on any IUU (Illegal, Unreported, Unregulated) lists during the period.

**Key constraints:**

- All four parameters (`vesselIds`, `startDate`, `endDate`, `includes`) are required.
- `vesselIds` must contain at least one ID. Use `vessel-by-id` or `vessel-search` first if you only have the vessel name or identifiers.

---

### vessel-events

**Purpose:** Retrieve individual fishing, encounter, port visit, or loitering events. Filter by event type, date range, vessel ID, region, confidence (port visits), and encounter type.

**Returns:** `{ total, limit, offset, nextOffset, entries[], mapUrl }` — each entry includes `id`, `type`, `start`, `end`, `lat`, `lon`, `vesselId`, and `regions` (arrays of intersecting MPA, EEZ, RFMO, and FAO IDs). Port visit events additionally include a `port` object; encounter events additionally include an `encounteredVessel` object. `mapUrl` links to the vessel's GFW profile for the queried period.

**When to use:** When you need individual event details (exact time, position, involved vessels, ports). For aggregate counts use `events-stats`. Results are sorted by start date descending.

**Key constraints:**

- `confidence` only valid for `port_visit` (default `[4]`); only change if the user asks.
- `encounterTypes` only valid for `encounter` (default `CARRIER-FISHING`, `SUPPORT-FISHING`); only change if the user asks.
- `regionType` and `regionId` must always be provided together.

---

### events-stats

**Purpose:** Compute aggregate statistics for events (fishing, encounters, port visits, loitering) over a date range. Optionally filter by region and group by flag state or gear type.

**Returns:** `{ flags[], numEvents, numFlags, numVessels, groups[], mapUrl }` — `groups` contains `{ name, value }` pairs sorted descending by count, where `name` is the flag or gear type and `value` is the event count. `mapUrl` links to the GFW map to visualise the queried events; it is **not present** when `eventType` is `fishing`.

**When to use:** When you need aggregate numbers, rankings by flag or gear type, or a summary of how many events/vessels are involved — without needing individual event records.

**Key constraints:** Same `confidence` and `encounterTypes` restrictions as `vessel-events`. `regionType` and `regionId` must always be provided together. Always show `mapUrl` to the user when it is present.

---

### region-id-lookup

**Purpose:** Resolve a human-readable MPA, EEZ, or RFMO name to its canonical region ID using word-overlap matching.

**Returns:** `{ regionType, query, limit, matches[] }` — each match includes `id`, `name`, `country` (ISO 3166-1 alpha-3 if available), and `source`.

**When to use:** Always run this first when you only have the region name and need to call `area-report`, `vessel-events`, or `events-stats` with a `regionId`. If multiple matches are returned, ask the user which one they meant before proceeding.

---

### region-geometry

**Purpose:** Returns the URL to fetch the GeoJSON geometry of a specific MPA, EEZ, or RFMO. No API token is required to call that URL.

**Returns:** `{ regionType, id, url }` — `url` is the endpoint from which the GeoJSON can be fetched directly.

**When to use:** When the user wants to visualize or programmatically use the geographic boundary of a region. Run `region-id-lookup` first to obtain the region ID.

---

### area-report

**Purpose:** Calculate total fishing, SAR, Sentinel-2, or AIS vessel presence hours inside a region (MPA, EEZ, or RFMO) for a given date range. Supports optional filters (flag, gear type, vessel type, speed) and grouping by vessel, flag, gear type, or flag+gear type.

**Returns:** `{ regionType, regionId, dateRange, gfwMapUrl }` plus one activity value field:

- `fishingHours` — total fishing hours (present when `type` is `FISHING`)
- `presenceHours` — total vessel presence hours (present when `type` is `PRESENCE`)
- `detections` — total SAR or Sentinel-2 vessel detections (present when `type` is `SAR` or `SENTINEL2`)

And optionally:

- `topVessels` (top N sorted descending, where N = `topVesselsLimit`, default 10; with `vesselId`, `shipName`, `mmsi`, `flag`, `geartype`, `value`) — only when `groupBy` is `VESSEL_ID`. `value` is hours for FISHING/PRESENCE, detections for SAR/SENTINEL2.
- `rows` (aggregated entries sorted descending by hours, with grouping fields + `hours`) — only when `groupBy` is `FLAG`, `GEARTYPE`, or `FLAGANDGEARTYPE`.
- Applied filters echoed back when provided.

**When to use:**

- Use `type: FISHING` (default) for questions about fishing activity or fishing pressure: hours when vessels were classified as actively fishing.
- Use `type: PRESENCE` for questions about vessel traffic or transit: hours when any vessel was inside the region regardless of activity.
- Use `type: SAR` for questions about SAR-detected vessel activity: satellite radar detections independent of AIS, useful for detecting vessels not broadcasting AIS.
- Use `type: SENTINEL2` for questions about Sentinel-2 optically detected vessel activity: satellite optical imagery detections independent of AIS.

**Key constraints:**

- **Never call in parallel.** If multiple reports are needed, call them sequentially.
- Date range cannot exceed 1 year.
- `geartypes` filter and `GEARTYPE`/`FLAGANDGEARTYPE` group-by are only valid with `type: FISHING`, `type: SAR`, or `type: SENTINEL2`.
- `vesselTypes` and `speeds` filters are only valid with `type: PRESENCE`.
- `gfwMapUrl` must always be shown to the user in full — never truncate, shorten, or summarize it.
- Run `region-id-lookup` first if you only have the human-readable region name.

---

## Example prompts

### Vessel search & profiles

- _"Search for vessels named 'Atlantic Star' flagged to Spain"_
- _"Find all trawlers active in 2023 under the Norwegian flag"_
- _"Look up vessel with MMSI 123456789"_
- _"Fetch the full profile for vessel ID abc123"_

### Vessel insights

- _"Get fishing and gap insights for vessel ID abc123 between January and June 2024"_
- _"Check if vessel xyz appeared on any IUU lists in 2023"_
- _"What is the AIS coverage percentage for vessel abc123 in Q1 2024?"_
- _"Show me all insights (fishing, gaps, coverage, IUU) for vessel abc123 over the last year"_

### Vessel events

- _"What fishing events has vessel ID xyz had in the last 30 days?"_
- _"Show me the last 10 port visits for vessel abc, sorted by most recent"_
- _"List all encounters for vessel xyz between January and June 2024"_
- _"Were there any loitering events inside the South Atlantic EEZ in 2023?"_

### Region lookup & geometry

- _"Find the region ID for the Great Barrier Reef MPA"_
- _"Search for EEZs matching 'Patagonia'"_
- _"Get the GeoJSON geometry for the Patagonian Shelf EEZ"_

### Activity hours reports

- _"How many fishing hours were recorded inside the Galápagos Marine Reserve in 2023?"_
- _"Show me vessel presence hours in the North Sea EEZ for Chinese-flagged cargo vessels in 2024"_
- _"Show me fishing hours in the WCPFC RFMO broken down by gear type for 2023"_
- _"Compare fishing pressure by flag state inside the Mozambique Channel EEZ in the first half of 2024"_
- _"How many trawling hours were logged in the Mediterranean Sea EEZ in 2022?"_
- _"How many SAR-detected vessel hours were recorded inside the South China Sea EEZ in 2023?"_
- _"Show me Sentinel-2 detected vessel hours in the Strait of Hormuz EEZ for 2023"_

### Event statistics

- _"How many carrier-fishing encounters happened in the WCPFC RFMO in 2023, grouped by flag?"_
- _"What flags are most active in port visits to the port of Las Palmas in 2024?"_
- _"How many fishing events were recorded globally in Q1 2024, grouped by gear type?"_
- _"Give me loitering event stats inside the Gulf of Guinea EEZ between 2022 and 2023"_
