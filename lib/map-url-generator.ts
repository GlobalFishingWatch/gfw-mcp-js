import { stringify } from 'qs';
import { REGION_DATASETS } from './types';

const DATA_DATAVIEW_INSTANCES = {
  FISHING: 'ais',
  PRESENCE: 'presence',
} as const;

const REGIONS_DATAVIEW_INSTANCES = {
  MPA: 'context-layer-mpa',
  EEZ: 'context-layer-eez',
  RFMO: 'context-layer-rfmo',
} as const;

const GFW_BASE_URL = 'https://globalfishingwatch.org/map';

export function generateReportUrl(
  regionId: string,
  regionType: keyof typeof REGION_DATASETS,
  type: keyof typeof DATA_DATAVIEW_INSTANCES,
  startDate: string,
  endDate: string,
  filters:
    | {
        flag: string[];
        vesselType: string[];
        geartype: string[];
        speed: string[];
      }
    | undefined = undefined,
): string {
  const baseUrl = '/fishing-activity/default-public';

  let dynamicPath = `/report/${REGION_DATASETS[regionType]}/${regionId}?reportLoadVessels=true&start=${startDate}&end=${endDate}`;
  const filtersCfg: any = {};

  const dataviewAIS = {
    id: DATA_DATAVIEW_INSTANCES['FISHING'],
    cfg: {
      vis: type === 'FISHING' ? true : false,
      filters: type === 'FISHING' ? filters : undefined,
    },
  };
  const dataviewPresence = {
    id: DATA_DATAVIEW_INSTANCES['PRESENCE'],
    cfg: {
      vis: type === 'PRESENCE' ? true : false,
      filters: type === 'PRESENCE' ? filters : undefined,
    },
  };
  const dataviewVMS = {
    id: 'vms',
    cfg: {
      vis: false,
    },
  };
  const dataviewRegion = {
    id: REGIONS_DATAVIEW_INSTANCES[regionType],
    cfg: {
      vis: true,
    },
  };
  console.error(
    'object',
    JSON.stringify({
      dvIn: [dataviewAIS, dataviewVMS, dataviewPresence, dataviewRegion],
    }),
  );
  const dataviewInstances = stringify(
    { dvIn: [dataviewAIS, dataviewVMS, dataviewPresence, dataviewRegion] },
    { arrayFormat: 'indices' },
  );
  dynamicPath += `&${dataviewInstances}`;

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}

export function generateVesselProfileUrl(
  vesselId: string,
  activeFrom?: string,
  activeTo?: string,
  events: string[] = [],
): string {
  const baseUrl = '/vessel';

  let dynamicPath = `/${vesselId}?`;
  if (activeFrom && activeTo) {
    dynamicPath += `&activeFrom=${activeFrom}&activeTo=${activeTo}`;
  }
  if (events.length > 0) {
    dynamicPath += events.map((e, i) => `vE[${i}]=${e}`).join('&');
  }

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}
