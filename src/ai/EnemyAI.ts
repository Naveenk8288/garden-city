import * as THREE from 'three';
import { BENGALURU_ZONES, ZoneId, getZoneAtWorldPos } from '../world/bengaluruData';
import { ChunkStreamer } from '../world/ChunkStreamer';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { VFXSystem } from '../combat/VFXSystem';
import { CombatHitTarget } from '../combat/WeaponSystem';
import { WantedSystem } from './WantedSystem';
import { NPCRig, buildNPCCharacter } from '../entities/NPCCharacterModel';

export type EnemyState = 'patrol' | 'alert' | 'chase' | 'cover' | 'flank' | 'retreat' | 'knockout';
export type EnemyArchetype = 'grunt' | 'shooter' | 'brute' | 'boss';
export type AgentFaction = 'rival' | 'police' | 'civilian';

export interface NPCBark {
  speaker: string;
  en: string;
  kn: string;
  hi: string;
}

const BENGALURU_BARKS: Record<string, NPCBark[]> = {
  rivalAlert: [
    { speaker: 'Rival Crew', en: "Ey macha! Wrong street — you're on our turf!", kn: 'ಏ ಮಚ್ಚಾ! ಇದು ನಮ್ಮ ಏರಿಯಾ — ಹಿಂದೆ ಸರಿ!', hi: 'अरे मच्चा! गलत गली में आ गया, ये हमारा इलाका है!' },
    { speaker: 'Rival Crew', en: 'Boss said drop anyone flashing iron near MG Road!', kn: 'ಬಾಸ್ ಹೇಳಿದ್ದಾರೆ — ಯಾರೇ ಬಂದ್ರೂ ಬಿಡಬೇಡಿ!', hi: 'बॉस ने बोला है — किसी को मत छोड़ो!' },
    { speaker: 'Rival Crew', en: 'Flank left, guru! Pin him by the darshini!', kn: 'ಎಡಗಡೆಯಿಂದ ಸುತ್ತುವರಿ ಗುರು! ಅವನನ್ನು ಹಿಡಿ!', hi: 'बाएं से घेरो गुरु! उसे भागने मत दो!' }
  ],
  police: [
    { speaker: 'Metro Patrol', en: 'City Tactical Patrol! Drop your weapon and freeze!', kn: 'ಸಿಟಿ ಪೆಟ್ರೋಲ್! ಆಯುಧ ಕೆಳಗಿಟ್ಟು ನಿಲ್ಲು!', hi: 'सिटी पेट्रोल! हथियार नीचे डालो और वहीं रुक जाओ!' },
    { speaker: 'Metro Patrol', en: 'Suspect fleeing across the junction — requesting backup!', kn: 'ಶಂಕಿತ ಜಂಕ್ಷನ್ ದಾಟುತ್ತಿದ್ದಾನೆ — ಬ್ಯಾಕಪ್ ಕಳಿಸಿ!', hi: 'संदिग्ध जंक्शन की तरफ भाग रहा है — बैकअप भेजो!' }
  ],
  civilian: [
    { speaker: 'Bengaluru Local', en: 'Ayyo! Look at this rain and traffic again, guru!', kn: 'ಅಯ್ಯೋ! ಮತ್ತೆ ಈ ಮಳೆ ಮತ್ತು ಟ್ರಾಫಿಕ್ ಗುರು!', hi: 'अय्यो! फिर से बारिश और जाम शुरू हो गया गुरु!' },
    { speaker: 'Bengaluru Local', en: 'One filter kaapi before Silk Board eats my evening.', kn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಹೋಗೋ ಮುಂಚೆ ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡಿಯೋಣ.', hi: 'सिल्क बोर्ड के जाम से पहले एक फ़िल्टर कॉफ़ी पी लेते हैं।' },
    { speaker: 'Bengaluru Local', en: 'Run! Gunfire on the main road — call Patrol!', kn: 'ಓಡಿ! ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿನ ದಾಳಿ!', hi: 'भागो! मेन रोड पर गोलीबारी हो रही है!' }
  ]
};

export interface EnemyUnit {
  id: string;
  faction: AgentFaction;
  archetype: EnemyArchetype;
  zoneId: ZoneId;
  missionTag?: string;
  state: EnemyState;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  health: number;
  maxHealth: number;
  fireCooldown: number;
  stateTimer: number;
  hitReactTimer: number;
  hitHeadshot: boolean;
  flankSign: number;
  patrolAnchor: THREE.Vector3;
  patrolTarget: THREE.Vector3;
  knockoutTimer: number;
  ragdollSpin: THREE.Vector3;
  mesh: THREE.Group;
  rig: NPCRig;
  animPhase: number;
}

export class EnemyAIManager {
  public units: EnemyUnit[] = [];
  private scene: THREE.Scene;
  private streamer: ChunkStreamer;
  private physics: PhysicsWorld;
  private vfx: VFXSystem;
  private wanted: WantedSystem;
  private idCounter = 0;
  private spawnTimer = 0;
  private barkCooldown = 0;

  public onPlayerDamaged?: (amount: number, fromPos: THREE.Vector3) => void;
  public onEnemyKnockedOut?: (unit: EnemyUnit) => void;
  public onBark?: (bark: NPCBark) => void;
  public onEnemyShot?: (pos: THREE.Vector3) => void;

  constructor(
    scene: THREE.Scene,
    streamer: ChunkStreamer,
    physics: PhysicsWorld,
    vfx: VFXSystem,
    wanted: WantedSystem
  ) {
    this.scene = scene;
    this.streamer = streamer;
    this.physics = physics;
    this.vfx = vfx;
    this.wanted = wanted;
  }

  public spawnUnit(
    faction: AgentFaction,
    archetype: EnemyArchetype,
    pos: THREE.Vector3,
    zoneId: ZoneId,
    missionTag?: string
  ): EnemyUnit {
    const id = `npc_${++this.idCounter}`;
    const zoneDef = BENGALURU_ZONES.find((z) => z.id === zoneId) || BENGALURU_ZONES[0];

    let coatHex = zoneDef.crewHex;
    let maxHealth = 75;
    let scale = 1.0;

    if (faction === 'police') {
      coatHex = 0x1e3a8a;
      maxHealth = archetype === 'brute' ? 150 : 90;
    } else if (faction === 'civilian') {
      const palette = [0x0d9488, 0xdb2777, 0x3b82f6, 0xd97706, 0x059669, 0x94a3b8];
      coatHex = palette[this.idCounter % palette.length];
      maxHealth = 45;
    } else {
      if (archetype === 'grunt') maxHealth = 70;
      else if (archetype === 'shooter') maxHealth = 85;
      else if (archetype === 'brute') { maxHealth = 175; scale = 1.18; }
      else if (archetype === 'boss') { maxHealth = 400; scale = 1.26; }
    }

    const rig = buildNPCCharacter(faction, archetype, coatHex, this.idCounter);
    rig.root.position.copy(pos);
    rig.root.scale.setScalar(scale);
    this.scene.add(rig.root);

    const unit: EnemyUnit = {
      id,
      faction,
      archetype,
      zoneId,
      missionTag,
      state: 'patrol',
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2,
      health: maxHealth,
      maxHealth,
      fireCooldown: 0.65 + Math.random() * 0.85,
      stateTimer: 1 + Math.random() * 3,
      hitReactTimer: 0,
      hitHeadshot: false,
      flankSign: Math.random() < 0.5 ? -1 : 1,
      patrolAnchor: pos.clone(),
      patrolTarget: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 28, 0, (Math.random() - 0.5) * 28)),
      knockoutTimer: 0,
      ragdollSpin: new THREE.Vector3(),
      mesh: rig.root,
      rig,
      animPhase: Math.random() * 6.28
    };

    this.units.push(unit);
    return unit;
  }

  public clearMissionUnits(tag: string): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      if (this.units[i].missionTag === tag) {
        this.removeUnit(i);
      }
    }
  }

  public alertNearbyOnGunshot(origin: THREE.Vector3, radius = 60): void {
    for (const u of this.units) {
      if (u.state === 'knockout') continue;
      const d = u.position.distanceTo(origin);
      if (d > radius) continue;
      if (u.faction === 'civilian') {
        u.state = 'retreat';
        u.stateTimer = 8;
        this.maybeBark('civilian');
      } else if (u.faction === 'rival' && u.state === 'patrol') {
        u.state = 'alert';
        u.stateTimer = 0.9;
        this.maybeBark('rivalAlert');
      } else if (u.faction === 'police') {
        u.state = 'chase';
        this.maybeBark('police');
      }
    }
  }

  public getCombatTargets(): CombatHitTarget[] {
    const out: CombatHitTarget[] = [];
    for (const u of this.units) {
      if (u.state === 'knockout') continue;
      const scale = u.mesh.scale.x;
      const label =
        u.faction === 'police'
          ? 'METRO PATROL'
          : u.faction === 'civilian'
            ? 'BENGALURU LOCAL'
            : u.archetype === 'boss'
              ? 'CREW BOSS'
              : `RIVAL ${u.archetype.toUpperCase()}`;
      out.push({
        id: u.id,
        label,
        health: u.health,
        maxHealth: u.maxHealth,
        position: u.position,
        radius: 0.48 * scale,
        height: 1.85 * scale,
        applyHit: (dmg, knockDir, knockForce, hs) => this.damageUnit(u, dmg, knockDir, knockForce, hs)
      });
    }
    return out;
  }

  public checkVehicleRamming(vehPos: THREE.Vector3, vehSpeed: number, fwdDir: THREE.Vector3): THREE.Vector3[] {
    const hitPoints: THREE.Vector3[] = [];
    if (Math.abs(vehSpeed) < 2.2) return hitPoints;
    for (const u of this.units) {
      if (u.state === 'knockout') continue;
      const d = Math.hypot(u.position.x - vehPos.x, u.position.z - vehPos.z);
      if (d < 2.35) {
        const dmg = Math.max(12, Math.abs(vehSpeed) * 4.8);
        this.damageUnit(u, dmg, fwdDir, Math.min(20, Math.max(5, Math.abs(vehSpeed))), false);
        hitPoints.push(u.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
      }
    }
    return hitPoints;
  }

  public damageUnit(
    u: EnemyUnit,
    damage: number,
    knockDir: THREE.Vector3,
    knockForce: number,
    isHeadshot = false
  ): void {
    if (u.state === 'knockout') return;
    u.health = Math.max(0, u.health - damage);
    u.velocity.addScaledVector(knockDir, knockForce * 0.55);

    // Visceral stagger & hit reaction!
    u.hitReactTimer = isHeadshot ? 0.42 : 0.28;
    u.hitHeadshot = isHeadshot;
    u.fireCooldown = Math.max(u.fireCooldown, 0.45);

    if (u.faction === 'civilian') {
      this.wanted.reportCrime(45);
      u.state = 'retreat';
    } else if (u.faction === 'police') {
      this.wanted.reportCrime(55);
      u.state = 'chase';
    } else if (u.state === 'patrol' || u.state === 'alert') {
      u.state = 'chase';
    }

    if (u.health > 0 && u.health < u.maxHealth * 0.45 && u.faction !== 'civilian' && u.archetype !== 'brute') {
      u.state = Math.random() < 0.6 ? 'cover' : 'retreat';
      u.stateTimer = 2.8;
    }

    const ratio = Math.max(0.01, u.health / u.maxHealth);
    u.rig.hpBarFill.scale.x = ratio;

    if (u.health <= 0) {
      u.state = 'knockout';
      u.knockoutTimer = 7.0;
      u.velocity.copy(knockDir).multiplyScalar(Math.min(13, knockForce * 0.85)).setY(4.6);
      u.ragdollSpin.set((Math.random() - 0.5) * 6.5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 6.5);
      u.rig.hpBg.visible = false;
      u.rig.hpBarFill.visible = false;
      this.vfx.spawnKnockoutRing(u.position.clone().add(new THREE.Vector3(0, 1.0, 0)), isHeadshot ? 0xff4757 : 0xff9f2e);
      if (u.faction === 'rival') this.wanted.reportCrime(18);
      else if (u.faction === 'police') this.wanted.reportCrime(75);
      this.onEnemyKnockedOut?.(u);
    }
  }

  private maybeBark(poolKey: keyof typeof BENGALURU_BARKS): void {
    if (this.barkCooldown > 0) return;
    const pool = BENGALURU_BARKS[poolKey];
    if (!pool || pool.length === 0) return;
    this.barkCooldown = 5.5;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.onBark?.(pick);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3,
    ownedZones: Set<ZoneId>
  ): { policeHasLOS: boolean } {
    if (this.barkCooldown > 0) this.barkCooldown -= dt;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5;
      this.maintainPopulation(playerPos, ownedZones);
    }

    let policeHasLOS = false;
    const playerInSafeZone = Boolean(this.streamer.getSafeZoneAt(playerPos.x, playerPos.z));

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const distToPlayer = u.position.distanceTo(playerPos);

      if (!u.missionTag && distToPlayer > 175) {
        this.removeUnit(i);
        continue;
      }

      // Stylized multi-joint ragdoll knockout tumble & sprawl
      if (u.state === 'knockout') {
        u.knockoutTimer -= dt;
        u.velocity.y -= 18 * dt;
        u.position.addScaledVector(u.velocity, dt);
        if (u.position.y < 0.22) {
          u.position.y = 0.22;
          u.velocity.multiplyScalar(0.5);
          u.velocity.y = Math.abs(u.velocity.y) * 0.22;
          u.ragdollSpin.multiplyScalar(0.72);
        }
        u.mesh.position.copy(u.position);
        u.mesh.rotation.x = THREE.MathUtils.lerp(u.mesh.rotation.x, Math.PI * 0.48, dt * 6);
        u.mesh.rotation.z += u.ragdollSpin.z * dt * 0.4;
        // Splay limbs dynamically during knockout
        u.rig.leftShoulder.rotation.set(0.4, 0, 1.15);
        u.rig.rightShoulder.rotation.set(-0.3, 0, -1.2);
        u.rig.leftHip.rotation.set(0.25, 0, -0.35);
        u.rig.rightHip.rotation.set(-0.15, 0, 0.35);
        u.rig.leftKnee.rotation.x = -0.4;
        u.rig.rightKnee.rotation.x = -0.3;
        if (u.knockoutTimer <= 0) this.removeUnit(i);
        continue;
      }

      // Billboard overhead healthbar toward camera
      u.rig.hpBg.lookAt(cameraPos);
      u.rig.hpBarFill.lookAt(cameraPos);

      const inSafe = Boolean(this.streamer.getSafeZoneAt(u.position.x, u.position.z));
      const toPlayer = playerPos.clone().sub(u.position);
      toPlayer.y = 0;
      const horizDist = toPlayer.length() || 0.01;
      const dirToPlayer = toPlayer.clone().divideScalar(horizDist);

      u.stateTimer -= dt;
      if (u.hitReactTimer > 0) u.hitReactTimer -= dt;

      let moveVec = new THREE.Vector3();
      let speed = 2.7;

      if (u.faction === 'civilian') {
        if (u.state === 'retreat') {
          moveVec.copy(dirToPlayer).negate();
          speed = 5.4;
          if (u.stateTimer <= 0 && horizDist > 45) u.state = 'patrol';
        } else {
          const toTarget = u.patrolTarget.clone().sub(u.position);
          toTarget.y = 0;
          if (toTarget.length() < 2.2 || u.stateTimer <= 0) {
            u.patrolTarget.copy(u.patrolAnchor).add(new THREE.Vector3((Math.random() - 0.5) * 44, 0, (Math.random() - 0.5) * 44));
            u.stateTimer = 4 + Math.random() * 5;
          } else {
            moveVec.copy(toTarget.normalize());
          }
          if (horizDist < 12 && Math.random() < dt * 0.08) this.maybeBark('civilian');
        }
      } else {
        const isHostile =
          (u.faction === 'police' && this.wanted.stars > 0) ||
          (u.faction === 'rival' && (Boolean(u.missionTag) || !ownedZones.has(u.zoneId)));

        if (u.faction === 'police' && this.wanted.stars > 0 && horizDist < 80) {
          policeHasLOS = true;
        }

        if (!isHostile || playerInSafeZone || inSafe) {
          u.state = 'patrol';
          const toTarget = u.patrolTarget.clone().sub(u.position);
          toTarget.y = 0;
          if (toTarget.length() < 2.5 || u.stateTimer <= 0) {
            u.patrolTarget.copy(u.patrolAnchor).add(new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30));
            u.stateTimer = 3 + Math.random() * 4;
          } else {
            moveVec.copy(toTarget.normalize());
          }
        } else {
          if (u.state === 'patrol' && horizDist < (u.missionTag ? 68 : 32)) {
            u.state = 'alert';
            u.stateTimer = 0.75;
            this.maybeBark(u.faction === 'police' ? 'police' : 'rivalAlert');
          } else if (u.state === 'alert' && u.stateTimer <= 0) {
            u.state = u.archetype === 'grunt' ? 'chase' : Math.random() < 0.45 ? 'flank' : 'chase';
            u.stateTimer = 3.2;
          } else if (u.state === 'chase') {
            if (u.archetype === 'grunt') {
              speed = 5.9;
              moveVec.copy(dirToPlayer);
              if (horizDist < 2.2) {
                moveVec.set(0, 0, 0);
                this.tryEnemyAttack(u, playerPos, horizDist, true);
              }
            } else {
              speed = u.archetype === 'brute' ? 3.8 : 4.9;
              if (horizDist > 24) moveVec.copy(dirToPlayer);
              else if (horizDist < 10) moveVec.copy(dirToPlayer).negate();
              this.tryEnemyAttack(u, playerPos, horizDist, false);
              if (u.stateTimer <= 0) {
                u.state = Math.random() < 0.5 ? 'flank' : 'cover';
                u.flankSign = Math.random() < 0.5 ? -1 : 1;
                u.stateTimer = 2.5 + Math.random() * 2;
              }
            }
          } else if (u.state === 'flank') {
            speed = 5.2;
            const perp = new THREE.Vector3(-dirToPlayer.z * u.flankSign, 0, dirToPlayer.x * u.flankSign);
            moveVec.copy(perp).addScaledVector(dirToPlayer, horizDist > 22 ? 0.45 : -0.1).normalize();
            this.tryEnemyAttack(u, playerPos, horizDist, u.archetype === 'grunt');
            if (u.stateTimer <= 0) {
              u.state = 'chase';
              u.stateTimer = 2.8;
            }
          } else if (u.state === 'cover') {
            speed = 2.2;
            const perp = new THREE.Vector3(-dirToPlayer.z * u.flankSign, 0, dirToPlayer.x * u.flankSign);
            moveVec.copy(perp).multiplyScalar(0.35);
            // Pop up periodically to fire from cover
            if (u.stateTimer < 1.3) {
              this.tryEnemyAttack(u, playerPos, horizDist, false);
            }
            if (u.stateTimer <= 0) {
              u.state = 'flank';
              u.stateTimer = 2.6;
            }
          } else if (u.state === 'retreat') {
            speed = 4.7;
            moveVec.copy(dirToPlayer).negate();
            if (u.stateTimer <= 0 || horizDist > 36) {
              u.state = 'cover';
              u.stateTimer = 2.4;
            }
          }
        }
      }

      // Building-aware wall avoidance via Rapier raycast so NPCs never clip through buildings!
      if (moveVec.lengthSq() > 0.01) {
        const wallProbe = this.physics.castRay(
          new THREE.Vector3(u.position.x, 1.0, u.position.z),
          moveVec,
          1.35
        );
        if (wallProbe && (wallProbe.tag === 'building' || wallProbe.tag === 'landmark' || wallProbe.tag === 'safe_building')) {
          // Slide tangentially around building edge
          const tangent = new THREE.Vector3(-wallProbe.normal.z * u.flankSign, 0, wallProbe.normal.x * u.flankSign);
          moveVec.copy(tangent);
        }
      }

      u.velocity.x = THREE.MathUtils.lerp(u.velocity.x, moveVec.x * speed, dt * 6);
      u.velocity.z = THREE.MathUtils.lerp(u.velocity.z, moveVec.z * speed, dt * 6);
      u.position.x += u.velocity.x * dt;
      u.position.z += u.velocity.z * dt;
      u.position.y = 0;

      if (u.state !== 'patrol' && u.state !== 'retreat' && u.faction !== 'civilian') {
        u.yaw = Math.atan2(-dirToPlayer.x, -dirToPlayer.z);
      } else if (moveVec.lengthSq() > 0.04) {
        u.yaw = Math.atan2(-moveVec.x, -moveVec.z);
      }

      // Multi-joint articulated animation + cover crouch + visceral hit-reaction flinch!
      const spd = Math.hypot(u.velocity.x, u.velocity.z);
      u.animPhase += dt * (spd > 0.5 ? spd * 2.1 : 1.5);
      const stride = spd > 0.5 ? Math.sin(u.animPhase) * 0.52 : 0;
      const kneeFlex = spd > 0.5 ? Math.min(0, -Math.max(0, -Math.cos(u.animPhase)) * 0.7) : -0.05;

      const isDucking = u.state === 'cover' && u.stateTimer > 1.3;
      u.rig.hips.position.y = THREE.MathUtils.lerp(u.rig.hips.position.y, isDucking ? 0.64 : 0.91, dt * 10);
      u.rig.leftHip.rotation.x = isDucking ? 0.55 : stride;
      u.rig.rightHip.rotation.x = isDucking ? 0.45 : -stride;
      u.rig.leftKnee.rotation.x = isDucking ? -1.05 : kneeFlex;
      u.rig.rightKnee.rotation.x = isDucking ? -0.95 : -kneeFlex * 0.5 - 0.05;

      // Hit reaction snapback!
      const flinch = u.hitReactTimer > 0 ? Math.sin((u.hitReactTimer / 0.32) * Math.PI) : 0;
      u.rig.torso.rotation.x = isDucking ? 0.28 : -flinch * 0.42;
      u.rig.headGroup.rotation.x = u.hitHeadshot ? -flinch * 0.75 : -flinch * 0.25;

      if (u.state !== 'patrol' && u.state !== 'retreat' && u.faction !== 'civilian') {
        u.rig.rightShoulder.rotation.x = 1.32 - flinch * 0.6;
        u.rig.leftShoulder.rotation.x = 0.85;
      } else {
        u.rig.rightShoulder.rotation.x = -stride * 0.55;
        u.rig.leftShoulder.rotation.x = stride * 0.55;
      }

      u.mesh.position.copy(u.position);
      u.mesh.rotation.y = u.yaw;
      u.fireCooldown = Math.max(0, u.fireCooldown - dt);
    }

    return { policeHasLOS };
  }

  private tryEnemyAttack(u: EnemyUnit, playerPos: THREE.Vector3, dist: number, melee: boolean): void {
    if (u.fireCooldown > 0 || u.hitReactTimer > 0.1) return;
    if (melee) {
      if (dist > 2.6) return;
      u.fireCooldown = 1.05;
      this.onPlayerDamaged?.(u.archetype === 'brute' ? 16 : 9, u.position);
      return;
    }

    if (dist > 58) return;
    u.fireCooldown = u.archetype === 'boss' ? 0.52 : u.archetype === 'brute' ? 1.15 : 0.95;

    const muzzle = u.position.clone().add(new THREE.Vector3(0, 1.38, 0));
    const targetPt = playerPos.clone().add(new THREE.Vector3(0, 1.15, 0));
    const aimDir = targetPt.clone().sub(muzzle).normalize();

    const wallHit = this.physics.castRay(muzzle, aimDir, dist - 0.5);
    const missSpread = u.archetype === 'boss' ? 0.08 : 0.14;
    const shotEnd = wallHit
      ? wallHit.point
      : targetPt.clone().add(new THREE.Vector3((Math.random() - 0.5) * dist * missSpread, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * dist * missSpread));

    this.vfx.spawnTracer(muzzle, shotEnd, u.faction === 'police' ? 0x60a5fa : 0xff6b35);
    this.vfx.spawnMuzzleFlash(muzzle, false);
    this.onEnemyShot?.(muzzle);

    if (!wallHit && shotEnd.distanceTo(targetPt) < 1.25) {
      const dmg = u.archetype === 'boss' ? 12 : u.archetype === 'brute' ? 14 : 7;
      this.onPlayerDamaged?.(dmg, u.position);
    }
  }

  private maintainPopulation(playerPos: THREE.Vector3, ownedZones: Set<ZoneId>): void {
    const zone = getZoneAtWorldPos(playerPos.x, playerPos.z);
    const roads = this.streamer.getActiveRoadSegments();
    if (roads.length === 0) return;

    let civs = 0;
    let rivals = 0;
    let police = 0;
    for (const u of this.units) {
      if (u.state === 'knockout') continue;
      if (u.faction === 'civilian') civs++;
      else if (u.faction === 'police') police++;
      else if (!u.missionTag) rivals++;
    }

    const pickSpawnPos = (minD: number, maxD: number): THREE.Vector3 | null => {
      for (let tries = 0; tries < 14; tries++) {
        const seg = roads[Math.floor(Math.random() * roads.length)];
        if (seg.bridge) continue;
        const t = Math.random();
        const sx = seg.ax + (seg.bx - seg.ax) * t + (Math.random() - 0.5) * 4;
        const sz = seg.az + (seg.bz - seg.az) * t + (Math.random() - 0.5) * 4;
        const d = Math.hypot(sx - playerPos.x, sz - playerPos.z);
        if (d >= minD && d <= maxD && !this.streamer.getSafeZoneAt(sx, sz)) {
          return new THREE.Vector3(sx, 0, sz);
        }
      }
      return null;
    };

    const targetCivs = Math.min(18, Math.round(9 * zone.trafficDensity));
    if (civs < targetCivs) {
      const p = pickSpawnPos(24, 92);
      if (p) this.spawnUnit('civilian', 'grunt', p, zone.id);
    }

    const targetRivals = ownedZones.has(zone.id) ? 2 : 7;
    if (rivals < targetRivals) {
      const p = pickSpawnPos(34, 108);
      if (p) {
        const roll = Math.random();
        const arch: EnemyArchetype = roll < 0.45 ? 'grunt' : roll < 0.85 ? 'shooter' : 'brute';
        this.spawnUnit('rival', arch, p, zone.id);
      }
    }

    const targetPolice = this.wanted.getDesiredPoliceCount();
    if (police < targetPolice) {
      const p = pickSpawnPos(36, 102);
      if (p) {
        const arch: EnemyArchetype = this.wanted.stars >= 4 && Math.random() < 0.45 ? 'brute' : 'shooter';
        const unit = this.spawnUnit('police', arch, p, zone.id);
        unit.state = 'chase';
      }
    }
  }

  private removeUnit(index: number): void {
    const u = this.units[index];
    this.scene.remove(u.mesh);
    this.units.splice(index, 1);
  }
}
