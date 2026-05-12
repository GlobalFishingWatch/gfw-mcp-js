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

const ACTIVITY_CAVEATS: Partial<Record<ActivityType, string[]>> = {
  FISHING: [
    'To avoid any misinterpretation of the data, please review this [data caveats about apparent fishing effort](https://globalfishingwatch.org/data-documentation/apparent-fishing-effort-ais/) and this about [AIS](https://globalfishingwatch.org/data-documentation/considerations-when-using-automatic-identification-system-ais-data/)',
  ],
  PRESENCE: ['To avoid any misinterpretation of AIS Presence, please review the [data caveats](https://globalfishingwatch.org/our-apis/documentation#ais-vessel-presence-caveats) and this about [AIS](https://globalfishingwatch.org/data-documentation/considerations-when-using-automatic-identification-system-ais-data/)'],
  SAR: ['To avoid any misinterpretation of SAR Vessel Detections, please review the [data caveats](https://globalfishingwatch.org/our-apis/documentation#sar-vessel-detections-data-caveats)'],
  SENTINEL2: ['To avoid any misinterpretation of Sentinel-2 Vessel Detections, please review the [data caveats](https://globalfishingwatch.org/data-download/datasets/public-sentinel2-vessel-detections%3Av1.0#caveats)'],
};

export async function areaReport({
  regionType,
  regionId,
  regionWorld,
  startDate,
  endDate,
  type,
  flags,
  vesselTypes,
  speeds,
  geartypes,
  groupBy,
  topVesselsLimit,
}: {
  regionType?: 'MPA' | 'EEZ' | 'RFMO';
  regionId?: string;
  regionWorld?: boolean;
  startDate: string;
  endDate: string;
  type?: 'FISHING' | 'PRESENCE' | 'SAR' | 'SENTINEL2';
  flags?: string[];
  vesselTypes?: string[];
  speeds?: string[];
  geartypes?: string[];
  groupBy?: 'VESSEL_ID' | 'FLAG' | 'GEARTYPE' | 'FLAGANDGEARTYPE';
  topVesselsLimit?: number;
}) {
  if (regionWorld && (regionType || regionId)) {
    return createErrorResponse(
      'regionWorld cannot be combined with regionType or regionId. Use one or the other.',
    );
  }
  if (!regionWorld && (!regionType || !regionId)) {
    return createErrorResponse(
      'regionType and regionId are required when regionWorld is not set to true.',
    );
  }

  const activityType: ActivityType = type ?? 'FISHING';
  const groupByValue = groupBy ?? 'VESSEL_ID';
  const topLimit = topVesselsLimit ?? 10;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const msInYear = 365 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > msInYear) {
    return createErrorResponse(
      'The report date range cannot exceed 1 year. Please reduce the range between startDate and endDate.',
    );
  }

  if (
    activityType === 'PRESENCE' &&
    (groupByValue === 'GEARTYPE' || groupByValue === 'FLAGANDGEARTYPE')
  ) {
    return createErrorResponse(
      'groupBy "GEARTYPE" and "FLAGANDGEARTYPE" are only valid when type is "FISHING", "SAR", or "SENTINEL2".',
    );
  }
  if (
    (activityType === 'FISHING' ||
      activityType === 'SAR' ||
      activityType === 'SENTINEL2') &&
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
      'geartypes filter is only valid when type is "FISHING", "SAR", or "SENTINEL2".',
    );
  }

  const activityDataset = ACTIVITY_DATASETS[activityType];
  const flagList = Array.isArray(flags) ? flags : [];
  const speedList = Array.isArray(speeds) ? speeds : [];
  const vesselTypeList = Array.isArray(vesselTypes) ? vesselTypes : [];
  const geartypeList = Array.isArray(geartypes) ? geartypes : [];

  const filters = [];
  if (flagList.length > 0)
    filters.push(`flag IN (${flagList.map((f) => `'${f}'`).join(',')})`);
  if (speedList.length > 0)
    filters.push(`speed IN (${speedList.map((s) => `'${s}'`).join(',')})`);
  if (vesselTypeList.length > 0)
    filters.push(
      `vessel_type IN (${vesselTypeList.map((t) => `'${t}'`).join(',')})`,
    );
  if (geartypeList.length > 0)
    filters.push(
      `geartype IN (${geartypeList.map((g) => `'${g}'`).join(',')})`,
    );

  const params: Record<string, string> = {
    format: 'JSON',
    'datasets[0]': activityDataset,
    'date-range': `${startDate}T00:00:00.000Z,${endDate}T23:59:59.999Z`,
    'spatial-aggregation': 'true',
    'temporal-resolution': 'ENTIRE',
    'group-by': groupByValue,
  };
  if (regionWorld) {
    params['region-world'] = 'true';
  } else if (regionId && regionType) {
    params['region-id'] = regionId;
    params['region-dataset'] = REGION_DATASETS[regionType];
  }
  if (filters.length > 0) params['filters[0]'] = filters.join(' AND ');

  const response = await gfwFetch('/v3/4wings/report', params);
  const data: ReportResponse = await response.json();

  const isSarType = activityType === 'SAR' || activityType === 'SENTINEL2';
  const allRawRows = data.entries.flatMap(
    (entry) => entry[activityDataset] ?? [],
  );

  const getValue = (row: (typeof allRawRows)[number]): number =>
    isSarType
      ? (row as { detections: number }).detections
      : (row as FishingEffortEntry).hours;

  const fishingHours = allRawRows.reduce((sum, row) => sum + getValue(row), 0);

  const topVessels =
    groupByValue === 'VESSEL_ID'
      ? [...(allRawRows as FishingEffortEntry[])]
          .sort((a, b) => getValue(b) - getValue(a))
          .slice(0, topLimit)
          .map((row) => ({
            vesselId: row.vesselId,
            shipName: row.shipName,
            mmsi: row.mmsi,
            flag: row.flag,
            geartype: row.geartype,
            value: getValue(row),
          }))
      : undefined;

  const rows = (() => {
    if (groupByValue === 'VESSEL_ID') return undefined;
    const aggregated = new Map<
      string,
      { key: Record<string, string | undefined>; hours: number }
    >();
    for (const row of allRawRows) {
      const r = row as FishingEffortEntry;
      const key =
        groupByValue === 'FLAG'
          ? r.flag
          : groupByValue === 'GEARTYPE'
            ? r.geartype
            : `${r.flag}__${r.geartype}`;
      const keyFields: Record<string, string | undefined> =
        groupByValue === 'FLAG'
          ? { flag: r.flag }
          : groupByValue === 'GEARTYPE'
            ? { geartype: r.geartype }
            : { flag: r.flag, geartype: r.geartype };
      const existing = aggregated.get(key);
      if (existing) {
        existing.hours += getValue(row);
      } else {
        aggregated.set(key, { key: keyFields, hours: getValue(row) });
      }
    }
    return [...aggregated.values()]
      .sort((a, b) => b.hours - a.hours)
      .map(({ key, hours }) => ({ ...key, hours }));
  })();

  const gfwMapUrl = generateReportUrl(
    regionId ?? null,
    regionType ?? null,
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

  const activityValue =
    activityType === 'FISHING'
      ? { fishingHours }
      : activityType === 'PRESENCE'
        ? { presenceHours: fishingHours }
        : { detections: fishingHours };

  const dataCaveats = ACTIVITY_CAVEATS[activityType];

  return {
    ...(regionWorld ? { regionWorld: true } : { regionType, regionId }),
    dateRange: { start: startDate, end: endDate },
    ...activityValue,
    ...(topVessels && { topVessels }),
    ...(rows && { rows }),
    ...(flagList.length > 0 && { flags: flagList }),
    ...(vesselTypeList.length > 0 && { vesselTypes: vesselTypeList }),
    ...(speedList.length > 0 && { speeds: speedList }),
    ...(geartypeList.length > 0 && { geartypes: geartypeList }),
    gfwMapUrl,
    ...(dataCaveats && { dataCaveats }),
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'area-report',
    {
      title: 'Activity Hours Calculator',
      description:
        'Returns the number of activity hours for a given time period either worldwide or within a specific Marine Protected Area (MPA), Exclusive Economic Zone (EEZ), or Regional Fisheries Management Organisation (RFMO). For a specific region, provide regionType and regionId (use the Region ID Lookup tool if you only have the name). For a global report covering the entire world, set regionWorld to true and omit regionType and regionId — these two modes are mutually exclusive. Optionally filters by vessel flag states, gear types, vessel types, and speeds. The tool also provides a link to the Global Fishing Watch (GFW) map where users can view the detailed data visually. IMPORTANT: This tool must NEVER be called in parallel. If multiple reports are needed, call this tool sequentially, one at a time, waiting for each result before making the next call. IMPORTANT: The gfwMapUrl returned by this tool must NEVER be truncated, shortened, or summarized — always display it in its entirety.',
      inputSchema: {
        regionWorld: z
          .boolean()
          .optional()
          .describe(
            'Set to true to run the report for the entire world instead of a specific region. Mutually exclusive with regionType and regionId — do not provide regionType or regionId when this is true.',
          ),
        regionType: z
          .enum(['MPA', 'EEZ', 'RFMO'])
          .optional()
          .describe(
            'Type of region to analyze: MPA (Marine Protected Area), EEZ (Exclusive Economic Zone), or RFMO (Regional Fisheries Management Organisation). Required when regionWorld is not true.',
          ),
        regionId: z
          .string()
          .optional()
          .describe(
            'Canonical ID of the region (MPA, EEZ, or RFMO). Use the Region ID Lookup tool if you only have the name. Required when regionWorld is not true.',
          ),
        startDate: z
          .string()
          .describe(
            'Start date of the report period (ISO 8601 format: YYYY-MM-DD)',
          ),
        endDate: z
          .string()
          .describe(
            'End date of the report period (ISO 8601 format: YYYY-MM-DD). IMPORTANT! this date is exclusive. The range between startDate and endDate must not exceed 1 year.',
          ),
        type: z
          .enum(['FISHING', 'PRESENCE', 'SAR', 'SENTINEL2'])
          .optional()
          .describe(
            'Type of activity data to use for the report. ' +
              '"FISHING" (default) uses AIS-based fishing effort data — hours when a vessel was actively fishing as detected by its movement pattern. Use this to answer questions about fishing activity, fishing pressure, or fishing hours inside a region. ' +
              '"PRESENCE" uses vessel presence data — hours when any vessel was present inside the region regardless of whether it was fishing. Use this when the question is about vessel traffic, transit, or total time spent in the area. ' +
              '"SAR" uses Synthetic Aperture Radar (SAR) vessel detection data — presence hours detected via satellite radar regardless of AIS transmission. Supports the same filters and groupBy options as "FISHING". ' +
              '"SENTINEL2" uses Sentinel-2 optical satellite imagery vessel detection data — presence hours detected via satellite optical imagery regardless of AIS transmission. Supports the same filters and groupBy options as "FISHING".',
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
            'Optional list of gear types to filter by. Only applicable when type is "FISHING", "SAR", or "SENTINEL2". When omitted, all gear types are included.',
          ),
        groupBy: z
          .enum(['VESSEL_ID', 'FLAG', 'GEARTYPE', 'FLAGANDGEARTYPE'])
          .optional()
          .describe(
            'How to group the report results. ' +
              '"VESSEL_ID" (default): results grouped per individual vessel. ' +
              '"FLAG": results aggregated by flag state. ' +
              '"GEARTYPE": results aggregated by gear type — only valid when type is "FISHING", "SAR", or "SENTINEL2". ' +
              '"FLAGANDGEARTYPE": results aggregated by flag state and gear type combined — only valid when type is "FISHING", "SAR", or "SENTINEL2".',
          ),
        topVesselsLimit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            'Number of top vessels to return when groupBy is "VESSEL_ID". Default: 10. Ignored for other groupBy values.',
          ),
      },
      outputSchema: {
        regionWorld: z
          .boolean()
          .optional()
          .describe('True when the report covers the entire world.'),
        regionType: z.enum(['MPA', 'EEZ', 'RFMO']).optional(),
        regionId: z.string().optional(),
        dateRange: z.object({ start: z.string(), end: z.string() }),
        fishingHours: z
          .number()
          .optional()
          .describe(
            'Total fishing hours (AIS-based). Present when type is "FISHING".',
          ),
        presenceHours: z
          .number()
          .optional()
          .describe(
            'Total vessel presence hours (AIS-based). Present when type is "PRESENCE".',
          ),
        detections: z
          .number()
          .optional()
          .describe(
            'Total SAR or Sentinel-2 vessel detections. Present when type is "SAR" or "SENTINEL2".',
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
            'URL to the Global Fishing Watch map showing the detailed fishing activity data for the specified region and date range. IMPORTANT!! Always share this full link with the user when presenting reports. NEVER truncate, shorten, or summarize this URL — always display it in its entirety.',
          ),
        topVessels: z
          .array(
            z.object({
              vesselId: z.string(),
              shipName: z.string().nullish(),
              mmsi: z.string().nullish(),
              flag: z.string().nullish(),
              geartype: z.string().nullish(),
              value: z
                .number()
                .describe(
                  'Hours (FISHING/PRESENCE) or detections (SAR/SENTINEL2).',
                ),
            }),
          )
          .optional()
          .describe(
            'Top 10 vessels sorted descending by activity value. Only present when groupBy is "VESSEL_ID".',
          ),
        rows: z
          .array(z.record(z.string().or(z.number())))
          .optional()
          .describe(
            'Aggregated rows sorted by hours descending. Present when groupBy is "FLAG", "GEARTYPE", or "FLAGANDGEARTYPE". Each row contains the grouping fields plus "hours".',
          ),
        dataCaveats: z
          .array(z.string())
          .optional()
          .describe(
            'Array of markdown strings with data caveats for the requested activity type. Present when caveats exist for the type (e.g. "FISHING"). IMPORTANT: Always display all these to the user when present.',
          ),
      },
    },
    async (params) => {
      try {
        const output = await areaReport(params);
        if ('isError' in output) return output;
        const flagText =
          output.flags && output.flags.length > 0
            ? `\nFlag Filters: ${output.flags.join(', ')}`
            : '';
        const activityType = params.type ?? 'FISHING';
        const reportTitle =
          activityType === 'FISHING'
            ? 'Fishing Hours Report'
            : activityType === 'SAR'
              ? 'SAR Detections Report'
              : activityType === 'SENTINEL2'
                ? 'Sentinel-2 Detections Report'
                : 'Presence Hours Report';
        const activitySummary =
          activityType === 'FISHING'
            ? `Total Fishing Hours: ${output.fishingHours} hours`
            : activityType === 'PRESENCE'
              ? `Total Presence Hours: ${output.presenceHours} hours`
              : `Total Detections: ${output.detections}`;
        const regionLabel =
          'regionWorld' in output
            ? 'World'
            : `${'regionType' in output ? output.regionType : ''} ID: ${'regionId' in output ? output.regionId : ''}`;
        const caveatsText =
          output.dataCaveats && output.dataCaveats.length > 0
            ? `\n${output.dataCaveats.join('\n')}`
            : '';
        const responseText = `${reportTitle} for ${regionLabel}${flagText}
Date Range: ${output.dateRange.start} to ${output.dateRange.end}

${activitySummary}

View detailed data on the Global Fishing Watch map:
${output.gfwMapUrl}
${caveatsText}
Full data: ${JSON.stringify(output, null, 2)}`;
        return createToolResponse(
          responseText,
          output as unknown as Record<string, unknown>,
        );
      } catch (err) {
        const activityType = params.type ?? 'FISHING';
        const activityLabel =
          activityType === 'FISHING'
            ? 'fishing'
            : activityType === 'SAR'
              ? 'SAR presence'
              : activityType === 'SENTINEL2'
                ? 'Sentinel-2 presence'
                : 'presence';
        return createErrorResponse(
          `Failed to generate ${activityLabel} hours report: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
