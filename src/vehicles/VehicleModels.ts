import * as THREE from 'three';
import type { VehicleKind } from './VehicleSystem';
import {
  CharacterLoadout,
  DRESS_OPTIONS,
  PANTS_OPTIONS,
  SHOES_OPTIONS
} from '../entities/CustomizationData';

export type DriverPose = 'auto' | 'bike' | 'car' | 'bus' | 'truck';

export interface BuiltVehicleModel {
  group: THREE.Group;
  bodyRoot: THREE.Group; // Pitch/roll suspension pivot!
  wheels: THREE.Object3D[];
  headlights: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  sirenBar?: { red: THREE.Mesh; blue: THREE.Mesh };
  driverAnchor: THREE.Group; // Positioned at the exact driver's seat inside the cabin
  npcDriverGroup: THREE.Group;
  playerDriverGroup: THREE.Group;
  driverPose: DriverPose;
  steeringWheel?: THREE.Object3D;
  name: string;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  maxHealth: number;
  halfLength: number;
}

let sharedPlateTex: THREE.CanvasTexture | null = null;
let sharedBusSignTex: THREE.CanvasTexture | null = null;
let sharedHeroDriverTex: THREE.Texture | null = null;

function getHeroDriverFaceTex(): THREE.Texture {
  if (sharedHeroDriverTex) return sharedHeroDriverTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d4a483';
  ctx.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedHeroDriverTex = tex;

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.fillStyle = '#d4a483';
      ctx.fillRect(0, 0, 256, 128);
      const sx = img.width * 0.14;
      const sy = img.height * 0.18;
      const sw = img.width * 0.72;
      const sh = img.height * 0.62;
      ctx.drawImage(img, sx, sy, sw, sh, 84, 24, 88, 76);
      tex.needsUpdate = true;
    };
    img.src = `${import.meta.env.BASE_URL || './'}textures/hero-face.jpg`;
  }
  return tex;
}

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

function makeSteeringWheel(): THREE.Group {
  const g = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.55, metalness: 0.25 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 8, 18), wheelMat);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.025), hubMat);
  const vSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.025), hubMat);
  vSpoke.position.y = -0.07;
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), wheelMat);
  center.rotation.x = Math.PI / 2;
  g.add(rim, spoke, vSpoke, center);
  g.rotation.x = -0.42;
  return g;
}

export interface SeatedDriverSpec {
  pose: DriverPose;
  shirtHex: number;
  accentHex?: number;
  pantsHex: number;
  shoesHex: number;
  skinHex: number;
  hairHex: number;
  helmet?: boolean;
  policeCap?: boolean;
  playerLoadout?: CharacterLoadout;
}

/**
 * Builds a realistic articulated 3D seated driver positioned with origin at the seat cushion
 * (y = 0 at hips/seat surface, facing -Z toward the windshield & steering wheel/handlebars).
 */
export function buildSeatedDriver(spec: SeatedDriverSpec): THREE.Group {
  const root = new THREE.Group();
  const isBike = spec.pose === 'bike';
  const isAuto = spec.pose === 'auto';
  const isCar = spec.pose === 'car';

  const shirtMat = new THREE.MeshStandardMaterial({ color: spec.shirtHex, roughness: 0.62, metalness: 0.08 });
  const accentMat = new THREE.MeshStandardMaterial({ color: spec.accentHex ?? 0xe2e8f0, roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: spec.pantsHex, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: spec.shoesHex, roughness: 0.72 });
  const skinMat = new THREE.MeshStandardMaterial({ color: spec.skinHex, roughness: 0.62 });
  const hairMat = new THREE.MeshStandardMaterial({ color: spec.hairHex, roughness: 0.75 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.45, metalness: 0.35 });

  // Seated hips/pelvis on seat cushion
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.28), pantsMat);
  hips.position.set(0, 0.08, 0.02);
  hips.castShadow = true;
  root.add(hips);

  // Left & Right seated thighs & lower legs
  const legSpread = isBike ? 0.17 : 0.12;
  for (const sx of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.38, 8), pantsMat);
    thigh.rotation.x = Math.PI * 0.46;
    thigh.rotation.z = sx * (isBike ? -0.22 : -0.05);
    thigh.position.set(sx * legSpread, 0.09, -0.17);
    root.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.36, 8), pantsMat);
    shin.rotation.x = isBike ? 0.32 : -0.08;
    shin.position.set(sx * (legSpread + (isBike ? 0.04 : 0)), -0.1, isBike ? -0.28 : -0.34);
    root.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.18), shoeMat);
    boot.position.set(sx * (legSpread + (isBike ? 0.04 : 0)), -0.28, isBike ? -0.24 : -0.39);
    root.add(boot);
  }

  // Upper body group (leans forward on bikes, upright in cars/autos/buses/trucks)
  const upper = new THREE.Group();
  upper.position.set(0, 0.14, 0.03);
  upper.rotation.x = isBike ? -0.34 : isAuto ? -0.12 : isCar ? 0.08 : -0.04;
  root.add(upper);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.22), shirtMat);
  torso.position.set(0, 0.24, 0);
  torso.castShadow = true;
  upper.add(torso);

  // Shirt front / jacket lapel / inner tee contrast strip
  const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.03), accentMat);
  chestStrip.position.set(0, 0.25, -0.105);
  upper.add(chestStrip);

  // Shoulders
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.078, 8, 8), shirtMat);
    sh.position.set(sx * 0.21, 0.41, 0);
    upper.add(sh);
  }

  // Arms reaching forward to grip steering wheel / handlebars!
  const reachX = isBike ? 0.27 : isAuto ? 0.2 : 0.16;
  const reachZ = isBike ? -0.44 : isAuto ? -0.38 : -0.34;
  const reachY = isBike ? 0.26 : isAuto ? 0.3 : 0.31;
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Vector3(sx * 0.21, 0.4, 0);
    const elbow = new THREE.Vector3(sx * (reachX + 0.04), 0.24, -0.16);
    const hand = new THREE.Vector3(sx * reachX, reachY, reachZ);

    const addLimb = (a: THREE.Vector3, b: THREE.Vector3, rTop: number, rBot: number, mat: THREE.Material) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 8), mat);
      seg.position.copy(a).addScaledVector(dir, 0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      seg.castShadow = true;
      upper.add(seg);
    };

    addLimb(shoulder, elbow, 0.056, 0.048, shirtMat);
    addLimb(elbow, hand, 0.046, 0.038, skinMat);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 8), skinMat);
    fist.position.copy(hand);
    upper.add(fist);
  }

  // Neck + Head group (tagged as driverHead so steering turns their gaze slightly!)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.09, 8), skinMat);
  neck.position.set(0, 0.49, 0);
  upper.add(neck);

  const headGroup = new THREE.Group();
  headGroup.name = 'driverHead';
  headGroup.position.set(0, 0.62, -0.01);
  // Counter-tilt slightly on bike so rider looks ahead down the road
  headGroup.rotation.x = isBike ? 0.26 : 0;
  upper.add(headGroup);

  const loadout = spec.playerLoadout;
  const isHeroFace = loadout?.faceId === 'hero_portrait';
  const headMat = isHeroFace
    ? new THREE.MeshStandardMaterial({ map: getHeroDriverFaceTex(), roughness: 0.58 })
    : skinMat;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 10), headMat);
  head.rotation.y = -Math.PI / 2;
  head.castShadow = true;
  headGroup.add(head);

  if (loadout) {
    if (loadout.faceId === 'seraph_halo') {
      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.126, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
        new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.55 })
      );
      hair.position.y = 0.025;
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.01, 6, 18),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.6 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.14;
      headGroup.add(hair, halo);
    } else if (loadout.faceId === 'hero_portrait') {
      // Iconic Striker metal forehead headband + blond spiky hair
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.123, 0.123, 0.042, 14),
        new THREE.MeshStandardMaterial({ color: 0x3b4250, roughness: 0.35, metalness: 0.65 })
      );
      band.position.y = 0.035;
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.036, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.2, metalness: 0.85 })
      );
      plate.position.set(0, 0.035, -0.122);
      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.126, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
        new THREE.MeshStandardMaterial({ color: 0xd8cba8, roughness: 0.72 })
      );
      hair.position.y = 0.025;
      headGroup.add(band, plate, hair);
    } else if (loadout.faceId === 'cyber_visor') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), darkMat);
      hair.position.y = 0.02;
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.21, 0.055, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x38e8ff, emissive: 0x0ea5e9, emissiveIntensity: 1.8 })
      );
      visor.position.set(0, 0.01, -0.105);
      headGroup.add(hair, visor);
    } else if (loadout.faceId === 'shadow_mask') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), darkMat);
      hair.position.y = 0.02;
      const mask = new THREE.Mesh(
        new THREE.CylinderGeometry(0.122, 0.114, 0.085, 12),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 })
      );
      mask.position.y = -0.04;
      headGroup.add(hair, mask);
    } else if (loadout.faceId === 'specops_helmet') {
      const helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.138, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        new THREE.MeshStandardMaterial({ color: 0x2f3a32, roughness: 0.55 })
      );
      helm.position.y = 0.02;
      const nvg = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.045, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.4 })
      );
      nvg.position.set(0, 0.04, -0.13);
      headGroup.add(helm, nvg);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat);
      hair.position.y = 0.02;
      headGroup.add(hair);
      if (loadout.faceId === 'kingpin_shades') {
        const shades = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.045, 0.05), darkMat);
        shades.position.set(0, 0.015, -0.105);
        headGroup.add(shades);
      }
    }
  } else if (spec.helmet) {
    // Full-face Bengaluru commuter motorcycle helmet + dark visor
    const helmetMat = new THREE.MeshPhysicalMaterial({
      color: spec.accentHex ?? 0x1e293b,
      roughness: 0.18,
      metalness: 0.35,
      clearcoat: 1.0
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), helmetMat);
    shell.position.y = 0.01;
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.075, 14, 1, true, Math.PI * 0.72, Math.PI * 0.56),
      new THREE.MeshPhysicalMaterial({ color: 0x0b1220, roughness: 0.1, metalness: 0.6, clearcoat: 1.0 })
    );
    visor.position.y = 0.01;
    headGroup.add(shell, visor);
  } else if (spec.policeCap) {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.65 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.122, 0.07, 12), capMat);
    cap.position.y = 0.085;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.11), darkMat);
    brim.position.set(0, 0.055, -0.11);
    headGroup.add(cap, brim);
  } else {
    // Realistic civilian hair cap + subtle sunglasses/eyes
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.02;
    headGroup.add(hair);
    for (const sx of [-0.042, 0.042]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.015), darkMat);
      eye.position.set(sx, 0.015, -0.114);
      headGroup.add(eye);
    }
  }

  return root;
}

export function buildPlayerDriverForPose(pose: DriverPose, loadout: CharacterLoadout): THREE.Group {
  const dress = DRESS_OPTIONS.find((d) => d.id === loadout.dressId) || DRESS_OPTIONS[0];
  const pants = PANTS_OPTIONS.find((p) => p.id === loadout.pantsId) || PANTS_OPTIONS[0];
  const shoes = SHOES_OPTIONS.find((s) => s.id === loadout.shoesId) || SHOES_OPTIONS[0];
  return buildSeatedDriver({
    pose,
    shirtHex: new THREE.Color(dress.swatch).getHex(),
    accentHex: new THREE.Color(dress.accent || '#e2e8f0').getHex(),
    pantsHex: new THREE.Color(pants.swatch).getHex(),
    shoesHex: new THREE.Color(shoes.swatch).getHex(),
    skinHex: 0xd4a483,
    hairHex: loadout.faceId === 'hero_portrait' ? 0xd8cba8 : 0x241811,
    playerLoadout: loadout
  });
}

function buildNpcDriverForKind(kind: VehicleKind, pose: DriverPose, colorSeed: number): THREE.Group {
  const civShirts = [0xe2e8f0, 0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x334155];
  const skinTones = [0xc68e67, 0xb57b55, 0xd4a483, 0x9d6746];
  const skinHex = skinTones[colorSeed % skinTones.length];

  if (kind === 'auto') {
    // Classic Bengaluru Khaki-shirt Auto Driver!
    return buildSeatedDriver({
      pose,
      shirtHex: 0xb69c6d,
      accentHex: 0x8f774d,
      pantsHex: 0x3f3932,
      shoesHex: 0x23201d,
      skinHex,
      hairHex: 0x181512
    });
  }
  if (kind === 'patrol') {
    // Uniformed Metro Patrol Officer
    return buildSeatedDriver({
      pose,
      shirtHex: 0x1e3a8a,
      accentHex: 0xfacc15,
      pantsHex: 0x0f172a,
      shoesHex: 0x111318,
      skinHex,
      hairHex: 0x181512,
      policeCap: true
    });
  }
  if (kind === 'bike') {
    const helmColors = [0x111827, 0xdc2626, 0xe2e8f0, 0x2563eb, 0xf59e0b];
    return buildSeatedDriver({
      pose,
      shirtHex: civShirts[colorSeed % civShirts.length],
      accentHex: helmColors[(colorSeed + 2) % helmColors.length],
      pantsHex: 0x1e293b,
      shoesHex: 0x18181b,
      skinHex,
      hairHex: 0x181512,
      helmet: true
    });
  }
  if (kind === 'bus') {
    return buildSeatedDriver({
      pose,
      shirtHex: 0x94a3b8,
      accentHex: 0x1d4ed8,
      pantsHex: 0x334155,
      shoesHex: 0x18181b,
      skinHex,
      hairHex: 0x1c1917
    });
  }
  if (kind === 'truck') {
    return buildSeatedDriver({
      pose,
      shirtHex: 0xca8a04,
      accentHex: 0xfef08a,
      pantsHex: 0x3f3f46,
      shoesHex: 0x27272a,
      skinHex,
      hairHex: 0x181512
    });
  }
  return buildSeatedDriver({
    pose,
    shirtHex: kind === 'cab' ? 0xf1f5f9 : civShirts[colorSeed % civShirts.length],
    accentHex: kind === 'cab' ? 0x1e293b : 0xf8fafc,
    pantsHex: 0x1f2937,
    shoesHex: 0x18181b,
    skinHex,
    hairHex: 0x1a1512
  });
}

/**
 * Builds sculpted, clearcoated 4K-ready 3D Bengaluru vehicle meshes with open interiors,
 * clear tinted glass, steering wheels, seats, and visible drivers inside every vehicle.
 */
export function buildVehicleModel(kind: VehicleKind, colorSeed: number): BuiltVehicleModel {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const wheels: THREE.Object3D[] = [];
  const headlights: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];
  let sirenBar: { red: THREE.Mesh; blue: THREE.Mesh } | undefined;
  let steeringWheel: THREE.Object3D | undefined;

  const driverAnchor = new THREE.Group();
  bodyRoot.add(driverAnchor);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xffe8a6, emissiveIntensity: 2.4 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2238, emissive: 0xd90429, emissiveIntensity: 1.5 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xff9f1c, emissive: 0xf59e0b, emissiveIntensity: 1.0 });
  // Clear realistic tinted glass so drivers & cabin interiors are clearly visible!
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x26415c,
    roughness: 0.06,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.32,
    depthWrite: false
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.85, metalness: 0.08 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x282d38, roughness: 0.8 });
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
  let driverPose: DriverPose = 'car';

  if (kind === 'auto') {
    name = 'Bengaluru Auto-Rickshaw';
    maxSpeed = 24;
    accel = 18;
    turnRate = 3.25;
    maxHealth = 95;
    halfLength = 1.45;
    driverPose = 'auto';

    const greenPaint = new THREE.MeshPhysicalMaterial({
      color: 0x15803d,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18
    });
    const yellowCanopy = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.68, metalness: 0.05 });

    const floorTub = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 2.38), greenPaint);
    floorTub.position.set(0, 0.44, 0.08);
    floorTub.castShadow = true;
    bodyRoot.add(floorTub);

    const frontApron = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.68, 0.78, 14, 1, false, Math.PI * 0.55, Math.PI * 0.9), greenPaint);
    frontApron.position.set(0, 0.74, -0.78);
    frontApron.castShadow = true;
    bodyRoot.add(frontApron);

    const frontFace = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.68, 0.35), greenPaint);
    frontFace.position.set(0, 0.72, -1.04);
    frontFace.rotation.x = 0.14;
    frontFace.castShadow = true;
    bodyRoot.add(frontFace);

    const mudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.26, 12, 1, false, -Math.PI * 0.5, Math.PI), greenPaint);
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.36, -1.16);
    bodyRoot.add(mudguard);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.12, 0.14), darkTrimMat);
    bumper.position.set(0, 0.38, -1.26);
    bodyRoot.add(bumper);

    const rearCowl = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.62, 0.62), greenPaint);
    rearCowl.position.set(0, 0.76, 1.02);
    rearCowl.castShadow = true;
    bodyRoot.add(rearCowl);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 2.32), yellowCanopy);
    stripe.position.set(0, 0.88, 0.1);
    bodyRoot.add(stripe);

    // Interior passenger & driver seats + auto handlebars
    const passSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.52), seatMat);
    passSeat.position.set(0, 0.74, 0.68);
    bodyRoot.add(passSeat);
    const drvSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.38), seatMat);
    drvSeat.position.set(0, 0.72, -0.32);
    bodyRoot.add(drvSeat);

    const handleGroup = new THREE.Group();
    handleGroup.position.set(0, 1.04, -0.68);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), darkTrimMat);
    stem.position.y = -0.14;
    handleGroup.add(bar, stem);
    bodyRoot.add(handleGroup);
    steeringWheel = handleGroup;

    driverAnchor.position.set(0, 0.68, -0.3);

    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.54, 0.05), glassMat);
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

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 14, 1, false, 0, Math.PI), yellowCanopy);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.scale.set(1.0, 1.0, 0.45);
    roof.position.set(0, 1.68, 0.16);
    roof.castShadow = true;
    bodyRoot.add(roof);

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
    name = 'Deccan 250cc Street Bike';
    maxSpeed = 42;
    accel = 28;
    turnRate = 3.4;
    maxHealth = 75;
    halfLength = 1.15;
    driverPose = 'bike';

    const palette = [0xdc2626, 0x2563eb, 0x18181b, 0xea580c, 0x059669];
    const bikePaint = new THREE.MeshPhysicalMaterial({
      color: palette[colorSeed % palette.length],
      roughness: 0.2,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.56), darkTrimMat);
    engine.position.set(0, 0.54, 0.0);
    engine.castShadow = true;
    bodyRoot.add(engine);

    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), bikePaint);
    tank.scale.set(0.85, 0.72, 1.35);
    tank.position.set(0, 0.92, -0.24);
    tank.castShadow = true;
    bodyRoot.add(tank);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.68), darkTrimMat);
    seat.position.set(0, 0.82, 0.32);
    bodyRoot.add(seat);

    const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), bikePaint);
    tailCowl.position.set(0, 0.92, 0.68);
    tailCowl.rotation.x = 0.24;
    bodyRoot.add(tailCowl);

    for (const sx of [-0.11, 0.11]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8), chromeMat);
      fork.position.set(sx, 0.72, -0.68);
      fork.rotation.x = -0.34;
      bodyRoot.add(fork);
    }

    const handleGroup = new THREE.Group();
    handleGroup.position.set(0, 1.08, -0.56);
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.74, 8), darkTrimMat);
    handlebar.rotation.z = Math.PI / 2;
    handleGroup.add(handlebar);
    bodyRoot.add(handleGroup);
    steeringWheel = handleGroup;

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.22), bikePaint);
    fairing.position.set(0, 0.98, -0.76);
    fairing.rotation.x = 0.25;
    bodyRoot.add(fairing);

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

    driverAnchor.position.set(0, 0.86, 0.2);

    addWheel(0, 0.34, -0.82, 0.34, 0.14);
    addWheel(0, 0.34, 0.8, 0.34, 0.17);
  } else if (kind === 'bus') {
    name = 'Garden City Transit Bus';
    maxSpeed = 22;
    accel = 10;
    turnRate = 1.55;
    maxHealth = 300;
    halfLength = 4.5;
    driverPose = 'bus';

    const busBlue = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2, clearcoat: 0.7 });
    const busSilver = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.3 });

    // Lower solid body + interior cabin floor + rear bulkhead
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.54, 1.12, 8.85), busBlue);
    lower.position.y = 1.02;
    lower.castShadow = true;
    bodyRoot.add(lower);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 8.6), interiorMat);
    floor.position.y = 1.58;
    bodyRoot.add(floor);

    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.24, 0.24), busSilver);
    rearWall.position.set(0, 2.2, 4.3);
    bodyRoot.add(rearWall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.16, 8.8), busSilver);
    roof.position.y = 2.76;
    roof.castShadow = true;
    bodyRoot.add(roof);

    // Window pillars along both sides + front corners
    const pillarGeo = new THREE.BoxGeometry(0.1, 1.18, 0.12);
    for (const sx of [-1.22, 1.22]) {
      for (const sz of [-4.32, -2.5, -0.6, 1.3, 3.1, 4.25]) {
        const p = new THREE.Mesh(pillarGeo, busSilver);
        p.position.set(sx, 2.16, sz);
        bodyRoot.add(p);
      }
    }

    // Dashboard, driver seat & steering wheel (Indian Right-Hand Drive!)
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.44, 0.48), interiorMat);
    dash.position.set(0, 1.78, -4.08);
    bodyRoot.add(dash);

    const drvSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.48), seatMat);
    drvSeat.position.set(0.74, 1.72, -3.48);
    bodyRoot.add(drvSeat);

    const sw = makeSteeringWheel();
    sw.position.set(0.74, 2.15, -3.82);
    sw.scale.setScalar(1.25);
    bodyRoot.add(sw);
    steeringWheel = sw;

    driverAnchor.position.set(0.74, 1.72, -3.48);

    // Visible Bengaluru commuters seated inside the bus!
    const passShirts = [0xf97316, 0x3b82f6, 0xec4899, 0x10b981];
    const passCoords: Array<[number, number]> = [[-0.82, -1.8], [0.82, -0.7], [-0.82, 0.9], [0.82, 2.2]];
    passCoords.forEach(([px, pz], idx) => {
      const pSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.44), seatMat);
      pSeat.position.set(px, 1.72, pz);
      bodyRoot.add(pSeat);
      const passenger = buildSeatedDriver({
        pose: 'bus',
        shirtHex: passShirts[idx % passShirts.length],
        pantsHex: 0x1e293b,
        shoesHex: 0x18181b,
        skinHex: 0xc68e67,
        hairHex: 0x181512
      });
      passenger.position.set(px, 1.72, pz);
      bodyRoot.add(passenger);
    });

    // Clear panoramic windshield + side window panes
    const frontWin = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.04, 0.05), glassMat);
    frontWin.position.set(0, 2.16, -4.36);
    bodyRoot.add(frontWin);
    for (const sx of [-1.24, 1.24]) {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.04, 8.4), glassMat);
      sideWin.position.set(sx, 2.16, 0);
      bodyRoot.add(sideWin);
    }

    const routeMat = new THREE.MeshStandardMaterial({
      map: getBusRouteTex(),
      emissiveMap: getBusRouteTex(),
      emissive: new THREE.Color(0xff9f2e),
      emissiveIntensity: 1.2
    });
    const routeBoard = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 0.06), routeMat);
    routeBoard.position.set(0, 2.66, -4.41);
    bodyRoot.add(routeBoard);

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
    driverPose = 'truck';

    const cabPaint = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.35, clearcoat: 0.65 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.25 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 7.2), darkTrimMat);
    chassis.position.set(0, 0.65, 0.3);
    bodyRoot.add(chassis);

    // Lower solid cab + rear cab bulkhead + cab roof + open window cabin!
    const cabLower = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.9, 2.15), cabPaint);
    cabLower.position.set(0, 1.18, -2.25);
    cabLower.castShadow = true;
    bodyRoot.add(cabLower);

    const cabBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.92, 0.18), cabPaint);
    cabBack.position.set(0, 2.04, -1.26);
    bodyRoot.add(cabBack);

    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.14, 2.15), cabPaint);
    cabRoof.position.set(0, 2.48, -2.25);
    cabRoof.castShadow = true;
    bodyRoot.add(cabRoof);

    for (const sx of [-1.1, 1.1]) {
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.88, 0.12), cabPaint);
      aPillar.position.set(sx, 2.02, -3.26);
      bodyRoot.add(aPillar);
    }

    // Cab dashboard, seats & steering wheel (Right-Hand Drive)
    const cabDash = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.36, 0.42), interiorMat);
    cabDash.position.set(0, 1.66, -3.02);
    bodyRoot.add(cabDash);

    for (const sx of [-0.58, 0.58]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.48, 0.46), seatMat);
      seat.position.set(sx, 1.72, -2.28);
      bodyRoot.add(seat);
    }

    const sw = makeSteeringWheel();
    sw.position.set(0.58, 1.94, -2.66);
    sw.scale.setScalar(1.15);
    bodyRoot.add(sw);
    steeringWheel = sw;

    driverAnchor.position.set(0.58, 1.5, -2.3);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.78, 0.05), glassMat);
    windshield.position.set(0, 2.02, -3.31);
    bodyRoot.add(windshield);
    for (const sx of [-1.14, 1.14]) {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.76, 1.85), glassMat);
      sideGlass.position.set(sx, 2.02, -2.26);
      bodyRoot.add(sideGlass);
    }

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
    // WITH HOLLOWED-OUT OPEN CABIN, SEATS, STEERING WHEEL & VISIBLE DRIVER!
    const isPatrol = kind === 'patrol';
    const isCab = kind === 'cab';
    name = isPatrol ? 'Metro Patrol Interceptor' : isCab ? 'Namma City Cab' : 'Kaveri GT Coupe';
    maxSpeed = isPatrol ? 43 : isCab ? 31 : 47;
    accel = isPatrol ? 26 : isCab ? 19 : 29;
    turnRate = isCab ? 2.5 : 2.85;
    maxHealth = isPatrol ? 190 : 140;
    halfLength = 2.3;
    driverPose = 'car';

    const sportColors = [0xdc2626, 0x0ea5e9, 0xf59e0b, 0x1e293b, 0xe2e8f0, 0x7c3aed];
    const paintHex = isPatrol ? 0x172554 : isCab ? 0xf8fafc : sportColors[colorSeed % sportColors.length];
    const bodyPaint = new THREE.MeshPhysicalMaterial({
      color: paintHex,
      roughness: 0.18,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    // Lower chassis + sculpted hood & rear deck (hollow greenhouse above beltline y = 0.88!)
    const lowerProfile = new THREE.Shape();
    lowerProfile.moveTo(-2.22, 0.38);  // Front splitter
    lowerProfile.lineTo(-2.25, 0.72);  // Front nose
    lowerProfile.lineTo(-1.32, 0.88);  // Hood cowl
    lowerProfile.lineTo(1.54, 0.90);   // Beltline along cabin doors
    lowerProfile.lineTo(2.22, 0.88);   // Rear deck
    lowerProfile.lineTo(2.24, 0.42);   // Rear diffuser
    lowerProfile.closePath();

    const lowerGeo = new THREE.ExtrudeGeometry(lowerProfile, {
      depth: 1.76,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2
    });
    lowerGeo.translate(0, 0, -0.88);
    lowerGeo.rotateY(-Math.PI / 2);
    const lowerBody = new THREE.Mesh(lowerGeo, bodyPaint);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    bodyRoot.add(lowerBody);

    // Recessed dark cabin tub, dashboard, bucket seats & right-hand steering wheel!
    const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.9), interiorMat);
    cabinFloor.position.set(0, 0.48, 0.08);
    bodyRoot.add(cabinFloor);

    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.24, 0.44), interiorMat);
    dash.position.set(0, 0.88, -0.78);
    bodyRoot.add(dash);

    for (const sx of [-0.4, 0.4]) {
      const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), seatMat);
      seatBase.position.set(sx, 0.56, 0.06);
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.12), seatMat);
      seatBack.position.set(sx, 0.84, 0.28);
      seatBack.rotation.x = 0.14;
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.09), seatMat);
      headrest.position.set(sx, 1.12, 0.32);
      bodyRoot.add(seatBase, seatBack, headrest);
    }

    // Steering wheel on Right-Hand Drive side (India!) aligned to driver's hands
    const sw = makeSteeringWheel();
    sw.position.set(0.4, 0.96, -0.34);
    bodyRoot.add(sw);
    steeringWheel = sw;

    driverAnchor.position.set(0.4, 0.5, 0.04);

    // Sleek Roof panel supported by slim A-, B- and C-pillars so cabin stays open & visible!
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 1.48), bodyPaint);
    roof.position.set(0, 1.48, 0.08);
    roof.castShadow = true;
    bodyRoot.add(roof);

    for (const sx of [-0.78, 0.78]) {
      // A-pillar (front windshield frame)
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.07), bodyPaint);
      aPillar.position.set(sx, 1.18, -0.92);
      aPillar.rotation.x = 0.62;
      bodyRoot.add(aPillar);

      // B-pillar (center door frame)
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.6, 0.07), darkTrimMat);
      bPillar.position.set(sx, 1.19, 0.22);
      bodyRoot.add(bPillar);

      // C-pillar (rear fastback frame)
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.72, 0.09), bodyPaint);
      cPillar.position.set(sx, 1.19, 1.1);
      cPillar.rotation.x = -0.68;
      bodyRoot.add(cPillar);
    }

    // Clear tinted front, rear, and side glass panes
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.04, 0.82), glassMat);
    frontGlass.position.set(0, 1.2, -0.94);
    frontGlass.rotation.x = 0.72;
    bodyRoot.add(frontGlass);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.04, 0.88), glassMat);
    rearGlass.position.set(0, 1.21, 1.14);
    rearGlass.rotation.x = -0.64;
    bodyRoot.add(rearGlass);

    for (const sx of [-0.8, 0.8]) {
      const sidePane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 1.62), glassMat);
      sidePane.position.set(sx, 1.19, 0.08);
      bodyRoot.add(sidePane);
    }

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

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.04), plateMat);
    plate.position.set(0, 0.64, 2.31);
    bodyRoot.add(plate);

    for (const sx of [-0.52, 0.52]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(sx, 0.42, 2.28);
      bodyRoot.add(pipe);
    }

    if (!isCab && !isPatrol) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.06, 0.26), darkTrimMat);
      wing.position.set(0, 1.06, 2.08);
      bodyRoot.add(wing);
    }

    if (isCab) {
      const taxi = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.19, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 1.4 })
      );
      taxi.position.set(0, 1.6, 0.08);
      bodyRoot.add(taxi);
    }

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
      red.position.set(-0.3, 1.6, 0.08);
      const blue = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x2277ff, emissive: 0x2277ff, emissiveIntensity: 3.0 })
      );
      blue.position.set(0.3, 1.6, 0.08);
      bodyRoot.add(red, blue);
      sirenBar = { red, blue };
    }

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

  // Attach NPC driver & Player driver container onto the cabin's driverAnchor!
  const npcDriverGroup = buildNpcDriverForKind(kind, driverPose, colorSeed);
  npcDriverGroup.visible = false;
  driverAnchor.add(npcDriverGroup);

  const playerDriverGroup = new THREE.Group();
  playerDriverGroup.visible = false;
  driverAnchor.add(playerDriverGroup);

  return {
    group,
    bodyRoot,
    wheels,
    headlights,
    brakeLights,
    sirenBar,
    driverAnchor,
    npcDriverGroup,
    playerDriverGroup,
    driverPose,
    steeringWheel,
    name,
    maxSpeed,
    accel,
    turnRate,
    maxHealth,
    halfLength
  };
}
