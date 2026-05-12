export const FISHING_CAVEATS: string[] = [
  'To avoid any misinterpretation of the data, please review this [data caveats about apparent fishing effort](https://globalfishingwatch.org/data-documentation/apparent-fishing-effort-ais/) and this about [AIS](https://globalfishingwatch.org/data-documentation/considerations-when-using-automatic-identification-system-ais-data/)',
];

export const VESSEL_IDENTITY_CAVEATS: string[] = [];

export const REGION_CAVEATS: string[] = [];

export const ACTIVITY_CAVEATS: Record<string, string[]> = {
  FISHING: FISHING_CAVEATS,
  PRESENCE: [],
  SAR: [],
  SENTINEL2: [],
};

export const EVENT_TYPE_CAVEATS: Record<string, string[]> = {
  fishing: FISHING_CAVEATS,
  encounter: [],
  port_visit: [],
  loitering: [],
};
