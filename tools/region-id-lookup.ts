import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { ContextLayer, REGION_DATASETS } from '../lib/types.js';

// Returns a simple similarity score: number of query words found in label
function score(label: string, query: string): number {
  const lowerLabel = label.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.filter((w) => lowerLabel.includes(w)).length;
}

export function register(server: McpServer) {
  server.registerTool(
    'region-id-lookup',
    {
      title: 'Protected Region ID Lookup',
      description:
        'Retrieve the canonical identifier (ID) for a Marine Protected Area (MPA) or Exclusive Economic Zone (EEZ) based on a human-readable name. When more than one match is returned, ask the user which region they meant before proceeding. Use this tool before requesting fishing hours to ensure you pass the correct region ID.',
      inputSchema: {
        regionType: z
          .enum(['MPA', 'EEZ'])
          .describe(
            'Type of region to search: MPA (Marine Protected Area) or EEZ (Exclusive Economic Zone)',
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
        regionType: z.enum(['MPA', 'EEZ']),
        query: z.string(),
        limit: z.number(),
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
    async ({ regionType, query, limit }) => {
      try {
        const maxResults = limit ?? 5;
        const dataset = REGION_DATASETS[regionType];

        const response = await gfwFetch(
          `/v3/datasets/${dataset}/context-layers`,
        );
        const layers: ContextLayer[] = await response.json();

        const matches = layers
          .map((layer) => ({ layer, s: score(layer.label, query) }))
          .filter(({ s }) => s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, maxResults)
          .map(({ layer }) => ({
            id: String(layer.id),
            name: layer.label,
            country: layer.iso3 ?? undefined,
            source: dataset,
          }));

        const output = { regionType, query, limit: maxResults, matches };
        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to look up region: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
