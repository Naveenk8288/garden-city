import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { InputState } from '../engine/InputManager';
import { ArticulatedCharacterRig, buildProtagonistCharacter } from './PlayerCharacterModel';
import { CharacterLoadout, DEFAULT_LOADOUT } from './CustomizationData';

export interface PlayerStance {
  isCrouching: boolean;
  isInCover: boolean;
  isRolling: boolean;
  isVaulting: boolean;
  isSprinting: boolean;
  isAiming: boolean;
  speed: number;
}

/**
 * Third-person character controller backed by Rapier KinematicCharacterController
 * with walk, sprint, crouch, jump, vault, combat roll, cover snap, articulated
 * skeletal animation, and collision-safe over-the-shoulder / showcase camera.
 */
export class PlayerController {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public yaw = 0; // camera horizontal angle
  public pitch = -0.16; // camera vertical angle
  public characterYaw = 0;
  public frontCameraMode = false; // Press [V] to inspect character from front!
  public scopeActive = false;     // Tactical Optical Scope mode ([Z] / Middle-Click / Auto-RMB)
  public scopeZoom: 2.5 | 5.0 = 2.5;

  public health = 100;
  public maxHealth = 100;
  public armor = 50;
  public maxArmor = 100;
  public stamina = 100;
  public sprintMult = 1.0;
  public incomingDamageMult = 1.0;
  public inVehicle = false;
  public vaultSpinAngle = 0;
  public vaultAutoSpin = true;

  public stance: PlayerStance = {
    isCrouching: false,
    isInCover: false,
    isRolling: false,
    isVaulting: false,
    isSprinting: false,
    isAiming: false,
    speed: 0
  };

  public mesh: THREE.Group;
  public weaponMount: THREE.Group;
  private rig: ArticulatedCharacterRig;
  private scene: THREE.Scene;

  private physics: PhysicsWorld;
  private charCtrl: RAPIER.KinematicCharacterController;
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  private grounded = true;
  private verticalVel = 0;
  private crouchToggled = false;
  private coverNormal = new THREE.Vector3();
  private rollTimer = 0;
  private rollDir = new THREE.Vector3();
  private vaultTimer = 0;
  private vaultDir = new THREE.Vector3();
  private animPhase = 0;
  private meleeSwingTimer = 0;
  private grabTimer = 0;
  private combatHoldTimer = 0;      // Keeps realistic two-handed shooting stance raised while/after shooting!
  private armRecoilKick = 0;        // Physical gun + wrist recoil kickback on every shot!
  public equippedWeaponStyle: 'melee' | 'pistol' | 'twohand' = 'pistol';
  public isReloadingWeapon = false;
  public aimTargetWorldPoint: THREE.Vector3 | null = null;
  public isMeleeBlocking = false;
  private recoilPitch = 0;

  // Over-the-shoulder camera smoothing state
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private currentFov = 60;
  public lastYawDelta = 0;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, spawnPos: THREE.Vector3, initialLoadout: CharacterLoadout = DEFAULT_LOADOUT) {
    this.scene = scene;
    this.physics = physics;
    this.position.copy(spawnPos);

    this.charCtrl = physics.createCharacterController();
    const { body, collider } = physics.createKinematicCapsule(
      spawnPos.x,
      spawnPos.y + 0.95,
      spawnPos.z,
      0.55,
      0.36,
      'player'
    );
    this.body = body;
    this.collider = collider;

    this.rig = buildProtagonistCharacter(initialLoadout);
    this.mesh = this.rig.root;
    this.weaponMount = this.rig.weaponMount;
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    this.camPos.copy(spawnPos).add(new THREE.Vector3(0, 2.5, 5));
  }

  public applyLoadout(loadout: CharacterLoadout): THREE.Group {
    const prevRotY = this.mesh.rotation.y;
    const prevVis = this.mesh.visible;
    this.scene.remove(this.mesh);
    this.rig = buildProtagonistCharacter(loadout);
    this.mesh = this.rig.root;
    this.weaponMount = this.rig.weaponMount;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = prevRotY;
    this.mesh.visible = prevVis;
    this.scene.add(this.mesh);

    // Apply Free Fire-style Character Preset Passive Stats!
    this.maxHealth = loadout.presetId === 'rudra_ops' ? 135 : 100;
    this.maxArmor = loadout.presetId === 'zoya_viper' ? 130 : 100;
    this.sprintMult = loadout.presetId === 'kavya_shadow' ? 1.18 : loadout.presetId === 'kaal_dj' ? 1.1 : 1.0;
    this.incomingDamageMult = loadout.presetId === 'rudra_ops' ? 0.85 : 1.0;
    this.health = Math.min(this.maxHealth, Math.max(this.health, this.maxHealth * 0.85));
    this.armor = Math.min(this.maxArmor, this.armor);

    return this.weaponMount;
  }

  public updateVaultShowcase(dt: number, camera: THREE.PerspectiveCamera): void {
    this.mesh.visible = true;
    if (this.vaultAutoSpin) {
      this.vaultSpinAngle += dt * 0.52;
    }
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw + Math.PI + this.vaultSpinAngle;

    // Subtle heroic lobby breathing idle pose
    this.animPhase += dt * 2.0;
    this.rig.hips.position.y = 0.93 + Math.sin(this.animPhase) * 0.009;
    this.rig.torso.rotation.set(0.02, 0, 0);
    this.rig.headGroup.rotation.set(0, 0, 0);
    this.rig.leftHip.rotation.set(0.03, 0, -0.08);
    this.rig.rightHip.rotation.set(-0.03, 0, 0.08);
    this.rig.leftKnee.rotation.set(-0.04, 0, 0);
    this.rig.rightKnee.rotation.set(-0.04, 0, 0);
    this.rig.leftShoulder.rotation.set(0.06, 0, 0.14);
    this.rig.leftElbow.rotation.set(0.18, 0, 0);
    this.rig.rightShoulder.rotation.set(0.06, 0, -0.14);
    this.rig.rightElbow.rotation.set(0.18, 0, 0);
    this.rig.rightWrist.rotation.set(0, 0, 0);

    // Frame full-body character cleanly on the left side of the viewport (right half hosts Vault panel!)
    const camDist = 2.95;
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    const desiredCam = new THREE.Vector3(
      this.position.x - fwdX * camDist + rightX * 0.72,
      this.position.y + 1.15,
      this.position.z - fwdZ * camDist + rightZ * 0.72
    );
    const desiredLook = new THREE.Vector3(
      this.position.x + rightX * 0.72,
      this.position.y + 0.98,
      this.position.z + rightZ * 0.72
    );
    camera.position.lerp(desiredCam, Math.min(1, dt * 8));
    camera.lookAt(desiredLook);
    if (Math.abs(camera.fov - 46) > 0.2) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 46, Math.min(1, dt * 8));
      camera.updateProjectionMatrix();
    }
  }

  public teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.verticalVel = 0;
    this.body.setNextKinematicTranslation({ x, y: y + 0.95, z });
    this.body.setTranslation({ x, y: y + 0.95, z }, true);
    this.mesh.position.copy(this.position);
  }

  public addRecoil(pitchKick: number, yawKick: number): void {
    this.recoilPitch += pitchKick;
    this.yaw += yawKick;
    this.combatHoldTimer = 2.4;
    this.armRecoilKick = Math.min(0.42, this.armRecoilKick + 0.22 + pitchKick * 3.5);
  }

  public triggerMeleeAnimation(): void {
    this.meleeSwingTimer = 0.28;
  }

  public triggerGrabAnimation(): void {
    this.grabTimer = 0.34;
  }

  public takeDamage(amount: number): boolean {
    if (this.rollTimer > 0.1) return false; // i-frames during combat roll!
    let rem = amount * this.incomingDamageMult;
    if (this.armor > 0) {
      const absorb = Math.min(this.armor, rem * 0.65);
      this.armor = Math.max(0, this.armor - absorb);
      rem -= absorb;
    }
    this.health = Math.max(0, this.health - rem);
    return this.health <= 0;
  }

  public update(dt: number, input: InputState, camera: THREE.PerspectiveCamera): void {
    // Smoothly dampen mouse look sensitivity when zoomed in through the optical scope
    const lookScale = this.scopeActive ? (this.scopeZoom >= 5.0 ? 0.24 : 0.44) : 1.0;
    this.lastYawDelta = input.lookDeltaX * lookScale;
    this.yaw -= input.lookDeltaX * lookScale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - input.lookDeltaY * lookScale + this.recoilPitch, -1.15, 0.88);
    this.recoilPitch *= Math.max(0, 1 - dt * 16);

    if (input.cameraFlipPressed) {
      this.frontCameraMode = !this.frontCameraMode;
      if (this.frontCameraMode) this.scopeActive = false;
    }
    if (input.aim || this.scopeActive) {
      this.frontCameraMode = false;
    }

    if (this.inVehicle) {
      this.mesh.visible = false;
      return;
    }
    // Hide own body while looking directly through the optical scope lens
    this.mesh.visible = !this.scopeActive;

    // Movement basis from camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, input.moveZ)
      .addScaledVector(right, input.moveX);
    const hasMove = moveDir.lengthSq() > 0.01;
    if (hasMove) moveDir.normalize();

    this.stance.isAiming = input.aim;

    // Toggle Crouch & True Cover Snap when pressing C near a wall/building/vehicle
    if (input.crouchJustPressed) {
      if (this.stance.isInCover) {
        this.stance.isInCover = false;
        this.crouchToggled = false;
      } else {
        const probes = [forward, right, right.clone().negate(), forward.clone().negate()];
        let snapped = false;
        for (const pDir of probes) {
          const hit = this.physics.castRay(
            new THREE.Vector3(this.position.x, this.position.y + 0.85, this.position.z),
            pDir,
            1.45,
            this.collider
          );
          if (hit && (hit.tag === 'building' || hit.tag === 'landmark' || hit.tag === 'safe_building' || hit.tag === 'vehicle')) {
            this.stance.isInCover = true;
            this.crouchToggled = true;
            this.coverNormal.copy(hit.normal).setY(0).normalize();
            snapped = true;
            break;
          }
        }
        if (!snapped) {
          this.crouchToggled = !this.crouchToggled;
        }
      }
    }

    // Leave cover smoothly if walking away from wall edge or sprinting
    if (this.stance.isInCover) {
      const checkWall = this.physics.castRay(
        new THREE.Vector3(this.position.x, this.position.y + 0.85, this.position.z),
        this.coverNormal.clone().negate(),
        1.75,
        this.collider
      );
      if (!checkWall || input.sprint) {
        this.stance.isInCover = false;
        if (input.sprint) this.crouchToggled = false;
      }
    } else if (input.sprint && hasMove) {
      this.crouchToggled = false;
    }

    // Stand up smoothly to peek when aiming out of cover!
    this.stance.isCrouching = this.crouchToggled && !(this.stance.isInCover && input.aim);

    // Combat Roll (Alt / Ctrl / Double-tap C)
    if (input.rollPressed && this.rollTimer <= 0 && this.stamina >= 18) {
      this.rollTimer = 0.44;
      this.stance.isInCover = false;
      this.crouchToggled = false;
      this.stamina -= 18;
      this.rollDir.copy(hasMove ? moveDir : forward);
    }
    this.stance.isRolling = this.rollTimer > 0;

    // Jump / Real Vault over waist-high obstacle
    if (input.jumpPressed && this.grounded && this.vaultTimer <= 0) {
      const lowHit = this.physics.castRay(
        new THREE.Vector3(this.position.x, this.position.y + 0.65, this.position.z),
        forward,
        1.25,
        this.collider
      );
      const highHit = this.physics.castRay(
        new THREE.Vector3(this.position.x, this.position.y + 1.55, this.position.z),
        forward,
        1.45,
        this.collider
      );
      this.stance.isInCover = false;
      this.crouchToggled = false;
      if (lowHit && !highHit) {
        this.vaultTimer = 0.38;
        this.vaultDir.copy(forward);
        this.verticalVel = 7.8;
      } else {
        this.verticalVel = 8.4;
      }
      this.grounded = false;
    }
    this.stance.isVaulting = this.vaultTimer > 0;

    // Speed calculation & stamina management
    const wantsSprint = input.sprint && hasMove && !this.stance.isCrouching && !input.aim && this.stamina > 5;
    this.stance.isSprinting = wantsSprint;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 16);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 22);
    }

    let moveSpeed = 5.6;
    if (this.rollTimer > 0) {
      moveSpeed = 10.8;
      this.rollTimer -= dt;
    } else if (this.vaultTimer > 0) {
      moveSpeed = 8.6;
      this.vaultTimer -= dt;
    } else if (wantsSprint) {
      moveSpeed = 9.6 * this.sprintMult;
    } else if (this.stance.isCrouching) {
      moveSpeed = 3.2;
    } else if (input.aim) {
      moveSpeed = 3.7;
    }

    const horiz = new THREE.Vector3();
    if (this.rollTimer > 0) {
      horiz.copy(this.rollDir).multiplyScalar(moveSpeed);
    } else if (this.vaultTimer > 0) {
      horiz.copy(this.vaultDir).multiplyScalar(moveSpeed);
    } else if (this.stance.isInCover && !input.aim && hasMove) {
      const tangent = new THREE.Vector3(-this.coverNormal.z, 0, this.coverNormal.x);
      const slideAmt = moveDir.dot(tangent);
      horiz.copy(tangent).multiplyScalar(slideAmt * 3.1);
    } else if (hasMove) {
      horiz.copy(moveDir).multiplyScalar(moveSpeed);
    }

    // Gravity
    this.verticalVel -= 22 * dt;
    if (this.grounded && this.verticalVel < 0) this.verticalVel = -1.5;

    const desired = {
      x: horiz.x * dt,
      y: this.verticalVel * dt,
      z: horiz.z * dt
    };

    // Execute Rapier KinematicCharacterController sweep (capsule center rests at 0.97 = 0.91 + 0.06 skin)
    const BASE_CAPSULE_Y = 0.97;
    this.charCtrl.computeColliderMovement(this.collider, desired);
    const corrected = this.charCtrl.computedMovement();
    this.grounded = this.charCtrl.computedGrounded();

    const cur = this.body.translation();
    let dxMove = corrected.x;
    let dzMove = corrected.z;

    // Anti-stuck failsafe: if player is pressing movement keys while overlapped with an obstacle,
    // allow smooth raycast-validated sliding instead of ever freezing in place!
    if (hasMove && Math.hypot(dxMove, dzMove) < 0.0004 && Math.hypot(desired.x, desired.z) > 0.002) {
      const mLen = Math.hypot(desired.x, desired.z);
      const mDir = new THREE.Vector3(desired.x / mLen, 0, desired.z / mLen);
      const ahead = this.physics.castRay(
        new THREE.Vector3(cur.x, cur.y, cur.z),
        mDir,
        mLen + 0.45,
        this.collider
      );
      if (!ahead) {
        dxMove = desired.x;
        dzMove = desired.z;
      } else {
        // Slide tangentially along obstacle wall
        const dot = desired.x * ahead.normal.x + desired.z * ahead.normal.z;
        if (dot < 0) {
          dxMove = desired.x - ahead.normal.x * dot;
          dzMove = desired.z - ahead.normal.z * dot;
        }
      }
    }

    const nx = cur.x + dxMove;
    let ny = cur.y + corrected.y;
    const nz = cur.z + dzMove;
    if (ny <= BASE_CAPSULE_Y) {
      ny = BASE_CAPSULE_Y;
      this.grounded = true;
      this.verticalVel = 0;
    }

    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.position.set(nx, Math.max(0, ny - BASE_CAPSULE_Y), nz);
    this.velocity.set(
      dxMove / Math.max(dt, 0.001),
      corrected.y / Math.max(dt, 0.001),
      dzMove / Math.max(dt, 0.001)
    );
    this.stance.speed = Math.hypot(this.velocity.x, this.velocity.z);

    // Rotate character body: face directly toward the enemy / aim direction whenever aiming, scoping, OR firing!
    if (this.combatHoldTimer > 0) this.combatHoldTimer -= dt;
    this.armRecoilKick = Math.max(0, this.armRecoilKick - dt * 2.4);

    const isShootingStance =
      this.equippedWeaponStyle !== 'melee' &&
      (input.aim || input.fire || this.scopeActive || this.combatHoldTimer > 0);

    if (isShootingStance) {
      let targetYaw = this.yaw;
      if (this.aimTargetWorldPoint) {
        const dx = this.aimTargetWorldPoint.x - this.position.x;
        const dz = this.aimTargetWorldPoint.z - this.position.z;
        if (dx * dx + dz * dz > 1.0) {
          targetYaw = Math.atan2(-dx, -dz);
        }
      }
      this.characterYaw = lerpAngle(this.characterYaw, targetYaw, Math.min(1, dt * 20));
    } else if (input.aim || input.fire) {
      this.characterYaw = lerpAngle(this.characterYaw, this.yaw, Math.min(1, dt * 18));
    } else if (this.stance.isInCover) {
      const wallFaceYaw = Math.atan2(-this.coverNormal.x, -this.coverNormal.z);
      this.characterYaw = lerpAngle(this.characterYaw, wallFaceYaw, Math.min(1, dt * 14));
    } else if (hasMove) {
      const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
      this.characterYaw = lerpAngle(this.characterYaw, targetAngle, Math.min(1, dt * 12));
    }

    this.animateCharacter(dt, isShootingStance);
    this.updateCamera(dt, camera);
  }

  private animateCharacter(dt: number, isShootingStance: boolean): void {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.characterYaw;

    const speed = this.stance.speed;
    if (speed > 0.4 && this.grounded) {
      this.animPhase += dt * (this.stance.isSprinting ? 13.5 : 9.2);
    } else {
      this.animPhase += dt * 1.9;
    }

    const isMoving = speed > 0.4 && this.grounded;
    const amp = this.stance.isSprinting ? 0.72 : 0.44;
    const s = Math.sin(this.animPhase);
    const c = Math.cos(this.animPhase);

    // Multi-joint Hip & Knee locomotion + Heroic Ready Idle Stance (matching reference pose!)
    if (!this.grounded) {
      this.rig.leftHip.rotation.x = 0.45;
      this.rig.leftKnee.rotation.x = -0.75;
      this.rig.rightHip.rotation.x = -0.25;
      this.rig.rightKnee.rotation.x = -0.35;
    } else if (isMoving) {
      this.rig.leftHip.rotation.x = s * amp;
      this.rig.rightHip.rotation.x = -s * amp;
      this.rig.leftKnee.rotation.x = Math.min(0, -Math.max(0, -c) * amp * 1.35 - 0.08);
      this.rig.rightKnee.rotation.x = Math.min(0, -Math.max(0, c) * amp * 1.35 - 0.08);
    } else if (this.stance.isCrouching) {
      this.rig.leftHip.rotation.x = 0.65;
      this.rig.leftKnee.rotation.x = -1.15;
      this.rig.rightHip.rotation.x = 0.45;
      this.rig.rightKnee.rotation.x = -0.95;
    } else {
      // Confident athletic shoulder-width idle stance
      this.rig.leftHip.rotation.x = THREE.MathUtils.lerp(this.rig.leftHip.rotation.x, 0.04, dt * 10);
      this.rig.rightHip.rotation.x = THREE.MathUtils.lerp(this.rig.rightHip.rotation.x, -0.04, dt * 10);
      this.rig.leftHip.rotation.z = -0.07;
      this.rig.rightHip.rotation.z = 0.07;
      this.rig.leftKnee.rotation.x = THREE.MathUtils.lerp(this.rig.leftKnee.rotation.x, -0.04, dt * 10);
      this.rig.rightKnee.rotation.x = THREE.MathUtils.lerp(this.rig.rightKnee.rotation.x, -0.04, dt * 10);
    }
    if (isMoving) {
      this.rig.leftHip.rotation.z = 0;
      this.rig.rightHip.rotation.z = 0;
    }

    // Hips height, breathing bob, crouch & combat roll
    const bob = isMoving ? Math.abs(Math.sin(this.animPhase)) * 0.045 : Math.sin(this.animPhase) * 0.008;
    const targetHipY = this.stance.isRolling ? 0.56 : this.stance.isCrouching ? 0.68 : 0.93 + bob;
    this.rig.hips.position.y += (targetHipY - this.rig.hips.position.y) * Math.min(1, dt * 14);

    // Compute realistic elevation pitch from shoulder to exact target enemy (or camera pitch)
    let aimElevation = this.pitch;
    if (isShootingStance && this.aimTargetWorldPoint) {
      const shY = this.position.y + (this.stance.isCrouching ? 1.15 : 1.44);
      const horizD = Math.max(1.5, Math.hypot(this.aimTargetWorldPoint.x - this.position.x, this.aimTargetWorldPoint.z - this.position.z));
      aimElevation = THREE.MathUtils.clamp(Math.atan2(this.aimTargetWorldPoint.y - shY, horizD), -0.65, 0.65);
    }

    if (this.stance.isRolling) {
      this.rig.torso.rotation.x = (1 - this.rollTimer / 0.42) * Math.PI * 2;
      this.rig.torso.rotation.y = 0;
    } else {
      const lean = this.stance.isCrouching ? 0.28 : isShootingStance ? 0.06 : this.stance.isSprinting ? 0.16 : 0.02;
      // True right-handed bladed tactical stance: left shoulder forward, right shoulder braced back!
      const targetTwist = isShootingStance
        ? this.equippedWeaponStyle === 'twohand'
          ? -0.42
          : -0.14
        : isMoving
          ? -s * 0.09
          : 0;
      this.rig.torso.rotation.x = THREE.MathUtils.lerp(this.rig.torso.rotation.x, lean, dt * 14);
      this.rig.torso.rotation.y = THREE.MathUtils.lerp(this.rig.torso.rotation.y, targetTwist, dt * 14);
    }

    // Head tracks target smoothly and counter-rotates against bladed shooting torso to sight down the barrel!
    const targetHeadYaw = isShootingStance ? -this.rig.torso.rotation.y * 0.92 : 0;
    const targetHeadPitch = THREE.MathUtils.clamp(aimElevation * 0.6, -0.38, 0.38);
    this.rig.headGroup.rotation.y = THREE.MathUtils.lerp(this.rig.headGroup.rotation.y, targetHeadYaw, dt * 16);
    this.rig.headGroup.rotation.x = THREE.MathUtils.lerp(this.rig.headGroup.rotation.x, targetHeadPitch, dt * 16);

    // Smooth helper for natural joint blending
    const lerpJoint = (obj: THREE.Object3D, rx: number, ry: number, rz: number, rate = 18) => {
      const k = Math.min(1, dt * rate);
      obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, rx, k);
      obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, ry, k);
      obj.rotation.z = THREE.MathUtils.lerp(obj.rotation.z, rz, k);
    };

    // Articulated Shoulder + Elbow + Wrist Realistic Combat / Shooting / Reload / Carry Pose
    if (this.grabTimer > 0) {
      this.grabTimer -= dt;
      const t = 1 - this.grabTimer / 0.34;
      const push = Math.sin(t * Math.PI);
      lerpJoint(this.rig.rightShoulder, 1.45 * push, 0, -0.15, 25);
      lerpJoint(this.rig.rightElbow, 0.2, 0, 0, 25);
      lerpJoint(this.rig.rightWrist, 0, 0, 0, 25);
      lerpJoint(this.rig.leftShoulder, 1.45 * push, 0, 0.15, 25);
      lerpJoint(this.rig.leftElbow, 0.2, 0, 0, 25);
    } else if (this.meleeSwingTimer > 0) {
      this.meleeSwingTimer -= dt;
      const t = 1 - this.meleeSwingTimer / 0.28;
      this.rig.rightShoulder.rotation.set(1.5 - Math.sin(t * Math.PI) * 1.9, 0, -0.45 * Math.sin(t * Math.PI));
      this.rig.rightElbow.rotation.x = 0.55;
      this.rig.rightWrist.rotation.set(0, 0, 0);
      this.rig.leftShoulder.rotation.set(0.6, 0, 0.25);
      this.rig.leftElbow.rotation.x = 0.85;
    } else if (this.isMeleeBlocking) {
      lerpJoint(this.rig.rightShoulder, 1.25, -0.45, -0.2, 20);
      lerpJoint(this.rig.rightElbow, 1.45, 0, 0, 20);
      lerpJoint(this.rig.rightWrist, 0, 0, 0, 20);
      lerpJoint(this.rig.leftShoulder, 1.25, 0.45, 0.2, 20);
      lerpJoint(this.rig.leftElbow, 1.45, 0, 0, 20);
    } else if (this.isReloadingWeapon && this.equippedWeaponStyle !== 'melee') {
      // Realistic tactical magazine swap animation: tilt gun across chest, left hand pulls fresh mag from belt!
      const magWave = Math.sin(performance.now() * 0.011);
      lerpJoint(this.rig.rightShoulder, 0.95, 0, -0.35, 16);
      lerpJoint(this.rig.rightElbow, 0.85, 0, 0, 16);
      lerpJoint(this.rig.rightWrist, 0.1, 0.3, 0.4, 16);
      lerpJoint(this.rig.leftShoulder, 0.55 + magWave * 0.48, 0, 0.45, 16);
      lerpJoint(this.rig.leftElbow, 1.15 - magWave * 0.35, 0, 0, 16);
    } else if (isShootingStance) {
      // REALISTIC TWO-HANDED TACTICAL SHOOTING STANCE WITH LIVE QUATERNION BARREL ALIGNMENT ONTO ENEMY!
      const recoil = this.armRecoilKick;
      if (this.equippedWeaponStyle === 'pistol') {
        // Modern Two-Handed Isosceles Pistol Grip: both hands locked together dead-center!
        lerpJoint(this.rig.rightShoulder, 1.38 + aimElevation + recoil * 0.55, 0, -0.38, 24);
        lerpJoint(this.rig.rightElbow, 0.14 + recoil * 0.3, 0, 0, 24);

        // Left support arm reaches smoothly across so left hand cups the right pistol grip!
        lerpJoint(this.rig.leftShoulder, 1.42 + aimElevation + recoil * 0.45, 0, 0.62, 24);
        lerpJoint(this.rig.leftElbow, 0.08 + recoil * 0.2, 0, 0, 24);
      } else {
        // Realistic Right-Handed Shouldered Rifle / SMG / Shotgun Stance:
        // Right elbow braced back holding trigger grip, left arm extended forward under barrel handguard!
        lerpJoint(this.rig.rightShoulder, 0.72 + aimElevation + recoil * 0.45, 0, -0.44, 24);
        lerpJoint(this.rig.rightElbow, 0.88 + recoil * 0.3, 0, 0, 24);

        // Left support arm reaches forward directly beneath the rifle/shotgun forend!
        lerpJoint(this.rig.leftShoulder, 1.34 + aimElevation + recoil * 0.35, 0, 0.66, 24);
        lerpJoint(this.rig.leftElbow, 0.08 + recoil * 0.18, 0, 0, 24);
      }

      // Live exact world-quaternion wrist solver: keeps gun upright & barrel aimed 100% straight at the enemy!
      this.mesh.updateMatrixWorld(true);
      const qElbowWorld = new THREE.Quaternion();
      this.rig.rightElbow.getWorldQuaternion(qElbowWorld);
      // Desired weapon world orientation: characterYaw + exact aimElevation + recoil kick, upright (+Y)
      const qDesiredWeapon = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(aimElevation + recoil * 0.45, this.characterYaw, 0, 'YXZ')
      );
      // Since handMount has local rotation.x = -PI/2, compensate by +PI/2 so gun -Z points straight at enemy!
      const qMountComp = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      const qWristLocal = qElbowWorld.invert().multiply(qDesiredWeapon).multiply(qMountComp);
      this.rig.rightWrist.quaternion.copy(qWristLocal);
    } else if (this.equippedWeaponStyle !== 'melee') {
      // Realistic Tactical Low-Ready Carry (holding firearm ready across body instead of swinging it backward!)
      const sway = isMoving ? s * 0.08 : 0;
      if (this.equippedWeaponStyle === 'pistol') {
        lerpJoint(this.rig.rightShoulder, 0.52 + sway, 0, -0.14, 14);
        lerpJoint(this.rig.rightElbow, 0.48, 0, 0, 14);
        lerpJoint(this.rig.rightWrist, 0, 0, 0.14, 14);
        lerpJoint(this.rig.leftShoulder, isMoving ? s * 0.35 : 0.12, 0, 0.1, 14);
        lerpJoint(this.rig.leftElbow, isMoving ? 0.55 : 0.22, 0, 0, 14);
      } else {
        // Two-handed low-ready rifle/shotgun patrol hold
        lerpJoint(this.rig.rightShoulder, 0.58 + sway, 0, -0.22, 14);
        lerpJoint(this.rig.rightElbow, 0.65, 0, 0, 14);
        lerpJoint(this.rig.rightWrist, -0.1, 0, 0.18, 14);
        lerpJoint(this.rig.leftShoulder, 0.72 - sway, 0, 0.58, 14);
        lerpJoint(this.rig.leftElbow, 0.62, 0, 0, 14);
      }
    } else if (isMoving) {
      const armAmp = this.stance.isSprinting ? 0.82 : 0.45;
      lerpJoint(this.rig.rightShoulder, -s * armAmp, 0, -0.08, 16);
      lerpJoint(this.rig.rightElbow, this.stance.isSprinting ? 1.05 : 0.38, 0, 0, 16);
      lerpJoint(this.rig.rightWrist, 0, 0, 0, 16);
      lerpJoint(this.rig.leftShoulder, s * armAmp, 0, 0.08, 16);
      lerpJoint(this.rig.leftElbow, this.stance.isSprinting ? 1.05 : 0.38, 0, 0, 16);
    } else {
      // Relaxed athletic hero idle pose
      lerpJoint(this.rig.leftShoulder, 0.05, 0, 0.12, 12);
      lerpJoint(this.rig.leftElbow, 0.16, 0, 0, 12);
      lerpJoint(this.rig.rightShoulder, 0.05, 0, -0.12, 12);
      lerpJoint(this.rig.rightElbow, 0.16, 0, 0, 12);
      lerpJoint(this.rig.rightWrist, 0, 0, 0, 12);
    }
  }

  private updateCamera(dt: number, camera: THREE.PerspectiveCamera): void {
    const aim = this.stance.isAiming || this.scopeActive;
    const scoped = this.scopeActive;
    const dist = scoped ? 0.06 : this.frontCameraMode ? 2.65 : aim ? 2.3 : 4.35;
    const shoulderOffset = scoped || this.frontCameraMode ? 0.0 : aim ? 0.68 : 0.58;
    const heightOffset = scoped
      ? this.stance.isCrouching ? 1.25 : 1.62
      : this.frontCameraMode
        ? 1.28
        : this.stance.isCrouching
          ? 1.22
          : 1.56;

    const pivot = new THREE.Vector3(
      this.position.x + Math.cos(this.yaw) * shoulderOffset,
      this.position.y + heightOffset,
      this.position.z - Math.sin(this.yaw) * shoulderOffset
    );

    const viewYaw = this.frontCameraMode ? this.characterYaw + Math.PI : this.yaw;
    const viewPitch = this.frontCameraMode ? -0.05 : this.pitch;

    const camOffset = new THREE.Vector3(
      Math.sin(viewYaw) * Math.cos(viewPitch) * dist,
      -Math.sin(viewPitch) * dist,
      Math.cos(viewYaw) * Math.cos(viewPitch) * dist
    );

    const desiredPos = pivot.clone().add(camOffset);

    // Camera wall-collision raycast using Rapier
    const dir = desiredPos.clone().sub(pivot);
    const rayLen = dir.length();
    if (rayLen > 0.1) {
      dir.normalize();
      const hit = this.physics.castRay(pivot, dir, rayLen + 0.25, this.collider);
      if (hit && hit.distance < rayLen) {
        desiredPos.copy(pivot).addScaledVector(dir, Math.max(0.65, hit.distance - 0.35));
      }
    }
    if (desiredPos.y < 0.6) desiredPos.y = 0.6;

    this.camPos.lerp(desiredPos, Math.min(1, dt * 16));
    const lookTarget = this.frontCameraMode
      ? new THREE.Vector3(this.position.x, this.position.y + 1.18, this.position.z)
      : pivot.clone().add(
          new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch) * 18,
            Math.sin(this.pitch) * 18,
            -Math.cos(this.yaw) * Math.cos(this.pitch) * 18
          )
        );
    this.camLook.lerp(lookTarget, Math.min(1, dt * 20));

    camera.position.copy(this.camPos);
    camera.lookAt(this.camLook);

    const targetFov = scoped
      ? this.scopeZoom >= 5.0
        ? 13
        : 24
      : aim
        ? 44
        : this.stance.isSprinting
          ? 69
          : 58;
    this.currentFov += (targetFov - this.currentFov) * Math.min(1, dt * (scoped ? 14 : 10));
    if (Math.abs(camera.fov - this.currentFov) > 0.05) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }
  }

  public getAimRay(camera: THREE.PerspectiveCamera): { origin: THREE.Vector3; dir: THREE.Vector3 } {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    return { origin: camera.position.clone(), dir };
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
