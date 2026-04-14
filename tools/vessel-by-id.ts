import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { generateVesselProfileUrl } from '../lib/map-url-generator.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { VesselSearchResponse } from '../lib/types.js';

const DATASET = 'public-global-vessel-identity:v4.0';

export async function vesselById({ ids }: { ids: string[] }) {
  const params: Record<string, string> = {
    'datasets[0]': DATASET,
    ...Object.fromEntries(ids.map((id, i) => [`ids[${i}]`, id])),
  };

  const response = await gfwFetch('/v3/vessels', params);
  const data: VesselSearchResponse = await response.json();

  const results = data.entries.map((entry) => {
    const info = entry.selfReportedInfo[0];
    const combined = entry.combinedSourcesInfo[0];
    const vesselId = info?.id ?? combined?.vesselId ?? '';
    const from = info?.transmissionDateFrom;
    const to = info?.transmissionDateTo;
    return {
      vesselId,
      name: info?.shipname,
      mmsi: info?.ssvid,
      imo: info?.imo ?? undefined,
      callsign: info?.callsign ?? undefined,
      flag: info?.flag,
      gearType: combined?.geartypes?.[0]?.name,
      activeFrom: from,
      activeTo: to,
      mapUrl: vesselId ? generateVesselProfileUrl(vesselId, from, to) : null,
    };
  });

  return { total: data.total, results };
}

export function register(server: McpServer) {
  server.registerTool(
    'vessel-by-id',
    {
      title: 'Vessel by ID',
      description:
        'Retrieve one or more vessels by their GFW vessel IDs. Returns the same metadata as vessel-search, including a mapUrl for each vessel. Use when you already know the vessel ID(s) and want to fetch their full profile.',
      inputSchema: {
        ids: z
          .array(z.string().min(1))
          .min(1)
          .describe('List of GFW vessel IDs to look up.'),
      },
      outputSchema: {
        total: z.number(),
        results: z.array(
          z.object({
            vesselId: z.string(),
            name: z.string().nullish(),
            mmsi: z.string().nullish(),
            imo: z.string().nullish(),
            callsign: z.string().nullish(),
            flag: z.string().nullish(),
            gearType: z.string().nullish(),
            activeFrom: z.string().nullish(),
            activeTo: z.string().nullish(),
            mapUrl: z
              .string()
              .nullish()
              .describe(
                "Global Fishing Watch map URL to view this vessel's profile and track. IMPORTANT!! Always share this full link with the user when presenting vessel results.",
              ),
          }),
        ),
      },
    },
    async (params) => {
      try {
        const output = await vesselById(params);
        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to fetch vessels: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
