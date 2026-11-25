import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CHUNK_SIZE,
  FICTIONAL_SHOPS,
  NAMMA_METRO_STATIONS,
  chunkCoords,
  latLonToWorld
} from './bengaluruData';
import { ProceduralTextures } from './ProceduralTextures';
import { PhysicsWorld } from '../engine/PhysicsWorld';

export interface RoadSegmentData {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  width: number;
  name: string;
  nameKn: string;
  highway: string;
  bridge: boolean;
  oneway: boolean;
}

export interface SafeZonePoint {
  id: string;
  name: string;
  nameKn: string;
  x: number;
  z: number;
  radius: number;
}

interface GeoJSONFeature {
  id: string;
  properties: Record<string, any>;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
}

interface ChunkManifest {
  originLat: number;
  originLon: number;
  chunkSize: number;
  attribution: string;
  zonesLoaded: string[];
  chunks: Record<string, { buildings: number; roads: number; parks: number; water: number; safeZones: number; zones: string[]; detailed: boolean }>;
}

interface LoadedChunk {
  key: string;
  cx: number;
  cz: number;
  group: THREE.Group;
  roads: RoadSegmentData[];
  safeZones: SafeZonePoint[];
  detailLevel: 'near' | 'far';
  disposables: Array<{ dispose: () => void }>;
}

export class ChunkStreamer {
  public manifest: ChunkManifest | null = null;
  public metroGeoJSON: { features: GeoJSONFeature[] } | null = null;
  public corridorGeoJSON: { features: GeoJSONFeature[] } | null = null;

  private scene: THREE.Scene;
  private textures: ProceduralTextures;
  private physics: PhysicsWorld;
  private loadedChunks = new Map<string, LoadedChunk>();
  private loadingKeys = new Set<string>();
  private rawChunkCache = new Map<string, GeoJSONFeature[]>();

  public streamRadius = 2; // 5x5 chunks = 2.5km x 2.5km active window
  private lastCenterKey = '';

  // Base terrain plane following player
  private groundMesh: THREE.Mesh;
  private metroGroup: THREE.Group;

  // Shared tree & lamp geometries for instancing
  private trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 4.2, 6);
  private canopyGeo = new THREE.DodecahedronGeometry(3.2, 1);
  private poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.8, 6);
  private bulbGeo = new THREE.SphereGeometry(0.32, 6, 6);

  private trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.92 });
  private rainTreeMat = new THREE.MeshStandardMaterial({ color: 0x266131, roughness: 0.85 });
  private gulmoharMat = new THREE.MeshStandardMaterial({ color: 0xe84b1f, roughness: 0.78 });
  private poleMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.6, metalness: 0.55 });

  constructor(scene: THREE.Scene, textures: ProceduralTextures, physics: PhysicsWorld) {
    this.scene = scene;
    this.textures = textures;
    this.physics = physics;

    // Continuous plateau terrain base underneath streamed chunks
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a302d,
      roughness: 0.94,
      metalness: 0.04
    });
    this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.08;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.metroGroup = new THREE.Group();
    this.scene.add(this.metroGroup);
  }

  public async init(onProgress?: (msg: string, pct: number) => void): Promise<void> {
    onProgress?.('Loading Bengaluru OpenStreetMap manifest...', 22);
    const mRes = await fetch('/map-data/manifest.json');
    if (!mRes.ok) throw new Error('Missing /map-data/manifest.json — run OSM pipeline first');
    this.manifest = await mRes.json();

    onProgress?.('Loading Namma Metro lines & highway corridors...', 42);
    const [metroRes, corrRes] = await Promise.all([
      fetch('/map-data/metro.geojson').catch(() => null),
      fetch('/map-data/corridors.geojson').catch(() => null)
    ]);

    if (metroRes?.ok) {
      this.metroGeoJSON = await metroRes.json();
      this.buildMetroViaducts();
    }
    if (corrRes?.ok) {
      this.corridorGeoJSON = await corrRes.json();
    }
  }

  private buildMetroViaducts(): void {
    // Render Namma Metro Purple & Green elevated viaducts + glowing station beacons from real OSM tracks
    const purpleGeos: THREE.BufferGeometry[] = [];
    const greenGeos: THREE.BufferGeometry[] = [];
    const pillarGeos: THREE.BufferGeometry[] = [];

    const features = this.metroGeoJSON?.features || [];
    for (const f of features) {
      if (f.properties.kind !== 'metro_track' || f.geometry.type !== 'LineString') continue;
      if (f.properties.underground) continue;
      const coords: [number, number][] = f.geometry.coordinates;
      const isGreen = f.properties.line === 'green';

      for (let i = 0; i < coords.length - 1; i++) {
        const a = latLonToWorld(coords[i][1], coords[i][0]);
        const b = latLonToWorld(coords[i + 1][1], coords[i + 1][0]);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1 || len > 500) continue;

        const deck = new THREE.BoxGeometry(7.2, 1.35, len + 0.5);
        const angle = Math.atan2(dx, dz);
        deck.rotateY(angle);
        deck.translate((a.x + b.x) * 0.5, 11.2, (a.z + b.z) * 0.5);
        (isGreen ? greenGeos : purpleGeos).push(deck);

        if (i % 2 === 0 && pillarGeos.length < 2400) {
          const p = new THREE.BoxGeometry(1.8, 10.6, 1.8);
          p.translate(a.x, 5.3, a.z);
          pillarGeos.push(p);
        }
      }
    }

    if (purpleGeos.length > 0) {
      const merged = mergeGeometries(purpleGeos, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.metroPurpleMat);
        this.metroGroup.add(mesh);
      }
      purpleGeos.forEach((g) => g.dispose());
    }
    if (greenGeos.length > 0) {
      const merged = mergeGeometries(greenGeos, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.metroGreenMat);
        this.metroGroup.add(mesh);
      }
      greenGeos.forEach((g) => g.dispose());
    }
    if (pillarGeos.length > 0) {
      const merged = mergeGeometries(pillarGeos, false);
      if (merged) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x7b818a, roughness: 0.85 });
        const mesh = new THREE.Mesh(merged, mat);
        this.metroGroup.add(mesh);
      }
      pillarGeos.forEach((g) => g.dispose());
    }

    // Iconic Namma Metro station canopies & bilingual signs
    for (const stn of NAMMA_METRO_STATIONS) {
      const w = latLonToWorld(stn.lat, stn.lon);
      const stnGroup = new THREE.Group();
      stnGroup.position.set(w.x, 0, w.z);

      const lineMat = stn.line === 'green' ? this.textures.metroGreenMat : this.textures.metroPurpleMat;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(28, 3.8, 11), lineMat);
      canopy.position.y = stn.elevated ? 13.8 : 4.2;
      stnGroup.add(canopy);

      const signTex = this.textures.getStreetSignTexture(`METRO: ${stn.name}`, `ನಮ್ಮ ಮೆಟ್ರೋ • ${stn.nameKn}`);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.45,
        roughness: 0.4
      });
      const board = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.4, 0.35), signMat);
      board.position.set(0, stn.elevated ? 8.5 : 4.5, 6.2);
      stnGroup.add(board);

      this.metroGroup.add(stnGroup);
    }
  }

  public setStreamRadius(radius: number): void {
    this.streamRadius = radius;
    this.lastCenterKey = '';
  }

  public async ensureChunksAt(pos: THREE.Vector3): Promise<void> {
    this.groundMesh.position.x = pos.x;
    this.groundMesh.position.z = pos.z;

    const { cx, cz } = chunkCoords(pos.x, pos.z);
    const centerKey = `${cx}_${cz}`;
    if (centerKey === this.lastCenterKey) return;
    this.lastCenterKey = centerKey;

    const needed = new Set<string>();
    const toLoad: Array<{ cx: number; cz: number; key: string; dist: number }> = [];

    for (let dx = -this.streamRadius; dx <= this.streamRadius; dx++) {
      for (let dz = -this.streamRadius; dz <= this.streamRadius; dz++) {
        const ncx = cx + dx;
        const ncz = cz + dz;
        const key = `${ncx}_${ncz}`;
        needed.add(key);
        if (!this.loadedChunks.has(key) && !this.loadingKeys.has(key)) {
          toLoad.push({ cx: ncx, cz: ncz, key, dist: Math.hypot(dx, dz) });
        }
      }
    }

    // Unload distant chunks to stay light on memory & draw calls
    for (const [key, chunk] of this.loadedChunks.entries()) {
      if (!needed.has(key)) {
        this.unloadChunk(key, chunk);
      }
    }

    // Load closest chunks first
    toLoad.sort((a, b) => a.dist - b.dist);
    await Promise.all(
      toLoad.map((item) => this.loadChunk(item.cx, item.cz, item.key, item.dist <= 1.5 ? 'near' : 'far'))
    );
  }

  private unloadChunk(key: string, chunk: LoadedChunk): void {
    this.scene.remove(chunk.group);
    this.physics.removeChunkColliders(key);
    for (const d of chunk.disposables) {
      d.dispose();
    }
    this.loadedChunks.delete(key);
  }

  private async loadChunk(cx: number, cz: number, key: string, detailLevel: 'near' | 'far'): Promise<void> {
    this.loadingKeys.add(key);
    try {
      let features = this.rawChunkCache.get(key);
      const hasOsmTile = Boolean(this.manifest?.chunks[key]);

      if (!features && hasOsmTile) {
        const res = await fetch(`/map-data/chunks/${key}.geojson`);
        if (res.ok) {
          const fc = await res.json();
          features = fc.features || [];
          this.rawChunkCache.set(key, features!);
        }
      }

      const chunk = this.buildChunkMesh(cx, cz, key, features || [], detailLevel);
      this.scene.add(chunk.group);
      this.loadedChunks.set(key, chunk);
    } finally {
      this.loadingKeys.delete(key);
    }
  }

  private buildChunkMesh(
    cx: number,
    cz: number,
    key: string,
    features: GeoJSONFeature[],
    detailLevel: 'near' | 'far'
  ): LoadedChunk {
    const group = new THREE.Group();
    const disposables: Array<{ dispose: () => void }> = [];
    const roads: RoadSegmentData[] = [];
    const safeZones: SafeZonePoint[] = [];

    const buildingBuckets: Record<string, THREE.BufferGeometry[]> = {
      heritage: [],
      commercial: [],
      techGlass: [],
      residential: [],
      industrial: [],
      worship: [],
      rooftop: [],
      lodFar: []
    };
    const majorRoadGeos: THREE.BufferGeometry[] = [];
    const minorRoadGeos: THREE.BufferGeometry[] = [];
    const parkGeos: THREE.BufferGeometry[] = [];
    const waterGeos: THREE.BufferGeometry[] = [];
    const bellandurGeos: THREE.BufferGeometry[] = [];

    const treePositions: Array<{ x: number; z: number; gulmohar: boolean; scale: number }> = [];
    const lampPositions: Array<{ x: number; z: number }> = [];
    const signCandidates: Array<{ x: number; z: number; angle: number; name: string; nameKn: string }> = [];
    const stallPositions: Array<{ x: number; z: number; angle: number; idx: number }> = [];

    const chunkOriginX = cx * CHUNK_SIZE;
    const chunkOriginZ = cz * CHUNK_SIZE;

    let bldgCount = 0;

    for (const f of features) {
      const kind = f.properties.kind;
      const zone = f.properties.zone || '';

      // 1. Safe Zones (Temples, Mosques, Churches)
      if (kind === 'safe_zone' && f.geometry.type === 'Point') {
        const [lon, lat] = f.geometry.coordinates;
        const w = latLonToWorld(lat, lon);
        const radius = f.properties.radius || 48;
        safeZones.push({
          id: f.id,
          name: f.properties.name || 'Sacred Place',
          nameKn: f.properties.name_kn || 'ಪೂಜಾ ಸ್ಥಳ',
          x: w.x,
          z: w.z,
          radius
        });

        // Soft peaceful golden sanctuary ring on ground
        const ringGeo = new THREE.RingGeometry(radius - 0.6, radius, 36);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38e8c8,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(w.x, 0.14, w.z);
        group.add(ring);
        disposables.push(ringGeo, ringMat);
        continue;
      }

      // 2. Real OSM Roads
      if (kind === 'road' && f.geometry.type === 'LineString') {
        const coords: [number, number][] = f.geometry.coordinates;
        const width = f.properties.width || 8;
        const hw = f.properties.highway || 'residential';
        const isMajor = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(hw);
        const isBridge = Boolean(f.properties.bridge);
        const yBase = isBridge ? 4.8 : isMajor ? 0.09 : 0.05;

        for (let i = 0; i < coords.length - 1; i++) {
          const a = latLonToWorld(coords[i][1], coords[i][0]);
          const b = latLonToWorld(coords[i + 1][1], coords[i + 1][0]);

          // Clip segments belonging to this chunk so we don't duplicate road ribbons across neighboring chunks
          const midX = (a.x + b.x) * 0.5;
          const midZ = (a.z + b.z) * 0.5;
          const midChunk = chunkCoords(midX, midZ);
          if (midChunk.cx !== cx || midChunk.cz !== cz) continue;

          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const len = Math.hypot(dx, dz);
          if (len < 0.8) continue;

          roads.push({
            ax: a.x,
            az: a.z,
            bx: b.x,
            bz: b.z,
            width,
            name: f.properties.name || '',
            nameKn: f.properties.name_kn || '',
            highway: hw,
            bridge: isBridge,
            oneway: Boolean(f.properties.oneway)
          });

          const angle = Math.atan2(dx, dz);
          const geo = new THREE.PlaneGeometry(width, len + width * 0.35);
          geo.rotateX(-Math.PI / 2);
          // Scale V UV by segment length for crisp dashed lanes
          const uv = geo.attributes.uv;
          const vRepeat = Math.max(1, len / 14);
          for (let k = 0; k < uv.count; k++) {
            uv.setY(k, uv.getY(k) * vRepeat);
          }
          geo.rotateY(angle);
          geo.translate(midX, yBase, midZ);
          (isMajor ? majorRoadGeos : minorRoadGeos).push(geo);

          // Avenue trees, street lamps, BBMP signs & roadside tea stalls along real roads
          const perpX = dz / len;
          const perpZ = -dx / len;
          const edgeOffset = width * 0.5 + 2.4;

          if (len > 14 && treePositions.length < 130) {
            const hash = Math.abs(Math.floor(midX * 7 + midZ * 13));
            if (hash % (isMajor ? 2 : 3) === 0) {
              const side = hash % 2 === 0 ? 1 : -1;
              treePositions.push({
                x: midX + perpX * edgeOffset * side,
                z: midZ + perpZ * edgeOffset * side,
                gulmohar: hash % 5 === 0, // Flame-of-the-forest Gulmohar trees!
                scale: 0.85 + (hash % 40) * 0.012
              });
            }
          }

          if (isMajor && len > 18 && lampPositions.length < 48) {
            lampPositions.push({
              x: midX + perpX * (width * 0.5 + 1.1),
              z: midZ + perpZ * (width * 0.5 + 1.1)
            });
          }

          if (f.properties.name && signCandidates.length < 7 && len > 16) {
            const exists = signCandidates.some((s) => s.name === f.properties.name);
            if (!exists) {
              signCandidates.push({
                x: midX + perpX * (width * 0.5 + 1.6),
                z: midZ + perpZ * (width * 0.5 + 1.6),
                angle,
                name: f.properties.name,
                nameKn: f.properties.name_kn || ''
              });
            }
          }

          if (!isBridge && detailLevel === 'near' && stallPositions.length < 6 && len > 20) {
            const h = Math.abs(Math.floor(midX * 3 + midZ * 11));
            if (h % 9 === 0) {
              stallPositions.push({
                x: midX - perpX * (width * 0.5 + 3.0),
                z: midZ - perpZ * (width * 0.5 + 3.0),
                angle,
                idx: h % FICTIONAL_SHOPS.length
              });
            }
          }
        }
        continue;
      }

      // 3. Parks (Cubbon Park, Lalbagh, neighborhood gardens)
      if (kind === 'park' && f.geometry.type === 'Polygon') {
        const ring: [number, number][] = f.geometry.coordinates[0];
        const shape = this.ringToShape(ring);
        if (shape) {
          const geo = new THREE.ShapeGeometry(shape);
          geo.rotateX(-Math.PI / 2);
          geo.translate(0, 0.03, 0);
          parkGeos.push(geo);

          // Scatter lush Cubbon Park / Lalbagh trees inside the park polygon
          const pts = ring.map(([lon, lat]) => latLonToWorld(lat, lon));
          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
          for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
          }
          const spanX = Math.min(350, maxX - minX);
          const spanZ = Math.min(350, maxZ - minZ);
          for (let t = 0; t < 24 && treePositions.length < 180; t++) {
            const tx = minX + (((t * 73 + cx * 19) % 100) / 100) * spanX;
            const tz = minZ + (((t * 47 + cz * 31) % 100) / 100) * spanZ;
            if (tx >= chunkOriginX && tx <= chunkOriginX + CHUNK_SIZE && tz >= chunkOriginZ && tz <= chunkOriginZ + CHUNK_SIZE) {
              treePositions.push({ x: tx, z: tz, gulmohar: t % 4 === 0, scale: 1.05 + (t % 5) * 0.14 });
            }
          }
        }
        continue;
      }

      // 4. Lakes (Ulsoor Lake, Bellandur Lake, Hebbal Lake, Sankey Tank, Lalbagh Lake)
      if (kind === 'water' && f.geometry.type === 'Polygon') {
        const ring: [number, number][] = f.geometry.coordinates[0];
        const shape = this.ringToShape(ring);
        if (shape) {
          const geo = new THREE.ShapeGeometry(shape);
          geo.rotateX(-Math.PI / 2);
          geo.translate(0, 0.04, 0);
          const isBellandur = (f.properties.name || '').toLowerCase().includes('bellandur') || zone === 'east';
          (isBellandur ? bellandurGeos : waterGeos).push(geo);
        }
        continue;
      }

      // 5. Real Extruded OSM Building Footprints
      if (kind === 'building' && f.geometry.type === 'Polygon') {
        bldgCount++;
        const ring: [number, number][] = f.geometry.coordinates[0];
        const h = Math.max(3.5, Math.min(85, Number(f.properties.height) || 10));
        const pts = ring.map(([lon, lat]) => latLonToWorld(lat, lon));
        if (pts.length < 3) continue;

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.z < minZ) minZ = p.z;
          if (p.z > maxZ) maxZ = p.z;
        }
        const bw = maxX - minX;
        const bd = maxZ - minZ;
        if (bw < 2.2 || bd < 2.2 || bw > 260 || bd > 260) continue;

        const centerX = (minX + maxX) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;

        let geo: THREE.BufferGeometry | null = null;
        if (detailLevel === 'near' && ring.length <= 16) {
          const shape = this.ringToShape(ring);
          if (shape) {
            geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
            // Rotate from XY (y=-z, extrusion +z) by -PI/2 around X -> world (x, +y=extrusion, +z=-y)
            geo.rotateX(-Math.PI / 2);
            // Normalize UVs in world meters so 1024px facade windows stay crisp & never stretched
            const posAttr = geo.attributes.position;
            const normAttr = geo.attributes.normal;
            const uvAttr = geo.attributes.uv;
            for (let i = 0; i < posAttr.count; i++) {
              const nx = Math.abs(normAttr.getX(i));
              const ny = Math.abs(normAttr.getY(i));
              const nz = Math.abs(normAttr.getZ(i));
              if (ny > 0.7) {
                // Rooftop cap gets neutral slab UVs (clean terrace roof!)
                uvAttr.setXY(i, posAttr.getX(i) * 0.04, posAttr.getZ(i) * 0.04);
              } else {
                const u = nx > nz ? posAttr.getZ(i) : posAttr.getX(i);
                const v = posAttr.getY(i);
                uvAttr.setXY(i, u * 0.065, v * 0.065);
              }
            }
          }
        }
        if (!geo) {
          geo = new THREE.BoxGeometry(bw, h, bd);
          geo.translate(centerX, h * 0.5, centerZ);
        }

        // Convert to non-indexed for safe merging with mixed geometries
        const nonIdx = geo.index ? geo.toNonIndexed() : geo;
        if (nonIdx !== geo) geo.dispose();

        // Separate crisp concrete rooftop cap + AC/water tank silhouette on detailed buildings!
        if (detailLevel === 'near' && bldgCount <= 260) {
          const roofCap = new THREE.BoxGeometry(Math.min(bw * 0.96, 80), 0.45, Math.min(bd * 0.96, 80)).toNonIndexed();
          roofCap.translate(centerX, h + 0.18, centerZ);
          buildingBuckets.rooftop.push(roofCap);

          if (bw > 8 && bd > 8 && bldgCount % 2 === 0) {
            const acUnit = new THREE.BoxGeometry(Math.min(3.5, bw * 0.24), 1.4, Math.min(3.2, bd * 0.24)).toNonIndexed();
            acUnit.translate(centerX + bw * 0.14, h + 1.05, centerZ - bd * 0.14);
            buildingBuckets.rooftop.push(acUnit);
          }
        }

        const bucket = this.pickBuildingBucket(f.properties, h, detailLevel);
        buildingBuckets[bucket].push(nonIdx);

        // Exact perimeter wall colliders matching EVERY real OSM building footprint in near chunks!
        if (detailLevel === 'near' && bldgCount <= 2000) {
          const cleanPts = pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].z === pts[pts.length - 1].z
            ? pts.slice(0, -1)
            : pts;
          if (cleanPts.length >= 3 && cleanPts.length <= 18) {
            this.physics.addChunkPolygonWalls(
              key,
              cleanPts,
              h,
              f.properties.safe ? 'safe_building' : 'building'
            );
          } else {
            this.physics.addChunkBoxCollider(
              key,
              centerX,
              h * 0.5,
              centerZ,
              Math.min(bw * 0.36, 40),
              h * 0.5,
              Math.min(bd * 0.36, 40),
              0,
              f.properties.safe ? 'safe_building' : 'building'
            );
          }
        }
      }
    }

    // If this chunk is an inter-zone corridor tile without detailed OSM buildings,
    // generate light Bengaluru suburban silhouettes & rain trees along highways so the city feels continuous!
    if (bldgCount === 0 && roads.length > 0) {
      const seed = Math.abs(cx * 73856093 ^ cz * 19349663);
      for (let i = 0; i < Math.min(28, roads.length * 2); i++) {
        const seg = roads[i % roads.length];
        const dx = seg.bx - seg.ax;
        const dz = seg.bz - seg.az;
        const len = Math.hypot(dx, dz) || 1;
        const side = i % 2 === 0 ? 1 : -1;
        const offset = seg.width * 0.5 + 14 + ((seed + i * 17) % 18);
        const bx = (seg.ax + seg.bx) * 0.5 + (dz / len) * offset * side;
        const bz = (seg.az + seg.bz) * 0.5 - (dx / len) * offset * side;
        const bw = 10 + ((seed + i * 31) % 14);
        const bd = 10 + ((seed + i * 43) % 14);
        const bh = 7 + ((seed + i * 23) % 16);
        const box = new THREE.BoxGeometry(bw, bh, bd).toNonIndexed();
        box.translate(bx, bh * 0.5, bz);
        buildingBuckets[i % 3 === 0 ? 'commercial' : 'residential'].push(box);
        if (detailLevel === 'near') {
          this.physics.addChunkBoxCollider(key, bx, bh * 0.5, bz, bw * 0.5, bh * 0.5, bd * 0.5, 0, 'building');
        }
      }
    }

    // Merge geometry buckets into minimal draw calls!
    const matLookup: Record<string, THREE.Material> = {
      heritage: this.textures.buildings.heritage,
      commercial: this.textures.buildings.commercial,
      techGlass: this.textures.buildings.techGlass,
      residential: this.textures.buildings.residential,
      industrial: this.textures.buildings.industrial,
      worship: this.textures.buildings.worship,
      rooftop: this.textures.buildings.rooftop,
      lodFar: this.textures.buildings.lodFar
    };

    for (const [bKey, geos] of Object.entries(buildingBuckets)) {
      if (geos.length === 0) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, matLookup[bKey]);
        mesh.castShadow = detailLevel === 'near' && bKey !== 'lodFar';
        mesh.receiveShadow = true;
        group.add(mesh);
        disposables.push(merged);
      }
    }

    if (majorRoadGeos.length > 0) {
      const merged = mergeGeometries(majorRoadGeos, false);
      majorRoadGeos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.roadMajorMat);
        mesh.receiveShadow = true;
        group.add(mesh);
        disposables.push(merged);
      }
    }

    if (minorRoadGeos.length > 0) {
      const merged = mergeGeometries(minorRoadGeos, false);
      minorRoadGeos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.roadMinorMat);
        mesh.receiveShadow = true;
        group.add(mesh);
        disposables.push(merged);
      }
    }

    if (parkGeos.length > 0) {
      const merged = mergeGeometries(parkGeos, false);
      parkGeos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.parkMat);
        mesh.receiveShadow = true;
        group.add(mesh);
        disposables.push(merged);
      }
    }

    if (waterGeos.length > 0) {
      const merged = mergeGeometries(waterGeos, false);
      waterGeos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.waterMat);
        group.add(mesh);
        disposables.push(merged);
      }
    }

    if (bellandurGeos.length > 0) {
      const merged = mergeGeometries(bellandurGeos, false);
      bellandurGeos.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new THREE.Mesh(merged, this.textures.bellandurWaterMat);
        group.add(mesh);
        disposables.push(merged);
      }
    }

    // Instanced Bengaluru Rain Trees & Gulmohar (orange-red blossom!) Trees
    if (treePositions.length > 0) {
      const dummy = new THREE.Object3D();
      const rainTrees = treePositions.filter((t) => !t.gulmohar);
      const gulTrees = treePositions.filter((t) => t.gulmohar);

      const trunks = new THREE.InstancedMesh(this.trunkGeo, this.trunkMat, treePositions.length);
      treePositions.forEach((t, i) => {
        dummy.position.set(t.x, 2.1 * t.scale, t.z);
        dummy.scale.set(t.scale, t.scale, t.scale);
        dummy.rotation.set(0, (i * 1.7) % 6.28, 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
      });
      group.add(trunks);

      if (rainTrees.length > 0) {
        const inst = new THREE.InstancedMesh(this.canopyGeo, this.rainTreeMat, rainTrees.length);
        rainTrees.forEach((t, i) => {
          dummy.position.set(t.x, 5.2 * t.scale, t.z);
          dummy.scale.set(t.scale * 1.35, t.scale * 0.85, t.scale * 1.35);
          dummy.rotation.set(0, i * 1.1, 0);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        });
        inst.castShadow = detailLevel === 'near';
        group.add(inst);
      }

      if (gulTrees.length > 0) {
        const inst = new THREE.InstancedMesh(this.canopyGeo, this.gulmoharMat, gulTrees.length);
        gulTrees.forEach((t, i) => {
          dummy.position.set(t.x, 5.0 * t.scale, t.z);
          dummy.scale.set(t.scale * 1.3, t.scale * 0.78, t.scale * 1.3);
          dummy.rotation.set(0, i * 1.3, 0);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        });
        inst.castShadow = detailLevel === 'near';
        group.add(inst);
      }
    }

    // Instanced Street Lamps along major avenues
    if (lampPositions.length > 0) {
      const dummy = new THREE.Object3D();
      const poles = new THREE.InstancedMesh(this.poleGeo, this.poleMat, lampPositions.length);
      const bulbs = new THREE.InstancedMesh(this.bulbGeo, this.textures.streetLampBulbMat, lampPositions.length);
      lampPositions.forEach((l, i) => {
        dummy.position.set(l.x, 3.4, l.z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        poles.setMatrixAt(i, dummy.matrix);

        dummy.position.set(l.x, 6.85, l.z);
        dummy.updateMatrix();
        bulbs.setMatrixAt(i, dummy.matrix);
      });
      group.add(poles, bulbs);
    }

    // Authentic English + Kannada BBMP Street Name Signs along real OSM roads
    if (detailLevel === 'near') {
      for (const s of signCandidates) {
        const signPost = new THREE.Group();
        signPost.position.set(s.x, 0, s.z);
        signPost.rotation.y = s.angle + Math.PI * 0.5;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.8, 6), this.poleMat);
        post.position.y = 1.9;
        signPost.add(post);

        const tex = this.textures.getStreetSignTexture(s.name, s.nameKn);
        const boardMat = new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.35,
          roughness: 0.35
        });
        const boardGeo = new THREE.BoxGeometry(2.6, 0.96, 0.1);
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 3.55;
        signPost.add(board);

        group.add(signPost);
        disposables.push(boardGeo, boardMat);
      }

      // Roadside Tea Stalls (Tapris / Darshinis), Flower Sellers & Multilingual Fictional Shop Neon Boards
      for (const st of stallPositions) {
        const shop = FICTIONAL_SHOPS[st.idx];
        const stall = new THREE.Group();
        stall.position.set(st.x, 0, st.z);
        stall.rotation.y = st.angle;

        const kioskGeo = new THREE.BoxGeometry(3.2, 2.6, 2.2);
        const kioskMat = new THREE.MeshStandardMaterial({ color: 0x3b414c, roughness: 0.78 });
        const kiosk = new THREE.Mesh(kioskGeo, kioskMat);
        kiosk.position.y = 1.3;
        stall.add(kiosk);

        // Corrugated monsoon tin roof awning (for rain atmosphere!)
        const roofGeo = new THREE.BoxGeometry(3.8, 0.16, 2.9);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e5c8a, roughness: 0.5, metalness: 0.45 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 2.75, 0.25);
        roof.rotation.x = 0.12;
        stall.add(roof);

        // Glowing multilingual shop signboard (Kannada, English, Hindi, Tamil, Telugu)
        const shopTex = this.textures.getShopSignTexture(shop.title, shop.subtitle, shop.accent);
        const signGeo = new THREE.BoxGeometry(3.1, 0.9, 0.12);
        const signMat = new THREE.MeshStandardMaterial({
          map: shopTex,
          emissiveMap: shopTex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.75,
          roughness: 0.3
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 3.25, 1.15);
        stall.add(sign);

        // Marigold flower garland accent on counter
        const flowerGeo = new THREE.BoxGeometry(2.6, 0.24, 0.22);
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0x663300, roughness: 0.7 });
        const flowers = new THREE.Mesh(flowerGeo, flowerMat);
        flowers.position.set(0, 1.3, 1.2);
        stall.add(flowers);

        group.add(stall);
        disposables.push(kioskGeo, kioskMat, roofGeo, roofMat, signGeo, signMat, flowerGeo, flowerMat);
      }
    }

    return { key, cx, cz, group, roads, safeZones, detailLevel, disposables };
  }

  private pickBuildingBucket(props: Record<string, any>, height: number, detail: 'near' | 'far'): string {
    if (detail === 'far') return 'lodFar';
    if (props.safe || props.subtype === 'worship') return 'worship';
    const zone = props.zone || '';
    const sub = String(props.subtype || '').toLowerCase();
    if (sub.includes('industrial') || sub.includes('warehouse') || zone === 'west') return 'industrial';
    if (zone === 'southeast' || (zone === 'east' && height > 15) || sub === 'office' || height > 24) return 'techGlass';
    if (sub === 'commercial' || sub === 'retail' || sub === 'shop' || zone === 'central') return height > 16 ? 'commercial' : 'heritage';
    if (zone === 'old_city') return 'heritage';
    return 'residential';
  }

  private ringToShape(ring: [number, number][]): THREE.Shape | null {
    if (!ring || ring.length < 3) return null;
    const shape = new THREE.Shape();
    const first = latLonToWorld(ring[0][1], ring[0][0]);
    // Rotating by -PI/2 around X maps shape (x, -z) -> world (x, 0, +z) with UP (+Y) normals!
    shape.moveTo(first.x, -first.z);
    for (let i = 1; i < ring.length; i++) {
      const p = latLonToWorld(ring[i][1], ring[i][0]);
      shape.lineTo(p.x, -p.z);
    }
    return shape;
  }

  public findNearestRoadPoint(x: number, z: number): { x: number; z: number; yaw: number } {
    let bestScore = Infinity;
    let bestX = x;
    let bestZ = z;
    let bestYaw = 0;

    const majorTypes = new Set(['primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified']);

    for (const chunk of this.loadedChunks.values()) {
      for (const r of chunk.roads) {
        if (r.bridge) continue;
        const vx = r.bx - r.ax;
        const vz = r.bz - r.az;
        const lenSq = vx * vx + vz * vz;
        if (lenSq < 16) continue;
        const t = Math.max(0.1, Math.min(0.9, ((x - r.ax) * vx + (z - r.az) * vz) / lenSq));
        const px = r.ax + vx * t;
        const pz = r.az + vz * t;
        // Never pick a point inside a building collider!
        if (this.physics.isPointBlocked(px, 1.0, pz)) continue;
        const dist = Math.hypot(x - px, z - pz);
        // Strongly prefer wide public named streets over tiny private service driveways
        const penalty = majorTypes.has(r.highway) ? (r.name ? 0 : 12) : 65;
        const score = dist + penalty;
        if (score < bestScore) {
          bestScore = score;
          bestX = px;
          bestZ = pz;
          bestYaw = Math.atan2(-vx, -vz);
        }
      }
    }
    return { x: bestX, z: bestZ, yaw: bestYaw };
  }

  public getNearestRoad(x: number, z: number): { name: string; nameKn: string; dist: number; seg?: RoadSegmentData } {
    let bestDist = Infinity;
    let bestName = 'Bengaluru Street';
    let bestKn = 'ಬೆಂಗಳೂರು ರಸ್ತೆ';
    let bestSeg: RoadSegmentData | undefined;

    for (const chunk of this.loadedChunks.values()) {
      for (const r of chunk.roads) {
        const d = pointToSegDist(x, z, r.ax, r.az, r.bx, r.bz);
        if (d < bestDist) {
          bestDist = d;
          bestSeg = r;
          if (r.name) {
            bestName = r.name;
            bestKn = r.nameKn || r.name;
          }
        }
      }
    }
    return { name: bestName, nameKn: bestKn, dist: bestDist, seg: bestSeg };
  }

  public getActiveRoadSegments(): RoadSegmentData[] {
    const out: RoadSegmentData[] = [];
    for (const chunk of this.loadedChunks.values()) {
      for (const r of chunk.roads) out.push(r);
    }
    return out;
  }

  public getSafeZoneAt(x: number, z: number): SafeZonePoint | null {
    for (const chunk of this.loadedChunks.values()) {
      for (const sz of chunk.safeZones) {
        if (Math.hypot(x - sz.x, z - sz.z) <= sz.radius) {
          return sz;
        }
      }
    }
    return null;
  }

  public getAllActiveSafeZones(): SafeZonePoint[] {
    const out: SafeZonePoint[] = [];
    for (const chunk of this.loadedChunks.values()) {
      for (const sz of chunk.safeZones) out.push(sz);
    }
    return out;
  }

  public getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }
}

function pointToSegDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 0.0001 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq)) : 0;
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}
