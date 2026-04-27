#!/usr/bin/env node
import { Command } from 'commander';
import { authLogin, authLogout, authStatus, resolveToken } from './auth.js';
import { vesselSearch } from '../tools/vessel-search.js';
import { vesselById } from '../tools/vessel-by-id.js';
import { vesselEvents } from '../tools/vessel-events.js';
import { eventsStats } from '../tools/events-stats.js';
import { regionIdLookup } from '../tools/region-id-lookup.js';
import { regionGeometry } from '../tools/region-geometry.js';
import { areaReport } from '../tools/area-report.js';
import { vesselInsights } from '../tools/vessel-insights.js';

function print(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function fail(message: string, stdout = 'error'): never {
  if (stdout === 'error') {
    console.error(`Error: ${message}`);
  } else {
    console.log(`Error: ${message}`);
  }
  process.exit(1);
}

const TOKEN_URL = 'https://globalfishingwatch.org/our-apis/tokens';
const TOKEN_HINT = `\n  You need a GFW API token. Generate one at: ${TOKEN_URL}\n  Then run: gfw auth login`;

function isAuthError(message: string): boolean {
  return /401|403|unauthorized|forbidden|no gfw api token/i.test(message);
}

async function run<T>(fn: () => Promise<T>) {
  try {
    // Inject token into env so gfwFetch picks it up
    process.env.API_KEY = resolveToken();
    const result = await fn();
    if (
      result &&
      typeof result === 'object' &&
      'isError' in result &&
      (result as any).isError
    ) {
      const message = (result as any).content?.[0]?.text ?? 'Unknown error';
      fail(isAuthError(message) ? message + TOKEN_HINT : message);
    }
    print(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(
      isAuthError(message) ? message + TOKEN_HINT : message,
      isAuthError(message) ? 'log' : 'error',
    );
  }
}

const program = new Command();

program.name('gfw').description('Global Fishing Watch CLI').version('1.0.0');

// ── mcp ───────────────────────────────────────────────────────────────────────
program
  .command('mcp')
  .description('Start the GFW MCP stdio server')
  .action(async () => {
    const { createServer } = await import('../mcp-server.js');
    const { StdioServerTransport } =
      await import('@modelcontextprotocol/sdk/server/stdio.js');
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // console.error('GFW MCP Server running on stdio');
  });

// ── auth ──────────────────────────────────────────────────────────────────────
const auth = program.command('auth').description('Manage GFW API credentials');

auth.command('login').description('Save a GFW API token').action(authLogin);
auth.command('logout').description('Remove stored token').action(authLogout);
auth
  .command('status')
  .description('Show current token source')
  .action(authStatus);

// ── vessel-search ─────────────────────────────────────────────────────────────
program
  .command('vessel-search')
  .description(
    'Search vessels by name, MMSI, IMO, callsign, flag, or date range',
  )
  .option('--name <name>', 'Vessel name or partial name')
  .option('--mmsi <mmsi>', '9-digit MMSI')
  .option('--imo <imo>', '7-digit IMO number')
  .option('--callsign <callsign>', 'Radio callsign')
  .option('--flag <flag>', 'Flag state ISO 3166-1 alpha-3 (e.g. ESP)')
  .option('--active-from <date>', 'Active on or after this date (YYYY-MM-DD)')
  .option('--active-to <date>', 'Active on or before this date (YYYY-MM-DD)')
  .option('--limit <n>', 'Max results (default 10, max 50)', parseInt)
  .action((opts) =>
    run(() =>
      vesselSearch({
        name: opts.name,
        mmsi: opts.mmsi,
        imo: opts.imo,
        callsign: opts.callsign,
        flag: opts.flag,
        activeFrom: opts.activeFrom,
        activeTo: opts.activeTo,
        limit: opts.limit,
      }),
    ),
  );

// ── vessel-by-id ──────────────────────────────────────────────────────────────
program
  .command('vessel-by-id')
  .description('Fetch vessel profile(s) by GFW vessel ID')
  .requiredOption('--ids <ids...>', 'One or more GFW vessel IDs')
  .action((opts) => run(() => vesselById({ ids: opts.ids })));

// ── vessel-events ─────────────────────────────────────────────────────────────
program
  .command('vessel-events')
  .description('Retrieve fishing, encounter, port visit, or loitering events')
  .requiredOption(
    '--event-type <type>',
    'Event type: fishing | encounter | port_visit | loitering',
  )
  .requiredOption('--start-date <date>', 'Start date YYYY-MM-DD')
  .requiredOption('--end-date <date>', 'End date YYYY-MM-DD')
  .option('--vessel-id <id>', 'Filter by vessel ID')
  .option('--limit <n>', 'Max results (default 20, max 100)', parseInt)
  .option('--offset <n>', 'Pagination offset', parseInt)
  .option(
    '--confidence <levels...>',
    'Confidence levels 2-4 (port_visit only)',
    (v, acc: number[]) => [...acc, parseInt(v)],
    [] as number[],
  )
  .option('--encounter-types <types...>', 'Encounter types (encounter only)')
  .option('--region-type <type>', 'Region type: MPA | EEZ | RFMO')
  .option('--region-id <id>', 'Region canonical ID')
  .action((opts) =>
    run(() =>
      vesselEvents({
        eventType: opts.eventType as any,
        startDate: opts.startDate,
        endDate: opts.endDate,
        vesselId: opts.vesselId,
        limit: opts.limit,
        offset: opts.offset,
        confidence: opts.confidence?.length ? opts.confidence : undefined,
        encounterTypes: opts.encounterTypes?.length
          ? opts.encounterTypes
          : undefined,
        regionType: opts.regionType as any,
        regionId: opts.regionId,
      }),
    ),
  );

// ── events-stats ──────────────────────────────────────────────────────────────
program
  .command('events-stats')
  .description('Compute aggregate event statistics')
  .requiredOption(
    '--event-type <type>',
    'Event type: fishing | encounter | port_visit | loitering',
  )
  .requiredOption('--start-date <date>', 'Start date YYYY-MM-DD')
  .requiredOption('--end-date <date>', 'End date YYYY-MM-DD')
  .option('--confidence <levels...>', 'Confidence levels (port_visit only)')
  .option('--encounter-types <types...>', 'Encounter types (encounter only)')
  .option('--region-type <type>', 'Region type: MPA | EEZ | RFMO')
  .option('--region-id <id>', 'Region canonical ID')
  .option('--group-by <dim>', 'Group by: FLAG | GEARTYPE (default FLAG)')
  .action((opts) =>
    run(() =>
      eventsStats({
        eventType: opts.eventType as any,
        startDate: opts.startDate,
        endDate: opts.endDate,
        confidence: opts.confidence?.length
          ? opts.confidence.map(Number)
          : undefined,
        encounterTypes: opts.encounterTypes?.length
          ? opts.encounterTypes
          : undefined,
        regionType: opts.regionType as any,
        regionId: opts.regionId,
        groupBy: opts.groupBy as any,
      }),
    ),
  );

// ── region-id-lookup ──────────────────────────────────────────────────────────
program
  .command('region-id-lookup')
  .description('Resolve an MPA, EEZ, or RFMO name to its canonical ID')
  .requiredOption('--region-type <type>', 'Region type: MPA | EEZ | RFMO')
  .requiredOption('--query <name>', 'Name or partial name of the region')
  .option('--limit <n>', 'Max results (default 5, max 20)', parseInt)
  .action((opts) =>
    run(() =>
      regionIdLookup({
        regionType: opts.regionType as any,
        query: opts.query,
        limit: opts.limit,
      }),
    ),
  );

// ── region-geometry ───────────────────────────────────────────────────────────
program
  .command('region-geometry')
  .description('Get the GeoJSON URL for an MPA, EEZ, or RFMO')
  .requiredOption('--region-type <type>', 'Region type: MPA | EEZ | RFMO')
  .requiredOption('--id <id>', 'Canonical region ID')
  .action((opts) => {
    // region-geometry is synchronous, no API token needed
    print(regionGeometry({ regionType: opts.regionType as any, id: opts.id }));
  });

// ── area-report ───────────────────────────────────────────────────────────────
program
  .command('area-report')
  .description('Calculate fishing or presence hours in a region')
  .requiredOption('--region-type <type>', 'Region type: MPA | EEZ | RFMO')
  .requiredOption('--region-id <id>', 'Canonical region ID')
  .requiredOption('--start-date <date>', 'Start date YYYY-MM-DD')
  .requiredOption(
    '--end-date <date>',
    'End date YYYY-MM-DD (exclusive, max 1 year range)',
  )
  .option('--type <type>', 'Activity type: FISHING (default) | PRESENCE')
  .option('--flags <flags...>', 'Flag state ISO 3166-1 alpha-3 codes')
  .option('--vessel-types <types...>', 'Vessel types (PRESENCE only)')
  .option('--speeds <speeds...>', 'Speed ranges (PRESENCE only)')
  .option('--geartypes <geartypes...>', 'Gear types (FISHING only)')
  .option(
    '--group-by <dim>',
    'Group by: VESSEL_ID | FLAG | GEARTYPE | FLAGANDGEARTYPE',
  )
  .action((opts) =>
    run(() =>
      areaReport({
        regionType: opts.regionType as any,
        regionId: opts.regionId,
        startDate: opts.startDate,
        endDate: opts.endDate,
        type: opts.type as any,
        flags: opts.flags,
        vesselTypes: opts.vesselTypes,
        speeds: opts.speeds,
        geartypes: opts.geartypes,
        groupBy: opts.groupBy as any,
      }),
    ),
  );

// ── vessel-insights ───────────────────────────────────────────────────────────
program
  .command('vessel-insights')
  .description('Retrieve insights for one or more vessels')
  .requiredOption('--vessel-ids <ids...>', 'One or more GFW vessel IDs')
  .requiredOption('--start-date <date>', 'Start date YYYY-MM-DD')
  .requiredOption('--end-date <date>', 'End date YYYY-MM-DD')
  .requiredOption(
    '--includes <types...>',
    'Insight types: FISHING | GAP | COVERAGE | VESSEL-IDENTITY-IUU-VESSEL-LIST',
  )
  .action((opts) =>
    run(() =>
      vesselInsights({
        vesselIds: opts.vesselIds,
        startDate: opts.startDate,
        endDate: opts.endDate,
        includes: opts.includes as any,
      }),
    ),
  );

program.parse(process.argv);
