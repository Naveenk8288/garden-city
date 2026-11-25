import * as THREE from 'three';
import type { VehicleKind } from './VehicleSystem';

export interface BuiltVehicleModel {
  group: THREE.Group;
  bodyRoot: THREE.Group; // Pitch/roll suspension pivot!
  wheels: THREE.Object3D[];
  headlights: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  sirenBar?: { red: THREE.Mesh; blue: THREE.Mesh };
  riderSeatGroup?: THREE.Group; // Shown on open vehicles (bike/auto) when player drives
  name: string;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  maxHealth: number;
  halfLength: number;
}

let sharedPlateTex: THREE.CanvasTexture | null = null;
let sharedBusSignTex: THREE.CanvasTexture | null = null;

function getLicensePlateTex(): THREE.CanvasTexture {
  if (sharedPlateTex) return sharedPlateTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 34px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KA 01 MJ 4092', 128, 34);
  sharedPlateTex = new THREE.CanvasTexture(c);
  sharedPlateTex.colorSpace = THREE.SRGBColorSpace;
  return sharedPlateTex;
}

function getBusRouteTex(): THREE.CanvasTexture {
  if (sharedBusSignTex) return sharedBusSignTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090d14';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#ff9f2e';
  ctx.font = 'bold 42px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('500D • SILK BOARD — HEBBAL', 256, 50);
  sharedBusSignTex = new THREE.CanvasTexture(c);
  sharedBusSignTex.colorSpace = THREE.SRGBColorSpace;
  return sharedBusSignTex;
}

function makeDetailedWheel(radius: number, width: number): THREE.Group {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.88, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.88 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.8 });

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.015, 12), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  const spoke1 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, radius * 1.1, radius * 0.14), hubMat);
  const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, radius * 0.14, radius * 1.1), hubMat);
  g.add(spoke1, spoke2);

  return g;
}

/**
 * Builds sculpted, clearcoated 4K-ready 3D Bengaluru vehicle meshes with
 * alloys, glass windshields, KA-01 license plates, mirrors, bumpers, and exhausts.
 */
export function buildVehicleModel(kind: VehicleKind, colorSeed: number): BuiltVehicleModel {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const wheels: THREE.Object3D[] = [];
  const headlights: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];
  let sirenBar: { red: THREE.Mesh; blue: THREE.Mesh } | undefined;
  let riderSeatGroup: THREE.Group | undefined;

  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xffe8a6, emissiveIntensity: 2.4 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2238, emissive: 0xd90429, emissiveIntensity: 1.5 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xff9f1c, emissive: 0xf59e0b, emissiveIntensity: 1.0 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x162536,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.86
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.15, metalness: 0.92 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.65, metalness: 0.2 });
  const plateMat = new THREE.MeshStandardMaterial({ map: getLicensePlateTex(), roughness: 0.4 });

  const addWheel = (x: number, y: number, z: number, r = 0.36, w = 0.24) => {
    const wh = makeDetailedWheel(r, w);
    wh.position.set(x, y, z);
    group.add(wh);
    wheels.push(wh);
  };

  let name = 'Kaveri GT Coupe';
  let maxSpeed = 34;
  let accel = 21;
  let turnRate = 2.6;
  let maxHealth = 130;
  let halfLength = 2.2;

  if (kind === 'auto') {
    // Authentic Sculpted Bengaluru Green & Yellow 3-Wheeler Auto-Rickshaw
    name = 'Bengaluru Auto-Rickshaw';
    maxSpeed = 24;
    accel = 18;
    turnRate = 3.25;
    maxHealth = 95;
    halfLength = 1.45;

    const greenPaint = new THREE.MeshPhysicalMaterial({
      color: 0x15803d,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18
    });
    const yellowCanopy = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.68, metalness: 0.05 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.85 });

    // Lower green chassis tub
    const floorTub = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 2.38), greenPaint);
    floorTub.position.set(0, 0.44, 0.08);
    floorTub.castShadow = true;
    bodyRoot.add(floorTub);

    // Sculpted tapered front cowling / apron
    const frontApron = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.68, 0.78, 14, 1, false, Math.PI * 0.55, Math.PI * 0.9), greenPaint);
    frontApron.position.set(0, 0.74, -0.78);
    frontApron.castShadow = true;
    bodyRoot.add(frontApron);

    const frontFace = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.68, 0.35), greenPaint);
    frontFace.position.set(0, 0.72, -1.04);
    frontFace.rotation.x = 0.14;
    frontFace.castShadow = true;
    bodyRoot.add(frontFace);

    // Front wheel mudguard + chrome bumper
    const mudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.26, 12, 1, false, -Math.PI * 0.5, Math.PI), greenPaint);
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.36, -1.16);
    bodyRoot.add(mudguard);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.12, 0.14), darkTrimMat);
    bumper.position.set(0, 0.38, -1.26);
    bodyRoot.add(bumper);

    // Rear body green side panels + engine rear cowl
    const rearCowl = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.62, 0.62), greenPaint);
    rearCowl.position.set(0, 0.76, 1.02);
    rearCowl.castShadow = true;
    bodyRoot.add(rearCowl);

    // Yellow stripe beltline around body
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 2.32), yellowCanopy);
    stripe.position.set(0, 0.88, 0.1);
    bodyRoot.add(stripe);

    // Interior passenger & driver seats + handlebar
    const passSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.52), seatMat);
    passSeat.position.set(0, 0.74, 0.68);
    bodyRoot.add(passSeat);
    const drvSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.38), seatMat);
    drvSeat.position.set(0, 0.72, -0.35);
    bodyRoot.add(drvSeat);

    // Windshield glass + metal frame + roof support bars
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.54, 0.06), glassMat);
    shield.position.set(0, 1.32, -0.94);
    shield.rotation.x = -0.22;
    bodyRoot.add(shield);

    const pillarGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.85, 6);
    for (const sx of [-0.62, 0.62]) {
      for (const sz of [-0.78, 0.18, 1.15]) {
        const p = new THREE.Mesh(pillarGeo, darkTrimMat);
        p.position.set(sx, 1.32, sz);
        bodyRoot.add(p);
      }
    }

    // Iconic rounded yellow soft-top canvas roof!
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 14, 1, false, 0, Math.PI), yellowCanopy);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.scale.set(1.0, 1.0, 0.45);
    roof.position.set(0, 1.68, 0.16);
    roof.castShadow = true;
    bodyRoot.add(roof);

    // Round front chrome headlight + amber blinkers + rear taillights + KA-01 plate
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), headMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.68, -1.24);
    bodyRoot.add(hl);
    headlights.push(hl);

    for (const sx of [-0.48, 0.48]) {
      const ind = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.08), amberMat);
      ind.position.set(sx, 0.72, -1.21);
      bodyRoot.add(ind);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.08), tailMat);
      tl.position.set(sx, 0.68, 1.35);
      bodyRoot.add(tl);
      brakeLights.push(tl);
    }

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.03), plateMat);
    plate.position.set(0, 0.52, 1.35);
    bodyRoot.add(plate);

    addWheel(0, 0.28, -1.16, 0.28, 0.16);
    addWheel(-0.68, 0.28, 0.86, 0.28, 0.18);
    addWheel(0.68, 0.28, 0.86, 0.28, 0.18);
  } else if (kind === 'bike') {
    // Detailed Deccan 250cc Streetfighter Motorcycle
    name = 'Deccan 250cc Street Bike';
    maxSpeed = 42;
    accel = 28;
    turnRate = 3.4;
    maxHealth = 75;
    halfLength = 1.15;

    const palette = [0xdc2626, 0x2563eb, 0x18181b, 0xea580c, 0x059669];
    const bikePaint = new THREE.MeshPhysicalMaterial({
      color: palette[colorSeed % palette.length],
      roughness: 0.2,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    // Engine & lower frame
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.56), darkTrimMat);
    engine.position.set(0, 0.54, 0.0);
    engine.castShadow = true;
    bodyRoot.add(engine);

    // Sculpted teardrop fuel tank
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), bikePaint);
    tank.scale.set(0.85, 0.72, 1.35);
    tank.position.set(0, 0.92, -0.24);
    tank.castShadow = true;
    bodyRoot.add(tank);

    // Stepped leather rider + pillion seat & sporty tail cowl
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.68), darkTrimMat);
    seat.position.set(0, 0.82, 0.32);
    bodyRoot.add(seat);

    const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), bikePaint);
    tailCowl.position.set(0, 0.92, 0.68);
    tailCowl.rotation.x = 0.24;
    bodyRoot.add(tailCowl);

    // Twin chrome telescopic front forks + handlebars + projector fairing
    for (const sx of [-0.11, 0.11]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8), chromeMat);
      fork.position.set(sx, 0.72, -0.68);
      fork.rotation.x = -0.34;
      bodyRoot.add(fork);
    }
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.74, 8), darkTrimMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 1.08, -0.56);
    bodyRoot.add(handlebar);

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.22), bikePaint);
    fairing.position.set(0, 0.98, -0.76);
    fairing.rotation.x = 0.25;
    bodyRoot.add(fairing);

    // Upswept chrome exhaust muffler
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.82, 10), chromeMat);
    exhaust.rotation.x = Math.PI * 0.42;
    exhaust.position.set(0.21, 0.56, 0.48);
    bodyRoot.add(exhaust);

    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.08), headMat);
    hl.position.set(0, 0.95, -0.88);
    bodyRoot.add(hl);
    headlights.push(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.06), tailMat);
    tl.position.set(0, 0.94, 0.9);
    bodyRoot.add(tl);
    brakeLights.push(tl);

    // Stylized seated player silhouette shown when riding the bike!
    riderSeatGroup = new THREE.Group();
    const jMat = new THREE.MeshStandardMaterial({ color: 0x8f5026, roughness: 0.48 });
    const pMat = new THREE.MeshStandardMaterial({ color: 0x47403a, roughness: 0.85 });
    const sMat = new THREE.MeshStandardMaterial({ color: 0xd4a483, roughness: 0.65 });
    const hMat = new THREE.MeshStandardMaterial({ color: 0xd8cba8, roughness: 0.72 });
    const bMat = new THREE.MeshStandardMaterial({ color: 0x3a404a, roughness: 0.35, metalness: 0.65 });
    const rTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.26), jMat);
    rTorso.position.set(0, 1.18, 0.14);
    rTorso.rotation.x = -0.35;
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), sMat);
    rHead.position.set(0, 1.56, -0.02);
    const rBand = new THREE.Mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.04, 12), bMat);
    rBand.position.set(0, 1.61, -0.02);
    const rHair = new THREE.Mesh(new THREE.SphereGeometry(0.128, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hMat);
    rHair.position.set(0, 1.58, -0.01);
    const rLegs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.46), pMat);
    rLegs.position.set(0, 0.86, 0.08);
    riderSeatGroup.add(rTorso, rHead, rBand, rHair, rLegs);
    riderSeatGroup.visible = false;
    bodyRoot.add(riderSeatGroup);

    addWheel(0, 0.34, -0.82, 0.34, 0.14);
    addWheel(0, 0.34, 0.8, 0.34, 0.17);
  } else if (kind === 'bus') {
    // Detailed Bengaluru City Transit Bus with LED Route Board & AC Pod
    name = 'Garden City Transit Bus';
    maxSpeed = 22;
    accel = 10;
    turnRate = 1.55;
    maxHealth = 300;
    halfLength = 4.5;

    const busBlue = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2, clearcoat: 0.7 });
    const busSilver = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.3 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.54, 1.12, 8.85), busBlue);
    lower.position.y = 1.02;
    lower.castShadow = true;
    bodyRoot.add(lower);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.25, 8.75), busSilver);
    upper.position.y = 2.18;
    upper.castShadow = true;
    bodyRoot.add(upper);

    // Panoramic tinted windows band
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.92, 8.3), glassMat);
    winBand.position.y = 2.12;
    bodyRoot.add(winBand);

    // Front glowing orange LED route sign
    const routeMat = new THREE.MeshStandardMaterial({
      map: getBusRouteTex(),
      emissiveMap: getBusRouteTex(),
      emissive: new THREE.Color(0xff9f2e),
      emissiveIntensity: 1.2
    });
    const routeBoard = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 0.06), routeMat);
    routeBoard.position.set(0, 2.66, -4.41);
    bodyRoot.add(routeBoard);

    // Rooftop AC pod
    const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.26, 3.4), busSilver);
    acPod.position.set(0, 2.94, 0.3);
    bodyRoot.add(acPod);

    const frontBump = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.28, 0.2), darkTrimMat);
    frontBump.position.set(0, 0.56, -4.45);
    bodyRoot.add(frontBump);

    for (const sx of [-0.95, 0.95]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), headMat);
      hl.position.set(sx, 0.88, -4.44);
      bodyRoot.add(hl);
      headlights.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.08), tailMat);
      tl.position.set(sx, 1.05, 4.44);
      bodyRoot.add(tl);
      brakeLights.push(tl);
    }

    addWheel(-1.26, 0.48, -2.9, 0.48, 0.32);
    addWheel(1.26, 0.48, -2.9, 0.48, 0.32);
    addWheel(-1.26, 0.48, 2.75, 0.48, 0.38);
    addWheel(1.26, 0.48, 2.75, 0.48, 0.38);
  } else if (kind === 'truck') {
    name = 'Peenya Cargo Lorry';
    maxSpeed = 24;
    accel = 11.5;
    turnRate = 1.7;
    maxHealth = 260;
    halfLength = 3.9;

    const cabPaint = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.35, clearcoat: 0.65 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.25 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 7.2), darkTrimMat);
    chassis.position.set(0, 0.65, 0.3);
    bodyRoot.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.32, 1.78, 2.15), cabPaint);
    cab.position.set(0, 1.62, -2.25);
    cab.castShadow = true;
    bodyRoot.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.74, 0.08), glassMat);
    windshield.position.set(0, 1.98, -3.33);
    bodyRoot.add(windshield);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.56, 0.1), chromeMat);
    grille.position.set(0, 1.18, -3.34);
    bodyRoot.add(grille);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.32, 5.05), cargoMat);
    cargo.position.set(0, 1.96, 1.45);
    cargo.castShadow = true;
    bodyRoot.add(cargo);

    for (const sx of [-0.9, 0.9]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), headMat);
      hl.position.set(sx, 1.02, -3.34);
      bodyRoot.add(hl);
      headlights.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), tailMat);
      tl.position.set(sx, 0.85, 4.0);
      bodyRoot.add(tl);
      brakeLights.push(tl);
    }

    addWheel(-1.18, 0.48, -2.2, 0.48, 0.3);
    addWheel(1.18, 0.48, -2.2, 0.48, 0.3);
    addWheel(-1.18, 0.48, 2.25, 0.48, 0.36);
    addWheel(1.18, 0.48, 2.25, 0.48, 0.36);
  } else {
    // Aerodynamic Sculpted Sports Coupe / Namma City Cab / Metro Patrol Interceptor
    const isPatrol = kind === 'patrol';
    const isCab = kind === 'cab';
    name = isPatrol ? 'Metro Patrol Interceptor' : isCab ? 'Namma City Cab' : 'Kaveri GT Coupe';
    maxSpeed = isPatrol ? 43 : isCab ? 31 : 47;
    accel = isPatrol ? 26 : isCab ? 19 : 29;
    turnRate = isCab ? 2.5 : 2.85;
    maxHealth = isPatrol ? 190 : 140;
    halfLength = 2.3;

    const sportColors = [0xdc2626, 0x0ea5e9, 0xf59e0b, 0x1e293b, 0xe2e8f0, 0x7c3aed];
    const paintHex = isPatrol ? 0x172554 : isCab ? 0xf8fafc : sportColors[colorSeed % sportColors.length];
    const bodyPaint = new THREE.MeshPhysicalMaterial({
      color: paintHex,
      roughness: 0.18,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    // Sculpted automotive side silhouette extruded along width!
    const profile = new THREE.Shape();
    profile.moveTo(-2.22, 0.38);  // Front splitter
    profile.lineTo(-2.25, 0.72);  // Front nose
    profile.lineTo(-1.35, 0.86);  // Hood line
    profile.lineTo(-0.62, 1.38);  // Raked windshield
    profile.lineTo(0.76, 1.38);   // Sleek roofline
    profile.lineTo(1.56, 0.94);   // Fastback rear window
    profile.lineTo(2.22, 0.88);   // Rear deck
    profile.lineTo(2.24, 0.42);   // Rear diffuser
    profile.closePath();

    const carGeo = new THREE.ExtrudeGeometry(profile, {
      depth: 1.76,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 2
    });
    // ExtrudeGeometry starts in XY (X = front-to-back, Y = up, Z = width); align X -> -Z!
    carGeo.translate(0, 0, -0.88);
    carGeo.rotateY(-Math.PI / 2);
    const carBody = new THREE.Mesh(carGeo, bodyPaint);
    carBody.castShadow = true;
    carBody.receiveShadow = true;
    bodyRoot.add(carBody);

    // Tinted greenhouse wrap (front windshield, side glass, rear window)
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.92), glassMat);
    frontGlass.position.set(0, 1.15, -0.98);
    frontGlass.rotation.x = 0.62;
    bodyRoot.add(frontGlass);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.06, 0.92), glassMat);
    rearGlass.position.set(0, 1.18, 1.14);
    rearGlass.rotation.x = -0.52;
    bodyRoot.add(rearGlass);

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.36, 1.56), glassMat);
    sideGlass.position.set(0, 1.16, 0.08);
    bodyRoot.add(sideGlass);

    // Chrome front grille + dark lower splitter + side wing mirrors
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.22, 0.08), darkTrimMat);
    grille.position.set(0, 0.58, -2.31);
    bodyRoot.add(grille);

    const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.05, 0.1), chromeMat);
    grilleBar.position.set(0, 0.61, -2.32);
    bodyRoot.add(grilleBar);

    for (const sx of [-0.98, 0.98]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.14), bodyPaint);
      mirror.position.set(sx, 0.98, -0.78);
      bodyRoot.add(mirror);
    }

    // Rear license plate + twin chrome exhaust pipes
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.04), plateMat);
    plate.position.set(0, 0.64, 2.31);
    bodyRoot.add(plate);

    for (const sx of [-0.52, 0.52]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(sx, 0.42, 2.28);
      bodyRoot.add(pipe);
    }

    // Sport spoiler on GT Coupe
    if (!isCab && !isPatrol) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.06, 0.26), darkTrimMat);
      wing.position.set(0, 1.06, 2.08);
      bodyRoot.add(wing);
    }

    // Taxi topper on Namma City Cab
    if (isCab) {
      const taxi = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.19, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 1.4 })
      );
      taxi.position.set(0, 1.54, 0.05);
      bodyRoot.add(taxi);
    }

    // Bullbar + flashing Red/Blue Lightbar on Metro Patrol Interceptor
    if (isPatrol) {
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 0.14), darkTrimMat);
      bullbar.position.set(0, 0.64, -2.38);
      bodyRoot.add(bullbar);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 3.6), chromeMat);
      stripe.position.set(0, 0.68, 0);
      bodyRoot.add(stripe);

      const red = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 3.0 })
      );
      red.position.set(-0.3, 1.54, 0.05);
      const blue = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x2277ff, emissive: 0x2277ff, emissiveIntensity: 3.0 })
      );
      blue.position.set(0.3, 1.54, 0.05);
      bodyRoot.add(red, blue);
      sirenBar = { red, blue };
    }

    // Sleek LED headlights & taillights
    for (const sx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.08), headMat);
      hl.position.set(sx, 0.72, -2.29);
      bodyRoot.add(hl);
      headlights.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.08), tailMat);
      tl.position.set(sx, 0.76, 2.3);
      bodyRoot.add(tl);
      brakeLights.push(tl);
    }

    addWheel(-0.96, 0.37, -1.36, 0.37, 0.25);
    addWheel(0.96, 0.37, -1.36, 0.37, 0.25);
    addWheel(-0.96, 0.37, 1.38, 0.37, 0.25);
    addWheel(0.96, 0.37, 1.38, 0.37, 0.25);
  }

  return {
    group,
    bodyRoot,
    wheels,
    headlights,
    brakeLights,
    sirenBar,
    riderSeatGroup,
    name,
    maxSpeed,
    accel,
    turnRate,
    maxHealth,
    halfLength
  };
}
