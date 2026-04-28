import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  gfwFetch: vi.fn(),
}));

import { gfwFetch } from '../../lib/api.js';
import { vesselEvents } from '../../tools/vessel-events.js';

const mockGfwFetch = vi.mocked(gfwFetch);

function makeEventsResponse(overrides: object = {}) {
  return {
    total: 1,
    limit: 20,
    offset: 0,
    nextOffset: 0,
    entries: [
      {
        id: 'event-1',
        type: 'fishing',
        start: '2024-03-01T10:00:00Z',
        end: '2024-03-01T14:00:00Z',
        position: { lat: 40.5, lon: -3.2 },
        vessel: { id: 'v1', name: 'SEA HUNTER', ssvid: '123456789', flag: 'ESP' },
        regions: { mpa: [], eez: ['8489'], rfmo: [], fao: ['37'] },
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

describe('vesselEvents — cross-field validation', () => {
  it('rejects confidence filter on non-port_visit', async () => {
    const result = await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      confidence: [4],
    });
    expect((result as any).isError).toBe(true);
    expect((result as any).content[0].text).toContain('confidence');
  });

  it('rejects encounterTypes filter on non-encounter', async () => {
    const result = await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      encounterTypes: ['CARRIER-FISHING'],
    });
    expect((result as any).isError).toBe(true);
    expect((result as any).content[0].text).toContain('encounterTypes');
  });

  it('rejects regionType without regionId', async () => {
    const result = await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      regionType: 'EEZ',
    });
    expect((result as any).isError).toBe(true);
    expect((result as any).content[0].text).toContain('regionType and regionId');
  });

  it('rejects regionId without regionType', async () => {
    const result = await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      regionId: '8489',
    });
    expect((result as any).isError).toBe(true);
  });
});

describe('vesselEvents — param construction', () => {
  it('uses correct dataset for fishing', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [path, params] = mockGfwFetch.mock.calls[0];
    expect(path).toBe('/v3/events');
    expect(params!['datasets[0]']).toBe('public-global-fishing-events:latest');
  });

  it('uses correct dataset for port_visit', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'port_visit', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['datasets[0]']).toBe('public-global-port-visits-events:latest');
  });

  it('uses correct dataset for encounter', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'encounter', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['datasets[0]']).toBe('public-global-encounters-events:latest');
  });

  it('uses correct dataset for loitering', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'loitering', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['datasets[0]']).toBe('public-global-loitering-events:latest');
  });

  it('adds vesselId param when provided', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01', vesselId: 'v1' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['vessels[0]']).toBe('v1');
  });

  it('adds region params when both provided', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      regionType: 'EEZ',
      regionId: '8489',
    });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['region-ids[0]']).toBe('8489');
    expect(params!['region-datasets[0]']).toBe('public-eez-areas');
  });

  it('defaults confidence to [4] for port_visit', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'port_visit', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['confidences[0]']).toBe('4');
  });

  it('uses custom confidence for port_visit', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'port_visit', startDate: '2024-01-01', endDate: '2024-03-01', confidence: [2, 3] });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['confidences[0]']).toBe('2');
    expect(params!['confidences[1]']).toBe('3');
  });

  it('expands encounter types with symmetric pairs', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({
      eventType: 'encounter',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      encounterTypes: ['CARRIER-FISHING'],
    });
    const [, params] = mockGfwFetch.mock.calls[0];
    const encounterValues = Object.entries(params!)
      .filter(([k]) => k.startsWith('encounter-types'))
      .map(([, v]) => v);
    expect(encounterValues).toContain('CARRIER-FISHING');
    expect(encounterValues).toContain('FISHING-CARRIER');
  });

  it('uses default limit 20', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01' });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['limit']).toBe('20');
  });

  it('uses custom limit', async () => {
    setupFetchMock(makeEventsResponse());
    await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01', limit: 50 });
    const [, params] = mockGfwFetch.mock.calls[0];
    expect(params!['limit']).toBe('50');
  });
});

describe('vesselEvents — response mapping', () => {
  it('maps event fields correctly', async () => {
    setupFetchMock(makeEventsResponse());
    const result = await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01' }) as any;
    expect(result.entries).toHaveLength(1);
    const e = result.entries[0];
    expect(e.id).toBe('event-1');
    expect(e.lat).toBe(40.5);
    expect(e.lon).toBe(-3.2);
    expect(e.regions.eez).toContain('8489');
  });

  it('includes port field for port_visit', async () => {
    const data = makeEventsResponse({
      entries: [{
        id: 'event-2',
        type: 'port_visit',
        start: '2024-03-01T10:00:00Z',
        end: '2024-03-01T14:00:00Z',
        position: { lat: 40.5, lon: -3.2 },
        vessel: { id: 'v1', name: 'SEA HUNTER', ssvid: '123456789', flag: 'ESP' },
        port_visit: { intermediateAnchorage: { name: 'Barcelona', id: 'port-1', flag: 'ESP' } },
        regions: { mpa: [], eez: [], rfmo: [], fao: [] },
      }],
    });
    setupFetchMock(data);
    const result = await vesselEvents({ eventType: 'port_visit', startDate: '2024-01-01', endDate: '2024-03-01' }) as any;
    expect(result.entries[0].port.name).toBe('Barcelona');
  });

  it('includes encounteredVessel for encounter events', async () => {
    const data = makeEventsResponse({
      entries: [{
        id: 'event-3',
        type: 'encounter',
        start: '2024-03-01T10:00:00Z',
        end: '2024-03-01T14:00:00Z',
        position: { lat: 10, lon: 20 },
        vessel: { id: 'v1', name: 'A', ssvid: '111111111', flag: 'PAN' },
        encounter: { vessel: { id: 'v2', name: 'B', ssvid: '222222222', flag: 'CHN' } },
        regions: { mpa: [], eez: [], rfmo: [], fao: [] },
      }],
    });
    setupFetchMock(data);
    const result = await vesselEvents({ eventType: 'encounter', startDate: '2024-01-01', endDate: '2024-03-01' }) as any;
    expect(result.entries[0].encounteredVessel.name).toBe('B');
  });

  it('includes mapUrl when vesselId and dates provided', async () => {
    setupFetchMock(makeEventsResponse());
    const result = await vesselEvents({
      eventType: 'fishing',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      vesselId: 'v1',
    }) as any;
    expect(result.mapUrl).toBeTruthy();
    expect(result.mapUrl).toContain('v1');
  });

  it('mapUrl is null without vesselId', async () => {
    setupFetchMock(makeEventsResponse());
    const result = await vesselEvents({ eventType: 'fishing', startDate: '2024-01-01', endDate: '2024-03-01' }) as any;
    expect(result.mapUrl).toBeNull();
  });
});
