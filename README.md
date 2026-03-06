# GFW MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes [Global Fishing Watch](https://globalfishingwatch.org) data to AI assistants. Enables querying fishing vessel information, detecting fishing events, and analyzing fishing activity within Marine Protected Areas (MPAs) and Exclusive Economic Zones (EEZs).

## Requirements

- Node.js 18+
- A [GFW API key](https://globalfishingwatch.org/our-apis/)

## Setup

```bash
npm install
npm run build
```

Create a `.env` file (or export env vars):

```env
API_KEY=your_gfw_api_key_here
```

## Available Tools

| Tool                | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `vessel-search`     | Search vessels by name, MMSI, IMO, callsign, flag, or gear type           |
| `vessel-events`     | Retrieve fishing, encounter, port visit, or loitering events for a vessel |
| `region-id-lookup`  | Resolve MPA or EEZ names to canonical region IDs                          |
| `mpa-vessel-report` | Calculate fishing/presence hours in a region with top vessel breakdown    |

## Integration

The server runs over **stdio**, which is the standard transport for local MCP integrations.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/poc-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The tools will appear automatically in the conversation.

### Claude Code (CLI)

Add the server to your Claude Code config:

```bash
claude mcp add gfw -- node /absolute/path/to/poc-mcp/dist/index.js
```

Then set the API key in your environment or in the MCP config:

```bash
export API_KEY=your_gfw_api_key_here
```

Or configure it directly in `.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/poc-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/poc-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "gfw": {
      "command": "node",
      "args": ["/absolute/path/to/poc-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "gfw": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/poc-mcp/dist/index.js"],
      "env": {
        "API_KEY": "your_gfw_api_key_here"
      }
    }
  }
}
```

### HTTP Transport (optional)

The server also includes a commented-out `StreamableHTTPServerTransport` in [index.ts](index.ts). To enable it, uncomment the relevant block and set the `PORT` env var (default: `4000`). The endpoint will be available at `POST http://localhost:4000/mcp`.

This is useful for integrations that require a remote/hosted MCP server or for clients that do not support stdio.

## Environment Variables

| Variable      | Default | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| `API_KEY` | —      | GFW API bearer token (required for real data)     |
| `PORT`    | `4000` | HTTP port (only used with HTTP transport)          |

## Example Prompts

Once connected, you can ask the AI assistant things like:

- _"How many fishing hours were recorded inside the Galápagos Marine Reserve in 2023?"_
- _"Search for vessels named 'Atlantic Star' flagged to Spain"_
- _"What fishing events has vessel ID xyz had in the last 30 days?"_
- _"Find the region ID for the Great Barrier Reef MPA"_
- _"Show me vessel presence hours in the North Sea EEZ for Chinese-flagged cargo vessels in 2024"_

## Project Structure

```
index.ts              # Entry point: transport setup
mcp-server.ts         # McpServer creation and tool registration
middleware/auth.ts    # Bearer / X-API-Key authentication
tools/                # One file per tool
lib/
  api.ts              # gfwFetch() — GFW API client
  response.ts         # createToolResponse() / createErrorResponse()
  types.ts            # Shared TypeScript types and dataset constants
```
