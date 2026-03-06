import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gfwFetch } from '../lib/api.js';
import { createErrorResponse, createToolResponse } from '../lib/response.js';
import { EventsResponse } from '../lib/types.js';

const datasetsByType = {
  fishing: 'public-global-fishing-events:latest',
  encounter: 'public-global-encounters-events:latest',
  port_visit: 'public-global-port-visits-events:latest',
  loitering: 'public-global-loitering:latest',
};

export function register(server: McpServer) {
  server.registerTool(
    'vessel-events',
    {
      title: 'Vessel Events Lookup',
      description:
        'Retrieve fishing events from the Global Fishing Watch API. Filter by event type, date range, vessel ID, and region. Results include event metadata, positions, and vessel info.',
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
          .optional()
          .describe(
            'Only include events on/after this date. If omitted, defaults to one month ago.',
          ),
        endDate: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Use ISO 8601 date format YYYY-MM-DD for endDate.',
          )
          .optional()
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
          }),
        ),
      },
    },
    async ({ eventType, startDate, endDate, vesselId, limit, offset }) => {
      try {
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

        const response = await gfwFetch('/v3/events', params);
        const data: EventsResponse = await response.json();

        const entries = data.entries.map((e) => ({
          id: e.id,
          type: e.type,
          start: e.start,
          end: e.end,
          lat: e.position.lat,
          lon: e.position.lon,
          vesselId: e.vessel.id,
          vesselName: e.vessel.name,
          vesselFlag: e.vessel.flag,
        }));

        const output = {
          total: data.total,
          limit: data.limit,
          offset: data.offset,
          nextOffset: data.nextOffset || 0,
          entries,
        };

        return createToolResponse(JSON.stringify(output, null, 2), output);
      } catch (err) {
        return createErrorResponse(
          `Failed to fetch vessel events: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );
}
