---
name: gfw-mcp-js
description: Query Global Fishing Watch data — search vessels, retrieve fishing events, and calculate fishing/presence hours inside MPAs and EEZs.
metadata: {"clawdbot":{"emoji":"🎣","requires":{"bins":["node"],"env":["API_KEY"]}}}
---

# GFW MCP

Access [Global Fishing Watch](https://globalfishingwatch.org) data directly from your AI assistant. Search vessels, retrieve fishing and port-visit events, look up Marine Protected Areas and Exclusive Economic Zones, and calculate fishing activity hours within any region.

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

---

## Available Tools

| Tool | Description |
|------|-------------|
| `vessel-search` | Search vessels by name, MMSI, IMO, callsign, flag, or gear type |
| `vessel-events` | Retrieve fishing, encounter, port visit, or loitering events for a vessel |
| `region-id-lookup` | Resolve MPA or EEZ names to canonical region IDs |
| `mpa-vessel-report` | Calculate fishing/presence hours in a region with top vessel breakdown |

---

## Example Prompts

- *"How many fishing hours were recorded inside the Galápagos Marine Reserve in 2023?"*
- *"Search for vessels named 'Atlantic Star' flagged to Spain"*
- *"What fishing events has vessel ID xyz had in the last 30 days?"*
- *"Find the region ID for the Great Barrier Reef MPA"*
- *"Show me vessel presence hours in the North Sea EEZ for Chinese-flagged cargo vessels in 2024"*
