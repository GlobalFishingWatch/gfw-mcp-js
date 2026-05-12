import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { generateVesselProfileUrl } from '../lib/map-url-generator.js';
import { VESSEL_IDENTITY_CAVEATS } from '../lib/caveats.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { VesselSearchResponse } from '../lib/types.js';

const DATASET = 'public-global-vessel-identity:v4.0';

export async function vesselSearch({
  name,
  mmsi,
  imo,
  callsign,
  flag,
  owner,
  activeFrom,
  activeTo,
  limit,
}: {
  name?: string;
  mmsi?: string;
  imo?: string;
  callsign?: string;
  flag?: string;
  owner?: string;
  activeFrom?: string;
  activeTo?: string;
  limit?: number;
}) {
  const maxResults = limit ?? 10;

  if (maxResults > 50) {
    return createErrorResponse('Limit cannot exceed 50 results.');
  }

  const conditions: string[] = [];
  if (callsign) conditions.push(`callsign = '${callsign.toUpperCase()}'`);
  if (flag) conditions.push(`flag = '${flag.toUpperCase()}'`);
  if (imo) conditions.push(`imo = '${imo.toUpperCase()}'`);
  if (mmsi) conditions.push(`ssvid = '${mmsi.toUpperCase()}'`);
  if (activeTo)
    conditions.push(`transmissionDateFrom < '${activeTo}T23:59:59Z'`);
  if (activeFrom)
    conditions.push(`transmissionDateTo > '${activeFrom}T00:00:00Z'`);
  if (name) conditions.push(`shipname LIKE '*${name.toUpperCase()}*'`);
  if (owner)
    conditions.push(`registryOwners.name LIKE '*${owner.toUpperCase()}*'`);

  if (conditions.length === 0) {
    return createErrorResponse(
      'No search criteria provided. At least one filter must be specified for a meaningful search.',
    );
  }

  const params: Record<string, string> = {
    'datasets[0]': DATASET,
    limit: String(maxResults),
    where: conditions.join(' AND '),
    'includes[0]': 'OWNERSHIP',
  };

  const response = await gfwFetch('/v3/vessels/search', params);
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
    };
  });

  return {
    total: data.total,
    limit: data.limit,
    results,
    ...(VESSEL_IDENTITY_CAVEATS.length > 0 && { dataCaveats: VESSEL_IDENTITY_CAVEATS }),
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'vessel-search',
    {
      title: 'Vessel Search',
      description:
        "Search vessels by name, MMSI, IMO, callsign, flag, gear type, or activity date range. Returns basic vessel metadata and identifiers, including a mapUrl for each vessel. Use the mapUrl to link the user directly to the vessel's profile on the Global Fishing Watch map. All filters are optional but at least one should be provided for meaningful results.",
      inputSchema: {
        name: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            'Vessel name or partial name (case-insensitive wildcard match).',
          ),
        mmsi: z
          .string()
          .regex(/^[0-9]{9}$/, 'MMSI must be a 9-digit string.')
          .optional()
          .describe('Maritime Mobile Service Identity (9 digits).'),
        imo: z
          .string()
          .regex(/^[0-9]{7}$/, 'IMO must be a 7-digit string.')
          .optional()
          .describe('IMO number (7 digits).'),
        callsign: z
          .string()
          .trim()
          .optional()
          .describe('Vessel radio callsign (exact match).'),
        owner: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            'Vessel owner name or partial name (case-sensitive wildcard match).',
          ),
        flag: z
          .string()
          .regex(
            /^[A-Z]{3}$/,
            'Use ISO 3166-1 alpha-3 country code (e.g., "ESP").',
          )
          .optional()
          .describe('Flag state ISO 3166-1 alpha-3 code (e.g., "ESP", "USA").'),
        activeFrom: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Use ISO 8601 date format YYYY-MM-DD for activeFrom.',
          )
          .optional()
          .describe(
            'Filter for vessels active on or after this date (ISO 8601).',
          ),
        activeTo: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Use ISO 8601 date format YYYY-MM-DD for activeTo.',
          )
          .optional()
          .describe(
            'Filter for vessels active on or before this date (ISO 8601). IMPORTANT! this date is exclusive.',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe(
            'Maximum number of results to return (default 10, max 50).',
          ),
      },
      outputSchema: {
        total: z.number(),
        limit: z.number(),
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
          }),
        ),
      },
    },
    async (params) => {
      try {
        const output = await vesselSearch(params);
        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to search vessels: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
