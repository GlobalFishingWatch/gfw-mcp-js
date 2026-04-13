import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as vesselEvents from './tools/vessel-events.js';
import * as vesselSearch from './tools/vessel-search.js';
import * as regionIdLookup from './tools/region-id-lookup.js';
import * as regionGeometry from './tools/region-geometry.js';
import * as mpaVesselReport from './tools/vessel-report.js';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'gfw', version: '1.0.0' });

  vesselEvents.register(server);
  vesselSearch.register(server);
  regionIdLookup.register(server);
  regionGeometry.register(server);
  mpaVesselReport.register(server);

  return server;
}
