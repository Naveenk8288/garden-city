import * as THREE from 'three';
import {
  NAMMA_METRO_STATIONS,
  MetroStationDef,
  latLonToWorld
} from './bengaluruData';

interface MetroStopPoint {
  station: MetroStationDef;
  pos: THREE.Vector3;
  distAlongLine: number;
}

interface MetroLineRoute {
  id: 'purple' | 'green';
  name: string;
  colorHex: number;
  points: THREE.Vector3[];
  cumDist: number[];
  totalLength: number;
  stops: MetroStopPoint[];
}

interface MetroTrainUnit {
  id: string;
  line: MetroLineRoute;
  dist: number; // Distance along line (meters)
  dir: 1 | -1;
  speed: number; // m/s
  dwellTimer: number;
  lastStopId: string;
  cars: THREE.Group[]; // 3 articulated coaches
  interiorSeatAnchor: THREE.Group; // Inside middle/lead coach for passenger view
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  isPlayerBoarded: boolean;
}

export interface MetroRideState {
  riding: boolean;
  lineName: string;
  lineColor: string;
  speedKmh: number;
  nextStation: MetroStationDef | null;
  destination: MetroStationDef | null;
  interiorView: boolean;
  worldPos: THREE.Vector3 | null;
}

const PURPLE_STATION_IDS = [
  'kengeri',
  'vijayanagar',
  'majestic',
  'vidhana_soudha',
  'cubbon_park',
  'mg_road',
  'trinity',
  'halasuru',
  'indiranagar',
  'kr_puram',
  'pattandur',
  'whitefield',
  'airport_link'
];

const GREEN_STATION_IDS = [
  'peenya_ind',
  'yeshwanthpur',
  'hebbal_link',
  'malleshwaram',
  'majestic',
  'chickpete',
  'kr_market_stn',
  'lalbagh',
  'jayanagar',
  'jp_nagar',
  'silk_board_link',
  'ecity_link'
];

const TRACK_Y = 12.05; // Sits directly atop the elevated Namma Metro viaduct (y = 11.2 + 0.675 deck + rail height)

/**
 * Live Namma Metro Transit Simulation:
 * - 6 articulated 3-car white/purple & white/green Namma Metro trains running
 *   continuously across Bengaluru's Purple & Green Line elevated corridors.
 * - Board any train at street-level Metro entrances ([E]) or from the [M] Metro menu
 *   to ride live across Bengaluru with skyline exterior OR inside-cabin views!
 */
export class MetroTrainSystem {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private lines = new Map<'purple' | 'green', MetroLineRoute>();
  private trains: MetroTrainUnit[] = [];
  private entranceBeacons: Array<{ station: MetroStationDef; pos: THREE.Vector3; ring: THREE.Mesh }> = [];

  public boardedTrain: MetroTrainUnit | null = null;
  public destinationStation: MetroStationDef | null = null;
  public interiorView = false;

  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private cameraYawOffset = 0;

  public onStationArrival?: (stn: MetroStationDef, isDestination: boolean) => void;
  public onRideExited?: (stn: MetroStationDef) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.root);
    this.buildLinesAndTracks();
    this.buildStationPortals();
    this.spawnFleet();
  }

  private buildLinesAndTracks(): void {
    const byId = new Map(NAMMA_METRO_STATIONS.map((s) => [s.id, s]));

    const makeRoute = (id: 'purple' | 'green', name: string, colorHex: number, stnIds: string[]): MetroLineRoute => {
      const stations = stnIds.map((sid) => byId.get(sid)).filter(Boolean) as MetroStationDef[];
      const rawPts = stations.map((s) => {
        const w = latLonToWorld(s.lat, s.lon);
        return new THREE.Vector3(w.x, TRACK_Y, w.z);
      });

      // Smoothly subdivide long spans for clean elevated viaduct curves
      const points: THREE.Vector3[] = [];
      const cumDist: number[] = [];
      const stops: MetroStopPoint[] = [];
      let total = 0;

      for (let i = 0; i < rawPts.length; i++) {
        if (i === 0) {
          points.push(rawPts[0].clone());
          cumDist.push(0);
          stops.push({ station: stations[0], pos: rawPts[0].clone(), distAlongLine: 0 });
        } else {
          const prev = rawPts[i - 1];
          const curr = rawPts[i];
          const segLen = prev.distanceTo(curr);
          const steps = Math.max(2, Math.min(20, Math.ceil(segLen / 180)));
          for (let s = 1; s <= steps; s++) {
            const p = new THREE.Vector3().lerpVectors(prev, curr, s / steps);
            total += points[points.length - 1].distanceTo(p);
            points.push(p);
            cumDist.push(total);
          }
          stops.push({ station: stations[i], pos: curr.clone(), distAlongLine: total });
        }
      }

      // Build sleek elevated twin steel rails + color accent viaduct rail guide along every span
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82, metalness: 0.12 });
      const stripeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.45,
        roughness: 0.4
      });
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.88 });
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.88 });

      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;
        const angle = Math.atan2(dx, dz);
        const mx = (a.x + b.x) * 0.5;
        const mz = (a.z + b.z) * 0.5;

        const spanGroup = new THREE.Group();
        spanGroup.position.set(mx, TRACK_Y - 0.52, mz);
        spanGroup.rotation.y = angle;

        // Concrete box-girder viaduct + glowing Purple/Green edge trim + twin steel rails
        const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.9, len + 0.6), deckMat);
        spanGroup.add(deck);

        for (const sx of [-3.46, 3.46]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, len + 0.5), stripeMat);
          trim.position.set(sx, 0.26, 0);
          spanGroup.add(trim);
        }
        for (const rx of [-1.7, -0.5, 0.5, 1.7]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, len + 0.4), railMat);
          rail.position.set(rx, 0.5, 0);
          spanGroup.add(rail);
        }
        this.root.add(spanGroup);

        // Support concrete pillars every ~45m along viaduct
        const numPillars = Math.max(1, Math.floor(len / 48));
        for (let k = 0; k < numPillars; k++) {
          const t = k / numPillars;
          const px = a.x + dx * t;
          const pz = a.z + dz * t;
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.7, TRACK_Y - 0.9, 1.7), pillarMat);
          pillar.position.set(px, (TRACK_Y - 0.9) * 0.5, pz);
          this.root.add(pillar);
        }
      }

      return { id, name, colorHex, points, cumDist, totalLength: total, stops };
    };

    this.lines.set('purple', makeRoute('purple', 'NAMMA METRO PURPLE LINE', 0x9333ea, PURPLE_STATION_IDS));
    this.lines.set('green', makeRoute('green', 'NAMMA METRO GREEN LINE', 0x16a34a, GREEN_STATION_IDS));
  }

  private buildStationPortals(): void {
    // Glowing street-level boarding portals under every Namma Metro station so players can walk up & press [E]
    const ringGeo = new THREE.CylinderGeometry(2.6, 2.6, 11.5, 18, 1, true);
    const purplePortalMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const greenPortalMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for (const stn of NAMMA_METRO_STATIONS) {
      const w = latLonToWorld(stn.lat, stn.lon);
      const mat = stn.line === 'green' ? greenPortalMat : purplePortalMat;
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.set(w.x, 5.75, w.z);
      this.root.add(ring);
      this.entranceBeacons.push({
        station: stn,
        pos: new THREE.Vector3(w.x, 0, w.z),
        ring
      });
    }
  }

  private buildCoachMesh(
    lineColor: number,
    isFront: boolean,
    isRear: boolean
  ): {
    coach: THREE.Group;
    headlights: THREE.Mesh[];
    taillights: THREE.Mesh[];
    seatAnchor: THREE.Group;
  } {
    const coach = new THREE.Group();
    const headlights: THREE.Mesh[] = [];
    const taillights: THREE.Mesh[] = [];

    const bodyWhite = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.22,
      metalness: 0.28,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1
    });
    const roofGrey = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.35 });
    const darkBogie = new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.72, metalness: 0.4 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: lineColor,
      emissive: lineColor,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    const winGlass = new THREE.MeshPhysicalMaterial({
      color: 0x1a3048,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.36,
      depthWrite: false
    });
    const interiorGlow = new THREE.MeshStandardMaterial({
      color: 0xfff8e6,
      emissive: 0xffe8b6,
      emissiveIntensity: 0.65,
      roughness: 0.7
    });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 4.0 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2238, emissive: 0xff1e38, emissiveIntensity: 3.2 });

    const len = 14.4;
    const wid = 2.95;

    // Underbody bogies & skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.94, 0.56, len), darkBogie);
    skirt.position.y = 0.44;
    coach.add(skirt);

    // Lower white chassis wall (below window line)
    const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(wid, 1.05, len), bodyWhite);
    lowerWall.position.y = 1.24;
    lowerWall.castShadow = true;
    coach.add(lowerWall);

    // Iconic Namma Metro Purple or Green horizontal ribbon stripe!
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.05, 0.36, len + 0.02), stripeMat);
    stripe.position.y = 1.38;
    coach.add(stripe);

    // Warm lit cabin interior floor + bench seats + glowing ceiling strip!
    const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.25, 0.08, len - 0.6), darkBogie);
    cabinFloor.position.y = 1.15;
    coach.add(cabinFloor);

    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, len - 1.2), interiorGlow);
    lightStrip.position.y = 3.12;
    coach.add(lightStrip);

    // Roof shell + rooftop HVAC unit
    const roof = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.26, len), roofGrey);
    roof.position.y = 3.26;
    roof.castShadow = true;
    coach.add(roof);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 4.2), roofGrey);
    hvac.position.set(0, 3.5, 0);
    coach.add(hvac);

    // Side window pillars & clear tinted panoramic coach windows
    for (const sx of [-wid * 0.5 + 0.06, wid * 0.5 - 0.06]) {
      for (const sz of [-len * 0.46, -len * 0.22, 0, len * 0.22, len * 0.46]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.32), bodyWhite);
        pillar.position.set(sx, 2.44, sz);
        coach.add(pillar);
      }
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.22, len - 0.9), winGlass);
      glass.position.set(sx, 2.46, 0);
      coach.add(glass);
    }

    // Visible stainless-steel longitudinal metro bench seats & seated commuters inside!
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
    const shirtColors = [0x3b82f6, 0xf97316, 0xec4899, 0x10b981, 0xeab308];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68e67, roughness: 0.65 });
    for (const sx of [-1.06, 1.06]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, len - 2.4), seatMat);
      bench.position.set(sx, 1.4, 0);
      coach.add(bench);
    }
    for (let p = 0; p < 4; p++) {
      const sx = p % 2 === 0 ? -0.96 : 0.96;
      const sz = -4.2 + p * 2.8;
      const shirt = new THREE.MeshStandardMaterial({ color: shirtColors[p % shirtColors.length], roughness: 0.7 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.26), shirt);
      torso.position.set(sx, 1.88, sz);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skinMat);
      head.position.set(sx, 2.26, sz);
      coach.add(torso, head);
    }

    // Front & rear driver cabs with sleek sloped noses, LED destination boards & headlights
    const addCabEnd = (zSign: -1 | 1, isLead: boolean) => {
      const nose = new THREE.Mesh(new THREE.BoxGeometry(wid, 1.48, 0.55), bodyWhite);
      nose.position.set(0, 1.42, zSign * (len * 0.5 + 0.16));
      coach.add(nose);

      const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(wid - 0.3, 1.15, 0.12), winGlass);
      cabGlass.position.set(0, 2.52, zSign * (len * 0.5 + 0.12));
      cabGlass.rotation.x = zSign * -0.18;
      coach.add(cabGlass);

      // Glowing amber LED destination banner
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.24, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xff9f2e, emissive: 0xff8c1a, emissiveIntensity: 2.0 })
      );
      led.position.set(0, 3.02, zSign * (len * 0.5 + 0.24));
      coach.add(led);

      for (const lx of [-0.95, 0.95]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), isLead ? headMat : tailMat);
        lamp.position.set(lx, 1.18, zSign * (len * 0.5 + 0.45));
        coach.add(lamp);
        if (isLead) headlights.push(lamp);
        else taillights.push(lamp);
      }
    };

    if (isFront) addCabEnd(-1, true);
    if (isRear) addCabEnd(1, false);

    // Accordion flexible gangway connector to next car
    if (!isRear) {
      const bellows = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.72, 2.1, 1.05), darkBogie);
      bellows.position.set(0, 2.15, len * 0.5 + 0.45);
      coach.add(bellows);
    }

    const seatAnchor = new THREE.Group();
    seatAnchor.position.set(0, 2.38, -2.0);
    coach.add(seatAnchor);

    return { coach, headlights, taillights, seatAnchor };
  }

  private spawnFleet(): void {
    const purple = this.lines.get('purple')!;
    const green = this.lines.get('green')!;

    // Place one Purple Line train right near MG Road / Trinity so the player sees it immediately!
    const mgStop = purple.stops.find((s) => s.station.id === 'mg_road');
    const purpleStarts: Array<{ dist: number; dir: 1 | -1 }> = [
      { dist: mgStop ? Math.max(80, mgStop.distAlongLine - 180) : purple.totalLength * 0.45, dir: 1 },
      { dist: purple.totalLength * 0.24, dir: 1 },
      { dist: purple.totalLength * 0.72, dir: -1 }
    ];

    const majGreen = green.stops.find((s) => s.station.id === 'majestic');
    const greenStarts: Array<{ dist: number; dir: 1 | -1 }> = [
      { dist: majGreen ? Math.max(80, majGreen.distAlongLine - 150) : green.totalLength * 0.4, dir: 1 },
      { dist: green.totalLength * 0.18, dir: 1 },
      { dist: green.totalLength * 0.74, dir: -1 }
    ];

    const spawnOnLine = (line: MetroLineRoute, startDist: number, dir: 1 | -1, idx: number) => {
      const cars: THREE.Group[] = [];
      const headlights: THREE.Mesh[] = [];
      const taillights: THREE.Mesh[] = [];
      let interiorSeatAnchor = new THREE.Group();

      for (let c = 0; c < 3; c++) {
        const built = this.buildCoachMesh(line.colorHex, c === 0, c === 2);
        this.root.add(built.coach);
        cars.push(built.coach);
        headlights.push(...built.headlights);
        taillights.push(...built.taillights);
        if (c === 0) interiorSeatAnchor = built.seatAnchor;
      }

      const unit: MetroTrainUnit = {
        id: `metro_${line.id}_${idx}`,
        line,
        dist: THREE.MathUtils.clamp(startDist, 40, line.totalLength - 40),
        dir,
        speed: 18,
        dwellTimer: 0,
        lastStopId: '',
        cars,
        interiorSeatAnchor,
        headlights,
        taillights,
        isPlayerBoarded: false
      };
      this.syncTrainTransforms(unit);
      this.trains.push(unit);
    };

    purpleStarts.forEach((s, i) => spawnOnLine(purple, s.dist, s.dir, i));
    greenStarts.forEach((s, i) => spawnOnLine(green, s.dist, s.dir, i));
  }

  private sampleLine(line: MetroLineRoute, dist: number): { pos: THREE.Vector3; tangent: THREE.Vector3 } {
    const d = THREE.MathUtils.clamp(dist, 0, line.totalLength);
    const cum = line.cumDist;
    let hi = 1;
    while (hi < cum.length - 1 && cum[hi] < d) hi++;
    const lo = hi - 1;
    const segLen = Math.max(0.001, cum[hi] - cum[lo]);
    const t = THREE.MathUtils.clamp((d - cum[lo]) / segLen, 0, 1);
    const pos = new THREE.Vector3().lerpVectors(line.points[lo], line.points[hi], t);
    const tangent = new THREE.Vector3().subVectors(line.points[hi], line.points[lo]).normalize();
    return { pos, tangent };
  }

  private syncTrainTransforms(unit: MetroTrainUnit): void {
    const carSpacing = 15.3;
    // Offset laterally onto double-track direction lane (+1.5m vs -1.5m) so opposing trains never collide!
    for (let c = 0; c < unit.cars.length; c++) {
      const offset = (1 - c) * carSpacing * unit.dir;
      const sample = this.sampleLine(unit.line, unit.dist + offset);
      const fwd = sample.tangent.clone().multiplyScalar(unit.dir);
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
      const lateral = 1.55;
      unit.cars[c].position.copy(sample.pos).addScaledVector(right, lateral);
      // Coach front is -Z, so yaw aligns -Z with fwd!
      unit.cars[c].rotation.y = Math.atan2(-fwd.x, -fwd.z);
    }
  }

  public findNearestStation(worldPos: THREE.Vector3, maxDist = 42): MetroStationDef | null {
    let best: MetroStationDef | null = null;
    let bestD = maxDist;
    for (const eb of this.entranceBeacons) {
      const d = Math.hypot(eb.pos.x - worldPos.x, eb.pos.z - worldPos.z);
      if (d < bestD) {
        bestD = d;
        best = eb.station;
      }
    }
    return best;
  }

  /**
   * Boards the player onto a live moving Namma Metro train!
   * - If `destination` is provided (from [M] Metro menu), places a live train on the
   *   destination's line starting from the closest station (or 1-3 stops away for scenic ride)
   *   and glides smoothly all the way into the chosen station!
   * - If boarding from a street station with [E], boards directly onto that station's line!
   */
  public boardTrain(playerPos: THREE.Vector3, destination?: MetroStationDef): {
    startStation: MetroStationDef;
    lineName: string;
  } {
    const lineKey: 'purple' | 'green' =
      destination?.line === 'green'
        ? 'green'
        : destination?.line === 'purple'
          ? 'purple'
          : this.pickBestLineForPos(playerPos);
    const line = this.lines.get(lineKey)!;

    // Pick closest station on this line to player as boarding station
    let startStop = line.stops[0];
    let bestD = Infinity;
    for (const s of line.stops) {
      const d = Math.hypot(s.pos.x - playerPos.x, s.pos.z - playerPos.z);
      if (d < bestD) {
        bestD = d;
        startStop = s;
      }
    }

    let destStop: MetroStopPoint | null = null;
    if (destination) {
      destStop = line.stops.find((s) => s.station.id === destination.id) || null;
      // If player is already at the destination station, start 1 stop earlier so they still enjoy a real ride!
      if (destStop && destStop.station.id === startStop.station.id) {
        const idx = line.stops.indexOf(destStop);
        startStop = line.stops[idx > 0 ? idx - 1 : Math.min(line.stops.length - 1, idx + 1)];
      }
    }

    // Grab the first train on this line and bring it cleanly to the boarding platform
    const train = this.trains.find((t) => t.line.id === line.id) || this.trains[0];
    if (this.boardedTrain) this.boardedTrain.isPlayerBoarded = false;

    train.isPlayerBoarded = true;
    train.dist = THREE.MathUtils.clamp(startStop.distAlongLine, 35, line.totalLength - 35);
    train.dwellTimer = 0.8; // Brief door-closing chime before smooth departure
    train.speed = 0;
    train.lastStopId = startStop.station.id;

    if (destStop) {
      train.dir = destStop.distAlongLine >= train.dist ? 1 : -1;
      // Cap ultra-long cross-city rides (e.g. Airport 25km) to ~1.8km scenic approach so ride takes ~16-24s!
      const travelDist = Math.abs(destStop.distAlongLine - train.dist);
      if (travelDist > 2600) {
        train.dist = THREE.MathUtils.clamp(
          destStop.distAlongLine - train.dir * 2200,
          35,
          line.totalLength - 35
        );
      }
    } else {
      train.dir = train.dist < line.totalLength * 0.5 ? 1 : -1;
    }

    this.boardedTrain = train;
    this.destinationStation = destStop ? destStop.station : null;
    this.interiorView = false;
    this.cameraYawOffset = 0;
    this.syncTrainTransforms(train);

    const leadPos = train.cars[0].position;
    this.camPos.copy(leadPos).add(new THREE.Vector3(16, 8, 16));
    this.camLook.copy(leadPos);

    return { startStation: startStop.station, lineName: line.name };
  }

  private pickBestLineForPos(pos: THREE.Vector3): 'purple' | 'green' {
    let bestLine: 'purple' | 'green' = 'purple';
    let bestD = Infinity;
    for (const [k, line] of this.lines.entries()) {
      for (const s of line.stops) {
        const d = Math.hypot(s.pos.x - pos.x, s.pos.z - pos.z);
        if (d < bestD) {
          bestD = d;
          bestLine = k;
        }
      }
    }
    return bestLine;
  }

  public toggleCameraView(): boolean {
    this.interiorView = !this.interiorView;
    return this.interiorView;
  }

  /**
   * Exits the currently boarded Namma Metro train at the nearest (or destination) station.
   */
  public exitTrain(jumpToDestination = false): MetroStationDef | null {
    if (!this.boardedTrain) return null;
    const train = this.boardedTrain;
    let exitStn = this.destinationStation;

    if (!jumpToDestination || !exitStn) {
      // Find closest station along the train's current position
      let bestStop = train.line.stops[0];
      let bestD = Infinity;
      for (const s of train.line.stops) {
        const d = Math.abs(s.distAlongLine - train.dist);
        if (d < bestD) {
          bestD = d;
          bestStop = s;
        }
      }
      exitStn = bestStop.station;
    } else {
      const destStop = train.line.stops.find((s) => s.station.id === exitStn!.id);
      if (destStop) {
        train.dist = destStop.distAlongLine;
        this.syncTrainTransforms(train);
      }
    }

    train.isPlayerBoarded = false;
    this.boardedTrain = null;
    this.destinationStation = null;
    this.onRideExited?.(exitStn);
    return exitStn;
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    lookDeltaX: number
  ): MetroRideState {
    // Pulse street-level station portal rings subtly
    const pulse = 0.16 + Math.sin(performance.now() * 0.003) * 0.07;
    for (const eb of this.entranceBeacons) {
      (eb.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Update all 6 live running Namma Metro trains
    for (const train of this.trains) {
      if (train.dwellTimer > 0) {
        train.dwellTimer -= dt;
        train.speed = THREE.MathUtils.lerp(train.speed, 0, dt * 6);
        this.syncTrainTransforms(train);
        continue;
      }

      // Express cruise when player is aboard so riding across Bengaluru feels brisk and exciting!
      const maxCruise = train.isPlayerBoarded ? 62 : 26;
      const accel = train.isPlayerBoarded ? 28 : 11;

      // Check upcoming station ahead for smooth deceleration & station stop
      let upcomingStop: MetroStopPoint | null = null;
      let distToUpcoming = Infinity;
      for (const stop of train.line.stops) {
        const delta = (stop.distAlongLine - train.dist) * train.dir;
        if (delta > 0 && delta < distToUpcoming) {
          distToUpcoming = delta;
          upcomingStop = stop;
        }
      }

      const isDestAhead =
        train.isPlayerBoarded &&
        this.destinationStation &&
        upcomingStop?.station.id === this.destinationStation.id;

      // Ambient trains stop briefly at every station; boarded train only slows hard for destination (or passes intermediate stations briskly!)
      const shouldStopHere = !train.isPlayerBoarded || Boolean(isDestAhead) || !this.destinationStation;

      if (upcomingStop && shouldStopHere && distToUpcoming < (train.isPlayerBoarded ? 220 : 120)) {
        const targetSpd = Math.max(3.5, Math.sqrt(2 * 10 * distToUpcoming));
        train.speed = THREE.MathUtils.lerp(train.speed, Math.min(maxCruise, targetSpd), dt * 4.5);

        if (distToUpcoming < 14 && train.lastStopId !== upcomingStop.station.id) {
          train.dist = upcomingStop.distAlongLine;
          train.speed = 0;
          train.lastStopId = upcomingStop.station.id;
          train.dwellTimer = train.isPlayerBoarded ? 3.2 : 4.2;

          if (train.isPlayerBoarded) {
            this.onStationArrival?.(upcomingStop.station, Boolean(isDestAhead));
            if (isDestAhead) {
              this.syncTrainTransforms(train);
              const arrived = this.exitTrain(true);
              if (arrived) {
                return {
                  riding: false,
                  lineName: train.line.name,
                  lineColor: `#${train.line.colorHex.toString(16).padStart(6, '0')}`,
                  speedKmh: 0,
                  nextStation: arrived,
                  destination: null,
                  interiorView: this.interiorView,
                  worldPos: null
                };
              }
            }
          }
        }
      } else {
        train.speed = Math.min(maxCruise, train.speed + accel * dt);
        // Announce passing intermediate stations when riding express
        if (
          train.isPlayerBoarded &&
          upcomingStop &&
          !shouldStopHere &&
          distToUpcoming < 25 &&
          train.lastStopId !== upcomingStop.station.id
        ) {
          train.lastStopId = upcomingStop.station.id;
          this.onStationArrival?.(upcomingStop.station, false);
        }
      }

      train.dist += train.speed * train.dir * dt;

      // Turn around smoothly at terminus stations
      if (train.dist >= train.line.totalLength - 35) {
        train.dist = train.line.totalLength - 35;
        train.dir = -1;
        train.speed = 0;
        train.dwellTimer = 3.5;
        train.lastStopId = '';
      } else if (train.dist <= 35) {
        train.dist = 35;
        train.dir = 1;
        train.speed = 0;
        train.dwellTimer = 3.5;
        train.lastStopId = '';
      }

      this.syncTrainTransforms(train);
    }

    if (!this.boardedTrain) {
      return {
        riding: false,
        lineName: '',
        lineColor: '#9333ea',
        speedKmh: 0,
        nextStation: null,
        destination: null,
        interiorView: this.interiorView,
        worldPos: null
      };
    }

    // Update cinematic Namma Metro Ride Camera (Exterior Skyline Orbit OR Inside Passenger Cabin!)
    const train = this.boardedTrain;
    this.cameraYawOffset -= lookDeltaX;
    const leadCar = train.cars[0];
    const trainYaw = leadCar.rotation.y;
    const fwdX = -Math.sin(trainYaw);
    const fwdZ = -Math.cos(trainYaw);

    if (this.interiorView) {
      // Inside Lead Coach Window View looking forward/side over Bengaluru!
      const cabPos = new THREE.Vector3();
      train.interiorSeatAnchor.getWorldPosition(cabPos);
      const lookYaw = trainYaw + this.cameraYawOffset;
      const lookTarget = cabPos.clone().add(new THREE.Vector3(-Math.sin(lookYaw) * 45, -1.2, -Math.cos(lookYaw) * 45));
      camera.position.copy(cabPos);
      camera.lookAt(lookTarget);
      camera.fov = THREE.MathUtils.lerp(camera.fov, 68, dt * 5);
      camera.updateProjectionMatrix();
    } else {
      // Sweeping Elevated Viaduct Chase Camera overlooking the 3-car Namma Metro train & city!
      const orbitYaw = trainYaw + this.cameraYawOffset + 0.36;
      const targetCam = new THREE.Vector3(
        leadCar.position.x + Math.sin(orbitYaw) * 26,
        leadCar.position.y + 9.5,
        leadCar.position.z + Math.cos(orbitYaw) * 26
      );
      const targetLook = new THREE.Vector3(
        leadCar.position.x + fwdX * 14,
        leadCar.position.y + 2.2,
        leadCar.position.z + fwdZ * 14
      );
      this.camPos.lerp(targetCam, Math.min(1, dt * 6));
      this.camLook.lerp(targetLook, Math.min(1, dt * 8));
      camera.position.copy(this.camPos);
      camera.lookAt(this.camLook);
      camera.fov = THREE.MathUtils.lerp(camera.fov, 62, dt * 5);
      camera.updateProjectionMatrix();
    }

    // Compute next station ahead for HUD
    let nextStn: MetroStationDef | null = this.destinationStation;
    let bestDelta = Infinity;
    for (const s of train.line.stops) {
      const delta = (s.distAlongLine - train.dist) * train.dir;
      if (delta > 5 && delta < bestDelta) {
        bestDelta = delta;
        nextStn = s.station;
      }
    }

    return {
      riding: true,
      lineName: train.line.name,
      lineColor: `#${train.line.colorHex.toString(16).padStart(6, '0')}`,
      speedKmh: Math.round(train.speed * 3.6),
      nextStation: nextStn,
      destination: this.destinationStation,
      interiorView: this.interiorView,
      worldPos: leadCar.position.clone()
    };
  }
}
