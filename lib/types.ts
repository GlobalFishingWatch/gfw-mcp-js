// ── Region datasets ──────────────────────────────────────────────────────────

export const REGION_DATASETS = {
  MPA: 'public-mpa-all',
  EEZ: 'public-eez-areas',
  RFMO: 'public-rfmo',
} as const;

export type RegionType = keyof typeof REGION_DATASETS;

// ── Activity datasets ────────────────────────────────────────────────────────

export const ACTIVITY_DATASETS = {
  FISHING: 'public-global-fishing-effort:v4.0',
  PRESENCE: 'public-global-presence:v4.0',
  SAR: 'public-global-sar-presence:v4.0',
  SENTINEL2: 'public-global-sentinel2-presence:v4.0',
} as const;

export type ActivityType = keyof typeof ACTIVITY_DATASETS;

// ── GFW API response types ───────────────────────────────────────────────────

export type ContextLayer = {
  label: string;
  id: number;
  iso3: string | null;
  isoSov1: string | null;
  isoSov2: string | null;
  isoSov3: string | null;
  territory1: string | null;
};

export type VesselEntry = {
  dataset: string;
  selfReportedInfo: {
    id: string;
    ssvid: string;
    shipname: string;
    flag: string;
    callsign: string | null;
    imo: string | null;
    transmissionDateFrom: string;
    transmissionDateTo: string;
    sourceCode: string[];
  }[];
  combinedSourcesInfo: {
    vesselId: string;
    geartypes: { name: string }[];
    shiptypes: { name: string }[];
  }[];
};

export type VesselSearchResponse = {
  total: number;
  limit: number;
  since: string;
  entries: VesselEntry[];
};

export type EventEntry = {
  id: string;
  type: string;
  start: string;
  end: string;
  position: { lat: number; lon: number };
  vessel: {
    id: string;
    name: string;
    ssvid: string;
    flag: string;
  };
  port_visit?: {
    intermediateAnchorage?: {
      name: string;
      id: string;
      flag: string;
    };
  };
  encounter?: {
    vessel: {
      id: string;
      name: string;
      ssvid: string;
      flag: string;
    };
  };
  regions: Record<string, string[]>;
};

export type EventsResponse = {
  total: number;
  limit: number;
  offset: number;
  nextOffset: number;
  entries: EventEntry[];
};

export type EventsStatsResponse = {
  flags: string[];
  numEvents: number;
  numFlags: number;
  numVessels: number;
  groups: { name: string; value: number }[];
  /** GFW map URL to visualise the queried events. Null when eventType is "fishing". */
  mapUrl?: string | null;
};

export type FishingEffortEntry = {
  callsign: string;
  dataset: string;
  date: string;
  flag: string;
  geartype: string;
  hours: number;
  imo: string;
  mmsi: string;
  shipName: string;
  vesselId: string;
  vesselType: string;
};

export type SarPresenceEntry = {
  callsign: string;
  dataset: string;
  date: string;
  detections: number;
  flag: string;
  geartype: string;
  imo: string;
  mmsi: string;
  shipName: string;
  vesselId: string;
  vesselType: string;
};

export type ReportResponse = {
  total: number;
  limit: number | null;
  offset: number | null;
  nextOffset: number | null;
  entries: Record<string, (FishingEffortEntry | SarPresenceEntry)[]>[];
};

// ── Vessel insights response types ───────────────────────────────────────────

export type VesselInsightsFishing = {
  datasets: string[];
  periodSelectedCounters: {
    events: number;
    eventsInRFMOWithoutKnownAuthorization: number;
    eventsInNoTakeMPAs: number;
  };
  eventsInRfmoWithoutKnownAuthorization: unknown[];
  eventsInNoTakeMpas: unknown[];
};

export type VesselInsightsGap = {
  datasets: string[];
  periodSelectedCounters: {
    events: number;
    eventsGapOff: number;
  };
  aisOff: unknown[];
};

export type VesselInsightsCoverage = {
  blocks: string;
  blocksWithPositions: string;
  percentage: number;
};

export type VesselInsightsVesselIdentity = {
  datasets: string[];
  iuuVesselList: {
    valuesInThePeriod: unknown[];
    totalTimesListed: number;
    totalTimesListedInThePeriod: number;
  };
};

export type VesselInsightsResponse = {
  period: { startDate: string; endDate: string };
  vesselIdsWithoutIdentity: string[] | null;
  apparentFishing?: VesselInsightsFishing;
  gap?: VesselInsightsGap;
  coverage?: VesselInsightsCoverage;
  vesselIdentity?: VesselInsightsVesselIdentity;
};
