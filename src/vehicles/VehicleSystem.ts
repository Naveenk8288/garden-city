import * as THREE from 'three';
import { ChunkStreamer, RoadSegmentData } from '../world/ChunkStreamer';
import { getZoneAtWorldPos } from '../world/bengaluruData';
import { InputState } from '../engine/InputManager';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { buildVehicleModel } from './VehicleModels';

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
  riderSeatGroup?: THREE.Group;
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
  public onCrash?: (intensity: number) => void;

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
      riderSeatGroup: built.riderSeatGroup
    };

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
    if (v.riderSeatGroup) v.riderSeatGroup.visible = true;
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
    if (v.riderSeatGroup) v.riderSeatGroup.visible = false;
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
    if (this.smokePuffs.length > 48) return;
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

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

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

      // Spin all wheels smoothly & tilt front steering wheels visually
      const wheelSpin = v.speed * dt * 2.8;
      for (const w of v.wheels) {
        w.rotation.x -= wheelSpin;
      }

      const damageRatio = 1 - v.health / v.maxHealth;
      v.wobblePhase += dt * (9 + Math.abs(v.speed) * 0.45);
      const wobble = damageRatio > 0.35 ? Math.sin(v.wobblePhase) * 0.05 * damageRatio : 0;

      v.mesh.position.copy(v.position);
      v.mesh.rotation.y = v.yaw;

      // Suspension pitch/roll + motorcycle cornering lean!
      const leanMult = v.kind === 'bike' ? 0.34 : 0.075;
      const targetRoll = v.steer * -leanMult * Math.min(1, Math.abs(v.speed) / 14);
      v.rollTilt = THREE.MathUtils.lerp(v.rollTilt, targetRoll, dt * 8);
      v.bodyRoot.rotation.set(v.pitchTilt + wobble, 0, v.rollTilt + wobble * 1.4);
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

    // Arcade-realistic acceleration, braking, reverse & suspension nose pitch
    let targetPitch = 0;
    if (throttle > 0) {
      v.speed = Math.min(v.maxSpeed, v.speed + v.accel * throttle * dt);
      targetPitch = 0.032; // Nose lifts slightly on hard acceleration
    } else if (throttle < 0) {
      if (v.speed > 1.5) {
        v.speed = Math.max(0, v.speed - v.accel * 2.1 * dt);
        targetPitch = -0.048; // Nose dives on braking
      } else {
        v.speed = Math.max(-v.maxSpeed * 0.38, v.speed + v.accel * 0.85 * throttle * dt);
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
        if (Math.abs(v.speed) > 7) {
          v.health = Math.max(15, v.health - Math.abs(v.speed) * 0.65);
          this.onCrash?.(Math.min(1, Math.abs(v.speed) / 30));
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
        v.pitchTilt = -0.055; // Impact brake dive feel
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
    const maxTraffic = Math.min(36, Math.round(18 * zone.trafficDensity));
    const currentTraffic = this.vehicles.filter((v) => v.isTraffic).length;
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
        let kind: VehicleKind = 'auto';
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
