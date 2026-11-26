import * as THREE from 'three';
import type { AgentFaction, EnemyArchetype } from '../ai/EnemyAI';

export interface NPCRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  muzzleTip: THREE.Object3D;
  hasGun: boolean;
  hpBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
}

const sharedHpBgGeo = new THREE.PlaneGeometry(0.95, 0.11);
const sharedHpFillGeo = new THREE.PlaneGeometry(0.91, 0.08);
const sharedHpBgMat = new THREE.MeshBasicMaterial({ color: 0x0c111d, side: THREE.DoubleSide });

/**
 * Builds sculpted, articulated 3D humanoids for Bengaluru rival crews,
 * Metro Tactical Patrol officers, bosses, brutes, and ambient pedestrians.
 */
export function buildNPCCharacter(
  faction: AgentFaction,
  archetype: EnemyArchetype,
  coatHex: number,
  seed: number
): NPCRig {
  const root = new THREE.Group();

  const skinTones = [0xb9825c, 0xa8714b, 0xc99672, 0x935e3c];
  const skinMat = new THREE.MeshStandardMaterial({ color: skinTones[seed % skinTones.length], roughness: 0.68 });
  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.56, metalness: faction === 'police' ? 0.18 : 0.08 });
  const innerMat = new THREE.MeshStandardMaterial({
    color: faction === 'police' ? 0x0f172a : archetype === 'boss' ? 0x111318 : 0x2a2f3a,
    roughness: 0.8
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: faction === 'police' ? 0x172554 : 0x262932,
    roughness: 0.86
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1512, roughness: 0.84 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.78 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.35, metalness: 0.82 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.7 });

  const hips = new THREE.Group();
  hips.position.y = 0.91;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.23), pantsMat);
  hips.add(pelvis);

  const torso = new THREE.Group();
  torso.position.y = 0.05;
  hips.add(torso);

  // Tapered athletic torso jacket / vest / kurta
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.18, 0.54, 12), coatMat);
  chest.scale.set(1.14, 1, 0.76);
  chest.position.y = 0.28;
  chest.castShadow = true;
  torso.add(chest);

  const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.17), innerMat);
  innerShirt.position.set(0, 0.28, -0.09);
  torso.add(innerShirt);

  // Archetype distinct armor / uniform / boss details
  if (faction === 'police') {
    const tacVest = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.31), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 }));
    tacVest.position.y = 0.32;
    torso.add(tacVest);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03), goldMat);
    badge.position.set(0.11, 0.42, -0.165);
    torso.add(badge);
  } else if (archetype === 'brute') {
    const armor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.36), innerMat);
    armor.position.y = 0.33;
    torso.add(armor);
    for (const sx of [-0.28, 0.28]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), coatMat);
      pad.position.set(sx, 0.49, 0);
      torso.add(pad);
    }
  } else if (archetype === 'boss') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 12), goldMat);
    collar.position.y = 0.56;
    torso.add(collar);
    const longCoat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.46, 12, 1, true, -Math.PI * 0.65, Math.PI * 1.3), coatMat);
    longCoat.position.y = -0.14;
    torso.add(longCoat);
  } else if (faction === 'rival') {
    // Crew bandana scarf around neck
    const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.09, 10), coatMat);
    scarf.position.y = 0.54;
    torso.add(scarf);
  }

  // Head + Neck + Facial Feature Strip
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.55, 0);
  torso.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.078, 0.11, 8), skinMat);
  neck.position.y = 0.05;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), skinMat);
  head.scale.set(0.92, 1.1, 0.96);
  head.position.y = 0.2;
  head.castShadow = true;
  headGroup.add(head);

  // Subtle dark shades / eyes facing -Z
  const eyeVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.155, 0.038, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.2, metalness: 0.7 })
  );
  eyeVisor.position.set(0, 0.22, -0.105);
  headGroup.add(eyeVisor);

  if (faction === 'police') {
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.122, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }));
    capCrown.position.y = 0.3;
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.12), new THREE.MeshStandardMaterial({ color: 0x0a0f1c }));
    capBrim.position.set(0, 0.26, -0.11);
    headGroup.add(capCrown, capBrim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.124, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.225;
    headGroup.add(hair);
  }

  const muzzleTip = new THREE.Object3D();
  let hasGun = false;

  // Articulated Arms + Realistic Detailed 3D Firearms for ALL Hostile Enemies & Police!
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xbec7d4, roughness: 0.22, metalness: 0.9 });
  const polymerMat = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.72, metalness: 0.18 });
  const woodGripMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.75 });

  const buildArm = (side: -1 | 1): THREE.Group => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.275, 0.46, 0);
    torso.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.28, 8), coatMat);
    upper.position.y = -0.14;
    upper.castShadow = true;
    shoulder.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.27, 8), faction === 'civilian' ? skinMat : coatMat);
    lower.position.y = -0.4;
    shoulder.add(lower);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 6), skinMat);
    hand.position.y = -0.55;
    shoulder.add(hand);

    if (side === 1 && faction !== 'civilian') {
      hasGun = true;
      const wep = new THREE.Group();
      wep.position.set(0, -0.56, -0.04);
      wep.rotation.x = -Math.PI / 2;
      let muzzleZ = -0.34;

      if (archetype === 'grunt') {
        // Real 9mm Street Pistol (slide, steel barrel, polymer frame & grip) so every rival carries a real gun!
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.056, 0.25), gunMat);
        slide.position.set(0, 0.045, -0.09);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), steelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.044, -0.23);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.125, 0.06), polymerMat);
        grip.position.set(0, -0.045, 0.01);
        grip.rotation.x = 0.2;
        wep.add(slide, barrel, grip);
        muzzleZ = -0.28;
      } else if (archetype === 'boss') {
        // Gold-Accented Tactical Assault Rifle with optic, curved mag, handguard & steel barrel
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.09, 0.38), gunMat);
        rec.position.set(0, 0.05, -0.14);
        const goldRail = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.026, 0.36), goldMat);
        goldRail.position.set(0, 0.095, -0.18);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 10), steelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.054, -0.5);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.07), goldMat);
        mag.position.set(0, -0.09, -0.2);
        mag.rotation.x = -0.22;
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.2, 10), polymerMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.125, -0.14);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.24), polymerMat);
        stock.position.set(0, 0.035, 0.16);
        wep.add(rec, goldRail, barrel, mag, scope, stock);
        muzzleZ = -0.7;
      } else if (archetype === 'brute') {
        // Heavy Pump-Action Combat Shotgun (receiver, twin barrel/tube, wooden pump & stock)
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.088, 0.3), gunMat);
        rec.position.set(0, 0.048, -0.1);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.07, -0.46);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 8), steelMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0, 0.034, -0.42);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.065, 0.2), woodGripMat);
        pump.position.set(0, 0.03, -0.36);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.095, 0.26), woodGripMat);
        stock.position.set(0, 0.028, 0.16);
        wep.add(rec, barrel, tube, pump, stock);
        muzzleZ = -0.76;
      } else {
        // Detailed Compact SMG / Police Carbine (receiver, suppressor/barrel, vertical grip, extended mag)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.086, 0.36), gunMat);
        body.position.set(0, 0.048, -0.13);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 10), steelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.05, -0.4);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.115, 0.055), polymerMat);
        grip.position.set(0, -0.042, 0.0);
        grip.rotation.x = 0.2;
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.21, 0.048), gunMat);
        mag.position.set(0, -0.095, -0.14);
        mag.rotation.x = -0.14;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.078, 0.2), polymerMat);
        stock.position.set(0, 0.04, 0.14);
        wep.add(body, barrel, grip, mag, stock);
        muzzleZ = -0.54;
      }

      muzzleTip.position.set(0, 0.05, muzzleZ);
      wep.add(muzzleTip);
      shoulder.add(wep);
    }

    return shoulder;
  };

  const leftShoulder = buildArm(-1);
  const rightShoulder = buildArm(1);

  // Articulated Legs (Hips + Knees + Boots)
  const buildLeg = (side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.06, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.41, 8), pantsMat);
    thigh.position.y = -0.205;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.41;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.064, 0.37, 8), pantsMat);
    shin.position.y = -0.185;
    shin.castShadow = true;
    knee.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.24), bootMat);
    boot.position.set(0, -0.41, -0.035);
    knee.add(boot);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // Floating Health Bar
  const hpBg = new THREE.Mesh(sharedHpBgGeo, sharedHpBgMat);
  hpBg.position.y = 2.22;
  const hpFillMat = new THREE.MeshBasicMaterial({
    color: faction === 'police' ? 0x3b82f6 : archetype === 'boss' ? 0xfacc15 : 0xef4444,
    side: THREE.DoubleSide
  });
  const hpBarFill = new THREE.Mesh(sharedHpFillGeo, hpFillMat);
  hpBarFill.position.set(0, 2.22, 0.012);
  if (faction === 'civilian') {
    hpBg.visible = false;
    hpBarFill.visible = false;
  }
  root.add(hpBg, hpBarFill);

  return {
    root,
    hips,
    torso,
    headGroup,
    leftShoulder,
    rightShoulder,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    muzzleTip,
    hasGun,
    hpBg,
    hpBarFill
  };
}
