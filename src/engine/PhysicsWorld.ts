import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export interface RaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  colliderHandle: number;
  tag?: string;
}

export class PhysicsWorld {
  public world!: RAPIER.World;
  public RAPIER = RAPIER;
  private chunkColliders = new Map<string, RAPIER.Collider[]>();
  private colliderTags = new Map<number, string>();
  private groundBody!: RAPIER.RigidBody;

  public async init(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -22, z: 0 });

    // Infinite flat ground plane for Bengaluru plateau (y = 0)
    const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0);
    this.groundBody = this.world.createRigidBody(groundDesc);
    const groundCol = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(50000, 0.5, 50000).setFriction(1.0),
      this.groundBody
    );
    this.colliderTags.set(groundCol.handle, 'ground');
  }

  public step(dt: number): void {
    const clamped = Math.min(Math.max(dt, 1 / 144), 1 / 25);
    this.world.timestep = clamped;
    this.world.step();
  }

  /**
   * Fixed-timestep physics step (default 60 Hz) driven by QualityManager's accumulator
   * so simulation speed is identical across 30, 60, 120, and 144 Hz displays.
   */
  public stepFixed(fixedDt = 1 / 60): void {
    this.world.timestep = fixedDt;
    this.world.step();
  }

  public addChunkBoxCollider(
    chunkKey: string,
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    rotY = 0,
    tag = 'building'
  ): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.cuboid(
      Math.max(0.25, hx),
      Math.max(0.25, hy),
      Math.max(0.25, hz)
    )
      .setTranslation(cx, cy, cz)
      .setFriction(0.7);

    if (Math.abs(rotY) > 0.001) {
      const half = rotY * 0.5;
      desc.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    }

    const col = this.world.createCollider(desc);
    this.colliderTags.set(col.handle, tag);
    let list = this.chunkColliders.get(chunkKey);
    if (!list) {
      list = [];
      this.chunkColliders.set(chunkKey, list);
    }
    list.push(col);
    return col;
  }

  public addChunkPolygonWalls(
    chunkKey: string,
    pts: Array<{ x: number; z: number }>,
    height: number,
    tag = 'building'
  ): void {
    let list = this.chunkColliders.get(chunkKey);
    if (!list) {
      list = [];
      this.chunkColliders.set(chunkKey, list);
    }
    const hy = Math.max(0.5, height * 0.5);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.8) continue;
      const cx = (a.x + b.x) * 0.5;
      const cz = (a.z + b.z) * 0.5;
      const angle = Math.atan2(dx, dz);
      const half = angle * 0.5;
      // 1.16m solid building wall thickness so fast vehicles stop cleanly and never tunnel through!
      const desc = RAPIER.ColliderDesc.cuboid(0.58, hy, len * 0.5 + 0.2)
        .setTranslation(cx, hy, cz)
        .setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) })
        .setFriction(0.6);
      const col = this.world.createCollider(desc);
      this.colliderTags.set(col.handle, tag);
      list.push(col);
    }
  }

  public isPointBlocked(x: number, y: number, z: number, excludeCollider?: RAPIER.Collider): boolean {
    const proj = this.world.projectPoint({ x, y, z }, true, undefined, undefined, excludeCollider);
    if (!proj) return false;
    const tag = this.colliderTags.get(proj.collider.handle);
    if (tag === 'ground') return false;
    return proj.isInside;
  }

  public removeChunkColliders(chunkKey: string): void {
    const list = this.chunkColliders.get(chunkKey);
    if (!list) return;
    for (const col of list) {
      this.colliderTags.delete(col.handle);
      if (this.world.getCollider(col.handle)) {
        this.world.removeCollider(col, false);
      }
    }
    this.chunkColliders.delete(chunkKey);
  }

  public createCharacterController(): RAPIER.KinematicCharacterController {
    const ctrl = this.world.createCharacterController(0.06);
    ctrl.enableAutostep(0.55, 0.25, true);
    ctrl.enableSnapToGround(0.4);
    ctrl.setApplyImpulsesToDynamicBodies(true);
    ctrl.setMaxSlopeClimbAngle((48 * Math.PI) / 180);
    return ctrl;
  }

  public createKinematicCapsule(
    x: number,
    y: number,
    z: number,
    halfHeight = 0.55,
    radius = 0.36,
    tag = 'player'
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z)
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius),
      body
    );
    this.colliderTags.set(collider.handle, tag);
    return { body, collider };
  }

  public removeBody(body: RAPIER.RigidBody, collider?: RAPIER.Collider): void {
    if (collider) this.colliderTags.delete(collider.handle);
    if (this.world.getRigidBody(body.handle)) {
      this.world.removeRigidBody(body);
    }
  }

  public castRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDist: number,
    excludeCollider?: RAPIER.Collider
  ): RaycastHit | null {
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );
    const hit = this.world.castRayAndGetNormal(
      ray,
      maxDist,
      true,
      undefined,
      undefined,
      excludeCollider
    );
    if (!hit) return null;
    const pt = ray.pointAt(hit.timeOfImpact);
    return {
      point: new THREE.Vector3(pt.x, pt.y, pt.z),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      distance: hit.timeOfImpact,
      colliderHandle: hit.collider.handle,
      tag: this.colliderTags.get(hit.collider.handle)
    };
  }

  public getTag(handle: number): string | undefined {
    return this.colliderTags.get(handle);
  }
}
