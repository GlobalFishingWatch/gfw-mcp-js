import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { generateVesselProfileUrl } from '../lib/map-url-generator.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { VesselInsightsResponse } from '../lib/types.js';

const VESSEL_DATASET = 'public-global-vessel-identity:latest';

const INSIGHT_TYPES = [
  'FISHING',
  'GAP',
  'COVERAGE',
  'VESSEL-IDENTITY-IUU-VESSEL-LIST',
] as const;
type InsightType = (typeof INSIGHT_TYPES)[number];

export async function vesselInsights({
  vesselIds,
  startDate,
  endDate,
  includes,
}: {
  vesselIds: string[];
  startDate: string;
  endDate: string;
  includes: InsightType[];
}): Promise<VesselInsightsResponse & { mapUrls: Record<string, string> }> {
  const params: Record<string, string> = {
    'start-date': `${startDate}T00:00:00.000Z`,
    'end-date': `${endDate}T23:59:59.999Z`,
  };
  vesselIds.forEach((id, i) => {
    params[`vessels[${i}]`] = id;
    params[`datasets[${i}]`] = VESSEL_DATASET;
  });
  includes.forEach((type, i) => {
    params[`includes[${i}]`] = type;
  });

  const response = await gfwFetch('/v3/insights/vessels', params);
  const data: VesselInsightsResponse = await response.json();

  const mapUrls: Record<string, string> = {};
  vesselIds.forEach((id) => {
    mapUrls[id] = generateVesselProfileUrl(id, startDate, endDate);
  });

  return { ...data, mapUrls };
}

export function register(server: McpServer) {
  server.registerTool(
    'vessel-insights',
    {
      title: 'Vessel Insights',
      description:
        'Retrieve insights for one or more vessels over a date range. Supports four insight types: ' +
        '"FISHING" — apparent fishing events detected, including events inside RFMOs without known authorization and inside no-take MPAs; ' +
        '"GAP" — AIS-off events (suspected dark activity periods where the vessel stopped broadcasting AIS); ' +
        '"COVERAGE" — AIS reception coverage percentage (how reliably the vessel was tracked via satellite); ' +
        '"VESSEL-IDENTITY-IUU-VESSEL-LIST" — number of times the vessel appeared on IUU (Illegal, Unreported, Unregulated) vessel lists during the period. ' +
        'Multiple types can be requested in a single call. Results are returned as a single object with one field per requested type.',
      inputSchema: {
        vesselIds: z
          .array(z.string())
          .min(1)
          .describe('One or more GFW vessel IDs to retrieve insights for.'),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use ISO 8601 date format YYYY-MM-DD.')
          .describe('Start date of the insight period (YYYY-MM-DD).'),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use ISO 8601 date format YYYY-MM-DD.')
          .describe('End date of the insight period (YYYY-MM-DD).'),
        includes: z
          .array(
            z.enum([
              'FISHING',
              'GAP',
              'COVERAGE',
              'VESSEL-IDENTITY-IUU-VESSEL-LIST',
            ]),
          )
          .min(1)
          .describe(
            'Insight types to include in the response. ' +
              '"FISHING": apparent fishing events and potential violations. ' +
              '"GAP": AIS-off dark activity events. ' +
              '"COVERAGE": AIS reception coverage percentage. ' +
              '"VESSEL-IDENTITY-IUU-VESSEL-LIST": appearances on IUU vessel lists.',
          ),
      },
      outputSchema: {
        period: z.object({
          startDate: z.string(),
          endDate: z.string(),
        }),
        vesselIdsWithoutIdentity: z
          .array(z.string())
          .nullable()
          .describe('Vessel IDs for which no identity data was found, if any.'),
        apparentFishing: z
          .object({
            datasets: z.array(z.string()),
            periodSelectedCounters: z.object({
              events: z.number(),
              eventsInRFMOWithoutKnownAuthorization: z.number(),
              eventsInNoTakeMPAs: z.number(),
            }),
            eventsInRfmoWithoutKnownAuthorization: z.array(z.unknown()),
            eventsInNoTakeMpas: z.array(z.unknown()),
          })
          .optional()
          .describe(
            'Apparent fishing insight. Present when "FISHING" is included.',
          ),
        gap: z
          .object({
            datasets: z.array(z.string()),
            periodSelectedCounters: z.object({
              events: z.number(),
              eventsGapOff: z.number(),
            }),
            aisOff: z.array(z.unknown()),
          })
          .optional()
          .describe(
            'AIS gap (dark activity) insight. Present when "GAP" is included.',
          ),
        coverage: z
          .object({
            blocks: z.string(),
            blocksWithPositions: z.string(),
            percentage: z.number(),
          })
          .optional()
          .describe(
            'AIS reception coverage insight. Present when "COVERAGE" is included.',
          ),
        vesselIdentity: z
          .object({
            datasets: z.array(z.string()),
            iuuVesselList: z.object({
              valuesInThePeriod: z.array(z.unknown()),
              totalTimesListed: z.number(),
              totalTimesListedInThePeriod: z.number(),
            }),
          })
          .optional()
          .describe(
            'IUU vessel list insight. Present when "VESSEL-IDENTITY-IUU-VESSEL-LIST" is included.',
          ),
        mapUrls: z
          .record(z.string())
          .describe(
            "Map URLs keyed by vessel ID. Each URL links to the vessel's profile on the Global Fishing Watch map for the queried period. IMPORTANT!! Always share these full links with the user when presenting results. NEVER truncate, shorten, or summarize them.",
          ),
      },
    },
    async (params) => {
      try {
        const output = await vesselInsights(params);

        const lines: string[] = [
          `Vessel Insights for ${params.vesselIds.length} vessel(s)`,
          `Period: ${output.period.startDate} to ${output.period.endDate}`,
          '',
        ];

        if (output.apparentFishing) {
          const c = output.apparentFishing.periodSelectedCounters;
          lines.push(
            `FISHING: ${c.events} apparent fishing events` +
              (c.eventsInRFMOWithoutKnownAuthorization > 0
                ? `, ${c.eventsInRFMOWithoutKnownAuthorization} in RFMOs without known authorization`
                : '') +
              (c.eventsInNoTakeMPAs > 0
                ? `, ${c.eventsInNoTakeMPAs} in no-take MPAs`
                : ''),
          );
        }
        if (output.gap) {
          const c = output.gap.periodSelectedCounters;
          lines.push(
            `GAP: ${c.events} AIS-off events (${c.eventsGapOff} gap-off)`,
          );
        }
        if (output.coverage) {
          lines.push(
            `COVERAGE: ${output.coverage.percentage.toFixed(1)}% AIS reception (${output.coverage.blocksWithPositions}/${output.coverage.blocks} blocks)`,
          );
        }
        if (output.vesselIdentity) {
          const iuu = output.vesselIdentity.iuuVesselList;
          lines.push(
            `IUU LIST: ${iuu.totalTimesListedInThePeriod} times listed in period (${iuu.totalTimesListed} total)`,
          );
        }

        if (Object.keys(output.mapUrls).length > 0) {
          lines.push('', 'Global Fishing Watch map URLs:');
          Object.entries(output.mapUrls).forEach(([id, url]) => {
            lines.push(`  ${id}: ${url}`);
          });
        }

        lines.push('', `Full data: ${JSON.stringify(output, null, 2)}`);

        return createToolResponse(
          lines.join('\n'),
          output as unknown as Record<string, unknown>,
        );
      } catch (err) {
        return createErrorResponse(
          `Failed to fetch vessel insights: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
