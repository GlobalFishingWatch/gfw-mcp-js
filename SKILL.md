---
name: gfw-mcp-js
description: Query Global Fishing Watch data — search vessels, retrieve fishing events, calculate fishing/presence hours inside MPAs, EEZs and RFMOs, and get event statistics.
metadata:
  {
    'clawdbot':
      { 'emoji': '🎣', 'requires': { 'bins': ['node'], 'env': ['GFW_TOKEN'] } },
  }
---

# @globalfishingwatch/mcp

Access [Global Fishing Watch](https://globalfishingwatch.org) data directly from your AI assistant or from the terminal. Search vessels, retrieve fishing and port-visit events, look up Marine Protected Areas, Exclusive Economic Zones and RFMOs, calculate fishing activity hours within any region, and compute aggregate event statistics.

---

## Agent behavior guidelines

When using this skill, the agent must follow these rules:

- **Concise:** Return only what was asked. Do not add summaries, commentary, or unsolicited context.
- **Objective:** Do not interpret data beyond what is directly observable. If an interpretation is offered, always include the specific evidence (numbers, fields, values) that support it.
- **Prefer GFW data:** Always prioritize GFW tools and data over external sources or general knowledge.
- **Disclose assumed parameters:** If you choose a value for any parameter on your own (date ranges, vessel types, gear types, confidence levels, etc.), explicitly tell the user what you assumed and why before or alongside the result.
- **Never alter URLs:** Return all URLs exactly as the tool provides them — do not shorten, truncate, reformat, or paraphrase them. The user must be able to open them directly.

---

## CLI usage

The package ships a CLI that can be used without installing it:

```bash
npx @globalfishingwatch/mcp <command> [options]
```

### Authentication

The CLI resolves the API token in this order:

1. `GFW_TOKEN` environment variable
2. `API_KEY` environment variable (compatibility alias)
3. `~/.gfw/config.json` (saved via `auth login`)

```bash
# Save token interactively
npx @globalfishingwatch/mcp auth login

# Check which source is active
npx @globalfishingwatch/mcp auth status

# Remove stored token
npx @globalfishingwatch/mcp auth logout
```

Or pass the token inline:

```bash
GFW_TOKEN=your_key npx @globalfishingwatch/mcp vessel-search --name "Maria"
```

### CLI commands

#### vessel-search

```bash
npx @globalfishingwatch/mcp vessel-search [--name <name>] [--mmsi <mmsi>] [--imo <imo>]
  [--callsign <cs>] [--flag <ISO3>] [--active-from <YYYY-MM-DD>]
  [--active-to <YYYY-MM-DD>] [--limit <n>]
```

At least one filter must be provided. `--flag` uses ISO 3166-1 alpha-3 codes (e.g. `ESP`, `CHN`).

#### vessel-by-id

```bash
npx @globalfishingwatch/mcp vessel-by-id --ids <id> [<id2> ...]
```

#### vessel-events

```bash
npx @globalfishingwatch/mcp vessel-events --event-type <fishing|encounter|port_visit|loitering>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--vessel-id <id>] [--limit <n>] [--offset <n>]
  [--confidence <2|3|4> ...]          # port_visit only
  [--encounter-types <type> ...]      # encounter only; e.g. CARRIER-FISHING SUPPORT-FISHING
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
```

#### events-stats

```bash
npx @globalfishingwatch/mcp events-stats --event-type <fishing|encounter|port_visit|loitering>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--group-by <FLAG|GEARTYPE>]
  [--region-type <MPA|EEZ|RFMO>] [--region-id <id>]
  [--confidence <levels> ...] [--encounter-types <types> ...]
```

#### region-id-lookup

```bash
npx @globalfishingwatch/mcp region-id-lookup --region-type <MPA|EEZ|RFMO> --query <name> [--limit <n>]
```

Use this before `vessel-report` or `vessel-events` when you only know the human-readable name of a region.

#### region-geometry

```bash
npx @globalfishingwatch/mcp region-geometry --region-type <MPA|EEZ|RFMO> --id <id>
```

Returns the URL to fetch the GeoJSON geometry of the region (no API token required).

#### vessel-report

```bash
npx @globalfishingwatch/mcp vessel-report --region-type <MPA|EEZ|RFMO> --region-id <id>
  --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>
  [--type <FISHING|PRESENCE>]
  [--flags <ISO3> ...]
  [--geartypes <type> ...]    # FISHING only
  [--vessel-types <type> ...] # PRESENCE only
  [--speeds <range> ...]      # PRESENCE only; e.g. 2-4 4-6 6-10
  [--group-by <VESSEL_ID|FLAG|GEARTYPE|FLAGANDGEARTYPE>]
```

Date range must not exceed 1 year.

### Output

All commands output JSON to stdout. Pipe to `jq` for filtering:

```bash
npx @globalfishingwatch/mcp vessel-search --name "Maria" | jq '.results[].name'
npx @globalfishingwatch/mcp vessel-report --region-type EEZ --region-id 8386 \
  --start-date 2024-01-01 --end-date 2024-12-31 | jq '.fishingHours'
```

---

## MCP tools

When used as an MCP server, the same capabilities are available as tools:

| Tool               | Description                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vessel-search`    | Search vessels by name, MMSI, IMO, callsign, flag, or gear type                                                                                                |
| `vessel-by-id`     | Fetch full vessel profile(s) by GFW vessel ID(s); returns metadata and a map URL                                                                               |
| `vessel-events`    | Retrieve fishing, encounter, port visit, or loitering events; filter by vessel, region, date, confidence, and encounter type                                   |
| `events-stats`     | Compute aggregate statistics (total events, unique vessels, flag breakdown) over a date range, optionally filtered by region and grouped by flag or gear type  |
| `region-id-lookup` | Resolve MPA, EEZ, or RFMO names to canonical region IDs                                                                                                        |
| `region-geometry`  | Get the URL to fetch the GeoJSON geometry of a specific MPA, EEZ, or RFMO                                                                                      |
| `vessel-report`    | Calculate fishing or presence hours in a region (MPA, EEZ, RFMO) with optional flag, gear type, vessel type, and speed filters; supports groupBy flag/geartype |

---

## Example prompts

### Vessel search & profiles

- _"Search for vessels named 'Atlantic Star' flagged to Spain"_
- _"Find all trawlers active in 2023 under the Norwegian flag"_
- _"Look up vessel with MMSI 123456789"_
- _"Fetch the full profile for vessel ID abc123"_

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

### Event statistics

- _"How many carrier-fishing encounters happened in the WCPFC RFMO in 2023, grouped by flag?"_
- _"What flags are most active in port visits to the port of Las Palmas in 2024?"_
- _"How many fishing events were recorded globally in Q1 2024, grouped by gear type?"_
- _"Give me loitering event stats inside the Gulf of Guinea EEZ between 2022 and 2023"_
