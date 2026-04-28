import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  gfwFetch: vi.fn(),
}));

import { gfwFetch } from '../../lib/api.js';
import { areaReport } from '../../tools/area-report.js';

const mockGfwFetch = vi.mocked(gfwFetch);

const FISHING_DATASET = 'public-global-fishing-effort:v4.0';

function makeReportResponse(entries: object[] = []) {
  return {
    total: entries.length,
    limit: null,
    offset: null,
    nextOffset: null,
    entries: [
      {
        [FISHING_DATASET]: entries,
      },
    ],
  };
}

function makeVesselRow(overrides: object = {}) {
  return {
    callsign: 'EABC',
    dataset: FISHING_DATASET,
    date: '2024-01-01',
    flag: 'ESP',
    geartype: 'trawlers',
    hours: 10,
    imo: '1234567',
    mmsi: '123456789',
    shipName: 'SEA HUNTER',
    vesselId: 'vessel-abc',
    vesselType: 'fishing',
    ...overrides,
  };
}

function setupFetchMock(data: object) {
  mockGfwFetch.mockResolvedValueOnce({ json: async () => data } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('areaReport — date range validation', () => {
  it('rejects range > 1 year', async () => {
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2022-01-01',
      endDate: '2023-06-01',
    });
    expect(result.isError).toBe(true);
    expect((result as any).content[0].text).toContain('1 year');
  });

  it('accepts range exactly 1 year', async () => {
    setupFetchMock(makeReportResponse());
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    });
    expect(result).not.toHaveProperty('isError');
  });
});

describe('areaReport — groupBy + type validation', () => {
  it('rejects GEARTYPE groupBy with PRESENCE', async () => {
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      type: 'PRESENCE',
      groupBy: 'GEARTYPE',
    });
    expect(result.isError).toBe(true);
  });

  it('rejects FLAGANDGEARTYPE groupBy with PRESENCE', async () => {
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      type: 'PRESENCE',
      groupBy: 'FLAGANDGEARTYPE',
    });
    expect(result.isError).toBe(true);
  });

  it('rejects vesselTypes filter with FISHING type', async () => {
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      type: 'FISHING',
      vesselTypes: ['fishing'],
    });
    expect(result.isError).toBe(true);
    expect((result as any).content[0].text).toContain('vesselTypes');
  });

  it('rejects geartypes filter with PRESENCE type', async () => {
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      type: 'PRESENCE',
      geartypes: ['trawlers'],
    });
    expect(result.isError).toBe(true);
    expect((result as any).content[0].text).toContain('geartypes');
  });
});

describe('areaReport — param construction', () => {
  it('calls /v3/4wings/report endpoint', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [path] = mockGfwFetch.mock.calls[0];
    expect(path).toBe('/v3/4wings/report');
  });

  it('uses correct dataset for FISHING type', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['datasets[0]']).toBe(FISHING_DATASET);
  });

  it('uses PRESENCE dataset when type is PRESENCE', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01', type: 'PRESENCE' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['datasets[0]']).toBe('public-global-presence:v4.0');
  });

  it('passes region-id param', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['region-id']).toBe('8489');
  });

  it('passes correct region-dataset for EEZ', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['region-dataset']).toBe('public-eez-areas');
  });

  it('passes correct region-dataset for MPA', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'MPA', regionId: '555', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['region-dataset']).toBe('public-mpa-all');
  });

  it('builds flag filter correctly', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01', flags: ['ESP', 'PRT'] });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['filters[0]']).toContain("flag IN ('ESP','PRT')");
  });

  it('defaults group-by to VESSEL_ID', async () => {
    setupFetchMock(makeReportResponse());
    await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['group-by']).toBe('VESSEL_ID');
  });
});

describe('areaReport — response aggregation', () => {
  it('sums fishingHours across all rows', async () => {
    setupFetchMock(makeReportResponse([makeVesselRow({ hours: 10 }), makeVesselRow({ hours: 5 })]));
    const result = await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' }) as any;
    expect(result.fishingHours).toBe(15);
  });

  it('returns topVessels when groupBy is VESSEL_ID', async () => {
    setupFetchMock(makeReportResponse([makeVesselRow({ hours: 10 }), makeVesselRow({ vesselId: 'v2', hours: 20 })]));
    const result = await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' }) as any;
    expect(result.topVessels).toBeDefined();
    expect(result.topVessels[0].hours).toBeGreaterThanOrEqual(result.topVessels[1]?.hours ?? 0);
  });

  it('returns rows (not topVessels) when groupBy is FLAG', async () => {
    setupFetchMock(makeReportResponse([makeVesselRow({ flag: 'ESP', hours: 10 }), makeVesselRow({ flag: 'PRT', hours: 5 })]));
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      groupBy: 'FLAG',
    }) as any;
    expect(result.rows).toBeDefined();
    expect(result.topVessels).toBeUndefined();
    expect(result.rows[0].flag).toBeDefined();
    expect(result.rows[0].hours).toBeDefined();
  });

  it('aggregates hours by flag', async () => {
    setupFetchMock(makeReportResponse([
      makeVesselRow({ flag: 'ESP', hours: 10 }),
      makeVesselRow({ flag: 'ESP', hours: 5 }),
      makeVesselRow({ flag: 'PRT', hours: 8 }),
    ]));
    const result = await areaReport({
      regionType: 'EEZ',
      regionId: '8489',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      groupBy: 'FLAG',
    }) as any;
    const esp = result.rows.find((r: any) => r.flag === 'ESP');
    expect(esp.hours).toBe(15);
  });

  it('includes gfwMapUrl in response', async () => {
    setupFetchMock(makeReportResponse());
    const result = await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' }) as any;
    expect(result.gfwMapUrl).toBeTruthy();
    expect(typeof result.gfwMapUrl).toBe('string');
  });

  it('handles empty entries gracefully', async () => {
    setupFetchMock(makeReportResponse([]));
    const result = await areaReport({ regionType: 'EEZ', regionId: '8489', startDate: '2024-01-01', endDate: '2024-06-01' }) as any;
    expect(result.fishingHours).toBe(0);
    expect(result.topVessels).toHaveLength(0);
  });
});
