import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createToolResponse } from '../lib/response.js';
import { REGION_DATASETS } from '../lib/types.js';

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org';

export function regionGeometry({
  regionType,
  id,
}: {
  regionType: 'MPA' | 'EEZ' | 'RFMO';
  id: string;
}) {
  const dataset = REGION_DATASETS[regionType];
  const url = `${GFW_BASE}/v3/datasets/${dataset}/context-layers/${id}`;
  return { regionType, id, url };
}

export function register(server: McpServer) {
  server.registerTool(
    'region-geometry',
    {
      title: 'Region Geometry URL',
      description:
        'Returns the URL where the GeoJSON geometry of a specific Marine Protected Area (MPA), Exclusive Economic Zone (EEZ), or Regional Fisheries Management Organisation (RFMO) can be retrieved. Use region-id-lookup first to obtain the ID.',
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
        url: z.string().describe('URL to fetch the GeoJSON geometry of the region'),
      },
    },
    async (params) => {
      const output = regionGeometry(params);
      return createToolResponse(JSON.stringify(output, null, 2), output);
    },
  );
}
