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

  // Articulated Arms + Archetype Held Weapon
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
      const wep = new THREE.Group();
      wep.position.set(0, -0.56, -0.05);
      wep.rotation.x = -Math.PI / 2;
      if (archetype === 'grunt') {
        const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.04, 0.72, 8), new THREE.MeshStandardMaterial({ color: 0xc9965b, roughness: 0.7 }));
        bat.rotation.x = Math.PI / 2;
        bat.position.z = -0.32;
        wep.add(bat);
      } else if (archetype === 'boss') {
        const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.78), gunMat);
        rifle.position.z = -0.32;
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.04, 0.44), goldMat);
        trim.position.z = -0.26;
        wep.add(rifle, trim);
      } else if (archetype === 'brute') {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.72), gunMat);
        sg.position.z = -0.3;
        wep.add(sg);
      } else {
        const smg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.095, 0.42), gunMat);
        smg.position.z = -0.18;
        wep.add(smg);
      }
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
    hpBg,
    hpBarFill
  };
}
