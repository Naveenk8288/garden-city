#!/usr/bin/env node
/**
 * OpenStreetMap (Overpass API) fetcher & chunked GeoJSON tile preprocessor
 * for "Garden City Underworld" (Bengaluru, India).
 *
 * Fetches real road geometry, building footprints, lakes, parks, places of
 * worship (combat safe zones), landmarks, major corridors, and Namma Metro
 * lines/stations. Outputs standard GeoJSON chunk tiles into public/map-data/.
 *
 * Usage:
 *   node scripts/fetch-osm.mjs --zones central,metro,corridors
 *   node scripts/fetch-osm.mjs --zones old_city,east,south,southeast,west,north,airport
 *   node scripts/fetch-osm.mjs --zones all
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toKannadaName } from './kannada-names.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'map-data');
const CHUNKS_DIR = path.join(OUT_DIR, 'chunks');
const RAW_CACHE_DIR = path.join(ROOT, '.osm-cache');

// World origin: Central Bengaluru (between MG Road & Cubbon Park)
export const ORIGIN_LAT = 12.9760;
export const ORIGIN_LON = 77.5980;
export const CHUNK_SIZE = 500; // meters per chunk tile

const COS_ORIGIN = Math.cos((ORIGIN_LAT * Math.PI) / 180);

export function latLonToWorld(lat, lon) {
  return {
    x: (lon - ORIGIN_LON) * 111320 * COS_ORIGIN,
    z: -(lat - ORIGIN_LAT) * 110574
  };
}

export function chunkCoords(x, z) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE)
  };
}

// Overpass API mirrors with failover (openstreetmap.fr is fast and reliable)
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// Zone definitions with real Bengaluru bounding boxes [south, west, north, east]
// Larger districts are split into compact sub-boxes so Overpass responds rapidly.
const ZONE_SPECS = {
  central: {
    name: 'Central',
    nameKn: 'ಕೇಂದ್ರ ಬೆಂಗಳೂರು',
    center: [12.9760, 77.5990],
    boxes: [
      { id: 'central_west', bbox: [12.9695, 77.5875, 12.9835, 77.6030] }, // Vidhana Soudha, Cubbon Park, High Court, Freedom Park, Kasturba Rd
      { id: 'central_east', bbox: [12.9695, 77.6030, 12.9845, 77.6215] }  // MG Rd, Brigade Rd, Church St, Commercial St, Ulsoor Lake, Residency Rd
    ]
  },
  old_city: {
    name: 'Old City',
    nameKn: 'ಹಳೆಯ ಬೆಂಗಳೂರು',
    center: [12.9650, 77.5750],
    boxes: [
      { id: 'old_majestic', bbox: [12.9630, 77.5670, 12.9800, 77.5835] }, // Majestic, KSR Station, Chickpet, Avenue Rd, KR Market
      { id: 'old_lalbagh', bbox: [12.9435, 77.5690, 12.9600, 77.5900] }   // Lalbagh, Glasshouse, Bull Temple, Basavanagudi, VV Puram
    ]
  },
  east: {
    name: 'East',
    nameKn: 'ಪೂರ್ವ ಬೆಂಗಳೂರು',
    center: [12.9650, 77.6650],
    boxes: [
      { id: 'east_indiranagar', bbox: [12.9695, 77.6345, 12.9835, 77.6495] }, // Indiranagar 100ft Rd, Domlur
      { id: 'east_bellandur', bbox: [12.9295, 77.6660, 12.9445, 77.6850] },   // Bellandur Lake & ORR
      { id: 'east_whitefield', bbox: [12.9800, 77.7280, 12.9935, 77.7460] }   // ITPL Tech Park & Whitefield Main Rd
    ]
  },
  south: {
    name: 'South',
    nameKn: 'ದಕ್ಷಿಣ ಬೆಂಗಳೂರು',
    center: [12.9200, 77.6100],
    boxes: [
      { id: 'south_silkboard', bbox: [12.9110, 77.6120, 12.9245, 77.6310] },  // Silk Board Junction, Hosur Rd flyover, Madiwala, BTM/HSR edge
      { id: 'south_jayanagar', bbox: [12.9200, 77.5790, 12.9330, 77.5960] }   // Jayanagar 4th Block, JP Nagar, Bannerghatta Rd
    ]
  },
  southeast: {
    name: 'Electronic City',
    nameKn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ',
    center: [12.8455, 77.6640],
    boxes: [
      { id: 'se_ecity', bbox: [12.8380, 77.6560, 12.8535, 77.6745] }          // Electronic City Phase 1 & 2, Hosur Elevated Expressway
    ]
  },
  west: {
    name: 'West',
    nameKn: 'ಪಶ್ಚಿಮ ಬೆಂಗಳೂರು',
    center: [13.0250, 77.5350],
    boxes: [
      { id: 'west_peenya', bbox: [13.0200, 77.5180, 13.0355, 77.5420] },      // Peenya Industrial Area, Tumkur Rd
      { id: 'west_yeshwanthpur', bbox: [13.0180, 77.5420, 13.0320, 77.5580] } // Yeshwanthpur Railway Station, Rajajinagar north
    ]
  },
  north: {
    name: 'North',
    nameKn: 'ಉತ್ತರ ಬೆಂಗಳೂರು',
    center: [13.0360, 77.5970],
    boxes: [
      { id: 'north_hebbal', bbox: [13.0315, 77.5840, 13.0490, 77.6060] },     // Hebbal Flyover, Hebbal Lake, Bellary Rd (NH44)
      { id: 'north_malleshwaram', bbox: [12.9990, 77.5670, 13.0135, 77.5820] }// Malleshwaram, Sankey Tank, Sadashivanagar
    ]
  },
  airport: {
    name: 'Airport / Devanahalli',
    nameKn: 'ವಿಮಾನ ನಿಲ್ದಾಣ / ದೇವನಹಳ್ಳಿ',
    center: [13.1986, 77.7066],
    boxes: [
      { id: 'far_north_kia', bbox: [13.1900, 77.6920, 13.2080, 77.7190] }     // Kempegowda International Airport, Cargo Area, Airport Rd
    ]
  }
};

function buildZoneQuery(bbox) {
  const [s, w, n, e] = bbox;
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:45];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|service|living_street|pedestrian)$"](${b});
  way["building"](${b});
  way["leisure"~"^(park|garden)$"](${b});
  relation["leisure"~"^(park|garden)$"](${b});
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["amenity"="place_of_worship"](${b});
  node["amenity"="place_of_worship"](${b});
  node["railway"~"^(station|subway_entrance)$"](${b});
  node["tourism"~"^(attraction|museum|monument)$"](${b});
);
out geom qt;`;
}

function buildCorridorsQuery() {
  // Greater Bengaluru major road skeleton (no buildings) so players can drive continuously between all 8 zones
  const b = `12.830,77.495,13.215,77.760`;
  return `[out:json][timeout:60];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link)$"](${b});
);
out geom qt;`;
}

function buildMetroQuery() {
  const b = `12.840,77.470,13.100,77.770`;
  return `[out:json][timeout:45];
(
  way["railway"="subway"](${b});
  node["station"="subway"](${b});
  node["railway"="station"]["network"~"Namma Metro|BMRCL",i](${b});
  node["railway"="station"]["operator"~"BMRCL|Bangalore Metro",i](${b});
);
out geom qt;`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOsmBbox(bbox, cacheKey, force = false) {
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });
  const cacheFile = path.join(RAW_CACHE_DIR, `${cacheKey}.json`);
  if (!force) {
    try {
      const existing = await fs.readFile(cacheFile, 'utf8');
      const parsed = JSON.parse(existing);
      if (parsed?.elements?.length > 0) {
        console.log(`  [cache] ${cacheKey}: ${parsed.elements.length} elements`);
        return parsed;
      }
    } catch {
      // cache miss
    }
  }

  // Split larger bboxes into ~0.0085° x 0.0085° tiles so api.openstreetmap.org/api/0.6/map.json
  // stays well below the 50,000-node limit and responds in 1-3 seconds!
  const [south, west, north, east] = bbox;
  const maxStep = 0.0085;
  const latSteps = Math.max(1, Math.ceil((north - south) / maxStep));
  const lonSteps = Math.max(1, Math.ceil((east - west) / maxStep));
  const dLat = (north - south) / latSteps;
  const dLon = (east - west) / lonSteps;

  const elementMap = new Map();

  for (let r = 0; r < latSteps; r++) {
    for (let c = 0; c < lonSteps; c++) {
      const ts = roundCoord(south + r * dLat);
      const tn = roundCoord(south + (r + 1) * dLat);
      const tw = roundCoord(west + c * dLon);
      const te = roundCoord(west + (c + 1) * dLon);
      const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${tw},${ts},${te},${tn}`;
      let ok = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`  [osm-api] ${cacheKey} tile ${r * lonSteps + c + 1}/${latSteps * lonSteps} (${tw},${ts},${te},${tn})`);
          const res = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'GardenCityUnderworldMapBuilder/1.0'
            },
            signal: AbortSignal.timeout(25000)
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const tileData = await res.json();
          for (const el of tileData.elements || []) {
            elementMap.set(`${el.type}_${el.id}`, el);
          }
          ok = true;
          break;
        } catch (err) {
          console.warn(`  [retry] osm-api tile failed: ${err.message}`);
          await sleep(1500);
        }
      }
      if (!ok) {
        // Fallback to Overpass for this sub-tile
        const q = buildZoneQuery([ts, tw, tn, te]);
        const ovData = await fetchOverpass(q, `${cacheKey}_sub_${r}_${c}`, true);
        for (const el of ovData.elements || []) {
          elementMap.set(`${el.type}_${el.id}`, el);
        }
      }
      await sleep(350);
    }
  }

  const combined = { elements: [...elementMap.values()] };
  await fs.writeFile(cacheFile, JSON.stringify(combined));
  console.log(`  [ok] ${cacheKey}: ${combined.elements.length} unique OSM elements fetched`);
  return combined;
}

async function fetchOverpass(query, cacheKey, force = false) {
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });
  const cacheFile = path.join(RAW_CACHE_DIR, `${cacheKey}.json`);
  if (!force) {
    try {
      const existing = await fs.readFile(cacheFile, 'utf8');
      const parsed = JSON.parse(existing);
      if (parsed?.elements?.length > 0) {
        console.log(`  [cache] ${cacheKey}: ${parsed.elements.length} elements`);
        return parsed;
      }
    } catch {
      // cache miss
    }
  }

  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    try {
      console.log(`  [overpass] ${cacheKey} -> ${new URL(endpoint).host} (try ${attempt + 1})`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'GardenCityUnderworldMapBuilder/1.0'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(45000)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.elements)) {
        throw new Error('Invalid Overpass response shape');
      }
      await fs.writeFile(cacheFile, JSON.stringify(data));
      console.log(`  [ok] ${cacheKey}: ${data.elements.length} elements fetched`);
      return data;
    } catch (err) {
      lastErr = err;
      console.warn(`  [retry] ${cacheKey} failed on ${endpoint}: ${err.message}`);
      await sleep(1800 + attempt * 1500);
    }
  }
  throw new Error(`Overpass failed for ${cacheKey}: ${lastErr?.message}`);
}

function roundCoord(v) {
  return Math.round(v * 1e6) / 1e6;
}

function simplifyCoords(coords, minStepDeg = 0.000018) {
  if (coords.length <= 3) return coords;
  const out = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = coords[i];
    if (Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) >= minStepDeg) {
      out.push(cur);
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

function isClosed(coords) {
  if (coords.length < 4) return false;
  const a = coords[0];
  const b = coords[coords.length - 1];
  return a[0] === b[0] && a[1] === b[1];
}

function polygonCentroid(ring) {
  let sx = 0, sz = 0;
  const n = ring.length - (isClosed(ring) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sz += ring[i][1];
  }
  return [sx / Math.max(1, n), sz / Math.max(1, n)];
}

function estimateBuildingHeight(tags) {
  if (tags.height) {
    const m = parseFloat(String(tags.height).replace(/[^\d.]/g, ''));
    if (Number.isFinite(m) && m >= 3 && m <= 180) return Math.round(m * 10) / 10;
  }
  if (tags['building:levels']) {
    const lv = parseFloat(tags['building:levels']);
    if (Number.isFinite(lv) && lv >= 1 && lv <= 50) return Math.round(lv * 3.4 * 10) / 10;
  }
  const btype = (tags.building || '').toLowerCase();
  if (btype === 'apartments' || btype === 'office' || btype === 'commercial') return 14;
  if (btype === 'hotel' || btype === 'hospital') return 18;
  if (btype === 'industrial' || btype === 'warehouse') return 9;
  if (btype === 'house' || btype === 'residential') return 7.5;
  if (btype === 'retail' || btype === 'shop') return 8.5;
  if (btype === 'shed' || btype === 'garage' || btype === 'hut' || btype === 'kiosk') return 3.6;
  return 0; // Let deterministic hash pick authentic Bengaluru height (6–18m)
}

function roadWidth(highway, lanesTag) {
  const lanes = parseInt(lanesTag, 10);
  if (Number.isFinite(lanes) && lanes >= 1 && lanes <= 10) {
    return Math.min(26, Math.max(5.5, lanes * 3.5));
  }
  switch (highway) {
    case 'motorway':
    case 'trunk': return 18;
    case 'primary': return 15;
    case 'secondary': return 12;
    case 'tertiary': return 9.5;
    case 'motorway_link':
    case 'trunk_link':
    case 'primary_link':
    case 'secondary_link': return 8;
    case 'residential':
    case 'unclassified': return 7;
    case 'living_street':
    case 'pedestrian': return 5.5;
    default: return 5;
  }
}

function extractWayCoords(el, nodes) {
  if (Array.isArray(el.geometry) && el.geometry.length >= 2) {
    return el.geometry.map((pt) => [roundCoord(pt.lon), roundCoord(pt.lat)]);
  }
  const rawCoords = [];
  for (const nid of el.nodes || []) {
    const n = nodes.get(nid);
    if (n) rawCoords.push([n[0], n[1]]);
  }
  return rawCoords;
}

function osmToFeatures(data, zoneId) {
  const nodes = new Map();
  const ways = new Map();
  for (const el of data.elements) {
    if (el.type === 'node') nodes.set(el.id, [roundCoord(el.lon), roundCoord(el.lat), el.tags || null]);
    else if (el.type === 'way') ways.set(el.id, el);
  }

  const features = [];

  // Process ways
  for (const el of data.elements) {
    if (el.type !== 'way') continue;
    const tags = el.tags || {};
    const rawCoords = extractWayCoords(el, nodes);
    if (rawCoords.length < 2) continue;

    const name = tags['name:en'] || tags.name || '';
    const nameKn = toKannadaName(name, tags['name:kn']);

    // 1. Place of worship -> Safe Zone!
    if (tags.amenity === 'place_of_worship') {
      const closed = isClosed(rawCoords);
      const center = closed ? polygonCentroid(rawCoords) : rawCoords[Math.floor(rawCoords.length / 2)];
      features.push({
        type: 'Feature',
        id: `safe_way_${el.id}`,
        properties: {
          kind: 'safe_zone',
          zone: zoneId,
          religion: tags.religion || 'sacred',
          name: name || 'Place of Worship',
          name_kn: nameKn || 'ಪೂಜಾ ಸ್ಥಳ',
          radius: 50
        },
        geometry: { type: 'Point', coordinates: center }
      });
      // Still render building footprint as peaceful heritage architecture
      if (closed && tags.building) {
        const ring = simplifyCoords(rawCoords, 0.000012);
        if (ring.length >= 4) {
          features.push({
            type: 'Feature',
            id: `bldg_${el.id}`,
            properties: {
              kind: 'building',
              zone: zoneId,
              subtype: 'worship',
              safe: true,
              name: name || 'Sacred Heritage',
              name_kn: nameKn,
              height: estimateBuildingHeight(tags) || 11
            },
            geometry: { type: 'Polygon', coordinates: [ring] }
          });
        }
      }
      continue;
    }

    // 2. Roads
    if (tags.highway) {
      const line = simplifyCoords(rawCoords, 0.000015);
      if (line.length < 2) continue;
      const isBridge = tags.bridge === 'yes' || tags.bridge === 'viaduct' || Number(tags.layer) > 0;
      features.push({
        type: 'Feature',
        id: `road_${el.id}`,
        properties: {
          kind: 'road',
          zone: zoneId,
          highway: tags.highway,
          name: name || '',
          name_kn: nameKn || '',
          width: roadWidth(tags.highway, tags.lanes),
          oneway: tags.oneway === 'yes',
          bridge: isBridge,
          layer: Number(tags.layer) || 0
        },
        geometry: { type: 'LineString', coordinates: line }
      });
      continue;
    }

    // 3. Water / Lakes
    if (tags.natural === 'water' && isClosed(rawCoords)) {
      const ring = simplifyCoords(rawCoords, 0.000025);
      if (ring.length >= 4) {
        features.push({
          type: 'Feature',
          id: `water_${el.id}`,
          properties: {
            kind: 'water',
            zone: zoneId,
            name: name || 'Lake',
            name_kn: nameKn || 'ಕೆರೆ'
          },
          geometry: { type: 'Polygon', coordinates: [ring] }
        });
      }
      continue;
    }

    // 4. Parks & Gardens
    if ((tags.leisure === 'park' || tags.leisure === 'garden') && isClosed(rawCoords)) {
      const ring = simplifyCoords(rawCoords, 0.000025);
      if (ring.length >= 4) {
        features.push({
          type: 'Feature',
          id: `park_${el.id}`,
          properties: {
            kind: 'park',
            zone: zoneId,
            name: name || 'Park',
            name_kn: nameKn || 'ಉದ್ಯಾನ'
          },
          geometry: { type: 'Polygon', coordinates: [ring] }
        });
      }
      continue;
    }

    // 5. Buildings
    if (tags.building && isClosed(rawCoords)) {
      const ring = simplifyCoords(rawCoords, 0.000012);
      if (ring.length >= 4) {
        // Compute deterministic height if not explicitly tagged
        let h = estimateBuildingHeight(tags);
        if (!h) {
          const hash = (el.id * 2654435761) >>> 0;
          const zoneBias =
            zoneId === 'central' || zoneId === 'east' || zoneId === 'southeast' ? 1.25 :
            zoneId === 'old_city' ? 0.85 : 1.0;
          h = Math.round((6 + (hash % 15) * zoneBias) * 10) / 10;
        }
        features.push({
          type: 'Feature',
          id: `bldg_${el.id}`,
          properties: {
            kind: 'building',
            zone: zoneId,
            subtype: tags.building !== 'yes' ? tags.building : (tags.amenity || tags.shop || 'urban'),
            name: name || '',
            name_kn: nameKn || '',
            height: h
          },
          geometry: { type: 'Polygon', coordinates: [ring] }
        });
      }
    }
  }

  // Process multipolygon relations for large lakes & parks (Ulsoor Lake, Cubbon Park, Lalbagh, Bellandur Lake, Hebbal Lake, Sankey Tank)
  for (const el of data.elements) {
    if (el.type !== 'relation' || !el.members) continue;
    const tags = el.tags || {};
    const isWater = tags.natural === 'water';
    const isPark = tags.leisure === 'park' || tags.leisure === 'garden';
    if (!isWater && !isPark) continue;

    const outerWays = el.members
      .filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === ''))
      .map((m) => (m.geometry ? { geometry: m.geometry } : ways.get(m.ref)))
      .filter(Boolean);

    const rings = stitchRings(outerWays, nodes);
    const name = tags['name:en'] || tags.name || (isWater ? 'Lake' : 'Park');
    const nameKn = toKannadaName(name, tags['name:kn']);
    for (let idx = 0; idx < rings.length; idx++) {
      const ring = simplifyCoords(rings[idx], 0.000025);
      if (ring.length < 4) continue;
      if (!isClosed(ring)) ring.push(ring[0]);
      features.push({
        type: 'Feature',
        id: `${isWater ? 'water' : 'park'}_rel_${el.id}_${idx}`,
        properties: {
          kind: isWater ? 'water' : 'park',
          zone: zoneId,
          name,
          name_kn: nameKn
        },
        geometry: { type: 'Polygon', coordinates: [ring] }
      });
    }
  }

  // Process tagged nodes (places of worship, landmarks, stations)
  for (const el of data.elements) {
    if (el.type !== 'node' || !el.tags) continue;
    const tags = el.tags;
    const name = tags['name:en'] || tags.name || '';
    const nameKn = toKannadaName(name, tags['name:kn']);

    if (tags.amenity === 'place_of_worship') {
      features.push({
        type: 'Feature',
        id: `safe_node_${el.id}`,
        properties: {
          kind: 'safe_zone',
          zone: zoneId,
          religion: tags.religion || 'sacred',
          name: name || 'Place of Worship',
          name_kn: nameKn || 'ಪೂಜಾ ಸ್ಥಳ',
          radius: 45
        },
        geometry: { type: 'Point', coordinates: [roundCoord(el.lon), roundCoord(el.lat)] }
      });
    } else if (tags.tourism || tags.historic || tags.railway === 'station') {
      if (!name) continue;
      features.push({
        type: 'Feature',
        id: `poi_${el.id}`,
        properties: {
          kind: 'poi',
          zone: zoneId,
          category: tags.railway || tags.tourism || tags.historic || 'landmark',
          name,
          name_kn: nameKn
        },
        geometry: { type: 'Point', coordinates: [roundCoord(el.lon), roundCoord(el.lat)] }
      });
    }
  }

  return features;
}

function stitchRings(wayList, nodes) {
  // Convert ways to coordinate chains and stitch matching endpoints into closed rings
  const chains = [];
  for (const w of wayList) {
    const pts = extractWayCoords(w, nodes);
    if (pts.length >= 2) chains.push(pts);
  }

  const rings = [];
  const used = new Array(chains.length).fill(false);

  const samePt = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

  for (let i = 0; i < chains.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const ring = [...chains[i]];
    let changed = true;
    while (changed && !samePt(ring[0], ring[ring.length - 1])) {
      changed = false;
      const tail = ring[ring.length - 1];
      for (let j = 0; j < chains.length; j++) {
        if (used[j]) continue;
        const c = chains[j];
        if (samePt(tail, c[0])) {
          ring.push(...c.slice(1));
          used[j] = true;
          changed = true;
          break;
        } else if (samePt(tail, c[c.length - 1])) {
          ring.push(...c.slice(0, -1).reverse());
          used[j] = true;
          changed = true;
          break;
        }
      }
    }
    if (ring.length >= 4) {
      if (!samePt(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
      rings.push(ring);
    }
  }
  return rings;
}

function getFeatureChunkKeys(feature) {
  const geom = feature.geometry;
  const keys = new Set();

  if (geom.type === 'Point') {
    const [lon, lat] = geom.coordinates;
    const w = latLonToWorld(lat, lon);
    const { cx, cz } = chunkCoords(w.x, w.z);
    keys.add(`${cx}_${cz}`);
  } else if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    if (feature.properties.kind === 'building') {
      const [lon, lat] = polygonCentroid(ring);
      const w = latLonToWorld(lat, lon);
      const { cx, cz } = chunkCoords(w.x, w.z);
      keys.add(`${cx}_${cz}`);
    } else {
      // Lakes & parks may span multiple chunks — index by their bbox chunks
      let minCx = Infinity, maxCx = -Infinity, minCz = Infinity, maxCz = -Infinity;
      for (const [lon, lat] of ring) {
        const w = latLonToWorld(lat, lon);
        const { cx, cz } = chunkCoords(w.x, w.z);
        if (cx < minCx) minCx = cx;
        if (cx > maxCx) maxCx = cx;
        if (cz < minCz) minCz = cz;
        if (cz > maxCz) maxCz = cz;
      }
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          keys.add(`${cx}_${cz}`);
        }
      }
    }
  } else if (geom.type === 'LineString') {
    // Include every chunk a road touches so roads never vanish at chunk edges
    for (let i = 0; i < geom.coordinates.length; i++) {
      const [lon, lat] = geom.coordinates[i];
      const w = latLonToWorld(lat, lon);
      const { cx, cz } = chunkCoords(w.x, w.z);
      keys.add(`${cx}_${cz}`);
      if (i > 0) {
        const [plon, plat] = geom.coordinates[i - 1];
        const pw = latLonToWorld(plat, plon);
        const dist = Math.hypot(w.x - pw.x, w.z - pw.z);
        const steps = Math.min(20, Math.ceil(dist / (CHUNK_SIZE * 0.45)));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const { cx: scx, cz: scz } = chunkCoords(pw.x + (w.x - pw.x) * t, pw.z + (w.z - pw.z) * t);
          keys.add(`${scx}_${scz}`);
        }
      }
    }
  }

  return [...keys];
}

async function loadExistingChunks() {
  const chunkMap = new Map(); // key -> Map(featureId -> feature)
  try {
    const files = await fs.readdir(CHUNKS_DIR);
    for (const f of files) {
      if (!f.endsWith('.geojson')) continue;
      const key = f.replace('.geojson', '');
      const raw = JSON.parse(await fs.readFile(path.join(CHUNKS_DIR, f), 'utf8'));
      const m = new Map();
      for (const feat of raw.features || []) {
        m.set(feat.id, feat);
      }
      chunkMap.set(key, m);
    }
  } catch {
    // fresh directory
  }
  return chunkMap;
}

function addFeaturesToChunks(chunkMap, features) {
  for (const feat of features) {
    const keys = getFeatureChunkKeys(feat);
    for (const key of keys) {
      let bucket = chunkMap.get(key);
      if (!bucket) {
        bucket = new Map();
        chunkMap.set(key, bucket);
      }
      bucket.set(feat.id, feat);
    }
  }
}

async function processMetro() {
  console.log('\n[Metro] Fetching Namma Metro lines & stations from OSM...');
  const data = await fetchOverpass(buildMetroQuery(), 'namma_metro');
  const nodes = new Map();
  for (const el of data.elements) {
    if (el.type === 'node') nodes.set(el.id, [roundCoord(el.lon), roundCoord(el.lat), el.tags || {}]);
  }
  const features = [];
  const seenStations = new Set();

  for (const el of data.elements) {
    if (el.type === 'way' && el.tags?.railway === 'subway') {
      const coords = extractWayCoords(el, nodes);
      if (coords.length < 2) continue;
      const lineCoords = simplifyCoords(coords, 0.00004);
      const t = el.tags;
      const text = `${t.name || ''} ${t.colour || ''} ${t.line || ''}`.toLowerCase();
      let line = 'purple';
      if (text.includes('green') || text.includes('ಹಸಿರು')) line = 'green';
      else if (text.includes('yellow')) line = 'yellow';
      else if (text.includes('pink')) line = 'pink';
      else {
        // Infer Purple (W-E) vs Green (N-S) by orientation around Majestic (77.571, 12.976)
        const mid = lineCoords[Math.floor(lineCoords.length / 2)];
        const dLon = Math.abs(mid[0] - 77.571);
        const dLat = Math.abs(mid[1] - 12.976);
        line = dLat > dLon * 1.15 ? 'green' : 'purple';
      }
      features.push({
        type: 'Feature',
        id: `metro_way_${el.id}`,
        properties: {
          kind: 'metro_track',
          line,
          underground: t.tunnel === 'yes' || Number(t.layer) < 0,
          elevated: t.bridge === 'yes' || t.bridge === 'viaduct' || Number(t.layer) > 0 || t.tunnel !== 'yes',
          name: t['name:en'] || t.name || `Namma Metro ${line} Line`
        },
        geometry: { type: 'LineString', coordinates: lineCoords }
      });
    } else if (el.type === 'node' && el.tags && (el.tags.station === 'subway' || el.tags.railway === 'station')) {
      const name = el.tags['name:en'] || el.tags.name;
      if (!name) continue;
      const norm = name.toLowerCase().trim();
      if (seenStations.has(norm)) continue;
      seenStations.add(norm);
      const t = el.tags;
      const text = `${t.colour || ''} ${t.line || ''} ${name}`.toLowerCase();
      let line = 'purple';
      if (text.includes('green') || text.includes('lalbagh') || text.includes('jayanagar') || text.includes('peenya') || text.includes('yeshwanthpur') || text.includes('mantri') || text.includes('rajajinagar') || text.includes('banashankari') || text.includes('silk institute') || text.includes('nagasandra') || text.includes('chickpete') || text.includes('kr market') || text.includes('national college')) {
        line = 'green';
      }
      if (norm.includes('majestic') || norm.includes('nadaprabhu kempegowda')) {
        line = 'interchange';
      }
      features.push({
        type: 'Feature',
        id: `metro_stn_${el.id}`,
        properties: {
          kind: 'metro_station',
          line,
          name,
          name_kn: toKannadaName(name, t['name:kn'])
        },
        geometry: { type: 'Point', coordinates: [roundCoord(el.lon), roundCoord(el.lat)] }
      });
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'metro.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features })
  );
  console.log(`  [saved] public/map-data/metro.geojson (${features.length} features)`);
  return features;
}

async function processCorridors(chunkMap) {
  console.log('\n[Corridors] Fetching Greater Bengaluru major highway corridors from OSM...');
  const data = await fetchOverpass(buildCorridorsQuery(), 'bengaluru_corridors');
  const nodes = new Map();
  for (const el of data.elements) {
    if (el.type === 'node') nodes.set(el.id, [roundCoord(el.lon), roundCoord(el.lat)]);
  }
  const features = [];
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.tags?.highway) continue;
    const coords = extractWayCoords(el, nodes);
    if (coords.length < 2) continue;
    const line = simplifyCoords(coords, 0.00008);
    const name = el.tags['name:en'] || el.tags.name || '';
    const nameKn = toKannadaName(name, el.tags['name:kn']);
    const feat = {
      type: 'Feature',
      id: `corridor_${el.id}`,
      properties: {
        kind: 'road',
        corridor: true,
        highway: el.tags.highway,
        name,
        name_kn: nameKn,
        width: roadWidth(el.tags.highway, el.tags.lanes),
        oneway: el.tags.oneway === 'yes',
        bridge: el.tags.bridge === 'yes' || el.tags.bridge === 'viaduct' || Number(el.tags.layer) > 0,
        layer: Number(el.tags.layer) || 0
      },
      geometry: { type: 'LineString', coordinates: line }
    };
    features.push(feat);
  }

  // Write summary corridor map for full-city radar + fast inter-zone highway rendering
  await fs.writeFile(
    path.join(OUT_DIR, 'corridors.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features })
  );
  console.log(`  [saved] public/map-data/corridors.geojson (${features.length} major road segments)`);

  // Also inject corridor roads into chunk tiles (only if road_id isn't already present with higher detail)
  for (const feat of features) {
    const detailedId = feat.id.replace('corridor_', 'road_');
    const keys = getFeatureChunkKeys(feat);
    for (const key of keys) {
      let bucket = chunkMap.get(key);
      if (!bucket) {
        bucket = new Map();
        chunkMap.set(key, bucket);
      }
      if (!bucket.has(detailedId)) {
        bucket.set(feat.id, feat);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let zonesArg = 'central,metro,corridors';
  let force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--zones' && args[i + 1]) zonesArg = args[++i];
    if (args[i] === '--force') force = true;
  }

  const requested = zonesArg === 'all'
    ? [...Object.keys(ZONE_SPECS), 'metro', 'corridors']
    : zonesArg.split(',').map((s) => s.trim()).filter(Boolean);

  await fs.mkdir(CHUNKS_DIR, { recursive: true });
  const chunkMap = await loadExistingChunks();

  // Read existing manifest if present
  let manifest = {
    originLat: ORIGIN_LAT,
    originLon: ORIGIN_LON,
    chunkSize: CHUNK_SIZE,
    attribution: '© OpenStreetMap contributors',
    generatedAt: new Date().toISOString(),
    zonesLoaded: [],
    chunks: {}
  };
  try {
    const existing = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
    manifest.zonesLoaded = existing.zonesLoaded || [];
  } catch {
    // new manifest
  }

  for (const item of requested) {
    if (item === 'metro') {
      await processMetro();
      await sleep(1000);
      continue;
    }
    if (item === 'corridors') {
      await processCorridors(chunkMap);
      await sleep(1000);
      continue;
    }
    const spec = ZONE_SPECS[item];
    if (!spec) {
      console.warn(`Unknown zone: ${item}`);
      continue;
    }
    console.log(`\n[Zone: ${spec.name}] Fetching real OSM data...`);
    let totalFeats = 0;
    for (const box of spec.boxes) {
      const data = await fetchOsmBbox(box.bbox, box.id, force);
      const feats = osmToFeatures(data, item);
      addFeaturesToChunks(chunkMap, feats);
      totalFeats += feats.length;
      await sleep(500);
    }
    if (!manifest.zonesLoaded.includes(item)) {
      manifest.zonesLoaded.push(item);
    }
    console.log(`  [zone done] ${spec.name}: ${totalFeats} GeoJSON features indexed into chunks`);
  }

  // Write all chunk GeoJSON files and update manifest
  let totalBuildings = 0;
  let totalRoads = 0;
  let totalSafeZones = 0;
  manifest.chunks = {};
  manifest.generatedAt = new Date().toISOString();

  for (const [key, featMap] of chunkMap.entries()) {
    const features = [...featMap.values()];
    let buildings = 0, roads = 0, parks = 0, water = 0, safeZones = 0;
    const zonesInChunk = new Set();
    for (const f of features) {
      const k = f.properties.kind;
      if (k === 'building') buildings++;
      else if (k === 'road') roads++;
      else if (k === 'park') parks++;
      else if (k === 'water') water++;
      else if (k === 'safe_zone') safeZones++;
      if (f.properties.zone) zonesInChunk.add(f.properties.zone);
    }
    totalBuildings += buildings;
    totalRoads += roads;
    totalSafeZones += safeZones;

    manifest.chunks[key] = {
      buildings,
      roads,
      parks,
      water,
      safeZones,
      zones: [...zonesInChunk],
      detailed: buildings > 0 || parks > 0 || water > 0
    };

    const outPath = path.join(CHUNKS_DIR, `${key}.geojson`);
    await fs.writeFile(
      outPath,
      JSON.stringify({ type: 'FeatureCollection', features })
    );
  }

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✓ OSM pipeline complete!`);
  console.log(`  Chunks written: ${chunkMap.size}`);
  console.log(`  Zones loaded:   ${manifest.zonesLoaded.join(', ')}`);
  console.log(`  Totals (indexed across chunks): ${totalBuildings} buildings, ${totalRoads} road refs, ${totalSafeZones} sacred safe zones`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
