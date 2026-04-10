import { REGION_DATASETS } from './types';

const DATAVIEW_INSTANCES = {
  FISHING: 'ais',
  PRESENCE: 'presence',
} as const;

const GFW_BASE_URL = 'https://globalfishingwatch.org/map';

export function generateReportUrl(
  regionId: string,
  regionType: 'MPA' | 'EEZ',
  type: keyof typeof DATAVIEW_INSTANCES,
  startDate: string,
  endDate: string,
): string {
  const baseUrl = '/fishing-activity/default-public';

  const dynamicPath = `/report/${REGION_DATASETS[regionType]}/${regionId}?&dvIn[0][id]=${DATAVIEW_INSTANCES[type]}&dvIn[0][dT]=false&start=${startDate}&end=${endDate}&reportLoadVessels=true`;

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}

export function generateVesselProfileUrl(
  vesselId: string,
  activeFrom?: string,
  activeTo?: string,
): string {
  const baseUrl = '/vessel';

  const dynamicPath = `/${vesselId}?`;
  if (activeFrom && activeTo) {
    dynamicPath.concat(`&activeFrom=${activeFrom}&activeTo=${activeTo}`);
  }

  return `${GFW_BASE_URL}${baseUrl}${dynamicPath}`;
}
