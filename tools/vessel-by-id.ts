import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { generateVesselProfileUrl } from '../lib/map-url-generator.js';
import { VESSEL_IDENTITY_CAVEATS } from '../lib/caveats.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { VesselSearchResponse } from '../lib/types.js';

const DATASET = 'public-global-vessel-identity:v4.0';

export async function vesselById({ ids }: { ids: string[] }) {
  const params: Record<string, string> = {
    'datasets[0]': DATASET,
    'includes[0]': 'POTENTIAL_RELATED_SELF_REPORTED_INFO',
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
      registryOwners: entry.registryOwners ?? [],
      mapUrl: vesselId ? generateVesselProfileUrl(vesselId, from, to) : null,
      relatedIdentities: entry.selfReportedInfo
        .filter((sri) => !ids.includes(sri.id))
        .map((sri) => ({
          vesselId: sri.id,
          name: sri.shipname,
          mmsi: sri.ssvid,
          imo: sri.imo ?? undefined,
          callsign: sri.callsign ?? undefined,
          flag: sri.flag,
          activeFrom: sri.transmissionDateFrom,
          activeTo: sri.transmissionDateTo,
          mapUrl: sri.id
            ? generateVesselProfileUrl(
                sri.id,
                sri.transmissionDateFrom,
                sri.transmissionDateTo,
              )
            : null,
        })),
    };
  });

  return {
    total: data.total,
    results,
    ...(VESSEL_IDENTITY_CAVEATS.length > 0 && {
      dataCaveats: VESSEL_IDENTITY_CAVEATS,
    }),
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'vessel-by-id',
    {
      title: 'Vessel by ID',
      description:
        'Retrieve one or more vessels by their GFW vessel IDs. Returns vessel metadata including a mapUrl for each vessel, and a relatedIdentities array with other AIS identities linked to the same physical vessel (e.g. different MMSI or name periods). Use when you already know the vessel ID(s) and want to fetch their full profile.',
      inputSchema: {
        ids: z
          .array(z.string().min(1))
          .min(1)
          .describe('List of GFW vessel IDs to look up.'),
      },
      outputSchema: {
        total: z.number(),
        dataCaveats: z
          .array(z.string())
          .optional()
          .describe(
            'Array of markdown strings with data caveats. IMPORTANT: Always display every item to the user when present.',
          ),
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
            registryOwners: z.array(
              z.object({
                name: z.string(),
                flag: z.string(),
                ssvid: z.string(),
                sourceCode: z.array(z.string()),
                dateFrom: z.string(),
                dateTo: z.string(),
              }),
            ),
            mapUrl: z
              .string()
              .nullish()
              .describe(
                "Global Fishing Watch map URL to view this vessel's profile and track. IMPORTANT!! Always share this full link with the user when presenting vessel results.",
              ),
            relatedIdentities: z
              .array(
                z.object({
                  vesselId: z.string(),
                  name: z.string().nullish(),
                  mmsi: z.string().nullish(),
                  imo: z.string().nullish(),
                  callsign: z.string().nullish(),
                  flag: z.string().nullish(),
                  activeFrom: z.string().nullish(),
                  activeTo: z.string().nullish(),
                  mapUrl: z
                    .string()
                    .nullish()
                    .describe(
                      "Map URL for this related identity's profile and track.",
                    ),
                }),
              )
              .describe(
                'Other AIS identities linked to the same physical vessel (different MMSI or name/flag periods). Empty array if none. Show to the user when present.',
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
