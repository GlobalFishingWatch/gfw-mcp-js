import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { EVENT_TYPE_CAVEATS } from '../lib/caveats.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import {
  EventsResponse,
  EventsStatsResponse,
  REGION_DATASETS,
} from '../lib/types.js';
import { createStatsMapUrl } from '../lib/map-url-generator.js';

const datasetsByType = {
  fishing: 'public-global-fishing-events:latest',
  encounter: 'public-global-encounters-events:latest',
  port_visit: 'public-global-port-visits-events:latest',
  loitering: 'public-global-loitering-events:latest',
};

const MAX_FETCH = 500;

export async function eventsStats({
  eventType,
  startDate,
  endDate,
  confidence,
  encounterTypes,
  regionType,
  regionId,
  groupBy = 'FLAG',
}: {
  eventType: 'fishing' | 'encounter' | 'port_visit' | 'loitering';
  startDate: string;
  endDate: string;
  confidence?: number[];
  encounterTypes?: (
    | 'CARRIER-FISHING'
    | 'CARRIER-BUNKER'
    | 'FISHING-BUNKER'
    | 'FISHING-FISHING'
    | 'SUPPORT-FISHING'
  )[];
  regionType?: 'MPA' | 'EEZ' | 'RFMO';
  regionId?: string;
  groupBy?: 'FLAG' | 'GEARTYPE';
}) {
  if (confidence !== undefined && eventType !== 'port_visit') {
    return createErrorResponse(
      'The confidence filter is only valid when eventType is "port_visit".',
    );
  }
  if (encounterTypes !== undefined && eventType !== 'encounter') {
    return createErrorResponse(
      'The encounterTypes filter is only valid when eventType is "encounter".',
    );
  }
  if ((regionType === undefined) !== (regionId === undefined)) {
    return createErrorResponse(
      'regionType and regionId must be provided together.',
    );
  }

  const dataset = datasetsByType[eventType];
  const startIso = startDate
    ? `${startDate}T00:00:00.000Z`
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endIso = endDate
    ? `${endDate}T23:59:59.999Z`
    : new Date().toISOString();

  const params: Record<string, string> = {
    'datasets[0]': dataset,
    'start-date': startIso,
    'end-date': endIso,
    'group-by': groupBy.toUpperCase(),
    'time-filter-mode': 'START-DATE',
    'includes[0]': 'EVENTS_GROUPED',
    'includes[1]': 'TOTAL_COUNT',
    'timeseries-interval': 'YEAR',
  };

  if (regionType && regionId) {
    params['region-ids[0]'] = regionId;
    params['region-datasets[0]'] = REGION_DATASETS[regionType];
  }

  if (eventType === 'port_visit') {
    const confidenceList = confidence ?? [4];
    confidenceList.forEach((v, i) => {
      params[`confidences[${i}]`] = String(v);
    });
  }

  if (eventType === 'encounter') {
    const encounterTypeList = encounterTypes ?? [
      'CARRIER-FISHING',
      'SUPPORT-FISHING',
    ];
    const expanded: string[] = [];
    for (const v of encounterTypeList) {
      expanded.push(v);
      if (v !== 'FISHING-FISHING') {
        expanded.push(v.split('-').reverse().join('-'));
      }
    }
    [...new Set(expanded)].forEach((v, i) => {
      params[`encounter-types[${i}]`] = v;
    });
  }

  const response = await gfwFetch('/v3/events/stats', params);
  const data: EventsStatsResponse = await response.json();
  // TODO: take in account filters
  data.mapUrl = createStatsMapUrl(
    startDate,
    endDate,
    eventType,
    regionType,
    regionId,
  );
  const dataCaveats = EVENT_TYPE_CAVEATS[eventType] ?? [];
  return {
    ...data,
    ...(dataCaveats.length > 0 && { dataCaveats }),
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'events-stats',
    {
      title: 'Events Statistics',
      description:
        'Compute aggregate statistics for events (fishing, encounters, port visits, loitering) over a date range. Optionally filter by region (MPA, EEZ, RFMO) and group results by flag or gear type. Returns total event count, unique flags, unique vessels, grouped counts, and a GFW map URL to visualise the results (not available for fishing events).',
      inputSchema: {
        eventType: z
          .enum(['fishing', 'encounter', 'port_visit', 'loitering'])
          .describe('Type of event to analyse.'),
        startDate: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Use ISO 8601 date format YYYY-MM-DD for startDate.',
          )
          .describe(
            'Only include events on/after this date. If omitted, defaults to one month ago.',
          ),
        endDate: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Use ISO 8601 date format YYYY-MM-DD for endDate. IMPORTANT! this date is exclusive.',
          )
          .describe(
            'Only include events on/before this date. If omitted, defaults to today.',
          ),
        confidence: z
          .array(z.number().int().min(2).max(4))
          .min(1)
          .optional()
          .describe(
            'Confidence levels to include for port visits. Each value must be 2, 3, or 4. Only valid when eventType is "port_visit". ALWAYS default to [4] unless the user explicitly requests other confidence levels.',
          ),
        encounterTypes: z
          .array(
            z.enum([
              'CARRIER-FISHING',
              'CARRIER-BUNKER',
              'FISHING-BUNKER',
              'FISHING-FISHING',
              'SUPPORT-FISHING',
            ]),
          )
          .min(1)
          .optional()
          .describe(
            'Types of encounters to include. Only valid when eventType is "encounter". ALWAYS default to ["CARRIER-FISHING", "SUPPORT-FISHING"] unless the user explicitly requests other encounter types.',
          ),
        regionType: z
          .enum(['MPA', 'EEZ', 'RFMO'])
          .optional()
          .describe(
            'Type of region to filter by: MPA (Marine Protected Area), EEZ (Exclusive Economic Zone), or RFMO (Regional Fisheries Management Organisation). Must be provided together with regionId.',
          ),
        regionId: z
          .string()
          .optional()
          .describe(
            'Canonical ID of the region (MPA, EEZ, or RFMO). Use the Region ID Lookup tool if you only have the name. Must be provided together with regionType.',
          ),
        groupBy: z
          .enum(['FLAG', 'GEARTYPE'])
          .optional()
          .describe(
            'Dimension to group events by in the "groups" output. Defaults to "flag". ' +
              '"FLAG": counts per vessel flag state. ' +
              '"GEARTYPE": counts per vessel gear type.',
          ),
      },
      outputSchema: {
        flags: z
          .array(z.string())
          .describe('All unique flag states found in the matching events.'),
        numEvents: z
          .number()
          .describe('Total number of matching events fetched (up to 500).'),
        numFlags: z.number().describe('Number of unique flag states.'),
        numVessels: z.number().describe('Number of unique vessels.'),
        groups: z
          .array(z.object({ name: z.string(), value: z.number() }))
          .describe(
            'Counts grouped by the chosen groupBy dimension, sorted descending by value. Empty when groupBy is not specified.',
          ),
        mapUrl: z
          .string()
          .nullable()
          .optional()
          .describe(
            'GFW map URL to visualise the queried events. Not present when eventType is "fishing".',
          ),
        dataCaveats: z
          .array(z.string())
          .optional()
          .describe(
            'Array of markdown strings with data caveats for the requested event type. Present when caveats exist. IMPORTANT: Always display every item to the user when present.',
          ),
      },
    },
    async (params) => {
      try {
        const data = await eventsStats(params);
        return createToolResponse(
          JSON.stringify(data, null, 2),
          data as Record<string, unknown>,
        );
      } catch (err) {
        return createErrorResponse(
          `Failed to compute event statistics: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
