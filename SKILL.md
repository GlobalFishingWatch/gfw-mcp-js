---
name: gfw-mcp-js
description: Query Global Fishing Watch data — search vessels, retrieve fishing events, calculate fishing/presence hours inside MPAs, EEZs and RFMOs, and get event statistics.
metadata: {"clawdbot":{"emoji":"🎣","requires":{"bins":["node"],"env":["API_KEY"]}}}
---

# GFW MCP

Access [Global Fishing Watch](https://globalfishingwatch.org) data directly from your AI assistant. Search vessels, retrieve fishing and port-visit events, look up Marine Protected Areas, Exclusive Economic Zones and RFMOs, calculate fishing activity hours within any region, and compute aggregate event statistics.

## Setup

**1. Install and build**

```bash
git clone https://github.com/globalfishingwatch/gfw-mcp
cd gfw-mcp
npm install
npm run build
```

**2. Get a GFW API key** at https://globalfishingwatch.org/our-apis/

**3. Configure your MCP client** (see below)

---

## Client Configuration

Replace `/absolute/path/to/gfw-mcp` with the actual path on your machine.

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add gfw -- node /absolute/path/to/gfw-mcp/dist/index.js
export API_KEY=your_gfw_api_key_here
```

### Cursor

`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
      "env": { "API_KEY": "your_gfw_api_key_here" }
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
      "env": { "API_KEY": "your_gfw_api_key_here" }
    }
  }
}
```

### VS Code (Copilot)

`.vscode/mcp.json`

```json
{
  "servers": {
    "gfw": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
      "env": { "API_KEY": "your_gfw_api_key_here" }
    }
  }
}
```

### OpenClaw

`~/.openclaw/openclaw.json`

```json
{
  "tools": {
    "mcp": {
      "servers": {
        "gfw": {
          "command": "node",
          "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
          "env": {
            "API_KEY": "your_gfw_api_key_here"
          }
        }
      }
    }
  }
}
```

### Gemini CLI

`~/.gemini/settings.json` (global) o `.gemini/settings.json` (por proyecto)

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/gfw-mcp/dist/index.js"],
      "env": { "API_KEY": "your_gfw_api_key_here" }
    }
  }
}
```

---

## Available Tools

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

## Example Prompts

### Vessel search & profiles
- *"Search for vessels named 'Atlantic Star' flagged to Spain"*
- *"Find all trawlers active in 2023 under the Norwegian flag"*
- *"Look up vessel with MMSI 123456789"*
- *"Fetch the full profile for vessel ID abc123"*

### Vessel events
- *"What fishing events has vessel ID xyz had in the last 30 days?"*
- *"Show me the last 10 port visits for vessel abc, sorted by most recent"*
- *"List all encounters for vessel xyz between January and June 2024"*
- *"Were there any loitering events inside the South Atlantic EEZ in 2023?"*

### Region lookup & geometry
- *"Find the region ID for the Great Barrier Reef MPA"*
- *"Search for EEZs matching 'Patagonia'"*
- *"Get the GeoJSON geometry for the Patagonian Shelf EEZ"*

### Activity hours reports
- *"How many fishing hours were recorded inside the Galápagos Marine Reserve in 2023?"*
- *"Show me vessel presence hours in the North Sea EEZ for Chinese-flagged cargo vessels in 2024"*
- *"Show me fishing hours in the WCPFC RFMO broken down by gear type for 2023"*
- *"Compare fishing pressure by flag state inside the Mozambique Channel EEZ in the first half of 2024"*
- *"How many trawling hours were logged in the Mediterranean Sea EEZ in 2022?"*

### Event statistics
- *"How many carrier-fishing encounters happened in the WCPFC RFMO in 2023, grouped by flag?"*
- *"What flags are most active in port visits to the port of Las Palmas in 2024?"*
- *"How many fishing events were recorded globally in Q1 2024, grouped by gear type?"*
- *"Give me loitering event stats inside the Gulf of Guinea EEZ between 2022 and 2023"*
