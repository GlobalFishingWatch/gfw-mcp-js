import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import {
  generatePortReportUrl,
  generateVesselProfileUrl,
} from '../lib/map-url-generator.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { EventsResponse, REGION_DATASETS } from '../lib/types.js';

const datasetsByType = {
  fishing: 'public-global-fishing-events:latest',
  encounter: 'public-global-encounters-events:latest',
  port_visit: 'public-global-port-visits-events:latest',
  loitering: 'public-global-loitering-events:latest',
};

export async function vesselEvents({
  eventType,
  startDate,
  endDate,
  vesselId,
  limit,
  offset,
  confidence,
  encounterTypes,
  regionType,
  regionId,
}: {
  eventType: 'fishing' | 'encounter' | 'port_visit' | 'loitering';
  startDate: string;
  endDate: string;
  vesselId?: string;
  limit?: number;
  offset?: number;
  confidence?: number[];
  encounterTypes?: ('CARRIER-FISHING' | 'CARRIER-BUNKER' | 'FISHING-BUNKER' | 'FISHING-FISHING' | 'SUPPORT-FISHING')[];
  regionType?: 'MPA' | 'EEZ' | 'RFMO';
  regionId?: string;
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

  const maxResults = limit ?? 20;
  const pageOffset = offset ?? 0;
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
    limit: String(maxResults),
    offset: String(pageOffset),
    sort: '-start',
  };
  if (vesselId) params['vessels[0]'] = vesselId;
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
    const encounterTypeList = encounterTypes ?? ['CARRIER-FISHING', 'SUPPORT-FISHING'];
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

  const response = await gfwFetch('/v3/events', params);
  const data: EventsResponse = await response.json();

  const entries = data.entries.map((e) => {
    const extrafields: any = {};
    if (eventType === 'port_visit') {
      extrafields['port'] = {
        name: e.port_visit?.intermediateAnchorage?.name ?? null,
        id: e.port_visit?.intermediateAnchorage?.id ?? null,
        flag: e.port_visit?.intermediateAnchorage?.flag ?? null,
      };
    } else if (eventType === 'encounter') {
      extrafields['encounteredVessel'] = {
        name: e.encounter?.vessel?.name ?? null,
        id: e.encounter?.vessel?.id ?? null,
        flag: e.encounter?.vessel?.flag ?? null,
        ssvid: e.encounter?.vessel?.ssvid ?? null,
      };
    }
    return {
      id: e.id,
      type: e.type,
      start: e.start,
      end: e.end,
      lat: e.position.lat,
      lon: e.position.lon,
      vesselId: e.vessel.id,
      regions: {
        mpa: e.regions.mpa ?? [],
        eez: e.regions.eez ?? [],
        rfmo: e.regions.rfmo ?? [],
        fao: e.regions.fao ?? [],
      },
      ...extrafields,
    };
  });

  const mapUrl =
    vesselId && startDate && endDate
      ? generateVesselProfileUrl(vesselId, startDate, endDate, [eventType])
      : null;

  return {
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    nextOffset: data.nextOffset || 0,
    entries,
    mapUrl,
  };
}

export function register(server: McpServer) {
  server.registerTool(
    'vessel-events',
    {
      title: 'Vessel Events Lookup',
      description:
        "Retrieve fishing events from the Global Fishing Watch API. Filter by event type, date range, vessel ID, and region. Results include event metadata, positions, vessel info, and the region IDs (EEZ, MPA, RFMO, FAO) where each event intersects. Use the regions fields in each entry to filter or group events by region — for example, to find all events inside a specific EEZ, MPA, RFMO, or FAO area. Each entry also includes a mapUrl linking to the vessel's profile on the Global Fishing Watch map — share this URL with the user when presenting results.",
      inputSchema: {
        eventType: z
          .enum(['fishing', 'encounter', 'port_visit', 'loitering'])
          .describe('Type of event to retrieve.'),
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
        vesselId: z
          .string()
          .optional()
          .describe(
            'Filter events by a specific vessel ID. Use the Vessel Search tool to find vessel IDs.',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            'Maximum number of events to return (default 20, max 100).',
          ),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Pagination offset (default 0).'),
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
      },
      outputSchema: {
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        nextOffset: z.number().optional(),
        entries: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            start: z.string(),
            end: z.string(),
            lat: z.number(),
            lon: z.number(),
            vesselId: z.string().nullish(),
            vesselName: z.string().nullish(),
            vesselFlag: z.string().nullish(),
            regions: z
              .object({
                mpa: z.array(z.string()),
                eez: z.array(z.string()),
                rfmo: z.array(z.string()),
                fao: z.array(z.string()),
              })
              .describe(
                'Region IDs where the event intersects, grouped by region type. Use these fields to filter or group events by region — for example, to find all events inside a specific EEZ, MPA, RFMO, or FAO area, match against the corresponding array.',
              ),
            port: z
              .object({
                name: z.string().nullish(),
                id: z.string().nullish(),
                flag: z.string().nullish(),
              })
              .optional()
              .describe('Port details. Only present for port_visit events.'),
            encounteredVessel: z
              .object({
                name: z.string().nullish(),
                id: z.string().nullish(),
                flag: z.string().nullish(),
                ssvid: z.string().nullish(),
              })
              .optional()
              .describe(
                'The other vessel involved in the encounter. Only present for encounter events.',
              ),
          }),
        ),
        mapUrl: z
          .string()
          .nullish()
          .describe(
            "Global Fishing Watch map URL to view the vessel's profile for the queried period. IMPORTANT!! Always share this full link with the user when presenting results.",
          ),
      },
    },
    async (params) => {
      try {
        const output = await vesselEvents(params);
        return createToolResponse(JSON.stringify(output, null, 2), output as Record<string, unknown>);
      } catch (err) {
        return createErrorResponse(
          `Failed to fetch vessel events: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
