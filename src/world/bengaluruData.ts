// Core geographical projection, real Bengaluru zones, landmarks,
// fictional rival crews, safehouses, and Namma Metro stations.

export const ORIGIN_LAT = 12.9760;
export const ORIGIN_LON = 77.5980;
export const CHUNK_SIZE = 500; // meters per chunk tile
const COS_ORIGIN = Math.cos((ORIGIN_LAT * Math.PI) / 180);

export interface WorldXZ {
  x: number;
  z: number;
}

export function latLonToWorld(lat: number, lon: number): WorldXZ {
  return {
    x: (lon - ORIGIN_LON) * 111320 * COS_ORIGIN,
    z: -(lat - ORIGIN_LAT) * 110574
  };
}

export function worldToLatLon(x: number, z: number): { lat: number; lon: number } {
  return {
    lat: ORIGIN_LAT - z / 110574,
    lon: ORIGIN_LON + x / (111320 * COS_ORIGIN)
  };
}

export function chunkCoords(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE)
  };
}

export type ZoneId =
  | 'central'
  | 'old_city'
  | 'east'
  | 'south'
  | 'southeast'
  | 'west'
  | 'north'
  | 'airport';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  nameKn: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  crewName: string;
  crewColor: string;
  crewHex: number;
  trafficDensity: number; // 0.5 - 2.0 (Silk Board, Majestic, KR Market highest!)
  description: string;
  safehouseLat: number;
  safehouseLon: number;
  safehouseName: string;
  shopLat: number;
  shopLon: number;
  shopName: string;
  role: string;
  areas: string[];
}

export const BENGALURU_ZONES: ZoneDef[] = [
  {
    id: 'central',
    name: 'Central',
    nameKn: 'ಕೇಂದ್ರ ಬೆಂಗಳೂರು',
    centerLat: 12.9762,
    centerLon: 77.6000,
    radiusMeters: 2600,
    crewName: 'Cantonment Syndicate',
    crewColor: '#f59e0b',
    crewHex: 0xf59e0b,
    trafficDensity: 1.25,
    description: 'MG Road, Brigade Road, Church Street, Cubbon Park, Vidhana Soudha & Ulsoor Lake.',
    safehouseLat: 12.9754,
    safehouseLon: 77.6038,
    safehouseName: 'Church Street Loft Safehouse',
    shopLat: 12.9746,
    shopLon: 77.6075,
    shopName: 'Brigade Basement Armory',
    role: 'Starting turf, safehouse & first crew takeovers',
    areas: ['MG Road', 'Brigade Road', 'Church Street', 'Commercial Street', 'Cubbon Park', 'Vidhana Soudha', 'Shivajinagar', 'Ulsoor', 'Richmond Town', 'Shantinagar']
  },
  {
    id: 'old_city',
    name: 'Old City / Heart',
    nameKn: 'ಹಳೆಯ ಬೆಂಗಳೂರು',
    centerLat: 12.9635,
    centerLon: 77.5765,
    radiusMeters: 2400,
    crewName: 'Pettah Cobras',
    crewColor: '#ef4444',
    crewHex: 0xef4444,
    trafficDensity: 1.85,
    description: 'Majestic bus & rail hub, KR Market, Chickpet alleys, Lalbagh Glasshouse & Basavanagudi.',
    safehouseLat: 12.9715,
    safehouseLon: 77.5752,
    safehouseName: 'Avenue Road Terrace Hideout',
    shopLat: 12.9645,
    shopLon: 77.5768,
    shopName: 'Pettah Iron & Arms Depot',
    role: 'Dense alleys, night markets, Majestic hub & Lalbagh standoff',
    areas: ['Majestic', 'KR Market', 'Chickpet', 'Avenue Road', 'Chamarajpet', 'Gandhi Nagar', 'VV Puram', 'Basavanagudi', 'Lalbagh']
  },
  {
    id: 'east',
    name: 'East / Tech Corridor',
    nameKn: 'ಪೂರ್ವ ಬೆಂಗಳೂರು',
    centerLat: 12.9680,
    centerLon: 77.6750,
    radiusMeters: 5200,
    crewName: '100ft Neon Vipers',
    crewColor: '#a855f7',
    crewHex: 0xa855f7,
    trafficDensity: 1.4,
    description: 'Indiranagar 100 Feet Road, Domlur, Bellandur Lake mist, ORR corridor & Whitefield ITPL.',
    safehouseLat: 12.9784,
    safehouseLon: 77.6408,
    safehouseName: 'Indiranagar 100ft Penthouse',
    shopLat: 12.9742,
    shopLon: 77.6420,
    shopName: 'Deccan Tactical Lounge',
    role: 'Nightlife crew, tech-park heists & high-speed ORR chases',
    areas: ['Indiranagar', 'Domlur', 'Old Airport Road', 'Marathahalli', 'Whitefield', 'ITPL', 'Bellandur', 'Koramangala', 'KR Puram']
  },
  {
    id: 'south',
    name: 'South / Silk Board',
    nameKn: 'ದಕ್ಷಿಣ ಬೆಂಗಳೂರು',
    centerLat: 12.9210,
    centerLon: 77.6060,
    radiusMeters: 3800,
    crewName: 'Silk Grid Runners',
    crewColor: '#f97316',
    crewHex: 0xf97316,
    trafficDensity: 2.0,
    description: 'Legendary Silk Board Junction gridlock, Jayanagar 4th Block, BTM, HSR & Bannerghatta Rd.',
    safehouseLat: 12.9278,
    safehouseLon: 77.5855,
    safehouseName: 'Jayanagar 4th Block Villa',
    shopLat: 12.9175,
    shopLon: 77.6210,
    shopName: 'Madiwala Backstreet Armory',
    role: 'Residential turf & Silk Board gridlock bike chase',
    areas: ['Silk Board', 'Jayanagar', 'JP Nagar', 'BTM Layout', 'HSR Layout', 'Banashankari', 'Madiwala', 'Hosur Road', 'Bannerghatta Road']
  },
  {
    id: 'southeast',
    name: 'Electronic City',
    nameKn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ',
    centerLat: 12.8456,
    centerLon: 77.6645,
    radiusMeters: 3000,
    crewName: 'Silicon Syndicate',
    crewColor: '#06b6d4',
    crewHex: 0x06b6d4,
    trafficDensity: 1.1,
    description: 'Electronic City Phase 1 & 2 tech campuses & Hosur Road Elevated Expressway.',
    safehouseLat: 12.8465,
    safehouseLon: 77.6602,
    safehouseName: 'Phase 1 Glass Tower Loft',
    shopLat: 12.8442,
    shopLon: 77.6670,
    shopName: 'Expressway Hardware Vault',
    role: 'Corporate server room heist & expressway shootouts',
    areas: ['Electronic City Phase 1', 'Electronic City Phase 2', 'Bommasandra', 'Hebbagodi', 'Hosur Road Expressway']
  },
  {
    id: 'west',
    name: 'West / Peenya Industrial',
    nameKn: 'ಪಶ್ಚಿಮ ಬೆಂಗಳೂರು',
    centerLat: 13.0250,
    centerLon: 77.5350,
    radiusMeters: 3600,
    crewName: 'Peenya Iron Wolves',
    crewColor: '#eab308',
    crewHex: 0xeab308,
    trafficDensity: 1.2,
    description: 'Peenya factory blocks, Yeshwanthpur rail yard, Rajajinagar & Mysore/Tumkur Road.',
    safehouseLat: 13.0238,
    safehouseLon: 77.5495,
    safehouseName: 'Yeshwanthpur Rail Yard Office',
    shopLat: 13.0285,
    shopLon: 77.5280,
    shopName: 'Peenya Foundry Munitions',
    role: 'Industrial warehouses, rail yard fight & rival stash raid',
    areas: ['Peenya', 'Yeshwanthpur', 'Rajajinagar', 'Vijayanagar', 'Nagarbhavi', 'RR Nagar', 'Kengeri', 'Mysore Road', 'Tumkur Road']
  },
  {
    id: 'north',
    name: 'North / Hebbal',
    nameKn: 'ಉತ್ತರ ಬೆಂಗಳೂರು',
    centerLat: 13.0355,
    centerLon: 77.5930,
    radiusMeters: 3800,
    crewName: 'Hebbal Flyover Kings',
    crewColor: '#3b82f6',
    crewHex: 0x3b82f6,
    trafficDensity: 1.45,
    description: 'Hebbal Flyover & Lake, Bellary Road (NH44), Sankey Tank, Malleshwaram & Manyata.',
    safehouseLat: 13.0068,
    safehouseLon: 77.5735,
    safehouseName: 'Sankey Tank Heritage Bungalow',
    shopLat: 13.0345,
    shopLon: 77.5945,
    shopName: 'Bellary Rd Lockbox',
    role: 'Hebbal flyover police chase & lakeside standoffs',
    areas: ['Hebbal', 'Malleshwaram', 'Sadashivanagar', 'RT Nagar', 'Sanjay Nagar', 'Manyata Tech Park', 'Yelahanka', 'Bellary Road']
  },
  {
    id: 'airport',
    name: 'Devanahalli / Airport',
    nameKn: 'ವಿಮಾನ ನಿಲ್ದಾಣ / ದೇವನಹಳ್ಳಿ',
    centerLat: 13.1986,
    centerLon: 77.7066,
    radiusMeters: 3200,
    crewName: 'Devanahalli Sky Cartel',
    crewColor: '#ec4899',
    crewHex: 0xec4899,
    trafficDensity: 0.9,
    description: 'Kempegowda International Airport cargo terminals & high-speed Airport Road.',
    safehouseLat: 13.1945,
    safehouseLon: 77.6980,
    safehouseName: 'Cargo Hangar Staging Post',
    shopLat: 13.1965,
    shopLon: 77.7025,
    shopName: 'Runway Smuggler Armory',
    role: 'Final cargo smuggling shootout & boss confrontation',
    areas: ['Devanahalli', 'Bagalur', 'Kempegowda International Airport', 'Airport Road']
  }
];

export interface LandmarkDef {
  id: string;
  name: string;
  nameKn: string;
  zone: ZoneId;
  lat: number;
  lon: number;
  kind: 'hero' | 'lake' | 'park' | 'junction' | 'safe_zone' | 'nogo';
}

export const BENGALURU_LANDMARKS: LandmarkDef[] = [
  { id: 'vidhana_soudha', name: 'Vidhana Soudha', nameKn: 'ವಿಧಾನ ಸೌಧ', zone: 'central', lat: 12.9796, lon: 77.5907, kind: 'hero' },
  { id: 'high_court', name: 'High Court (Attara Kacheri)', nameKn: 'ಹೈಕೋರ್ಟ್ (ಅಠಾರಾ ಕಚೇರಿ)', zone: 'central', lat: 12.9779, lon: 77.5925, kind: 'hero' },
  { id: 'cubbon_park', name: 'Cubbon Park', nameKn: 'ಕಬ್ಬನ್ ಪಾರ್ಕ್', zone: 'central', lat: 12.9757, lon: 77.5929, kind: 'park' },
  { id: 'mg_road', name: 'MG Road Promenade', nameKn: 'ಎಂ.ಜಿ. ರಸ್ತೆ', zone: 'central', lat: 12.9756, lon: 77.6066, kind: 'junction' },
  { id: 'ulsoor_lake', name: 'Ulsoor Lake', nameKn: 'ಹಲಸೂರು ಕೆರೆ', zone: 'central', lat: 12.9817, lon: 77.6195, kind: 'lake' },
  { id: 'majestic_hub', name: 'Majestic Bus & Rail Hub', nameKn: 'ಮೆಜೆಸ್ಟಿಕ್ ಬಸ್ ಮತ್ತು ರೈಲು ನಿಲ್ದಾಣ', zone: 'old_city', lat: 12.9774, lon: 77.5713, kind: 'hero' },
  { id: 'kr_market', name: 'KR Market', nameKn: 'ಕೆ.ಆರ್. ಮಾರುಕಟ್ಟೆ', zone: 'old_city', lat: 12.9634, lon: 77.5767, kind: 'junction' },
  { id: 'lalbagh_glasshouse', name: 'Lalbagh Glasshouse', nameKn: 'ಲಾಲ್‌ಬಾಗ್ ಗ್ಲಾಸ್ ಹೌಸ್', zone: 'old_city', lat: 12.9507, lon: 77.5848, kind: 'hero' },
  { id: 'bull_temple', name: 'Bull Temple Heritage (Safe Zone)', nameKn: 'ಬುಲ್ ಟೆಂಪಲ್ (ಸುರಕ್ಷಿತ ವಲಯ)', zone: 'old_city', lat: 12.9419, lon: 77.5680, kind: 'safe_zone' },
  { id: 'indiranagar_100ft', name: '100 Feet Road Indiranagar', nameKn: '೧೦೦ ಅಡಿ ರಸ್ತೆ ಇಂದಿರಾನಗರ', zone: 'east', lat: 12.9784, lon: 77.6408, kind: 'junction' },
  { id: 'bellandur_lake', name: 'Bellandur Lake (Foam & Mist)', nameKn: 'ಬೆಳ್ಳಂದೂರು ಕೆರೆ', zone: 'east', lat: 12.9360, lon: 77.6745, kind: 'lake' },
  { id: 'itpl_park', name: 'ITPL Tech Park', nameKn: 'ಐಟಿಪಿಎಲ್ ಟೆಕ್ ಪಾರ್ಕ್', zone: 'east', lat: 12.9854, lon: 77.7365, kind: 'hero' },
  { id: 'silk_board', name: 'Silk Board Junction', nameKn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಜಂಕ್ಷನ್', zone: 'south', lat: 12.9177, lon: 77.6238, kind: 'hero' },
  { id: 'ecity_campus', name: 'Electronic City Phase 1', nameKn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ಹಂತ ೧', zone: 'southeast', lat: 12.8456, lon: 77.6632, kind: 'hero' },
  { id: 'peenya_hub', name: 'Peenya Industrial Warehouses', nameKn: 'ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶ', zone: 'west', lat: 13.0285, lon: 77.5260, kind: 'hero' },
  { id: 'yeshwanthpur_rail', name: 'Yeshwanthpur Rail Yard', nameKn: 'ಯಶವಂತಪುರ ರೈಲು ನಿಲ್ದಾಣ', zone: 'west', lat: 13.0235, lon: 77.5503, kind: 'junction' },
  { id: 'hebbal_flyover', name: 'Hebbal Flyover & Lake', nameKn: 'ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆ ಮತ್ತು ಕೆರೆ', zone: 'north', lat: 13.0358, lon: 77.5970, kind: 'hero' },
  { id: 'sankey_tank', name: 'Sankey Tank', nameKn: 'ಸ್ಯಾಂಕಿ ಕೆರೆ', zone: 'north', lat: 13.0108, lon: 77.5736, kind: 'lake' },
  { id: 'yelahanka_afb', name: 'Yelahanka Airfield (No-Go Zone)', nameKn: 'ಯಲಹಂಕ ವಾಯುನೆಲೆ (ನಿಷೇಧಿತ ವಲಯ)', zone: 'north', lat: 13.1355, lon: 77.6060, kind: 'nogo' },
  { id: 'kia_airport', name: 'Kempegowda International Airport', nameKn: 'ಕೆಂಪೇಗೌಡ ಅಂತಾರಾಷ್ಟ್ರೀಯ ವಿಮಾನ ನಿಲ್ದಾಣ', zone: 'airport', lat: 13.1986, lon: 77.7066, kind: 'hero' }
];

export interface MetroStationDef {
  id: string;
  name: string;
  nameKn: string;
  line: 'purple' | 'green' | 'interchange';
  lat: number;
  lon: number;
  zone: ZoneId;
  elevated: boolean;
}

export const NAMMA_METRO_STATIONS: MetroStationDef[] = [
  // Purple Line (Whitefield -> Challaghatta)
  { id: 'whitefield', name: 'Whitefield (Kadugodi)', nameKn: 'ವೈಟ್‌ಫೀಲ್ಡ್ (ಕಾಡುಗೋಡಿ)', line: 'purple', lat: 12.9958, lon: 77.7580, zone: 'east', elevated: true },
  { id: 'pattandur', name: 'Pattandur Agrahara (ITPL)', nameKn: 'ಪಟ್ಟಂದೂರು ಅಗ್ರಹಾರ', line: 'purple', lat: 12.9875, lon: 77.7376, zone: 'east', elevated: true },
  { id: 'kr_puram', name: 'KR Puram', nameKn: 'ಕೆ.ಆರ್. ಪುರಂ', line: 'purple', lat: 12.9999, lon: 77.6776, zone: 'east', elevated: true },
  { id: 'indiranagar', name: 'Indiranagar', nameKn: 'ಇಂದಿರಾನಗರ', line: 'purple', lat: 12.9784, lon: 77.6386, zone: 'east', elevated: true },
  { id: 'halasuru', name: 'Halasuru (Ulsoor)', nameKn: 'ಹಲಸೂರು', line: 'purple', lat: 12.9765, lon: 77.6266, zone: 'central', elevated: true },
  { id: 'trinity', name: 'Trinity', nameKn: 'ಟ್ರಿನಿಟಿ', line: 'purple', lat: 12.9730, lon: 77.6170, zone: 'central', elevated: true },
  { id: 'mg_road', name: 'Mahatma Gandhi Road', nameKn: 'ಮಹಾತ್ಮ ಗಾಂಧಿ ರಸ್ತೆ', line: 'purple', lat: 12.9756, lon: 77.6066, zone: 'central', elevated: true },
  { id: 'cubbon_park', name: 'Cubbon Park', nameKn: 'ಕಬ್ಬನ್ ಪಾರ್ಕ್', line: 'purple', lat: 12.9809, lon: 77.5975, zone: 'central', elevated: false },
  { id: 'vidhana_soudha', name: 'Dr. B.R. Ambedkar (Vidhana Soudha)', nameKn: 'ವಿಧಾನ ಸೌಧ', line: 'purple', lat: 12.9795, lon: 77.5920, zone: 'central', elevated: false },
  { id: 'majestic', name: 'Nadaprabhu Kempegowda (Majestic)', nameKn: 'ನಾಡಪ್ರಭು ಕೆಂಪೇಗೌಡ (ಮೆಜೆಸ್ಟಿಕ್)', line: 'interchange', lat: 12.9757, lon: 77.5728, zone: 'old_city', elevated: false },
  { id: 'vijayanagar', name: 'Vijayanagar', nameKn: 'ವಿಜಯನಗರ', line: 'purple', lat: 12.9709, lon: 77.5374, zone: 'west', elevated: true },
  { id: 'kengeri', name: 'Kengeri / Challaghatta Corridor', nameKn: 'ಕೆಂಗೇರಿ', line: 'purple', lat: 12.9078, lon: 77.4765, zone: 'west', elevated: true },

  // Green Line (Nagasandra -> Silk Institute)
  { id: 'peenya_ind', name: 'Peenya Industry', nameKn: 'ಪೀಣ್ಯ ಇಂಡಸ್ಟ್ರಿ', line: 'green', lat: 13.0363, lon: 77.5255, zone: 'west', elevated: true },
  { id: 'yeshwanthpur', name: 'Yeshwanthpur', nameKn: 'ಯಶವಂತಪುರ', line: 'green', lat: 13.0232, lon: 77.5499, zone: 'west', elevated: true },
  { id: 'malleshwaram', name: 'Mantri Square / Malleshwaram', nameKn: 'ಮಲ್ಲೇಶ್ವರಂ', line: 'green', lat: 12.9905, lon: 77.5707, zone: 'north', elevated: true },
  { id: 'chickpete', name: 'Chickpete', nameKn: 'ಚಿಕ್ಕಪೇಟೆ', line: 'green', lat: 12.9665, lon: 77.5746, zone: 'old_city', elevated: false },
  { id: 'kr_market_stn', name: 'KR Market', nameKn: 'ಕೆ.ಆರ್. ಮಾರುಕಟ್ಟೆ', line: 'green', lat: 12.9612, lon: 77.5746, zone: 'old_city', elevated: false },
  { id: 'lalbagh', name: 'Lalbagh', nameKn: 'ಲಾಲ್‌ಬಾಗ್', line: 'green', lat: 12.9464, lon: 77.5800, zone: 'old_city', elevated: true },
  { id: 'jayanagar', name: 'Jayanagar', nameKn: 'ಜಯನಗರ', line: 'green', lat: 12.9295, lon: 77.5802, zone: 'south', elevated: true },
  { id: 'jp_nagar', name: 'JP Nagar / Banashankari', nameKn: 'ಜೆ.ಪಿ. ನಗರ', line: 'green', lat: 12.9074, lon: 77.5731, zone: 'south', elevated: true },

  // Express Airport / Electronic City Metro Link Stops (in-game fast transit connections)
  { id: 'hebbal_link', name: 'Hebbal Ring Interchange', nameKn: 'ಹೆಬ್ಬಾಳ ನಿಲ್ದಾಣ', line: 'green', lat: 13.0365, lon: 77.5965, zone: 'north', elevated: true },
  { id: 'silk_board_link', name: 'Silk Board Interchange', nameKn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ನಿಲ್ದಾಣ', line: 'green', lat: 12.9175, lon: 77.6230, zone: 'south', elevated: true },
  { id: 'ecity_link', name: 'Electronic City Terminal', nameKn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ನಿಲ್ದಾಣ', line: 'green', lat: 12.8460, lon: 77.6630, zone: 'southeast', elevated: true },
  { id: 'airport_link', name: 'KIA Airport Express Metro', nameKn: 'ವಿಮಾನ ನಿಲ್ದಾಣ ಮೆಟ್ರೋ', line: 'purple', lat: 13.1970, lon: 77.7055, zone: 'airport', elevated: true }
];

export function getZoneAtWorldPos(x: number, z: number): ZoneDef {
  const { lat, lon } = worldToLatLon(x, z);
  let best = BENGALURU_ZONES[0];
  let bestScore = Infinity;
  for (const zDef of BENGALURU_ZONES) {
    const p = latLonToWorld(zDef.centerLat, zDef.centerLon);
    const d = Math.hypot(x - p.x, z - p.z) / zDef.radiusMeters;
    if (d < bestScore) {
      bestScore = d;
      best = zDef;
    }
  }
  // Keep airport distinct when far north
  if (lat > 13.12) return BENGALURU_ZONES.find((z) => z.id === 'airport')!;
  if (lat < 12.885 && lon > 77.63) return BENGALURU_ZONES.find((z) => z.id === 'southeast')!;
  return best;
}

export const FICTIONAL_SHOPS: Array<{ title: string; subtitle: string; lang: string; accent: string }> = [
  { title: 'NAMMA FILTER KAAPI', subtitle: 'ನಮ್ಮ ಫಿಲ್ಟರ್ ಕಾಫಿ • FRESH BREW', lang: 'kn', accent: '#ff9f2e' },
  { title: 'MALGUDI DARSHINI', subtitle: 'ಮಾಲ್ಗುಡಿ ದರ್ಶಿನಿ • IDLI VADA DOSA', lang: 'kn', accent: '#2ecc71' },
  { title: 'KAVERI SILK HOUSE', subtitle: 'ಕಾವೇರಿ ಸಿಲ್ಕ್ ಹೌಸ್ • HANDLOOM', lang: 'kn', accent: '#f43f5e' },
  { title: 'DECCAN ELECTRONICS', subtitle: 'ಡೆಕ್ಕನ್ ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ • REPAIR', lang: 'kn', accent: '#38bdf8' },
  { title: 'GARDEN CITY BAKERY', subtitle: 'ಗಾರ್ಡನ್ ಸಿಟಿ ಬೇಕರಿ • DIL PASAND', lang: 'kn', accent: '#fbbf24' },
  { title: 'BANYAN SPICE BAZAAR', subtitle: 'बनियान मसाला बाज़ार • MASALA', lang: 'hi', accent: '#f97316' },
  { title: 'CAUVERY TAILORS', subtitle: 'காவேரி தையலகம் • BESPOKE', lang: 'ta', accent: '#a855f7' },
  { title: 'SANDALWOOD CYBER', subtitle: 'శాండల్‌వుడ్ సైబర్ • 24x7 NET', lang: 'te', accent: '#22d3ee' },
  { title: 'OLD CITY MOTORS', subtitle: 'ಓಲ್ಡ್ ಸಿಟಿ ಮೋಟಾರ್ಸ್ • AUTO PARTS', lang: 'kn', accent: '#ef4444' },
  { title: 'MONSOON CHAI TAPRI', subtitle: 'मानसून चाय टपरी • GINGER TEA', lang: 'hi', accent: '#eab308' }
];
