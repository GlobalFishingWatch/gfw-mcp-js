// Porter Stemmer (English) — avoids ESM-only dependencies
function stem(word: string): string {
  let w = word;
  const re = /^(.+?)(ss|i)es$/;
  const re2 = /^(.+?)s$/;
  const re3 = /^(.+?)([^aeiou])eed$/;
  const re4 = /^(.+?)([aeiou].*(ed|ing))$/;
  if (re.test(w)) w = w.replace(re, '$1$2');
  else if (re2.test(w) && !/^[aeiou]s$/.test(w)) w = w.replace(re2, '$1');
  if (re3.test(w)) {
    const m = w.match(re3)!;
    if (m[1].length > 1) w = w.slice(0, -1);
  } else if (re4.test(w)) {
    const m = w.match(re4)!;
    const stem0 = m[1];
    w = stem0;
    if (/at$|bl$|iz$/.test(w)) w += 'e';
    else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1);
    else if (/^[^aeiou][aeiou][^aeiouwxy]$/.test(w)) w += 'e';
  }
  w = w.replace(/^(.+?)y$/, (_, p) => (/[aeiou]/.test(p) ? p + 'i' : p + 'y'));
  w = w
    .replace(/^(.{2,})ational$/, '$1ate')
    .replace(/^(.{2,})tional$/, '$1tion')
    .replace(/^(.{2,})enci$/, '$1ence')
    .replace(/^(.{2,})anci$/, '$1ance')
    .replace(/^(.{2,})izer$/, '$1ize')
    .replace(/^(.{2,})bli$/, '$1ble')
    .replace(/^(.{2,})alli$/, '$1al')
    .replace(/^(.{2,})entli$/, '$1ent')
    .replace(/^(.{2,})eli$/, '$1e')
    .replace(/^(.{2,})ousli$/, '$1ous')
    .replace(/^(.{2,})ization$/, '$1ize')
    .replace(/^(.{2,})ation$/, '$1ate')
    .replace(/^(.{2,})alism$/, '$1al')
    .replace(/^(.{2,})iveness$/, '$1ive')
    .replace(/^(.{2,})fulness$/, '$1ful')
    .replace(/^(.{2,})ousness$/, '$1ous')
    .replace(/^(.{2,})aliti$/, '$1al')
    .replace(/^(.{2,})iviti$/, '$1ive')
    .replace(/^(.{2,})biliti$/, '$1ble');
  return w;
}

const DEMONYM_MAP: Record<string, string> = {
  spanish: 'spain',
  french: 'france',
  british: 'united kingdom',
  english: 'england',
  dutch: 'netherlands',
  german: 'germany',
  italian: 'italy',
  portuguese: 'portugal',
  greek: 'greece',
  polish: 'poland',
  swedish: 'sweden',
  danish: 'denmark',
  finnish: 'finland',
  norwegian: 'norway',
  irish: 'ireland',
  swiss: 'switzerland',
  belgian: 'belgium',
  austrian: 'austria',
  hungarian: 'hungary',
  czech: 'czech republic',
  romanian: 'romania',
  bulgarian: 'bulgaria',
  croatian: 'croatia',
  serbian: 'serbia',
  ukrainian: 'ukraine',
  russian: 'russia',
  turkish: 'turkey',
  egyptian: 'egypt',
  moroccan: 'morocco',
  algerian: 'algeria',
  libyan: 'libya',
  tunisian: 'tunisia',
  nigerian: 'nigeria',
  kenyan: 'kenya',
  'south african': 'south africa',
  american: 'united states',
  canadian: 'canada',
  mexican: 'mexico',
  brazilian: 'brazil',
  argentinian: 'argentina',
  argentine: 'argentina',
  chilean: 'chile',
  peruvian: 'peru',
  colombian: 'colombia',
  venezuelan: 'venezuela',
  ecuadorian: 'ecuador',
  bolivian: 'bolivia',
  paraguayan: 'paraguay',
  uruguayan: 'uruguay',
  chinese: 'china',
  japanese: 'japan',
  korean: 'korea',
  indian: 'india',
  pakistani: 'pakistan',
  bangladeshi: 'bangladesh',
  indonesian: 'indonesia',
  malaysian: 'malaysia',
  philippine: 'philippines',
  filipino: 'philippines',
  vietnamese: 'vietnam',
  thai: 'thailand',
  burmese: 'myanmar',
  cambodian: 'cambodia',
  australian: 'australia',
  'new zealander': 'new zealand',
  palestinian: 'palestine',
  israeli: 'israel',
  lebanese: 'lebanon',
  syrian: 'syria',
  iraqi: 'iraq',
  iranian: 'iran',
  persian: 'iran',
  saudi: 'saudi arabia',
  emirati: 'united arab emirates',
  omani: 'oman',
  yemeni: 'yemen',
  kuwaiti: 'kuwait',
  qatari: 'qatar',
  bahraini: 'bahrain',
};

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function applyDemonyms(s: string): string {
  let result = s;
  for (const [demonym, country] of Object.entries(DEMONYM_MAP)) {
    result = result.replace(new RegExp(`\\b${demonym}\\b`, 'gi'), country);
  }
  return result;
}

export function stemmed(s: string): string {
  return normalize(applyDemonyms(s))
    .split(/\W+/)
    .filter(Boolean)
    .map((w) => stem(w))
    .join(' ');
}
