import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { generateReportUrl } from '../lib/map-url-generator.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import {
  ACTIVITY_DATASETS,
  ActivityType,
  FishingEffortEntry,
  REGION_DATASETS,
  ReportResponse,
} from '../lib/types.js';

export function register(server: McpServer) {
  server.registerTool(
    'vessel-report',
    {
      title: 'Activity Hours Calculator',
      description:
        'Returns the number of activity hours for a given time period in a specific Marine Protected Area (MPA), Exclusive Economic Zone (EEZ), or Regional Fisheries Management Organisation (RFMO) identified by its canonical region ID. Use the Region ID Lookup tool first if you only know the human-readable name. Optionally filters by one or multiple vessel flag states. This tool calculates and reports the total fishing activity hours detected within the region boundaries during the specified date range. The tool also provides a link to the Global Fishing Watch (GFW) map where users can view the detailed data and navigate the fishing activity visually. IMPORTANT: This tool must NEVER be called in parallel. If multiple reports are needed, call this tool sequentially, one at a time, waiting for each result before making the next call.',
      inputSchema: {
        regionType: z
          .enum(['MPA', 'EEZ', 'RFMO'])
          .describe(
            'Type of region to analyze: MPA (Marine Protected Area), EEZ (Exclusive Economic Zone), or RFMO (Regional Fisheries Management Organisation)',
          ),
        regionId: z
          .string()
          .describe(
            'Canonical ID of the region (MPA, EEZ, or RFMO). Use the Region ID Lookup tool if you only have the name.',
          ),
        startDate: z
          .string()
          .describe(
            'Start date of the report period (ISO 8601 format: YYYY-MM-DD)',
          ),
        endDate: z
          .string()
          .describe(
            'End date of the report period (ISO 8601 format: YYYY-MM-DD). IMPORTANT! this date is exclusive.',
          ),
        type: z
          .enum(['FISHING', 'PRESENCE'])
          .optional()
          .describe(
            'Type of activity data to use for the report. ' +
              '"FISHING" (default) uses AIS-based fishing effort data — hours when a vessel was actively fishing as detected by its movement pattern. Use this to answer questions about fishing activity, fishing pressure, or fishing hours inside a region. ' +
              '"PRESENCE" uses vessel presence data — hours when any vessel was present inside the region regardless of whether it was fishing. Use this when the question is about vessel traffic, transit, or total time spent in the area.',
          ),
        flags: z
          .array(
            z
              .string()
              .regex(
                /^[A-Z]{3}$/,
                'Use ISO 3166-1 alpha-3 country codes (e.g., "ESP").',
              ),
          )
          .min(1)
          .max(10)
          .optional()
          .describe(
            'Optional list of vessel flag states (ISO 3166-1 alpha-3 codes, e.g., "ESP", "USA", "CHN"). When omitted, all flags are included.',
          ),
        vesselTypes: z
          .array(
            z.enum([
              'carrier',
              'seismic_vessel',
              'passenger',
              'other',
              'support',
              'bunker',
              'gear',
              'cargo',
              'fishing',
              'discrepancy',
            ]),
          )
          .min(1)
          .optional()
          .describe(
            'Optional list of vessel types to filter by. Only applicable when type is "PRESENCE". When omitted, all vessel types are included.',
          ),
        speeds: z
          .array(z.enum(['2-4', '4-6', '6-10', '10-15', '15-25', '>25']))
          .min(1)
          .optional()
          .describe(
            'Optional list of speed ranges to filter by. Only applicable when type is "PRESENCE". When omitted, all speeds are included.',
          ),
        geartypes: z
          .array(
            z.enum([
              'tuna_purse_seines',
              'driftnets',
              'trollers',
              'set_longlines',
              'purse_seines',
              'pots_and_traps',
              'other_fishing',
              'dredge_fishing',
              'set_gillnets',
              'fixed_gear',
              'trawlers',
              'fishing',
              'seiners',
              'other_purse_seines',
              'other_seines',
              'squid_jigger',
              'pole_and_line',
              'drifting_longlines',
            ]),
          )
          .min(1)
          .optional()
          .describe(
            'Optional list of gear types to filter by. Only applicable when type is "FISHING". When omitted, all gear types are included.',
          ),
      },
      outputSchema: {
        regionType: z.enum(['MPA', 'EEZ', 'RFMO']),
        regionId: z.string(),
        dateRange: z.object({ start: z.string(), end: z.string() }),
        fishingHours: z
          .number()
          .describe(
            'Total number of fishing hours detected in the region during the specified date range',
          ),
        flags: z
          .array(z.string().regex(/^[A-Z]{3}$/))
          .optional()
          .describe(
            'Flag state filters applied (if any). ISO 3166-1 alpha-3 codes.',
          ),
        vesselTypes: z
          .array(z.string())
          .optional()
          .describe('Vessel type filters applied (if any).'),
        speeds: z
          .array(z.string())
          .optional()
          .describe('Speed range filters applied (if any).'),
        geartypes: z
          .array(z.string())
          .optional()
          .describe('Gear type filters applied (if any).'),
        gfwMapUrl: z
          .string()
          .describe(
            'URL to the Global Fishing Watch map showing the detailed fishing activity data for the specified region and date range. IMPORTANT!! Always share this full link with the user when presenting reports. ',
          ),
        topVessels: z
          .array(
            z.object({
              vesselId: z.string(),
              shipName: z.string().nullish(),
              mmsi: z.string().nullish(),
              flag: z.string().nullish(),
              geartype: z.string().nullish(),
              hours: z.number(),
            }),
          )
          .describe('Top 10 vessels by fishing/presence hours in the region'),
      },
    },
    async ({
      regionType,
      regionId,
      startDate,
      endDate,
      type,
      flags,
      vesselTypes,
      speeds,
      geartypes,
    }) => {
      const activityType: ActivityType = type ?? 'FISHING';
      try {
        if (
          activityType === 'FISHING' &&
          Array.isArray(vesselTypes) &&
          vesselTypes.length > 0
        ) {
          return createErrorResponse(
            'vesselTypes filter is only valid when type is "PRESENCE".',
          );
        }
        if (
          activityType === 'PRESENCE' &&
          Array.isArray(geartypes) &&
          geartypes.length > 0
        ) {
          return createErrorResponse(
            'geartypes filter is only valid when type is "FISHING".',
          );
        }

        const activityDataset = ACTIVITY_DATASETS[activityType];
        const flagList = Array.isArray(flags) ? flags : [];
        const speedList = Array.isArray(speeds) ? speeds : [];
        const vesselTypeList = Array.isArray(vesselTypes) ? vesselTypes : [];
        const geartypeList = Array.isArray(geartypes) ? geartypes : [];

        const filters = [];
        if (flagList.length > 0) {
          filters.push(`flag IN (${flagList.map((f) => `'${f}'`).join(',')})`);
        }
        if (speedList.length > 0) {
          filters.push(
            `speed IN (${speedList.map((s) => `'${s}'`).join(',')})`,
          );
        }
        if (vesselTypeList.length > 0) {
          filters.push(
            `vessel_type IN (${vesselTypeList.map((t) => `'${t}'`).join(',')})`,
          );
        }
        if (geartypeList.length > 0) {
          filters.push(
            `geartype IN (${geartypeList.map((g) => `'${g}'`).join(',')})`,
          );
        }

        const params: Record<string, string> = {
          format: 'JSON',
          'datasets[0]': activityDataset,
          'date-range': `${startDate}T00:00:00.000Z,${endDate}T23:59:59.999Z`,
          'spatial-aggregation': 'true',
          'temporal-resolution': 'ENTIRE',
          'region-id': regionId,
          'region-dataset': REGION_DATASETS[regionType],
          'group-by': 'VESSEL_ID',
        };
        if (filters.length > 0) {
          params['filters[0]'] = filters.join(' AND ');
        }

        const response = await gfwFetch('/v3/4wings/report', params);
        const data: ReportResponse = await response.json();

        const allRows: FishingEffortEntry[] = data.entries.flatMap(
          (entry) => entry[activityDataset] ?? [],
        );

        const fishingHours = allRows.reduce((sum, row) => sum + row.hours, 0);

        const topVessels = [...allRows]
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10)
          .map((row) => ({
            vesselId: row.vesselId,
            shipName: row.shipName,
            mmsi: row.mmsi,
            flag: row.flag,
            geartype: row.geartype,
            hours: row.hours,
          }));

        const gfwMapUrl = generateReportUrl(
          regionId,
          regionType,
          activityType,
          startDate,
          endDate,
          {
            speed: speedList,
            vesselType: vesselTypeList,
            geartype: geartypeList,
            flag: flagList,
          },
        );

        const output = {
          regionType,
          regionId,
          dateRange: { start: startDate, end: endDate },
          fishingHours,
          topVessels,
          ...(flagList.length > 0 && { flags: flagList }),
          ...(vesselTypeList.length > 0 && { vesselTypes: vesselTypeList }),
          ...(speedList.length > 0 && { speeds: speedList }),
          ...(geartypeList.length > 0 && { geartypes: geartypeList }),
          gfwMapUrl,
        };

        const flagText =
          flagList.length > 0 ? `\nFlag Filters: ${flagList.join(', ')}` : '';
        const responseText = `${activityType === 'FISHING' ? 'Fishing Hours Report' : 'Presence Hours Report'} for ${regionType} ID: ${regionId}${flagText}
Date Range: ${startDate} to ${endDate}

Total ${activityType} Hours: ${output.fishingHours} hours

View detailed data on the Global Fishing Watch map:
${gfwMapUrl}

Full data: ${JSON.stringify(output, null, 2)}`;

        return createToolResponse(responseText, output);
      } catch (err) {
        return createErrorResponse(
          `Failed to generate ${activityType} hours report: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
