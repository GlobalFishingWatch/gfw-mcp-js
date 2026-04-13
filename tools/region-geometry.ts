import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { REGION_DATASETS } from '../lib/types.js';

export function register(server: McpServer) {
  server.registerTool(
    'region-geometry',
    {
      title: 'Region Geometry',
      description:
        'Retrieve the GeoJSON geometry for a specific Marine Protected Area (MPA), Exclusive Economic Zone (EEZ), or Regional Fisheries Management Organisation (RFMO) by its canonical ID. Use region-id-lookup first to obtain the ID.',
      inputSchema: {
        regionType: z
          .enum(['MPA', 'EEZ', 'RFMO'])
          .describe(
            'Type of region: MPA (Marine Protected Area), EEZ (Exclusive Economic Zone), or RFMO (Regional Fisheries Management Organisation)',
          ),
        id: z.string().describe('Canonical region ID as returned by region-id-lookup'),
      },
      outputSchema: {
        regionType: z.enum(['MPA', 'EEZ', 'RFMO']),
        id: z.string(),
        geometry: z.record(z.unknown()).describe('GeoJSON geometry object'),
      },
    },
    async ({ regionType, id }) => {
      try {
        const dataset = REGION_DATASETS[regionType];
        const response = await gfwFetch(`/v3/datasets/${dataset}/context-layers/${id}`);
        const geometry = await response.json();

        const output = { regionType, id, geometry };
        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to retrieve region geometry: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
