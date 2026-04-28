import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  gfwFetch: vi.fn(),
}));

import { gfwFetch } from '../../lib/api.js';
import { regionIdLookup } from '../../tools/region-id-lookup.js';

const mockGfwFetch = vi.mocked(gfwFetch);

const CONTEXT_LAYERS = [
  { id: 1, label: 'Mediterranean Sea', iso3: 'MED', isoSov1: null, isoSov2: null, isoSov3: null, territory1: null },
  { id: 2, label: 'Atlantic Ocean', iso3: null, isoSov1: null, isoSov2: null, isoSov3: null, territory1: null },
  { id: 3, label: 'Mediterranean EEZ Spain', iso3: 'ESP', isoSov1: null, isoSov2: null, isoSov3: null, territory1: null },
  { id: 4, label: 'Pacific Ocean', iso3: null, isoSov1: null, isoSov2: null, isoSov3: null, territory1: null },
];

function setupFetchMock() {
  mockGfwFetch.mockResolvedValue({ json: async () => CONTEXT_LAYERS } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('regionIdLookup — API call', () => {
  it('calls correct endpoint for EEZ', async () => {
    setupFetchMock();
    await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    const [path] = mockGfwFetch.mock.calls[0];
    expect(path).toContain('public-eez-areas');
    expect(path).toContain('context-layers');
  });

  it('calls correct endpoint for MPA', async () => {
    setupFetchMock();
    await regionIdLookup({ regionType: 'MPA', query: 'test' });
    const [path] = mockGfwFetch.mock.calls[0];
    expect(path).toContain('public-mpa-all');
  });

  it('calls correct endpoint for RFMO', async () => {
    setupFetchMock();
    await regionIdLookup({ regionType: 'RFMO', query: 'test' });
    const [path] = mockGfwFetch.mock.calls[0];
    expect(path).toContain('public-rfmo');
  });
});

describe('regionIdLookup — scoring and ranking', () => {
  it('returns matches for single-word query', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    expect(result.matches.length).toBeGreaterThan(0);
    result.matches.forEach((m) => expect(m.name.toLowerCase()).toContain('mediterranean'));
  });

  it('ranks higher-score matches first', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean EEZ' });
    expect(result.matches[0].name).toBe('Mediterranean EEZ Spain');
  });

  it('returns no matches for unrelated query', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'xyznonexistent' });
    expect(result.matches).toHaveLength(0);
  });

  it('respects limit parameter', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Ocean', limit: 1 });
    expect(result.matches.length).toBeLessThanOrEqual(1);
  });

  it('defaults limit to 5', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    expect(result.limit).toBe(5);
  });
});

describe('regionIdLookup — response shape', () => {
  it('includes id as string', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    result.matches.forEach((m) => expect(typeof m.id).toBe('string'));
  });

  it('includes name field', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    result.matches.forEach((m) => expect(m.name).toBeTruthy());
  });

  it('includes country when iso3 is present', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    const medSea = result.matches.find((m) => m.name === 'Mediterranean Sea');
    expect(medSea?.country).toBe('MED');
  });

  it('country is undefined when iso3 is null', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Atlantic' });
    const atlantic = result.matches.find((m) => m.name === 'Atlantic Ocean');
    expect(atlantic?.country).toBeUndefined();
  });

  it('echoes regionType and query in response', async () => {
    setupFetchMock();
    const result = await regionIdLookup({ regionType: 'EEZ', query: 'Mediterranean' });
    expect(result.regionType).toBe('EEZ');
    expect(result.query).toBe('Mediterranean');
  });
});
