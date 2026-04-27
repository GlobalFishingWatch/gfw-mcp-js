import { stringify } from 'qs';
import { REGION_DATASETS } from './types';

const DATA_DATAVIEW_INSTANCES = {
  FISHING: 'ais',
  PRESENCE: 'presence',
  SAR: 'sar',
  SENTINEL2: 'sentinel2',
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
  const dataviewSAR = {
    id: DATA_DATAVIEW_INSTANCES['SAR'],
    cfg: {
      vis: type === 'SAR' ? true : false,
      filters: type === 'SAR' ? filters : undefined,
    },
  };
  const dataviewSentinel2 = {
    id: DATA_DATAVIEW_INSTANCES['SENTINEL2'],
    cfg: {
      vis: type === 'SENTINEL2' ? true : false,
      filters: type === 'SENTINEL2' ? filters : undefined,
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
      dvIn: [dataviewAIS, dataviewVMS, dataviewPresence, dataviewSAR, dataviewSentinel2, dataviewRegion],
    }),
  );
  const dataviewInstances = stringify(
    { dvIn: [dataviewAIS, dataviewVMS, dataviewPresence, dataviewSAR, dataviewSentinel2, dataviewRegion] },
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
    dynamicPath += `&start=${activeFrom}&end=${activeTo}`;
  }
  if (events.length > 0) {
    dynamicPath += events.map((e, i) => `vE[${i}]=${e}`).join('&');
  }

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}

export function createStatsMapUrl(
  start: string,
  end: string,
  eventType: string,
  regionType?: keyof typeof REGION_DATASETS,
  regionId?: string,
): string | null {
  if (eventType === 'fishing') {
    return null;
  }
  const baseUrl = '/vessel';

  let dynamicPath = `/reports/default-public/report`;
  if (regionType && regionId) {
    dynamicPath += `/${REGION_DATASETS[regionType]}/${regionId}`;
  }
  if (start && end) {
    dynamicPath += `&start=${start}&end=${end}`;
  }
  const dataviewInstances = stringify(
    { dvIn: [
      {
        "id": "encounters",
        "origin": "report",
        "config": {
          "visible": eventType === 'encounter' 
        }
      },
      {
        "id": "loitering",
        "origin": "report",
        "config": {
          "visible": eventType === 'loitering' 
        }
      },
      {
        "id": "port-visits",
        "origin": "report",
        "config": {
          "visible": eventType === 'port_visit' 
        }
      }
    ] },
    { arrayFormat: 'indices' },
  );
  dynamicPath += `&${dataviewInstances}`;

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}

export function generatePortReportUrl(portId: string): string {
  return `${GFW_BASE_URL}/fishing-activity/default-public/ports-report/${portId}?portsReportDatasetId=public-global-port-visits-events:latest`;
}
