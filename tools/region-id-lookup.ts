import Fuse from 'fuse.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { REGION_CAVEATS } from '../lib/caveats.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { stemmed } from '../lib/search.js';
import { ContextLayer, REGION_DATASETS } from '../lib/types.js';

export async function regionIdLookup({
  regionType,
  query,
  limit,
}: {
  regionType: 'MPA' | 'EEZ' | 'RFMO';
  query: string;
  limit?: number;
}) {
  const maxResults = limit ?? 5;
  const dataset = REGION_DATASETS[regionType];

  const response = await gfwFetch(`/v3/datasets/${dataset}/context-layers`);
  const layers: ContextLayer[] = await response.json();

  const normalized = layers.map((layer) => ({
    layer,
    normLabel: stemmed(layer.label),
  }));

  const fuse = new Fuse(normalized, {
    keys: ['normLabel'],
    threshold: 0.3,
    distance: 1000,
    includeScore: true,
  });

  const matches = fuse
    .search(stemmed(query))
    .slice(0, maxResults)
    .map(({ item }) => ({
      id: String(item.layer.id),
      name: item.layer.label,
      country: item.layer.iso3 ?? undefined,
      source: dataset,
    }));

  return {
    regionType,
    query,
    limit: maxResults,
    matches,
    ...(REGION_CAVEATS.length > 0 && { dataCaveats: REGION_CAVEATS }),
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'region-id-lookup',
    {
      title: 'Region ID Lookup',
      description:
        'Retrieve the canonical identifier (ID) for a Marine Protected Area (MPA), Exclusive Economic Zone (EEZ), or Regional Fisheries Management Organisation (RFMO) based on a human-readable name. When more than one match is returned, ask the user which region they meant before proceeding. Use this tool before requesting fishing hours to ensure you pass the correct region ID.',
      inputSchema: {
        regionType: z
          .enum(['MPA', 'EEZ', 'RFMO'])
          .describe(
            'Type of region to search: MPA (Marine Protected Area), EEZ (Exclusive Economic Zone), or RFMO (Regional Fisheries Management Organisation)',
          ),
        query: z
          .string()
          .describe(
            'Name or partial name of the region. Case-insensitive substring matching is applied.',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe(
            'Maximum number of results to return (default: 5, max: 20).',
          ),
      },
      outputSchema: {
        regionType: z.enum(['MPA', 'EEZ', 'RFMO']),
        query: z.string(),
        limit: z.number(),
        dataCaveats: z
          .array(z.string())
          .optional()
          .describe(
            'Array of markdown strings with data caveats. IMPORTANT: Always display every item to the user when present.',
          ),
        matches: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            country: z
              .string()
              .optional()
              .describe('ISO 3166-1 alpha-3 country code, if available'),
            source: z.string().describe('Data source or catalogue identifier'),
          }),
        ),
      },
    },
    async (params) => {
      try {
        const output = await regionIdLookup(params);
        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to look up region: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
