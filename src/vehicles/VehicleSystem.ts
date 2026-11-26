import * as THREE from 'three';
import { ChunkStreamer, RoadSegmentData } from '../world/ChunkStreamer';
import { getZoneAtWorldPos } from '../world/bengaluruData';
import { InputState } from '../engine/InputManager';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { buildPlayerDriverForPose, buildVehicleModel, DriverPose } from './VehicleModels';
import { CharacterLoadout, DEFAULT_LOADOUT } from '../entities/CustomizationData';

export type VehicleKind = 'auto' | 'bike' | 'cab' | 'car' | 'bus' | 'truck' | 'patrol';

export interface RadioStation {
  name: string;
  genre: string;
  bpm: number;
  rootHz: number;
}

export const RADIO_STATIONS: RadioStation[] = [
  { name: 'RADIO NADA 98.4 FM', genre: 'Monsoon Synth-Tabla', bpm: 108, rootHz: 146.83 },
  { name: 'DECCAN BASS 104.2 FM', genre: 'Bengaluru Underground Beats', bpm: 124, rootHz: 110.0 },
  { name: 'GARDEN LO-FI 91.9 FM', genre: 'Rainy MG Road Chill', bpm: 84, rootHz: 130.81 },
  { name: 'SILICON PULSE 107.6 FM', genre: 'ORR Night Drive', bpm: 132, rootHz: 164.81 },
  { name: 'RADIO OFF', genre: 'Engine & City Ambience', bpm: 0, rootHz: 0 }
];

export interface VehicleCrashEvent {
  intensity: number;
  kind: 'vehicle' | 'building' | 'person';
  point: THREE.Vector3;
  normal: THREE.Vector3;
  damage: number;
  distance: number;
  involvesPlayer: boolean;
}

export interface VehicleInstance {
  id: string;
  kind: VehicleKind;
  name: string;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  steer: number;
  driftVel: number;
  pitchTilt: number;
  rollTilt: number;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  health: number;
  maxHealth: number;
  halfLength: number;
  halfWidth: number;
  mass: number;
  crashCooldown: number;
  isPlayerControlled: boolean;
  isTraffic: boolean;
  roadSeg: RoadSegmentData | null;
  segProgress: number;
  segDir: 1 | -1;
  laneOffset: number;
  honkCooldown: number;
  wobblePhase: number;
  mesh: THREE.Group;
  bodyRoot: THREE.Group;
  wheels: THREE.Object3D[];
  headlights: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  sirenBar?: { red: THREE.Mesh; blue: THREE.Mesh };
  driverAnchor: THREE.Group;
  npcDriverGroup: THREE.Group;
  playerDriverGroup: THREE.Group;
  driverPose: DriverPose;
  steeringWheel?: THREE.Object3D;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

/**
 * Bengaluru Vehicles & Traffic System:
 * Clearcoated sculpted Auto-Rickshaws, Street Bikes, City Buses, Cabs, GT Coupes,
 * Cargo Lorries & Patrol Interceptors with real projecting SpotLight headlights,
 * suspension pitch/roll, handbrake drift smoke, wall sliding, and dense area traffic.
 */
export class VehicleSystem {
  public vehicles: VehicleInstance[] = [];
  public activeVehicle: VehicleInstance | null = null;
  public radioIndex = 0;
  public maxTrafficCap = 34;
  public particleScale = 1.0;

  private scene: THREE.Scene;
  private streamer: ChunkStreamer;
  private physics: PhysicsWorld;
  private idCounter = 0;
  private trafficSpawnTimer = 0;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();

  // Real projecting SpotLight headlights for the player's active vehicle
  private playerHeadlightL: THREE.SpotLight;
  private playerHeadlightR: THREE.SpotLight;
  private headlightTargetL: THREE.Object3D;
  private headlightTargetR: THREE.Object3D;

  // Drift & Damage Smoke Puffs
  private smokePuffs: SmokePuff[] = [];
  private smokeGeo = new THREE.SphereGeometry(0.26, 6, 6);
  private smokeTimer = 0;

  public onHonk?: (kind: VehicleKind, distance: number) => void;
  public onVehicleStolen?: () => void;
  public onCrash?: (event: VehicleCrashEvent) => void;
  public onPlayerBumpedOnFoot?: (damage: number, pushDir: THREE.Vector3, intensity: number) => void;
  private footBumpCooldown = 0;
  private playerLoadout: CharacterLoadout = { ...DEFAULT_LOADOUT };

  public setPlayerLoadout(loadout: CharacterLoadout): void {
    this.playerLoadout = { ...loadout };
    if (this.activeVehicle) {
      this.refreshPlayerDriverMesh(this.activeVehicle);
    }
  }

  private refreshPlayerDriverMesh(v: VehicleInstance): void {
    while (v.playerDriverGroup.children.length > 0) {
      v.playerDriverGroup.remove(v.playerDriverGroup.children[0]);
    }
    const mesh = buildPlayerDriverForPose(v.driverPose, this.playerLoadout);
    v.playerDriverGroup.add(mesh);
  }

  constructor(scene: THREE.Scene, streamer: ChunkStreamer, physics: PhysicsWorld) {
    this.scene = scene;
    this.streamer = streamer;
    this.physics = physics;

    this.headlightTargetL = new THREE.Object3D();
    this.headlightTargetR = new THREE.Object3D();
    this.scene.add(this.headlightTargetL, this.headlightTargetR);

    this.playerHeadlightL = new THREE.SpotLight(0xfff1cc, 0, 58, Math.PI * 0.26, 0.55, 1.2);
    this.playerHeadlightR = new THREE.SpotLight(0xfff1cc, 0, 58, Math.PI * 0.26, 0.55, 1.2);
    this.playerHeadlightL.target = this.headlightTargetL;
    this.playerHeadlightR.target = this.headlightTargetR;
    this.scene.add(this.playerHeadlightL, this.playerHeadlightR);
  }

  public spawnVehicle(kind: VehicleKind, pos: THREE.Vector3, yaw: number, isTraffic = false): VehicleInstance {
    const id = `veh_${++this.idCounter}`;
    const built = buildVehicleModel(kind, this.idCounter);
    built.group.position.copy(pos);
    built.group.rotation.y = yaw;
    this.scene.add(built.group);

    const halfWidth = kind === 'bike' ? 0.45 : kind === 'auto' ? 0.8 : kind === 'bus' || kind === 'truck' ? 1.32 : 1.0;
    const mass = kind === 'bike' ? 0.45 : kind === 'auto' ? 0.85 : kind === 'bus' || kind === 'truck' ? 3.2 : 1.4;

    const veh: VehicleInstance = {
      id,
      kind,
      name: built.name,
      position: pos.clone(),
      yaw,
      speed: 0,
      steer: 0,
      driftVel: 0,
      pitchTilt: 0,
      rollTilt: 0,
      maxSpeed: built.maxSpeed,
      accel: built.accel,
      turnRate: built.turnRate,
      health: built.maxHealth,
      maxHealth: built.maxHealth,
      halfLength: built.halfLength,
      halfWidth,
      mass,
      crashCooldown: 0,
      isPlayerControlled: false,
      isTraffic,
      roadSeg: null,
      segProgress: 0,
      segDir: 1,
      laneOffset: kind === 'bike' ? (Math.random() - 0.5) * 2.4 : 1.75,
      honkCooldown: 2 + Math.random() * 6,
      wobblePhase: 0,
      mesh: built.group,
      bodyRoot: built.bodyRoot,
      wheels: built.wheels,
      headlights: built.headlights,
      brakeLights: built.brakeLights,
      sirenBar: built.sirenBar,
      driverAnchor: built.driverAnchor,
      npcDriverGroup: built.npcDriverGroup,
      playerDriverGroup: built.playerDriverGroup,
      driverPose: built.driverPose,
      steeringWheel: built.steeringWheel
    };

    // Moving traffic vehicles ALWAYS have a visible Bengaluru driver inside!
    veh.npcDriverGroup.visible = isTraffic;

    this.vehicles.push(veh);
    return veh;
  }

  public findNearestVehicle(pos: THREE.Vector3, maxDist = 5.6): VehicleInstance | null {
    let best: VehicleInstance | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      if (v === this.activeVehicle) continue;
      const d = v.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  public enterVehicle(v: VehicleInstance): void {
    this.activeVehicle = v;
    v.isPlayerControlled = true;
    v.npcDriverGroup.visible = false;
    this.refreshPlayerDriverMesh(v);
    v.playerDriverGroup.visible = true;
    if (v.isTraffic) {
      v.isTraffic = false;
      this.onVehicleStolen?.();
    }
    this.camPos.copy(v.position).add(new THREE.Vector3(Math.sin(v.yaw) * 7, 3.2, Math.cos(v.yaw) * 7));
  }

  public exitVehicle(): THREE.Vector3 | null {
    if (!this.activeVehicle) return null;
    const v = this.activeVehicle;
    v.isPlayerControlled = false;
    v.playerDriverGroup.visible = false;
    v.speed *= 0.3;
    this.activeVehicle = null;
    this.playerHeadlightL.intensity = 0;
    this.playerHeadlightR.intensity = 0;

    const sideX = Math.cos(v.yaw) * 2.3;
    const sideZ = -Math.sin(v.yaw) * 2.3;
    return new THREE.Vector3(v.position.x + sideX, 0.2, v.position.z + sideZ);
  }

  public cycleRadio(): RadioStation {
    this.radioIndex = (this.radioIndex + 1) % RADIO_STATIONS.length;
    return RADIO_STATIONS[this.radioIndex];
  }

  public getCurrentRadio(): RadioStation {
    return RADIO_STATIONS[this.radioIndex];
  }

  private spawnSmoke(pos: THREE.Vector3, dark: boolean): void {
    const maxSmoke = Math.max(8, Math.round(48 * this.particleScale));
    if (this.smokePuffs.length > maxSmoke) return;
    const mat = new THREE.MeshBasicMaterial({
      color: dark ? 0x262930 : 0xdbe2ea,
      transparent: true,
      opacity: dark ? 0.58 : 0.42,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.smokePuffs.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4),
      life: 0.65
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    input: InputState,
    camera: THREE.PerspectiveCamera,
    nightFactor: number,
    wantedStars: number
  ): { playerWorldPos: THREE.Vector3 | null; speedKmh: number } {
    this.trafficSpawnTimer -= dt;
    if (this.trafficSpawnTimer <= 0) {
      this.trafficSpawnTimer = 1.15;
      this.maintainTraffic(playerPos, wantedStars);
    }

    // Update drift/damage smoke particles
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.addScalar(dt * 2.4);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 0.75);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.smokePuffs.splice(i, 1);
      }
    }

    const headIntensity = 0.8 + nightFactor * 3.0;
    const flash = Math.sin(performance.now() * 0.02) > 0;
    this.footBumpCooldown = Math.max(0, this.footBumpCooldown - dt);

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.crashCooldown = Math.max(0, v.crashCooldown - dt);

      if (v.isTraffic && v.position.distanceTo(playerPos) > 225) {
        this.scene.remove(v.mesh);
        this.vehicles.splice(i, 1);
        continue;
      }

      for (const hl of v.headlights) {
        (hl.material as THREE.MeshStandardMaterial).emissiveIntensity = headIntensity;
      }

      if (v.sirenBar) {
        const active = wantedStars > 0 || v.isPlayerControlled;
        (v.sirenBar.red.material as THREE.MeshStandardMaterial).emissiveIntensity = active && flash ? 4.5 : 0.25;
        (v.sirenBar.blue.material as THREE.MeshStandardMaterial).emissiveIntensity = active && !flash ? 4.5 : 0.25;
      }

      if (v.isPlayerControlled) {
        this.updatePlayerVehicle(v, dt, input, camera, nightFactor);
      } else if (v.isTraffic) {
        this.updateTrafficVehicle(v, dt, playerPos);
      } else {
        v.speed *= Math.max(0, 1 - dt * 3);
        const fwdX = -Math.sin(v.yaw);
        const fwdZ = -Math.cos(v.yaw);
        v.position.x += fwdX * v.speed * dt;
        v.position.z += fwdZ * v.speed * dt;
      }

      // Damaged traffic/parked vehicles also emit dark engine smoke!
      if (!v.isPlayerControlled && v.health < v.maxHealth * 0.55 && Math.random() < dt * 4.5) {
        const hoodPos = v.position.clone().add(new THREE.Vector3(-Math.sin(v.yaw) * (v.halfLength * 0.65), 0.95, -Math.cos(v.yaw) * (v.halfLength * 0.65)));
        this.spawnSmoke(hoodPos, true);
      }
    }

    // Resolve all vehicle-to-vehicle touches & collisions (damage, pushback, wobble, sparks & crash audio!)
    this.resolveVehicleCollisions(playerPos);

    // Check if any moving traffic vehicle touches the player while on foot
    if (!this.activeVehicle && this.footBumpCooldown <= 0) {
      for (const v of this.vehicles) {
        if (Math.abs(v.speed) < 2.2) continue;
        const dx = playerPos.x - v.position.x;
        const dz = playerPos.z - v.position.z;
        const fwdX = -Math.sin(v.yaw);
        const fwdZ = -Math.cos(v.yaw);
        const rightX = Math.cos(v.yaw);
        const rightZ = -Math.sin(v.yaw);
        const localFwd = dx * fwdX + dz * fwdZ;
        const localRight = dx * rightX + dz * rightZ;
        if (Math.abs(localFwd) < v.halfLength + 0.55 && Math.abs(localRight) < v.halfWidth + 0.45) {
          const intensity = THREE.MathUtils.clamp(Math.abs(v.speed) / 18, 0.25, 1.0);
          const pushDir = new THREE.Vector3(fwdX, 0, fwdZ).normalize();
          const dmg = Math.round(6 + intensity * 18);
          this.footBumpCooldown = 0.75;
          v.speed *= 0.25;
          this.onHonk?.(v.kind, 0);
          this.onCrash?.({
            intensity,
            kind: 'person',
            point: playerPos.clone().add(new THREE.Vector3(0, 0.9, 0)),
            normal: pushDir,
            damage: dmg,
            distance: 0,
            involvesPlayer: true
          });
          this.onPlayerBumpedOnFoot?.(dmg, pushDir, intensity);
          break;
        }
      }
    }

    // Sync final transforms, wheel rotation, and damage wobble after collision separation
    for (const v of this.vehicles) {
      const wheelSpin = v.speed * dt * 2.8;
      for (const w of v.wheels) {
        w.rotation.x -= wheelSpin;
      }

      const damageRatio = 1 - v.health / v.maxHealth;
      v.wobblePhase += dt * (9 + Math.abs(v.speed) * 0.45);
      const wobble = damageRatio > 0.25 ? Math.sin(v.wobblePhase) * 0.055 * damageRatio : 0;

      v.mesh.position.copy(v.position);
      v.mesh.rotation.y = v.yaw;

      const leanMult = v.kind === 'bike' ? 0.34 : 0.075;
      const targetRoll = v.steer * -leanMult * Math.min(1, Math.abs(v.speed) / 14);
      v.rollTilt = THREE.MathUtils.lerp(v.rollTilt, targetRoll, dt * 8);
      v.bodyRoot.rotation.set(v.pitchTilt + wobble, 0, v.rollTilt + wobble * 1.4);

      // Animate steering wheel / handlebars and driver head turn when steering!
      if (v.steeringWheel) {
        if (v.kind === 'bike' || v.kind === 'auto') {
          v.steeringWheel.rotation.y = v.steer * 0.38;
        } else {
          v.steeringWheel.rotation.z = v.steer * 0.9;
        }
      }
      const activeDriver = v.playerDriverGroup.visible ? v.playerDriverGroup : v.npcDriverGroup.visible ? v.npcDriverGroup : null;
      const head = activeDriver?.getObjectByName('driverHead');
      if (head) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, v.steer * 0.35, dt * 8);
      }
    }

    if (this.activeVehicle) {
      return {
        playerWorldPos: this.activeVehicle.position.clone(),
        speedKmh: Math.round(Math.abs(this.activeVehicle.speed) * 3.6)
      };
    }
    return { playerWorldPos: null, speedKmh: 0 };
  }

  private updatePlayerVehicle(
    v: VehicleInstance,
    dt: number,
    input: InputState,
    camera: THREE.PerspectiveCamera,
    nightFactor: number
  ): void {
    const throttle = input.moveZ;
    const steerInput = -input.moveX;
    const handbrake = input.handbrake;

    if (input.horn && v.honkCooldown <= 0) {
      this.onHonk?.(v.kind, 0);
      v.honkCooldown = 0.42;
    }
    v.honkCooldown = Math.max(0, v.honkCooldown - dt);

    // Arcade-realistic acceleration, braking, reverse & suspension nose pitch (damaged vehicles limp slower)
    const healthMult = v.health <= 0 ? 0.22 : v.health < v.maxHealth * 0.3 ? 0.62 : 1.0;
    const effMaxSpeed = v.maxSpeed * healthMult;
    const effAccel = v.accel * (v.health <= 0 ? 0.35 : 1.0);
    let targetPitch = 0;
    if (throttle > 0) {
      v.speed = Math.min(effMaxSpeed, v.speed + effAccel * throttle * dt);
      targetPitch = 0.032; // Nose lifts slightly on hard acceleration
    } else if (throttle < 0) {
      if (v.speed > 1.5) {
        v.speed = Math.max(0, v.speed - v.accel * 2.1 * dt);
        targetPitch = -0.048; // Nose dives on braking
      } else {
        v.speed = Math.max(-effMaxSpeed * 0.38, v.speed + effAccel * 0.85 * throttle * dt);
      }
    } else {
      v.speed *= Math.max(0, 1 - dt * 1.25);
    }
    v.pitchTilt = THREE.MathUtils.lerp(v.pitchTilt, targetPitch, dt * 7);

    // Handbrake Drift physics + tire smoke
    if (handbrake && Math.abs(v.speed) > 6) {
      v.speed *= Math.max(0, 1 - dt * 2.4);
      v.driftVel = THREE.MathUtils.clamp(v.driftVel + steerInput * Math.abs(v.speed) * 0.24 * dt, -14, 14);
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.06;
        const rearPos = v.position.clone().add(new THREE.Vector3(Math.sin(v.yaw) * 1.4, 0.25, Math.cos(v.yaw) * 1.4));
        this.spawnSmoke(rearPos, false);
      }
    } else {
      v.driftVel *= Math.max(0, 1 - dt * 5.0);
    }

    // Engine smoke when vehicle is heavily damaged
    if (v.health < v.maxHealth * 0.5) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.14;
        const hoodPos = v.position.clone().add(new THREE.Vector3(-Math.sin(v.yaw) * 1.4, 0.95, -Math.cos(v.yaw) * 1.4));
        this.spawnSmoke(hoodPos, true);
      }
    }

    v.steer = THREE.MathUtils.lerp(v.steer, steerInput, dt * 10);
    const speedFactor = Math.min(1, Math.abs(v.speed) / 4.8);
    const dirSign = v.speed >= -0.1 ? 1 : -1;
    const driftBoost = handbrake ? 1.55 : 1.0;
    v.yaw += v.steer * v.turnRate * driftBoost * speedFactor * dirSign * dt;

    const fwdX = -Math.sin(v.yaw);
    const fwdZ = -Math.cos(v.yaw);
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);

    const stepX = (fwdX * v.speed + rightX * v.driftVel) * dt;
    const stepZ = (fwdZ * v.speed + rightZ * v.driftVel) * dt;

    // Bulletproof 5-Ray Bumper Sweep + Corner Overlap Guard:
    // Vehicles ALWAYS stop cleanly in front of buildings and NEVER pass through walls!
    const moveLen = Math.hypot(stepX, stepZ);
    if (moveLen > 0.002) {
      const moveDir = new THREE.Vector3(stepX / moveLen, 0, stepZ / moveLen);
      const halfW = v.kind === 'bike' ? 0.42 : v.kind === 'auto' ? 0.76 : v.kind === 'bus' || v.kind === 'truck' ? 1.32 : 1.0;
      const startBack = 0.5;
      const probeDist = startBack + v.halfLength + moveLen + 0.55;
      const lateralOffsets = [-halfW, -halfW * 0.5, 0, halfW * 0.5, halfW];

      let closestBuildingHit: { distance: number; normal: THREE.Vector3 } | null = null;

      for (const lat of lateralOffsets) {
        const rayOrigin = new THREE.Vector3(
          v.position.x + rightX * lat - moveDir.x * startBack,
          0.95,
          v.position.z + rightZ * lat - moveDir.z * startBack
        );
        const hit = this.physics.castRay(rayOrigin, moveDir, probeDist);
        if (hit && (hit.tag === 'building' || hit.tag === 'landmark' || hit.tag === 'safe_building')) {
          if (!closestBuildingHit || hit.distance < closestBuildingHit.distance) {
            closestBuildingHit = { distance: hit.distance, normal: hit.normal };
          }
        }
      }

      // Also verify candidate bumper corners are not inside any solid building collider
      const candX = v.position.x + stepX;
      const candZ = v.position.z + stepZ;
      let cornerBlocked = false;
      for (const lat of [-halfW, 0, halfW]) {
        const bx = candX + moveDir.x * (v.halfLength + 0.25) + rightX * lat;
        const bz = candZ + moveDir.z * (v.halfLength + 0.25) + rightZ * lat;
        if (this.physics.isPointBlocked(bx, 1.0, bz)) {
          cornerBlocked = true;
          break;
        }
      }

      if (closestBuildingHit || cornerBlocked) {
        const impactSpeed = Math.abs(v.speed);
        if (impactSpeed > 1.2 && v.crashCooldown <= 0) {
          const dmg = Math.max(2, impactSpeed * 0.85);
          v.health = Math.max(0, v.health - dmg);
          v.crashCooldown = 0.28;
          const intensity = THREE.MathUtils.clamp(impactSpeed / 24, 0.22, 1.0);
          const contactPoint = new THREE.Vector3(
            v.position.x + moveDir.x * (v.halfLength + 0.1),
            0.9,
            v.position.z + moveDir.z * (v.halfLength + 0.1)
          );
          const hitNormal = closestBuildingHit ? closestBuildingHit.normal.clone() : moveDir.clone().negate();
          this.onCrash?.({
            intensity,
            kind: 'building',
            point: contactPoint,
            normal: hitNormal,
            damage: dmg,
            distance: 0,
            involvesPlayer: true
          });
        }
        if (closestBuildingHit) {
          // Halt cleanly flush right in front of the building wall (never entering it!)
          const safeGap = startBack + v.halfLength + 0.42;
          const allowedStep = Math.max(0, Math.min(moveLen, closestBuildingHit.distance - safeGap));
          v.position.x += moveDir.x * allowedStep;
          v.position.z += moveDir.z * allowedStep;
        }
        v.speed = 0;
        v.driftVel = 0;
        v.pitchTilt = -0.065; // Impact brake dive feel
      } else {
        v.position.x = candX;
        v.position.z = candZ;
      }
    }

    // Position real SpotLight headlight beams ahead of the vehicle!
    const beamPower = 38 + nightFactor * 95;
    const frontX = v.position.x + fwdX * v.halfLength;
    const frontZ = v.position.z + fwdZ * v.halfLength;
    const spread = v.kind === 'bike' || v.kind === 'auto' ? 0.15 : 0.65;

    this.playerHeadlightL.position.set(frontX - rightX * spread, 0.9, frontZ - rightZ * spread);
    this.playerHeadlightR.position.set(frontX + rightX * spread, 0.9, frontZ + rightZ * spread);
    this.headlightTargetL.position.set(frontX + fwdX * 22 - rightX * 1.2, 0.0, frontZ + fwdZ * 22 - rightZ * 1.2);
    this.headlightTargetR.position.set(frontX + fwdX * 22 + rightX * 1.2, 0.0, frontZ + fwdZ * 22 + rightZ * 1.2);
    this.playerHeadlightL.intensity = beamPower;
    this.playerHeadlightR.intensity = beamPower;

    const braking = throttle < -0.1 || handbrake;
    for (const bl of v.brakeLights) {
      (bl.material as THREE.MeshStandardMaterial).emissiveIntensity = braking ? 4.0 : 1.1;
    }

    // Smooth cinematic vehicle chase camera
    const camDist = v.kind === 'bus' || v.kind === 'truck' ? 12.2 : v.kind === 'bike' ? 4.8 : 7.2;
    const camHeight = v.kind === 'bus' ? 4.6 : v.kind === 'bike' ? 2.15 : 2.75;
    const targetCam = new THREE.Vector3(
      v.position.x + Math.sin(v.yaw) * camDist,
      v.position.y + camHeight,
      v.position.z + Math.cos(v.yaw) * camDist
    );
    this.camPos.lerp(targetCam, Math.min(1, dt * 6.5));
    const targetLook = new THREE.Vector3(
      v.position.x - Math.sin(v.yaw) * 11,
      v.position.y + 1.35,
      v.position.z - Math.cos(v.yaw) * 11
    );
    this.camLook.lerp(targetLook, Math.min(1, dt * 9.5));
    camera.position.copy(this.camPos);
    camera.lookAt(this.camLook);

    const targetFov = 58 + Math.min(20, Math.abs(v.speed) * 0.45);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 5);
    camera.updateProjectionMatrix();
  }

  private resolveVehicleCollisions(playerPos: THREE.Vector3): void {
    const list = this.vehicles;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];

        // Quick broad-phase rejection
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const maxR = a.halfLength + b.halfLength + 1.0;
        if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
        if (Math.abs(a.position.y - b.position.y) > 2.2) continue;

        // 2D SAT (Separating Axis Theorem) over both vehicles' oriented footprints
        const aFwdX = -Math.sin(a.yaw);
        const aFwdZ = -Math.cos(a.yaw);
        const aRightX = Math.cos(a.yaw);
        const aRightZ = -Math.sin(a.yaw);

        const bFwdX = -Math.sin(b.yaw);
        const bFwdZ = -Math.cos(b.yaw);
        const bRightX = Math.cos(b.yaw);
        const bRightZ = -Math.sin(b.yaw);

        const axes: Array<[number, number]> = [
          [aFwdX, aFwdZ],
          [aRightX, aRightZ],
          [bFwdX, bFwdZ],
          [bRightX, bRightZ]
        ];

        let minOverlap = Infinity;
        let sepX = 0;
        let sepZ = 0;
        let separated = false;

        for (const [ax, az] of axes) {
          const distProj = Math.abs(dx * ax + dz * az);
          const aProj =
            Math.abs(aFwdX * ax + aFwdZ * az) * a.halfLength +
            Math.abs(aRightX * ax + aRightZ * az) * a.halfWidth;
          const bProj =
            Math.abs(bFwdX * ax + bFwdZ * az) * b.halfLength +
            Math.abs(bRightX * ax + bRightZ * az) * b.halfWidth;
          const overlap = aProj + bProj - distProj;
          if (overlap <= 0) {
            separated = true;
            break;
          }
          if (overlap < minOverlap) {
            minOverlap = overlap;
            const sign = dx * ax + dz * az >= 0 ? 1 : -1;
            sepX = ax * sign;
            sepZ = az * sign;
          }
        }

        if (separated || minOverlap <= 0.001) continue;

        // Separate the touching vehicles according to mass (without pushing into a building!)
        const totalMass = a.mass + b.mass;
        const aShare = b.mass / totalMass;
        const bShare = a.mass / totalMass;
        const push = minOverlap + 0.06;

        const nextAx = a.position.x - sepX * push * aShare;
        const nextAz = a.position.z - sepZ * push * aShare;
        if (!this.physics.isPointBlocked(nextAx, 1.0, nextAz)) {
          a.position.x = nextAx;
          a.position.z = nextAz;
        }
        const nextBx = b.position.x + sepX * push * bShare;
        const nextBz = b.position.z + sepZ * push * bShare;
        if (!this.physics.isPointBlocked(nextBx, 1.0, nextBz)) {
          b.position.x = nextBx;
          b.position.z = nextBz;
        }

        // Compute relative impact velocity along the contact normal
        const aVx = aFwdX * a.speed + aRightX * a.driftVel;
        const aVz = aFwdZ * a.speed + aRightZ * a.driftVel;
        const bVx = bFwdX * b.speed + bRightX * b.driftVel;
        const bVz = bFwdZ * b.speed + bRightZ * b.driftVel;

        const relClosing = (aVx - bVx) * sepX + (aVz - bVz) * sepZ;
        const relMag = Math.hypot(aVx - bVx, aVz - bVz);
        const impactSpeed = Math.max(relClosing, relMag * 0.65);

        const involvesPlayer = a.isPlayerControlled || b.isPlayerControlled;
        const contactPoint = new THREE.Vector3(
          (a.position.x + b.position.x) * 0.5,
          0.85,
          (a.position.z + b.position.z) * 0.5
        );
        const distToPlayer = involvesPlayer ? 0 : contactPoint.distanceTo(playerPos);

        // Dampen / bounce speeds and jolt suspension on contact
        a.speed *= 0.35;
        b.speed *= 0.35;
        a.driftVel *= 0.25;
        b.driftVel *= 0.25;
        a.pitchTilt = -0.055;
        b.pitchTilt = 0.055;
        a.rollTilt += (Math.random() - 0.5) * 0.14;
        b.rollTilt += (Math.random() - 0.5) * 0.14;

        // Apply damage & emit crash sound even on gentle vehicle touches!
        if (impactSpeed > 0.85 && a.crashCooldown <= 0 && b.crashCooldown <= 0) {
          const baseDmg = Math.max(3, impactSpeed * 1.15);
          const dmgA = baseDmg * (b.mass / a.mass) * 0.75;
          const dmgB = baseDmg * (a.mass / b.mass) * 0.75;

          a.health = Math.max(0, a.health - Math.min(42, dmgA));
          b.health = Math.max(0, b.health - Math.min(42, dmgB));
          a.crashCooldown = 0.26;
          b.crashCooldown = 0.26;

          const intensity = THREE.MathUtils.clamp(impactSpeed / 20, 0.24, 1.0);
          const reportedDamage = a.isPlayerControlled ? dmgA : b.isPlayerControlled ? dmgB : Math.max(dmgA, dmgB);

          if (distToPlayer < 80) {
            this.onCrash?.({
              intensity,
              kind: 'vehicle',
              point: contactPoint,
              normal: new THREE.Vector3(-sepX, 0.35, -sepZ).normalize(),
              damage: Math.min(42, reportedDamage),
              distance: distToPlayer,
              involvesPlayer
            });
          }

          // Angry Bengaluru street horn when you bump another vehicle!
          if (involvesPlayer) {
            const other = a.isPlayerControlled ? b : a;
            if (other.honkCooldown <= 0) {
              this.onHonk?.(other.kind, 4);
              other.honkCooldown = 1.6;
            }
          }
        }
      }
    }
  }

  private updateTrafficVehicle(v: VehicleInstance, dt: number, playerPos: THREE.Vector3): void {
    const seg = v.roadSeg;
    if (!seg) return;

    const zone = getZoneAtWorldPos(v.position.x, v.position.z);
    const congestionFactor = zone.trafficDensity > 1.65 ? 0.36 : zone.trafficDensity > 1.3 ? 0.72 : 1.0;

    let blocked = false;
    const fwdX = -Math.sin(v.yaw);
    const fwdZ = -Math.cos(v.yaw);
    for (const other of this.vehicles) {
      if (other === v) continue;
      const dx = other.position.x - v.position.x;
      const dz = other.position.z - v.position.z;
      const d = Math.hypot(dx, dz);
      if (d < (v.kind === 'bike' ? 4.4 : 9.0)) {
        const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.01, d);
        if (dot > 0.72) {
          blocked = true;
          break;
        }
      }
    }

    // Bikes and Autos weave / lane-split through dense Bengaluru traffic!
    if (blocked && (v.kind === 'bike' || v.kind === 'auto')) {
      v.laneOffset = THREE.MathUtils.clamp(v.laneOffset + (Math.sin(v.wobblePhase) > 0 ? 1 : -1) * dt * 2.4, -3.2, 3.2);
    }

    // Stop AI traffic cleanly if a building wall is directly ahead
    if (!blocked && v.speed > 0.2) {
      const bHit = this.physics.castRay(
        new THREE.Vector3(v.position.x, 0.95, v.position.z),
        new THREE.Vector3(fwdX, 0, fwdZ),
        v.halfLength + 1.8
      );
      if (bHit && (bHit.tag === 'building' || bHit.tag === 'landmark' || bHit.tag === 'safe_building')) {
        blocked = true;
      }
    }

    const cruiseSpeed = (v.kind === 'bike' ? 14.5 : v.kind === 'auto' ? 10.5 : v.kind === 'bus' ? 8.5 : 13.5) * congestionFactor;
    const targetSpeed = blocked ? 0.0 : cruiseSpeed;
    v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, dt * 4);

    v.honkCooldown -= dt;
    if (blocked && v.honkCooldown <= 0) {
      const dPlayer = v.position.distanceTo(playerPos);
      if (dPlayer < 75) this.onHonk?.(v.kind, dPlayer);
      v.honkCooldown = 3.2 + Math.random() * 5.5;
    }

    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const segLen = Math.max(1, Math.hypot(dx, dz));
    v.segProgress += ((v.speed * dt) / segLen) * v.segDir;

    if (v.segProgress >= 1 || v.segProgress <= 0) {
      const endX = v.segDir > 0 ? seg.bx : seg.ax;
      const endZ = v.segDir > 0 ? seg.bz : seg.az;
      const next = this.findConnectedSegment(endX, endZ, seg);
      if (next) {
        v.roadSeg = next.seg;
        v.segDir = next.dir;
        v.segProgress = next.dir > 0 ? 0.02 : 0.98;
      } else {
        v.segDir = v.segDir > 0 ? -1 : 1;
        v.segProgress = THREE.MathUtils.clamp(v.segProgress, 0.02, 0.98);
      }
    }

    const cur = v.roadSeg!;
    const cdx = cur.bx - cur.ax;
    const cdz = cur.bz - cur.az;
    const clen = Math.max(1, Math.hypot(cdx, cdz));
    const perpX = (cdz / clen) * -v.segDir;
    const perpZ = (-cdx / clen) * -v.segDir;
    const px = cur.ax + cdx * v.segProgress + perpX * v.laneOffset;
    const pz = cur.az + cdz * v.segProgress + perpZ * v.laneOffset;

    v.position.set(px, cur.bridge ? 4.85 : 0.05, pz);
    v.yaw = Math.atan2(-(cdx * v.segDir), -(cdz * v.segDir));
  }

  private findConnectedSegment(
    x: number,
    z: number,
    exclude: RoadSegmentData
  ): { seg: RoadSegmentData; dir: 1 | -1 } | null {
    const roads = this.streamer.getActiveRoadSegments();
    const candidates: Array<{ seg: RoadSegmentData; dir: 1 | -1 }> = [];
    for (const r of roads) {
      if (r === exclude) continue;
      if (Math.hypot(r.ax - x, r.az - z) < 12) candidates.push({ seg: r, dir: 1 });
      else if (Math.hypot(r.bx - x, r.bz - z) < 12) candidates.push({ seg: r, dir: -1 });
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private maintainTraffic(playerPos: THREE.Vector3, wantedStars: number): void {
    const roads = this.streamer.getActiveRoadSegments();
    if (roads.length === 0) return;

    const zone = getZoneAtWorldPos(playerPos.x, playerPos.z);
    const maxTraffic = Math.min(this.maxTrafficCap, Math.round(18 * zone.trafficDensity));
    const trafficList = this.vehicles.filter((v) => v.isTraffic);
    // Trim farthest excess traffic immediately when stepping down quality tier
    if (trafficList.length > maxTraffic) {
      trafficList.sort((a, b) => b.position.distanceToSquared(playerPos) - a.position.distanceToSquared(playerPos));
      const excess = trafficList.length - maxTraffic;
      for (let k = 0; k < excess; k++) {
        const victim = trafficList[k];
        const idx = this.vehicles.indexOf(victim);
        if (idx >= 0) {
          this.scene.remove(victim.mesh);
          this.vehicles.splice(idx, 1);
        }
      }
      return;
    }
    const currentTraffic = trafficList.length;
    if (currentTraffic >= maxTraffic) return;

    const spawnBatch = Math.min(4, maxTraffic - currentTraffic);
    for (let s = 0; s < spawnBatch; s++) {
      for (let tries = 0; tries < 12; tries++) {
        const seg = roads[Math.floor(Math.random() * roads.length)];
        const mx = (seg.ax + seg.bx) * 0.5;
        const mz = (seg.az + seg.bz) * 0.5;
        const d = Math.hypot(mx - playerPos.x, mz - playerPos.z);
        if (d < 34 || d > 175) continue;

        const roll = Math.random();
        let kind: VehicleKind;
        if (wantedStars >= 2 && roll < 0.18) kind = 'patrol';
        else if (roll < 0.36) kind = 'bike';
        else if (roll < 0.64) kind = 'auto';
        else if (roll < 0.78) kind = 'cab';
        else if (roll < 0.89) kind = 'car';
        else if (roll < 0.95) kind = 'bus';
        else kind = 'truck';

        const veh = this.spawnVehicle(kind, new THREE.Vector3(mx, seg.bridge ? 4.85 : 0.05, mz), 0, true);
        veh.roadSeg = seg;
        veh.segProgress = 0.5;
        veh.segDir = Math.random() < 0.5 ? 1 : -1;
        break;
      }
    }
  }
}
