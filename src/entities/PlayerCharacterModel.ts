import * as THREE from 'three';
import {
  CharacterLoadout,
  DEFAULT_LOADOUT,
  DressId,
  FaceId,
  PantsId,
  ShoesId
} from './CustomizationData';

export interface ArticulatedCharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightWrist: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  weaponMount: THREE.Group;
  pocketHolster: THREE.Group;
  backHolster: THREE.Group;
  leftWing?: THREE.Group;
  rightWing?: THREE.Group;
  ribbonTail?: THREE.Group;
}

interface DressPalette {
  outerHex: number;
  trimHex: number;
  darkHex: number;
  innerHex: number;
  teeHex: number;
  hemHex: number;
  glowHex?: number;
  shortSleeves: boolean; // Pushed-up forearms vs full-length sleeves
  isArmored?: boolean;
  isBlazer?: boolean;
  isHoodie?: boolean;
  hasDoveWings?: boolean;
}

const DRESS_PALETTES: Record<DressId, DressPalette> = {
  seraph_crimson:{ outerHex: 0x6b141c, trimHex: 0x991b1b, darkHex: 0x3f0a10, innerHex: 0xf8f3e8, teeHex: 0xfefce8, hemHex: 0xd97706, glowHex: 0xfbbf24, shortSleeves: false, isBlazer: true, hasDoveWings: true },
  cognac_bomber: { outerHex: 0x8f5026, trimHex: 0xa66235, darkHex: 0x5c3116, innerHex: 0x4b5159, teeHex: 0xedeae2, hemHex: 0x34383f, shortSleeves: true },
  cyber_dj:      { outerHex: 0x151b28, trimHex: 0x222b3d, darkHex: 0x0b0f18, innerHex: 0x1e293b, teeHex: 0x0f172a, hemHex: 0x1e293b, glowHex: 0x38e8ff, shortSleeves: true },
  crimson_hoodie:{ outerHex: 0xc81e1e, trimHex: 0x991b1b, darkHex: 0x18181b, innerHex: 0x1e2028, teeHex: 0x18181b, hemHex: 0x18181b, glowHex: 0xff4757, shortSleeves: false, isHoodie: true },
  gold_blazer:   { outerHex: 0xf1f5f9, trimHex: 0xe2e8f0, darkHex: 0xcbd5e1, innerHex: 0x111827, teeHex: 0x111827, hemHex: 0x1e293b, glowHex: 0xfacc15, shortSleeves: false, isBlazer: true },
  viper_biker:   { outerHex: 0x6b21a8, trimHex: 0x9333ea, darkHex: 0x3b0764, innerHex: 0x1e1b2e, teeHex: 0x18181b, hemHex: 0x1e1b2e, glowHex: 0xf472b6, shortSleeves: true },
  tactical_armor:{ outerHex: 0x2f3b32, trimHex: 0x3e4d41, darkHex: 0x1c241e, innerHex: 0x1f2421, teeHex: 0x262e28, hemHex: 0x1a1f1c, glowHex: 0x22c55e, shortSleeves: false, isArmored: true },
  royal_kurta:   { outerHex: 0x1d4ed8, trimHex: 0x2563eb, darkHex: 0x1e3a8a, innerHex: 0x172554, teeHex: 0xfef3c7, hemHex: 0xf59e0b, glowHex: 0xfbbf24, shortSleeves: false, isBlazer: true },
  arctic_trench: { outerHex: 0xdce4ed, trimHex: 0x94a3b8, darkHex: 0x475569, innerHex: 0x1e293b, teeHex: 0x0f172a, hemHex: 0x334155, glowHex: 0x38bdf8, shortSleeves: false }
};

interface PantsPalette {
  baseHex: string;
  stripeHex?: number;
  hasCargoPockets: boolean;
}

const PANTS_PALETTES: Record<PantsId, PantsPalette> = {
  seraph_ivory:   { baseHex: '#ebe5d8', stripeHex: 0xfbbf24, hasCargoPockets: false },
  olive_cargo:    { baseHex: '#47403a', hasCargoPockets: true },
  cyber_joggers:  { baseHex: '#151a24', stripeHex: 0x38e8ff, hasCargoPockets: false },
  midnight_jeans: { baseHex: '#1e304f', hasCargoPockets: false },
  kingpin_slacks: { baseHex: '#252932', stripeHex: 0xfacc15, hasCargoPockets: false },
  desert_camo:    { baseHex: '#8d7b5c', hasCargoPockets: true },
  viper_track:    { baseHex: '#1b1628', stripeHex: 0xc084fc, hasCargoPockets: false }
};

interface ShoesPalette {
  bodyHex: number;
  collarHex: number;
  soleHex: number;
  soleGlowHex?: number;
  accentHex?: number;
}

const SHOES_PALETTES: Record<ShoesId, ShoesPalette> = {
  seraph_wings:  { bodyHex: 0xf8f5ee, collarHex: 0x7f1d1d, soleHex: 0xfbbf24, soleGlowHex: 0xf59e0b, accentHex: 0xfbbf24 },
  rust_boots:    { bodyHex: 0x7b4520, collarHex: 0x3b2618, soleHex: 0x181a1f },
  neon_sneakers: { bodyHex: 0x161c2a, collarHex: 0x243047, soleHex: 0x38e8ff, soleGlowHex: 0x38e8ff, accentHex: 0x38e8ff },
  crimson_kicks: { bodyHex: 0xdc2626, collarHex: 0x18181b, soleHex: 0xf8fafc, accentHex: 0xf8fafc },
  stealth_boots: { bodyHex: 0x1c2026, collarHex: 0x111418, soleHex: 0x0b0d10 },
  gold_loafers:  { bodyHex: 0x1a1715, collarHex: 0x292524, soleHex: 0x0f0e0d, accentHex: 0xfacc15 },
  viper_racers:  { bodyHex: 0x7e22ce, collarHex: 0x1e1b2e, soleHex: 0xf8fafc, soleGlowHex: 0xf472b6, accentHex: 0xf472b6 }
};

/**
 * Builds a fully customizable Free Fire-style articulated 3D protagonist supporting
 * 6 Faces/Headgear × 8 Dresses/Jackets × 6 Pants × 6 Shoes (1,728 unique combos!).
 */
export function buildProtagonistCharacter(loadout: CharacterLoadout = DEFAULT_LOADOUT): ArticulatedCharacterRig {
  const root = new THREE.Group();
  const dress = DRESS_PALETTES[loadout.dressId] || DRESS_PALETTES.cognac_bomber;
  const pants = PANTS_PALETTES[loadout.pantsId] || PANTS_PALETTES.olive_cargo;
  const shoes = SHOES_PALETTES[loadout.shoesId] || SHOES_PALETTES.rust_boots;

  const skinHex = loadout.faceId === 'hero_portrait' ? 0xd4a483 : 0xc48b63;
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.6, metalness: 0.03 });
  const jacketMat = createJacketMaterial(dress.outerHex);
  const trimMat = new THREE.MeshStandardMaterial({ color: dress.trimHex, roughness: 0.44, metalness: 0.14 });
  const darkMat = new THREE.MeshStandardMaterial({ color: dress.darkHex, roughness: 0.52, metalness: 0.12 });
  const innerMat = new THREE.MeshStandardMaterial({ color: dress.innerHex, roughness: 0.82 });
  const teeMat = new THREE.MeshStandardMaterial({ color: dress.teeHex, roughness: 0.86 });
  const hemMat = new THREE.MeshStandardMaterial({ color: dress.hemHex, roughness: 0.88 });
  const neonMat = dress.glowHex
    ? new THREE.MeshStandardMaterial({
        color: dress.glowHex,
        emissive: dress.glowHex,
        emissiveIntensity: 1.5,
        roughness: 0.25
      })
    : null;

  const cargoMat = createPantsMaterial(pants.baseHex, loadout.pantsId === 'desert_camo');
  const stripeMat = pants.stripeHex
    ? new THREE.MeshStandardMaterial({
        color: pants.stripeHex,
        emissive: pants.stripeHex,
        emissiveIntensity: 0.9,
        roughness: 0.3
      })
    : null;

  const watchMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.35, metalness: 0.68 });
  const bootMat = new THREE.MeshStandardMaterial({ color: shoes.bodyHex, roughness: 0.52, metalness: 0.12 });
  const bootCollarMat = new THREE.MeshStandardMaterial({ color: shoes.collarHex, roughness: 0.72 });
  const soleMat = new THREE.MeshStandardMaterial({
    color: shoes.soleHex,
    emissive: shoes.soleGlowHex ?? 0x000000,
    emissiveIntensity: shoes.soleGlowHex ? 1.4 : 0,
    roughness: 0.8
  });

  // --- HIPS / PELVIS ---
  const hips = new THREE.Group();
  hips.position.y = 0.93;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.24), cargoMat);
  pelvis.position.y = -0.02;
  pelvis.castShadow = true;
  hips.add(pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.19, 0.055, 14), hemMat);
  belt.scale.set(1.06, 1, 0.72);
  belt.position.y = 0.055;
  hips.add(belt);

  // Visible tactical hip pocket / holster pouch on right hip (holds stowed sidearm!)
  const pocketPouch = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.145, 0.11), darkMat);
  pocketPouch.position.set(0.205, -0.055, 0.01);
  pocketPouch.rotation.z = -0.1;
  hips.add(pocketPouch);

  const pocketHolster = new THREE.Group();
  pocketHolster.position.set(0.215, -0.02, -0.01);
  // Barrel points cleanly down into hip pocket with grip sticking up ready to draw!
  pocketHolster.rotation.set(-Math.PI * 0.44, 0.12, -0.18);
  hips.add(pocketHolster);

  // --- TORSO (Customizable Free Fire Dress / Jacket / Armor / Blazer / Hoodie) ---
  const torso = new THREE.Group();
  torso.position.y = 0.05;
  hips.add(torso);

  const teeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.172, 0.54, 16), teeMat);
  teeBody.scale.set(1.12, 1, 0.72);
  teeBody.position.y = 0.27;
  teeBody.castShadow = true;
  torso.add(teeBody);

  const teeHem = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.18, 0.07, 14), teeMat);
  teeHem.scale.set(1.1, 1, 0.72);
  teeHem.position.set(0, 0.02, -0.01);
  torso.add(teeHem);

  // Inner zip layer
  for (const side of [-1, 1]) {
    const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.49, 0.18), innerMat);
    innerPanel.position.set(side * 0.125, 0.29, -0.065);
    innerPanel.rotation.y = side * -0.14;
    innerPanel.castShadow = true;
    torso.add(innerPanel);
  }

  // Outer jacket back shell + shoulder yoke
  const jacketBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.215, 0.52, 16, 1, false, -Math.PI * 0.62, Math.PI * 1.24),
    jacketMat
  );
  jacketBack.scale.set(1.12, 1, 0.78);
  jacketBack.position.set(0, 0.28, 0.015);
  jacketBack.castShadow = true;
  torso.add(jacketBack);

  const upperBack = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.18, 0.27), jacketMat);
  upperBack.position.set(0, 0.46, 0.02);
  upperBack.castShadow = true;
  torso.add(upperBack);

  for (const side of [-1, 1]) {
    const frontHalf = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.48, 0.16), jacketMat);
    frontHalf.position.set(side * 0.185, 0.28, -0.075);
    frontHalf.rotation.y = side * -0.18;
    frontHalf.castShadow = true;
    torso.add(frontHalf);

    const waistCuff = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.075, 0.22), hemMat);
    waistCuff.position.set(side * 0.185, 0.055, -0.02);
    torso.add(waistCuff);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.105, 0.025), trimMat);
    pocket.position.set(side * 0.182, 0.365, -0.158);
    pocket.rotation.y = side * -0.18;
    torso.add(pocket);

    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.028, 0.03), darkMat);
    flap.position.set(side * 0.182, 0.415, -0.162);
    flap.rotation.y = side * -0.18;
    torso.add(flap);

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), trimMat);
    shoulderCap.scale.set(1.12, 0.82, 1.05);
    shoulderCap.position.set(side * 0.245, 0.49, 0.0);
    shoulderCap.castShadow = true;
    torso.add(shoulderCap);

    // Free Fire style glowing neon piping / lapel trims!
    if (neonMat) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.48, 0.03), neonMat);
      strip.position.set(side * 0.115, 0.29, -0.155);
      torso.add(strip);

      const shoulderGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.024, 0.05), neonMat);
      shoulderGlow.position.set(side * 0.22, 0.56, 0.0);
      torso.add(shoulderGlow);
    }
  }

  // Outfit-specific 3D accents (Tactical Chest Plate / Hoodie Hood / Gold Blazer Coat Tails)
  if (dress.isArmored) {
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.34), darkMat);
    chestPlate.position.set(0, 0.34, -0.02);
    chestPlate.castShadow = true;
    torso.add(chestPlate);
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.06), trimMat);
      pouch.position.set(p * 0.1, 0.22, -0.2);
      torso.add(pouch);
    }
  } else if (dress.isBlazer) {
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.24, 0.26, 14, 1, true, -Math.PI * 0.68, Math.PI * 1.36),
      jacketMat
    );
    tail.position.set(0, -0.08, 0.01);
    torso.add(tail);
  } else if (dress.isHoodie) {
    const hoodBack = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), jacketMat);
    hoodBack.scale.set(1.15, 0.72, 0.85);
    hoodBack.position.set(0, 0.56, 0.1);
    torso.add(hoodBack);
  }

  // Glowing back emblem strip on Neon / Cyber / Viper jackets (iconic Free Fire back view!)
  let leftWing: THREE.Group | undefined;
  let rightWing: THREE.Group | undefined;
  let ribbonTail: THREE.Group | undefined;

  if (dress.hasDoveWings) {
    // Sculpted layered white dove-feather wings + flowing crimson silk ribbon inspired by the reference artwork!
    const featherWhite = new THREE.MeshStandardMaterial({
      color: 0xfffdf7,
      emissive: 0xffe8b6,
      emissiveIntensity: 0.25,
      roughness: 0.42
    });
    const goldAccent = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.78
    });
    const crimsonSilk = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x450a0a,
      emissiveIntensity: 0.25,
      roughness: 0.38,
      side: THREE.DoubleSide
    });

    const buildWing = (side: -1 | 1): THREE.Group => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.12, 0.44, 0.16);
      // 7 sculpted layered primary & secondary dove feathers fanning gracefully outward
      for (let f = 0; f < 7; f++) {
        const len = 0.64 - f * 0.055;
        const w = 0.095 - f * 0.006;
        const feather = new THREE.Mesh(new THREE.BoxGeometry(len, w, 0.022), f === 0 ? goldAccent : featherWhite);
        feather.position.set(side * (len * 0.52 + 0.04), 0.16 - f * 0.075, 0.06 + f * 0.014);
        feather.rotation.z = side * (0.42 - f * 0.16);
        feather.rotation.y = side * (-0.36 - f * 0.03);
        feather.castShadow = true;
        wg.add(feather);
      }
      return wg;
    };

    leftWing = buildWing(-1);
    rightWing = buildWing(1);
    torso.add(leftWing, rightWing);

    // Flowing crimson silk ribbon scarf trailing elegantly behind shoulder
    ribbonTail = new THREE.Group();
    ribbonTail.position.set(-0.14, 0.52, 0.14);
    for (let r = 0; r < 5; r++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.11 - r * 0.012, 0.22, 0.016), crimsonSilk);
      seg.position.set(-r * 0.04, -r * 0.18 - 0.1, 0.05 + r * 0.075);
      seg.rotation.x = 0.38 + r * 0.08;
      seg.rotation.z = -0.18 - r * 0.04;
      ribbonTail.add(seg);
    }
    torso.add(ribbonTail);
  } else if (neonMat) {
    const backV = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), neonMat);
    backV.scale.set(1.2, 1.35, 0.16);
    backV.position.set(0, 0.36, 0.185);
    torso.add(backV);
  }

  const backHem = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.075, 0.12), hemMat);
  backHem.position.set(0, 0.055, 0.12);
  torso.add(backHem);

  // Back sling mount for holstered long guns (SMG, Shotgun, Rifle, Sniper, LMG, Launcher)
  const backHolster = new THREE.Group();
  backHolster.position.set(0.06, 0.34, 0.195);
  backHolster.rotation.set(0.32, Math.PI * 0.5, 0.55);
  torso.add(backHolster);

  // Standing collar + lapels
  const collarBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.135, 0.145, 0.14, 14, 1, true, -Math.PI * 0.65, Math.PI * 1.3),
    trimMat
  );
  collarBack.position.set(0, 0.585, 0.02);
  collarBack.castShadow = true;
  torso.add(collarBack);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 0.03), jacketMat);
    lapel.position.set(side * 0.125, 0.575, -0.07);
    lapel.rotation.set(0.18, side * 0.52, side * -0.25);
    torso.add(lapel);
  }

  // --- NECK & CUSTOMIZABLE HEAD / FACE / HEADGEAR ---
  const headGroup = buildFaceAndHead(loadout.faceId, skinMat);
  headGroup.position.set(0, 0.56, -0.01);
  torso.add(headGroup);

  // --- ARMS ---
  const buildArm = (side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group; handMount: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.285, 0.47, 0);
    torso.add(shoulder);

    const upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.082, 0.29, 12), jacketMat);
    upperSleeve.position.y = -0.145;
    upperSleeve.castShadow = true;
    shoulder.add(upperSleeve);

    const fold1 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.022, 8, 14), trimMat);
    fold1.rotation.x = Math.PI / 2;
    fold1.position.y = -0.23;
    shoulder.add(fold1);

    const fold2 = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.02, 8, 14), darkMat);
    fold2.rotation.x = Math.PI / 2;
    fold2.position.y = -0.275;
    shoulder.add(fold2);

    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);

    const forearmMat = dress.shortSleeves ? skinMat : jacketMat;
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(dress.shortSleeves ? 0.056 : 0.072, dress.shortSleeves ? 0.044 : 0.058, 0.26, 12),
      forearmMat
    );
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    elbow.add(forearm);

    if (neonMat && !dress.shortSleeves) {
      const cuffGlow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 6, 12), neonMat);
      cuffGlow.rotation.x = Math.PI / 2;
      cuffGlow.position.y = -0.24;
      elbow.add(cuffGlow);
    }

    if (side === -1) {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.042, 12), watchMat);
      strap.position.y = -0.22;
      elbow.add(strap);
      const dial = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.046, 0.022), neonMat || watchMat);
      dial.position.set(-0.045, -0.22, -0.01);
      elbow.add(dial);
    }

    const wrist = new THREE.Group();
    wrist.position.set(0, -0.26, 0);
    elbow.add(wrist);

    const handMat = dress.isArmored ? darkMat : skinMat;
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.095, 0.048), handMat);
    palm.position.set(0, -0.04, -0.005);
    palm.castShadow = true;
    wrist.add(palm);

    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.055, 0.042), handMat);
    fingers.position.set(0, -0.095, -0.015);
    fingers.rotation.x = 0.42;
    wrist.add(fingers);

    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.03), handMat);
    thumb.position.set(-side * 0.042, -0.05, -0.028);
    thumb.rotation.z = side * 0.3;
    wrist.add(thumb);

    const handMount = new THREE.Group();
    handMount.position.set(0, -0.075, -0.028);
    handMount.rotation.x = -Math.PI / 2;
    wrist.add(handMount);

    return { shoulder, elbow, wrist, handMount };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // --- LEGS (Customizable Pants + Shoes / LED Sneakers / Combat Boots) ---
  const buildLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.118, -0.06, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.09, 0.42, 12), cargoMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hip.add(thigh);

    if (pants.hasCargoPockets) {
      const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.155, 0.12), cargoMat);
      cargoPocket.position.set(side * 0.102, -0.23, 0.0);
      cargoPocket.castShadow = true;
      hip.add(cargoPocket);
      const pocketFlap = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.034, 0.125), hemMat);
      pocketFlap.position.set(side * 0.104, -0.155, 0.0);
      hip.add(pocketFlap);
    }

    if (stripeMat) {
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.38, 0.035), stripeMat);
      sideStripe.position.set(side * 0.102, -0.21, 0);
      hip.add(sideStripe);
    }

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.074, 0.37, 12), cargoMat);
    shin.position.y = -0.185;
    shin.castShadow = true;
    knee.add(shin);

    if (stripeMat) {
      const shinStripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.032), stripeMat);
      shinStripe.position.set(side * 0.084, -0.18, 0);
      knee.add(shinStripe);
    }

    const ankleCuff = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.018, 8, 12), cargoMat);
    ankleCuff.rotation.x = Math.PI / 2;
    ankleCuff.position.y = -0.35;
    knee.add(ankleCuff);

    // Customizable Footwear (Boots / LED High-Top Sneakers / Loafers / Racers)
    const bootUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.074, 0.11, 12), bootCollarMat);
    bootUpper.position.set(0, -0.39, 0.005);
    bootUpper.castShadow = true;
    knee.add(bootUpper);

    const bootBody = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.088, 0.255), bootMat);
    bootBody.position.set(0, -0.435, -0.042);
    bootBody.castShadow = true;
    knee.add(bootBody);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), bootMat);
    toeCap.scale.set(1.0, 0.68, 1.18);
    toeCap.position.set(0, -0.44, -0.155);
    knee.add(toeCap);

    const accentMat = shoes.accentHex
      ? new THREE.MeshStandardMaterial({
          color: shoes.accentHex,
          emissive: shoes.soleGlowHex ?? 0x000000,
          emissiveIntensity: shoes.soleGlowHex ? 0.8 : 0,
          roughness: 0.4
        })
      : bootCollarMat;

    const laces = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.026, 0.11), accentMat);
    laces.position.set(0, -0.392, -0.075);
    laces.rotation.x = 0.28;
    knee.add(laces);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.138, 0.036, 0.298), soleMat);
    sole.position.set(0, -0.478, -0.052);
    knee.add(sole);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    hips,
    torso,
    headGroup,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightWrist: rightArm.wrist,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    weaponMount: rightArm.handMount,
    pocketHolster,
    backHolster,
    leftWing,
    rightWing,
    ribbonTail
  };
}

function buildFaceAndHead(faceId: FaceId, skinMat: THREE.MeshStandardMaterial): THREE.Group {
  const headGroup = new THREE.Group();

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.08, 0.13, 12), skinMat);
  neck.position.y = 0.055;
  neck.castShadow = true;
  headGroup.add(neck);

  const faceMat = createFaceMaterial(faceId);
  const headGeo = new THREE.SphereGeometry(0.126, 28, 22);
  headGeo.scale(0.92, 1.13, 0.98);
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.position.set(0, 0.215, -0.005);
  headMesh.rotation.y = Math.PI / 2;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 6), skinMat);
  nose.rotation.x = -Math.PI * 0.42;
  nose.position.set(0, 0.202, -0.124);
  headGroup.add(nose);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), skinMat);
    ear.scale.set(0.48, 1.15, 0.72);
    ear.position.set(side * 0.114, 0.205, 0.0);
    headGroup.add(ear);
  }

  if (faceId === 'seraph_halo') {
    // Ethereal snowy-ivory swept hair + luminous pearl orb + floating golden halo ring!
    const ivoryHair = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.55, metalness: 0.08 });
    const goldHalo = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.9,
      roughness: 0.18,
      metalness: 0.85
    });
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe4b5,
      emissiveIntensity: 1.4,
      roughness: 0.12
    });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), ivoryHair);
    crown.scale.set(0.96, 1.06, 1.04);
    crown.position.set(0, 0.238, 0.008);
    headGroup.add(crown);

    const hairSweep = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.24, 8), ivoryHair);
    hairSweep.position.set(0, 0.21, 0.145);
    hairSweep.rotation.x = 0.62;
    headGroup.add(hairSweep);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 28), goldHalo);
    halo.rotation.x = Math.PI / 2 - 0.18;
    halo.position.set(0, 0.39, 0.02);
    headGroup.add(halo);

    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), pearlMat);
    pearl.position.set(0, 0.365, -0.115);
    headGroup.add(pearl);
  } else if (faceId === 'hero_portrait') {
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xd8cba8, roughness: 0.72, metalness: 0.06 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x3a404a, roughness: 0.35, metalness: 0.65 });
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0xc2934b, roughness: 0.35, metalness: 0.7 });

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.123, 0.125, 0.046, 22, 1, true), bandMat);
    band.scale.set(0.94, 1, 1.0);
    band.position.set(0, 0.272, -0.004);
    headGroup.add(band);

    const emblemRing = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.014, 16), emblemMat);
    emblemRing.rotation.x = Math.PI / 2;
    emblemRing.position.set(0, 0.272, -0.126);
    headGroup.add(emblemRing);

    const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.129, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
    hairCrown.scale.set(0.96, 1.04, 1.02);
    hairCrown.position.set(0, 0.242, 0.004);
    headGroup.add(hairCrown);

    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), hairMat);
    hairBack.scale.set(0.94, 0.94, 0.84);
    hairBack.position.set(0, 0.23, 0.036);
    headGroup.add(hairBack);

    const spikeGeo = new THREE.ConeGeometry(0.028, 0.115, 6);
    const spikeSpecs: Array<[number, number, number, number, number, number]> = [
      [-0.088, 0.305, -0.095, 2.55, 0, 0.35],
      [-0.048, 0.318, -0.112, 2.65, 0, 0.15],
      [0.0, 0.322, -0.116, 2.7, 0, 0.0],
      [0.052, 0.318, -0.112, 2.65, 0, -0.18],
      [0.09, 0.304, -0.095, 2.55, 0, -0.38],
      [-0.095, 0.355, -0.02, -0.2, 0, 0.65],
      [0.095, 0.355, -0.02, -0.2, 0, -0.65],
      [-0.045, 0.375, 0.01, -0.3, 0, 0.28],
      [0.045, 0.375, 0.01, -0.3, 0, -0.28],
      [0.0, 0.382, 0.025, -0.42, 0, 0.0]
    ];
    for (const [sx, sy, sz, rx, ry, rz] of spikeSpecs) {
      const spike = new THREE.Mesh(spikeGeo, hairMat);
      spike.position.set(sx, sy, sz);
      spike.rotation.set(rx, ry, rz);
      headGroup.add(spike);
    }
  } else if (faceId === 'specops_helmet') {
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1e2620, roughness: 0.48, metalness: 0.35 });
    const nvgGlow = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.2 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
    dome.position.set(0, 0.245, 0.0);
    dome.castShadow = true;
    headGroup.add(dome);
    for (const sx of [-0.045, 0.045]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10), helmetMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(sx, 0.245, -0.145);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 10), nvgGlow);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(sx, 0.245, -0.192);
      headGroup.add(tube, lens);
    }
  } else {
    const darkHair = new THREE.MeshStandardMaterial({
      color: faceId === 'cyber_visor' ? 0x181c28 : 0x241a14,
      roughness: 0.78
    });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), darkHair);
    crown.scale.set(0.95, 1.08, 1.02);
    crown.position.set(0, 0.232, 0.005);
    headGroup.add(crown);

    const quiff = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.068, 0.155), darkHair);
    quiff.position.set(0, 0.335, -0.02);
    quiff.rotation.x = -0.14;
    headGroup.add(quiff);

    if (faceId === 'cyber_visor') {
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x38e8ff,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.8,
        roughness: 0.15,
        metalness: 0.7
      });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.054, 0.09), visorMat);
      visor.position.set(0, 0.228, -0.098);
      headGroup.add(visor);
    } else if (faceId === 'kingpin_shades') {
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.9 });
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.12, metalness: 0.8 });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.02), goldMat);
      bridge.position.set(0, 0.236, -0.122);
      headGroup.add(bridge);
      for (const sx of [-0.048, 0.048]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.048, 0.022), lensMat);
        lens.position.set(sx, 0.224, -0.12);
        headGroup.add(lens);
      }
    } else if (faceId === 'shadow_mask') {
      const maskMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 });
      const mask = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.106, 0.095, 16, 1, false, Math.PI * 0.52, Math.PI * 0.96), maskMat);
      mask.position.set(0, 0.165, -0.012);
      headGroup.add(mask);
      // Sleek tactical ponytail at back
      const pony = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.24, 8), darkHair);
      pony.position.set(0, 0.18, 0.155);
      pony.rotation.x = 0.55;
      headGroup.add(pony);
    }
  }

  return headGroup;
}

function createJacketMaterial(hex: number): THREE.MeshStandardMaterial {
  const base = new THREE.Color(hex);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  const r = Math.round(base.r * 255);
  const g = Math.round(base.g * 255);
  const b = Math.round(base.b * 255);
  for (let i = 0; i < 2000; i++) {
    const d = ((i * 53) % 28) - 14;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + d))},${Math.max(0, Math.min(255, g + d))},${Math.max(0, Math.min(255, b + d))})`;
    ctx.fillRect((i * 71) % 256, (i * 113) % 256, 3, 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let y = 26; y < 256; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.46, metalness: 0.1 });
}

function createPantsMaterial(baseHex: string, camo: boolean): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  if (camo) {
    const blobs = ['#6e5e44', '#a89675', '#4c4333'];
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = blobs[i % blobs.length];
      ctx.beginPath();
      ctx.ellipse((i * 37) % 128, (i * 59) % 128, 18, 11, i, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let y = 0; y < 128; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, y, 128, 1);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.84, metalness: 0.03 });
}

function createFaceMaterial(faceId: FaceId): THREE.MeshStandardMaterial {
  if (faceId === 'hero_portrait') {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    const drawBase = () => {
      ctx.fillStyle = '#d29f7e';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#cfc19e';
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = '#3a404a';
      ctx.fillRect(0, 118, 1024, 54);
    };
    drawBase();

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 16;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawBase();
      const sx = Math.round(img.width * 0.04);
      const sw = Math.round(img.width * 0.92);
      const sy = Math.round(img.height * 0.11);
      const sh = Math.round(img.height * 0.69);
      const destW = 310;
      const destH = 326;
      const destX = 512 - destW / 2;
      const destY = 102;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(512, destY + destH * 0.5, destW * 0.49, destH * 0.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, destX, destY, destW, destH);
      ctx.restore();

      const edgeGrad = ctx.createRadialGradient(512, destY + destH * 0.52, destW * 0.34, 512, destY + destH * 0.52, destW * 0.52);
      edgeGrad.addColorStop(0, 'rgba(210, 159, 126, 0)');
      edgeGrad.addColorStop(1, 'rgba(210, 159, 126, 0.92)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(destX - 10, destY - 10, destW + 20, destH + 20);
      map.needsUpdate = true;
    };
    img.src = `${import.meta.env.BASE_URL || './'}textures/hero-face.jpg`;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.58, metalness: 0.04 });
  }

  // Crisp stylized face texture for the other 5 selectable faces
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const cx = 256;
  ctx.fillStyle = '#c89068';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#241811';
  ctx.fillRect(0, 0, 512, 64);

  // Eyebrows & fierce eyes
  ctx.fillStyle = '#1f1510';
  ctx.fillRect(cx - 42, 102, 32, 7);
  ctx.fillRect(cx + 10, 102, 32, 7);
  for (const sx of [-26, 26]) {
    ctx.fillStyle = '#f5f2ed';
    ctx.beginPath();
    ctx.ellipse(cx + sx, 118, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = faceId === 'shadow_mask' ? '#991b1b' : faceId === 'seraph_halo' ? '#f59e0b' : '#2a1a10';
    ctx.beginPath();
    ctx.arc(cx + sx, 118, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (faceId === 'fixer_beard' || faceId === 'kingpin_shades') {
    ctx.fillStyle = 'rgba(36, 24, 16, 0.88)';
    ctx.beginPath();
    ctx.ellipse(cx, 186, 56, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#21150e';
    ctx.fillRect(cx - 22, 149, 44, 8);
  }
  ctx.fillStyle = '#9c5f4c';
  ctx.fillRect(cx - 14, 161, 28, 6);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.03 });
}
