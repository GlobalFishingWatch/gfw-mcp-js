import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  gfwFetch: vi.fn(),
}));

import { gfwFetch } from '../../lib/api.js';
import { vesselSearch } from '../../tools/vessel-search.js';

const mockGfwFetch = vi.mocked(gfwFetch);

function makeVesselResponse(overrides: object = {}) {
  return {
    total: 1,
    limit: 10,
    since: '',
    entries: [
      {
        dataset: 'test',
        selfReportedInfo: [
          {
            id: 'vessel-abc',
            ssvid: '123456789',
            shipname: 'SEA HUNTER',
            flag: 'ESP',
            callsign: 'EABC',
            imo: '1234567',
            transmissionDateFrom: '2022-01-01T00:00:00Z',
            transmissionDateTo: '2024-01-01T00:00:00Z',
            sourceCode: [],
          },
        ],
        combinedSourcesInfo: [
          {
            vesselId: 'vessel-abc',
            geartypes: [{ name: 'trawlers' }],
            shiptypes: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function setupFetchMock(data: object) {
  mockGfwFetch.mockResolvedValueOnce({ json: async () => data } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('vesselSearch — error on no criteria', () => {
  it('returns error when no filters provided', async () => {
    const result = await vesselSearch({});
    expect(result.isError).toBe(true);
    expect((result as any).content[0].text).toContain('No search criteria');
  });
});

describe('vesselSearch — param construction', () => {
  it('builds where clause for name', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'hunter' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("shipname LIKE '*HUNTER*'");
  });

  it('builds where clause for MMSI', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ mmsi: '123456789' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("ssvid = '123456789'");
  });

  it('builds where clause for IMO', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ imo: '1234567' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("imo = '1234567'");
  });

  it('builds where clause for flag (uppercased)', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ flag: 'esp' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("flag = 'ESP'");
  });

  it('builds where clause for callsign (uppercased)', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ callsign: 'eabc' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("callsign = 'EABC'");
  });

  it('combines multiple filters with AND', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'hunter', flag: 'ESP' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain(' AND ');
  });

  it('applies activeFrom filter', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'x', activeFrom: '2023-01-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("transmissionDateTo > '2023-01-01T00:00:00Z'");
  });

  it('applies activeTo filter', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'x', activeTo: '2023-12-31' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['where']).toContain("transmissionDateFrom < '2023-12-31T23:59:59Z'");
  });

  it('uses default limit 10', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'x' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['limit']).toBe('10');
  });

  it('uses custom limit', async () => {
    setupFetchMock(makeVesselResponse());
    await vesselSearch({ name: 'x', limit: 25 });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['limit']).toBe('25');
  });
});

describe('vesselSearch — response mapping', () => {
  it('maps vessel fields correctly', async () => {
    setupFetchMock(makeVesselResponse());
    const result = await vesselSearch({ mmsi: '123456789' });
    expect(result).not.toHaveProperty('isError');
    const { results } = result as any;
    expect(results).toHaveLength(1);
    expect(results[0].vesselId).toBe('vessel-abc');
    expect(results[0].name).toBe('SEA HUNTER');
    expect(results[0].mmsi).toBe('123456789');
    expect(results[0].flag).toBe('ESP');
    expect(results[0].gearType).toBe('trawlers');
  });

  it('includes mapUrl when vesselId present', async () => {
    setupFetchMock(makeVesselResponse());
    const result = await vesselSearch({ mmsi: '123456789' });
    const { results } = result as any;
    expect(results[0].mapUrl).toBeTruthy();
    expect(results[0].mapUrl).toContain('vessel-abc');
  });

  it('returns total and limit', async () => {
    setupFetchMock(makeVesselResponse({ total: 42, limit: 10 }));
    const result = await vesselSearch({ name: 'x' }) as any;
    expect(result.total).toBe(42);
    expect(result.limit).toBe(10);
  });

  it('handles empty results', async () => {
    setupFetchMock({ total: 0, limit: 10, since: '', entries: [] });
    const result = await vesselSearch({ name: 'nothing' }) as any;
    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
