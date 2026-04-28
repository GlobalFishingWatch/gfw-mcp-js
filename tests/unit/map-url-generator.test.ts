import { describe, it, expect } from 'vitest';
import {
  generateVesselProfileUrl,
  generateReportUrl,
  generatePortReportUrl,
  createStatsMapUrl,
} from '../../lib/map-url-generator.js';

const BASE = 'https://globalfishingwatch.org/map';

describe('generateVesselProfileUrl', () => {
  it('includes vesselId in path', () => {
    const url = generateVesselProfileUrl('vessel-123');
    expect(url).toContain('/vessel/vessel-123');
  });

  it('includes date range when both dates provided', () => {
    const url = generateVesselProfileUrl('v1', '2024-01-01', '2024-12-31');
    expect(url).toContain('start=2024-01-01');
    expect(url).toContain('end=2024-12-31');
  });

  it('includes event types', () => {
    const url = generateVesselProfileUrl('v1', '2024-01-01', '2024-12-31', ['fishing', 'encounter']);
    expect(url).toContain('vE[0]=fishing');
    expect(url).toContain('vE[1]=encounter');
  });

  it('starts with GFW base URL', () => {
    const url = generateVesselProfileUrl('abc');
    expect(url.startsWith(BASE)).toBe(true);
  });
});

describe('generateReportUrl', () => {
  it('starts with GFW base URL', () => {
    const url = generateReportUrl('12345', 'EEZ', 'FISHING', '2024-01-01', '2024-12-31');
    expect(url.startsWith(BASE)).toBe(true);
  });

  it('includes regionId', () => {
    const url = generateReportUrl('99999', 'EEZ', 'FISHING', '2024-01-01', '2024-12-31');
    expect(url).toContain('99999');
  });

  it('includes date range', () => {
    const url = generateReportUrl('1', 'MPA', 'FISHING', '2023-06-01', '2023-12-31');
    expect(url).toContain('start=2023-06-01');
    expect(url).toContain('end=2023-12-31');
  });

  it('includes reportLoadVessels param', () => {
    const url = generateReportUrl('1', 'EEZ', 'FISHING', '2024-01-01', '2024-06-01');
    expect(url).toContain('reportLoadVessels=true');
  });

  it('uses correct region dataset for EEZ', () => {
    const url = generateReportUrl('1', 'EEZ', 'FISHING', '2024-01-01', '2024-06-01');
    expect(url).toContain('public-eez-areas');
  });

  it('uses correct region dataset for MPA', () => {
    const url = generateReportUrl('1', 'MPA', 'FISHING', '2024-01-01', '2024-06-01');
    expect(url).toContain('public-mpa-all');
  });

  it('uses correct region dataset for RFMO', () => {
    const url = generateReportUrl('1', 'RFMO', 'FISHING', '2024-01-01', '2024-06-01');
    expect(url).toContain('public-rfmo');
  });
});

describe('generatePortReportUrl', () => {
  it('includes portId', () => {
    const url = generatePortReportUrl('port-42');
    expect(url).toContain('port-42');
  });

  it('includes port-visits dataset', () => {
    const url = generatePortReportUrl('port-42');
    expect(url).toContain('public-global-port-visits-events:latest');
  });
});

describe('createStatsMapUrl', () => {
  it('returns null for fishing eventType', () => {
    const url = createStatsMapUrl('2024-01-01', '2024-06-01', 'fishing');
    expect(url).toBeNull();
  });

  it('returns string for encounter eventType', () => {
    const url = createStatsMapUrl('2024-01-01', '2024-06-01', 'encounter');
    expect(typeof url).toBe('string');
  });

  it('returns string for loitering eventType', () => {
    const url = createStatsMapUrl('2024-01-01', '2024-06-01', 'loitering');
    expect(typeof url).toBe('string');
  });

  it('returns string for port_visit eventType', () => {
    const url = createStatsMapUrl('2024-01-01', '2024-06-01', 'port_visit');
    expect(typeof url).toBe('string');
  });
});
