import * as THREE from 'three';

interface Tracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

interface Spark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface Decal {
  mesh: THREE.Mesh;
  age: number;
}

interface ShellCasing {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

/**
 * Object-pooled VFX manager for 3D star muzzle flashes, spinning brass casings,
 * bullet tracers, impact sparks, surface bullet decals, and stylized knockout bursts.
 */
export class VFXSystem {
  private scene: THREE.Scene;
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private decals: Decal[] = [];
  private shells: ShellCasing[] = [];
  private maxDecals = 85;
  private maxSparks = 150;
  private maxShells = 28;
  private particleScale = 1.0;

  private sparkGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xffc857 });
  private shellGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.042, 6);
  private shellMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.9 });
  private decalGeo = new THREE.PlaneGeometry(0.22, 0.22);
  private decalMat = new THREE.MeshBasicMaterial({
    color: 0x0d1016,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });

  private muzzleLight: THREE.PointLight;
  private muzzleStar: THREE.Group;
  private muzzleLightTimer = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.muzzleLight = new THREE.PointLight(0xffb84d, 0, 16, 1.8);
    this.scene.add(this.muzzleLight);

    // 3D glowing star-burst muzzle flash mesh
    this.muzzleStar = new THREE.Group();
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffe494,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const cone1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), flashMat);
    cone1.scale.set(0.7, 0.7, 2.2);
    const cone2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), flashMat);
    cone2.scale.set(2.0, 0.5, 0.5);
    const cone3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), flashMat);
    cone3.scale.set(0.5, 2.0, 0.5);
    this.muzzleStar.add(cone1, cone2, cone3);
    this.muzzleStar.visible = false;
    this.scene.add(this.muzzleStar);
  }

  public setParticleScale(scale: number): void {
    this.particleScale = Math.max(0.2, Math.min(1.2, scale));
    this.maxSparks = Math.max(24, Math.round(150 * this.particleScale));
    this.maxDecals = Math.max(20, Math.round(85 * this.particleScale));
    this.maxShells = Math.max(6, Math.round(28 * this.particleScale));
    while (this.decals.length > this.maxDecals) {
      const oldest = this.decals.shift()!;
      this.scene.remove(oldest.mesh);
    }
  }

  public spawnMuzzleFlash(worldPos: THREE.Vector3, ejectShell = true): void {
    this.muzzleLight.position.copy(worldPos);
    this.muzzleLight.intensity = 22;
    this.muzzleStar.position.copy(worldPos);
    this.muzzleStar.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    this.muzzleStar.visible = true;
    this.muzzleLightTimer = 0.055;

    this.spawnSparks(worldPos, new THREE.Vector3(0, 1, 0), Math.max(1, Math.round(3 * this.particleScale)), 0xffd27d);

    if (ejectShell && this.shells.length < this.maxShells) {
      const m = new THREE.Mesh(this.shellGeo, this.shellMat);
      m.position.copy(worldPos);
      this.scene.add(m);
      this.shells.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3.5, 1.8 + Math.random() * 1.4, (Math.random() - 0.5) * 3.5),
        spin: new THREE.Vector3(12, 16, 9),
        life: 0.9
      });
    }
  }

  public spawnTracer(from: THREE.Vector3, to: THREE.Vector3, colorHex = 0xffd97d): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.92
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.075, maxLife: 0.075 });
  }

  public spawnSparks(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    count = 8,
    colorHex = 0xffb347
  ): void {
    const mat = colorHex === 0xffc857
      ? this.sparkMat
      : new THREE.MeshBasicMaterial({ color: colorHex });

    const scaledCount = Math.max(1, Math.round(count * this.particleScale));
    for (let i = 0; i < scaledCount; i++) {
      if (this.sparks.length > this.maxSparks) break;
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const vel = normal
        .clone()
        .multiplyScalar(2.6 + Math.random() * 4.8)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 5.8,
            Math.random() * 4.4,
            (Math.random() - 0.5) * 5.8
          )
        );
      this.sparks.push({ mesh, vel, life: 0.22 + Math.random() * 0.24 });
    }
  }

  public spawnDecal(pos: THREE.Vector3, normal: THREE.Vector3): void {
    const mesh = new THREE.Mesh(this.decalGeo, this.decalMat);
    mesh.position.copy(pos).addScaledVector(normal, 0.025);
    const lookTarget = pos.clone().add(normal);
    mesh.lookAt(lookTarget);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.decals.push({ mesh, age: 0 });
    if (this.decals.length > this.maxDecals) {
      const oldest = this.decals.shift()!;
      this.scene.remove(oldest.mesh);
    }
  }

  public spawnKnockoutRing(pos: THREE.Vector3, colorHex = 0xff9f2e): void {
    this.spawnSparks(pos, new THREE.Vector3(0, 1, 0), 16, colorHex);
  }

  public update(dt: number): void {
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= dt;
      if (this.muzzleLightTimer <= 0) {
        this.muzzleLight.intensity = 0;
        this.muzzleStar.visible = false;
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      (t.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, t.life / t.maxLife);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 16 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.scale.setScalar(Math.max(0.1, s.life * 2.5));
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        if (s.mesh.material !== this.sparkMat) {
          (s.mesh.material as THREE.Material).dispose();
        }
        this.sparks.splice(i, 1);
      }
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      sh.life -= dt;
      sh.vel.y -= 18 * dt;
      sh.mesh.position.addScaledVector(sh.vel, dt);
      if (sh.mesh.position.y < 0.04) {
        sh.mesh.position.y = 0.04;
        sh.vel.y = Math.abs(sh.vel.y) * 0.35;
        sh.vel.x *= 0.6;
        sh.vel.z *= 0.6;
      }
      sh.mesh.rotation.x += sh.spin.x * dt;
      sh.mesh.rotation.y += sh.spin.y * dt;
      if (sh.life <= 0) {
        this.scene.remove(sh.mesh);
        this.shells.splice(i, 1);
      }
    }
  }
}
