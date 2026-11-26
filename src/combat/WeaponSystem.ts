import * as THREE from 'three';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { VFXSystem } from './VFXSystem';

export type WeaponId =
  | 'fists'
  | 'bat'
  | 'knife'
  | 'katana'
  | 'chain'
  | 'pistol'
  | 'silenced_pistol'
  | 'deagle'
  | 'smg'
  | 'dual_uzi'
  | 'shotgun'
  | 'rifle'
  | 'sniper'
  | 'lmg'
  | 'launcher';

export interface WeaponDef {
  id: WeaponId;
  slot: number;
  name: string;
  category: 'melee' | 'firearm';
  subType: 'MELEE' | 'PISTOL' | 'SMG' | 'SHOTGUN' | 'RIFLE' | 'SNIPER' | 'HEAVY';
  damage: number;
  fireRate: number; // shots or swings per second
  range: number;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  spread: number; // radians
  pellets: number;
  recoilPitch: number;
  recoilYaw: number;
  auto: boolean;
  price: number;
  ammoPrice: number;
  knockback: number;
  silenced?: boolean;
  explosiveRadius?: number;
}

export const WEAPON_DEFS: WeaponDef[] = [
  { id: 'fists', slot: 1, name: 'Street Brawling', category: 'melee', subType: 'MELEE', damage: 22, fireRate: 2.6, range: 2.4, magSize: 0, reserveMax: 0, reloadTime: 0, spread: 0, pellets: 1, recoilPitch: 0, recoilYaw: 0, auto: false, price: 0, ammoPrice: 0, knockback: 5 },
  { id: 'bat', slot: 2, name: 'Willow Cricket Bat', category: 'melee', subType: 'MELEE', damage: 38, fireRate: 1.7, range: 2.9, magSize: 0, reserveMax: 0, reloadTime: 0, spread: 0, pellets: 1, recoilPitch: 0, recoilYaw: 0, auto: false, price: 0, ammoPrice: 0, knockback: 10 },
  { id: 'knife', slot: 3, name: 'Bazaar Switchblade', category: 'melee', subType: 'MELEE', damage: 36, fireRate: 3.3, range: 2.6, magSize: 0, reserveMax: 0, reloadTime: 0, spread: 0, pellets: 1, recoilPitch: 0, recoilYaw: 0, auto: false, price: 0, ammoPrice: 0, knockback: 4 },
  { id: 'katana', slot: 4, name: 'Sandalwood Katana', category: 'melee', subType: 'MELEE', damage: 56, fireRate: 2.2, range: 3.5, magSize: 0, reserveMax: 0, reloadTime: 0, spread: 0, pellets: 1, recoilPitch: 0, recoilYaw: 0, auto: false, price: 0, ammoPrice: 0, knockback: 9 },
  { id: 'pistol', slot: 5, name: 'Deccan 9mm Pistol', category: 'firearm', subType: 'PISTOL', damage: 28, fireRate: 4.8, range: 95, magSize: 15, reserveMax: 150, reloadTime: 1.35, spread: 0.016, pellets: 1, recoilPitch: 0.018, recoilYaw: 0.006, auto: false, price: 0, ammoPrice: 160, knockback: 6 },
  { id: 'silenced_pistol', slot: 6, name: 'Cubbon Silenced 9mm', category: 'firearm', subType: 'PISTOL', damage: 32, fireRate: 5.0, range: 105, magSize: 16, reserveMax: 160, reloadTime: 1.3, spread: 0.01, pellets: 1, recoilPitch: 0.012, recoilYaw: 0.004, auto: false, price: 0, ammoPrice: 180, knockback: 5, silenced: true },
  { id: 'deagle', slot: 7, name: 'Vidhana .50 Deagle', category: 'firearm', subType: 'PISTOL', damage: 64, fireRate: 2.2, range: 115, magSize: 7, reserveMax: 70, reloadTime: 1.55, spread: 0.012, pellets: 1, recoilPitch: 0.044, recoilYaw: 0.014, auto: false, price: 0, ammoPrice: 240, knockback: 14 },
  { id: 'smg', slot: 8, name: 'Indira Compact SMG', category: 'firearm', subType: 'SMG', damage: 21, fireRate: 11.8, range: 85, magSize: 32, reserveMax: 256, reloadTime: 1.65, spread: 0.034, pellets: 1, recoilPitch: 0.014, recoilYaw: 0.012, auto: true, price: 0, ammoPrice: 240, knockback: 4 },
  { id: 'shotgun', slot: 9, name: 'Majestic Pump Shotgun', category: 'firearm', subType: 'SHOTGUN', damage: 18, fireRate: 1.3, range: 44, magSize: 8, reserveMax: 64, reloadTime: 2.0, spread: 0.075, pellets: 8, recoilPitch: 0.055, recoilYaw: 0.02, auto: false, price: 0, ammoPrice: 280, knockback: 18 },
  { id: 'rifle', slot: 10, name: 'Kaveri Assault Rifle', category: 'firearm', subType: 'RIFLE', damage: 35, fireRate: 8.4, range: 150, magSize: 30, reserveMax: 240, reloadTime: 1.9, spread: 0.017, pellets: 1, recoilPitch: 0.02, recoilYaw: 0.01, auto: true, price: 0, ammoPrice: 340, knockback: 9 },
  { id: 'sniper', slot: 11, name: 'Nandi .338 Sniper', category: 'firearm', subType: 'SNIPER', damage: 105, fireRate: 0.95, range: 260, magSize: 5, reserveMax: 45, reloadTime: 2.35, spread: 0.0025, pellets: 1, recoilPitch: 0.062, recoilYaw: 0.008, auto: false, price: 0, ammoPrice: 380, knockback: 22 },
  { id: 'lmg', slot: 12, name: 'Peenya M249 Heavy LMG', category: 'firearm', subType: 'HEAVY', damage: 30, fireRate: 10.8, range: 140, magSize: 80, reserveMax: 320, reloadTime: 2.8, spread: 0.032, pellets: 1, recoilPitch: 0.022, recoilYaw: 0.015, auto: true, price: 2200, ammoPrice: 420, knockback: 10 },
  { id: 'dual_uzi', slot: 13, name: 'KR Market Micro-Uzi', category: 'firearm', subType: 'SMG', damage: 18, fireRate: 16.5, range: 72, magSize: 45, reserveMax: 315, reloadTime: 1.5, spread: 0.044, pellets: 1, recoilPitch: 0.012, recoilYaw: 0.014, auto: true, price: 1400, ammoPrice: 260, knockback: 3 },
  { id: 'launcher', slot: 14, name: 'ORR Grenade Launcher', category: 'firearm', subType: 'HEAVY', damage: 135, fireRate: 0.72, range: 130, magSize: 4, reserveMax: 20, reloadTime: 2.6, spread: 0.015, pellets: 1, recoilPitch: 0.072, recoilYaw: 0.012, auto: false, price: 3200, ammoPrice: 550, knockback: 28, explosiveRadius: 6.0 },
  { id: 'chain', slot: 15, name: 'Peenya Steel Chain', category: 'melee', subType: 'MELEE', damage: 48, fireRate: 1.4, range: 3.6, magSize: 0, reserveMax: 0, reloadTime: 0, spread: 0, pellets: 1, recoilPitch: 0, recoilYaw: 0, auto: false, price: 800, ammoPrice: 0, knockback: 14 }
];

export interface WeaponRuntimeState {
  unlocked: boolean;
  mag: number;
  reserve: number;
}

export interface CombatHitTarget {
  id: string;
  label?: string;
  health?: number;
  maxHealth?: number;
  position: THREE.Vector3;
  radius: number;
  height: number;
  applyHit: (damage: number, knockDir: THREE.Vector3, knockForce: number, isHeadshot: boolean) => void;
}

export interface AimTargetInfo {
  target: CombatHitTarget;
  hitPoint: THREE.Vector3;
  distance: number;
  isHeadshot: boolean;
}

export class WeaponSystem {
  public states = new Map<WeaponId, WeaponRuntimeState>();
  public currentId: WeaponId = 'pistol';
  public reloading = false;
  public reloadTimer = 0;
  public comboStep = 0;
  public isHolstered = true;
  private idleHolsterTimer = 0;
  private drawPendingSwapTimer = 0;
  private comboResetTimer = 0;
  private fireCooldown = 0;
  public reloadSpeedMult = 1.0;
  public headshotDamageMult = 1.0;
  private mountGroup: THREE.Group;
  private pocketMount: THREE.Group | null = null;
  private backMount: THREE.Group | null = null;
  private currentModel: THREE.Group | null = null;
  private pocketDummyPistol: THREE.Group | null = null;
  private muzzleTip: THREE.Object3D;
  private physics: PhysicsWorld;
  private vfx: VFXSystem;

  public onShotFired?: (weapon: WeaponDef, pos: THREE.Vector3) => void;
  public onMeleeSwing?: (weapon: WeaponDef, comboStep: number) => void;
  public onWeaponDrawn?: (weapon: WeaponDef) => void;
  public onWeaponHolstered?: (weapon: WeaponDef) => void;
  public onHitConfirmed?: (isHeadshot: boolean) => void;
  public onHitDetails?: (info: {
    target: CombatHitTarget;
    hitPoint: THREE.Vector3;
    damage: number;
    isHeadshot: boolean;
    distance: number;
  }) => void;
  public onSafeZoneBlocked?: () => void;
  public onExplosion?: (pos: THREE.Vector3) => void;

  constructor(
    mountGroup: THREE.Group,
    physics: PhysicsWorld,
    vfx: VFXSystem,
    pocketMount?: THREE.Group,
    backMount?: THREE.Group
  ) {
    this.mountGroup = mountGroup;
    this.pocketMount = pocketMount || null;
    this.backMount = backMount || null;
    this.physics = physics;
    this.vfx = vfx;
    this.muzzleTip = new THREE.Object3D();
    this.mountGroup.add(this.muzzleTip);

    for (const def of WEAPON_DEFS) {
      const startsUnlocked = def.price === 0;
      this.states.set(def.id, {
        unlocked: startsUnlocked,
        mag: def.magSize,
        reserve: startsUnlocked ? Math.floor(def.reserveMax * 0.65) : 0
      });
    }
    this.isHolstered = true;
    this.currentId = 'pistol';
    this.rebuildModel();
    this.attachModelToActiveMount();
  }

  public setMountGroups(handMount: THREE.Group, pocketMount?: THREE.Group, backMount?: THREE.Group): void {
    if (this.currentModel && this.currentModel.parent) {
      this.currentModel.parent.remove(this.currentModel);
    }
    if (this.pocketDummyPistol && this.pocketDummyPistol.parent) {
      this.pocketDummyPistol.parent.remove(this.pocketDummyPistol);
    }
    this.mountGroup.remove(this.muzzleTip);
    this.mountGroup = handMount;
    if (pocketMount) this.pocketMount = pocketMount;
    if (backMount) this.backMount = backMount;
    this.mountGroup.add(this.muzzleTip);
    this.attachModelToActiveMount();
  }

  public setMountGroup(newMount: THREE.Group): void {
    this.setMountGroups(newMount);
  }

  private isPocketSidearm(id: WeaponId): boolean {
    return id === 'pistol' || id === 'silenced_pistol' || id === 'deagle' || id === 'dual_uzi';
  }

  private attachModelToActiveMount(): void {
    if (!this.currentModel) return;
    if (this.currentModel.parent) this.currentModel.parent.remove(this.currentModel);
    if (this.pocketDummyPistol && this.pocketDummyPistol.parent) {
      this.pocketDummyPistol.parent.remove(this.pocketDummyPistol);
    }

    const def = this.getCurrentDef();
    if (def.category === 'firearm' && this.isHolstered) {
      const holster = this.isPocketSidearm(def.id) ? this.pocketMount : (this.backMount || this.pocketMount);
      if (holster) {
        holster.add(this.currentModel);
      } else {
        this.mountGroup.add(this.currentModel);
      }
    } else {
      this.mountGroup.add(this.currentModel);
      // Even when using fists/melee or carrying a long gun, keep a sidearm visibly tucked in right pocket!
      if ((def.category === 'melee' || !this.isPocketSidearm(def.id)) && this.pocketMount) {
        if (!this.pocketDummyPistol) {
          this.pocketDummyPistol = this.buildPocketSidearmMesh();
        }
        this.pocketMount.add(this.pocketDummyPistol);
      }
    }
  }

  private buildPocketSidearmMesh(): THREE.Group {
    const g = new THREE.Group();
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.3, metalness: 0.85 });
    const mattePolymer = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.72, metalness: 0.18 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.052, 0.22), gunMetal);
    slide.position.set(0, 0.04, -0.08);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.06), mattePolymer);
    grip.position.set(0, -0.05, 0.01);
    grip.rotation.x = 0.18;
    g.add(slide, grip);
    return g;
  }

  /** Pulls gun out of pocket/holster into player's shooting hand with draw animation! */
  public drawWeapon(): boolean {
    const def = this.getCurrentDef();
    if (def.category !== 'firearm') return false;
    this.idleHolsterTimer = 10.0;
    if (!this.isHolstered) return false;
    this.isHolstered = false;
    this.drawPendingSwapTimer = 0.13; // Swaps from pocket into right hand mid-draw!
    this.onWeaponDrawn?.(def);
    return true;
  }

  /** Stows firearm neatly back into hip pocket / back sling */
  public holsterWeapon(): void {
    const def = this.getCurrentDef();
    if (def.category !== 'firearm' || this.isHolstered) return;
    this.isHolstered = true;
    this.drawPendingSwapTimer = 0;
    this.attachModelToActiveMount();
    this.onWeaponHolstered?.(def);
  }

  public getCurrentDef(): WeaponDef {
    return WEAPON_DEFS.find((w) => w.id === this.currentId)!;
  }

  public getCurrentState(): WeaponRuntimeState {
    return this.states.get(this.currentId)!;
  }

  public unlock(id: WeaponId): void {
    const def = WEAPON_DEFS.find((w) => w.id === id);
    const st = this.states.get(id);
    if (!def || !st) return;
    st.unlocked = true;
    st.mag = def.magSize;
    st.reserve = Math.min(def.reserveMax, st.reserve + def.magSize * 3);
  }

  public addAmmo(id: WeaponId, amount: number): void {
    const def = WEAPON_DEFS.find((w) => w.id === id);
    const st = this.states.get(id);
    if (!def || !st) return;
    st.reserve = Math.min(def.reserveMax, st.reserve + amount);
  }

  public equip(id: WeaponId): boolean {
    const st = this.states.get(id);
    if (!st || !st.unlocked) return false;
    const prevId = this.currentId;
    const def = WEAPON_DEFS.find((w) => w.id === id)!;
    this.currentId = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.rebuildModel();

    if (def.category === 'firearm') {
      // Choosing a gun automatically takes it out of your pocket ready to shoot!
      const wasHolstered = this.isHolstered || prevId !== id;
      this.isHolstered = false;
      this.idleHolsterTimer = 10.0;
      if (wasHolstered) {
        // Brief reach-to-pocket before snapping into hand
        this.isHolstered = true;
        this.attachModelToActiveMount();
        this.isHolstered = false;
        this.drawPendingSwapTimer = 0.13;
        this.onWeaponDrawn?.(def);
      } else {
        this.attachModelToActiveMount();
      }
    } else {
      // Choosing melee/fists keeps your sidearm tucked visibly in your right hip pocket!
      this.isHolstered = true;
      this.drawPendingSwapTimer = 0;
      this.attachModelToActiveMount();
    }
    return true;
  }

  public equipBySlot(slot: number): boolean {
    const def = WEAPON_DEFS.find((w) => w.slot === slot);
    if (!def) return false;
    return this.equip(def.id);
  }

  private rebuildModel(): void {
    if (this.currentModel) {
      this.mountGroup.remove(this.currentModel);
    }
    const g = new THREE.Group();
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1d2129, roughness: 0.3, metalness: 0.85 });
    const mattePolymer = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.72, metalness: 0.18 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xd9a86c, roughness: 0.72 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xbec7d4, roughness: 0.22, metalness: 0.92 });
    const sightGlow = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.8 });

    let muzzleZ = -0.28;

    if (this.currentId === 'bat') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.34, 8), gripMat);
      handle.rotation.x = Math.PI / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.58), woodMat);
      blade.position.z = -0.44;
      g.add(handle, blade);
    } else if (this.currentId === 'knife') {
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.038, 0.14), mattePolymer);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.018), steelMat);
      guard.position.z = -0.07;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.038, 0.24), steelMat);
      blade.position.z = -0.19;
      g.add(grip, guard, blade);
    } else if (this.currentId === 'katana') {
      // Sandalwood Katana: wrapped tsuka hilt, bronze tsuba guard, gleaming long blade
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.28, 8), mattePolymer);
      hilt.rotation.x = Math.PI / 2;
      hilt.position.z = 0.06;
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.014, 14), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.88 }));
      tsuba.rotation.x = Math.PI / 2;
      tsuba.position.z = -0.08;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.88), steelMat);
      blade.position.set(0, 0.008, -0.52);
      const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.84), sightGlow);
      edgeGlow.position.set(0, -0.012, -0.52);
      g.add(hilt, tsuba, blade, edgeGlow);
    } else if (this.currentId === 'chain') {
      for (let i = 0; i < 6; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 10), steelMat);
        link.position.z = -i * 0.085;
        link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
        g.add(link);
      }
    } else if (this.currentId === 'pistol' || this.currentId === 'silenced_pistol') {
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.056, 0.24), gunMetal);
      slide.position.set(0, 0.045, -0.085);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.032, 0.22), mattePolymer);
      frame.position.set(0, 0.012, -0.075);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 8), steelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.044, -0.22);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.125, 0.062), mattePolymer);
      grip.position.set(0, -0.052, 0.01);
      grip.rotation.x = 0.18;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.065), mattePolymer);
      guard.position.set(0, -0.018, -0.055);
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.012), sightGlow);
      frontSight.position.set(0, 0.078, -0.19);
      g.add(slide, frame, barrel, grip, guard, frontSight);
      if (this.currentId === 'silenced_pistol') {
        const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.22, 12), mattePolymer);
        supp.rotation.x = Math.PI / 2;
        supp.position.set(0, 0.044, -0.35);
        g.add(supp);
        muzzleZ = -0.47;
      } else {
        muzzleZ = -0.27;
      }
    } else if (this.currentId === 'deagle') {
      // Heavy Chrome .50 Desert Eagle Hand Cannon
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.072, 0.31), steelMat);
      slide.position.set(0, 0.05, -0.12);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.038, 0.28), gunMetal);
      frame.position.set(0, 0.012, -0.1);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.072), mattePolymer);
      grip.position.set(0, -0.058, 0.015);
      grip.rotation.x = 0.2;
      const goldSight = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.016), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.5 }));
      goldSight.position.set(0, 0.092, -0.25);
      g.add(slide, frame, grip, goldSight);
      muzzleZ = -0.3;
    } else if (this.currentId === 'dual_uzi') {
      // High-RPM KR Market Micro-Uzi with extended stick mag & folding wire stock
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.26), gunMetal);
      body.position.set(0, 0.048, -0.08);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.14, 8), steelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.052, -0.26);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.054), mattePolymer);
      grip.position.set(0, -0.045, -0.02);
      const extMag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.04), gunMetal);
      extMag.position.set(0, -0.14, -0.02);
      g.add(body, barrel, grip, extMag);
      muzzleZ = -0.34;
    } else if (this.currentId === 'smg') {
      // Detailed Indira Compact Tactical SMG (receiver, suppressor barrel, foregrip, optic, extended mag)
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.088, 0.38), gunMetal);
      body.position.set(0, 0.045, -0.14);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 10), mattePolymer);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.045, -0.41);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.058), mattePolymer);
      grip.position.set(0, -0.04, 0.0);
      grip.rotation.x = 0.2;
      const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.095, 0.036), mattePolymer);
      foregrip.position.set(0, -0.035, -0.24);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.048), gunMetal);
      mag.position.set(0, -0.1, -0.14);
      mag.rotation.x = -0.12;
      const optic = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.044, 0.075), mattePolymer);
      optic.position.set(0, 0.11, -0.11);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.068, 0.22), mattePolymer);
      stock.position.set(0, 0.038, 0.14);
      g.add(body, barrel, grip, foregrip, mag, optic, stock);
      muzzleZ = -0.52;
    } else if (this.currentId === 'shotgun') {
      // Detailed Majestic Pump-Action Tactical Shotgun
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.082, 0.28), gunMetal);
      receiver.position.set(0, 0.045, -0.08);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.56, 10), gunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.068, -0.46);
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.48, 8), steelMat);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, 0.032, -0.42);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.062, 0.2), gripMat);
      pump.position.set(0, 0.028, -0.36);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.11, 0.058), mattePolymer);
      grip.position.set(0, -0.035, 0.01);
      grip.rotation.x = 0.24;
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.092, 0.28), gripMat);
      stock.position.set(0, 0.025, 0.18);
      g.add(receiver, barrel, magTube, pump, grip, stock);
      muzzleZ = -0.76;
    } else if (this.currentId === 'rifle') {
      // Detailed Kaveri Tactical Assault Rifle (receiver, handguard, scope, curved mag, muzzle brake, stock)
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.086, 0.34), gunMetal);
      rec.position.set(0, 0.048, -0.12);
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.32), mattePolymer);
      handguard.position.set(0, 0.048, -0.42);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), steelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.052, -0.66);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.055), mattePolymer);
      grip.position.set(0, -0.042, 0.0);
      grip.rotation.x = 0.22;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.21, 0.068), gunMetal);
      mag.position.set(0, -0.095, -0.2);
      mag.rotation.x = -0.24;
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.19, 10), mattePolymer);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.115, -0.14);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.098, 0.26), mattePolymer);
      stock.position.set(0, 0.035, 0.17);
      g.add(rec, handguard, barrel, grip, mag, scope, stock);
      muzzleZ = -0.79;
    } else if (this.currentId === 'sniper') {
      // Nandi .338 Marksman Sniper Rifle (long fluted barrel, muzzle brake, large tactical optic, bipod)
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.09, 0.44), new THREE.MeshStandardMaterial({ color: 0x3b4536, roughness: 0.65, metalness: 0.2 }));
      chassis.position.set(0, 0.045, -0.18);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.64, 10), gunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.062, -0.68);
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.08), steelMat);
      brake.position.set(0, 0.062, -1.02);
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.34, 12), mattePolymer);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.135, -0.18);
      const lensGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.4 }));
      lensGlow.rotation.x = Math.PI / 2;
      lensGlow.position.set(0, 0.135, -0.355);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.056), mattePolymer);
      grip.position.set(0, -0.042, 0.02);
      grip.rotation.x = 0.22;
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.11, 0.32), mattePolymer);
      stock.position.set(0, 0.03, 0.22);
      g.add(chassis, barrel, brake, scopeTube, lensGlow, grip, stock);
      muzzleZ = -1.08;
    } else if (this.currentId === 'lmg') {
      // Peenya M249 Heavy Squad LMG with green ammo box drum & heat-shroud barrel
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.115, 0.44), gunMetal);
      rec.position.set(0, 0.055, -0.16);
      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.42, 10), mattePolymer);
      shroud.rotation.x = Math.PI / 2;
      shroud.position.set(0, 0.062, -0.58);
      const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0x3f5436, roughness: 0.72 }));
      ammoBox.position.set(0, -0.075, -0.18);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.12, 0.058), mattePolymer);
      grip.position.set(0, -0.045, 0.04);
      grip.rotation.x = 0.22;
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.11, 0.26), mattePolymer);
      stock.position.set(0, 0.04, 0.2);
      g.add(rec, shroud, ammoBox, grip, stock);
      muzzleZ = -0.82;
    } else if (this.currentId === 'launcher') {
      // ORR Tactical 40mm Revolving Grenade Launcher
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.48, 12), gunMetal);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.062, -0.42);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.19, 14), mattePolymer);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, 0.048, -0.12);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.0 }));
      band.position.set(0, 0.062, -0.62);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.125, 0.058), mattePolymer);
      grip.position.set(0, -0.05, 0.04);
      grip.rotation.x = 0.2;
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.26), mattePolymer);
      stock.position.set(0, 0.035, 0.19);
      g.add(tube, drum, band, grip, stock);
      muzzleZ = -0.68;
    }

    this.muzzleTip.position.set(0, 0.05, muzzleZ);
    if (this.currentModel && this.currentModel.parent) {
      this.currentModel.parent.remove(this.currentModel);
    }
    this.currentModel = g;
    this.attachModelToActiveMount();
  }

  public startReload(): void {
    const def = this.getCurrentDef();
    const st = this.getCurrentState();
    if (def.category !== 'firearm' || this.reloading) return;
    if (st.mag >= def.magSize || st.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = def.reloadTime / Math.max(0.5, this.reloadSpeedMult);
  }

  public update(dt: number, isCombatActive = false): void {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    if (this.drawPendingSwapTimer > 0) {
      this.drawPendingSwapTimer -= dt;
      if (this.drawPendingSwapTimer <= 0) {
        this.attachModelToActiveMount();
      }
    }

    const curDef = this.getCurrentDef();
    if (curDef.category === 'firearm' && !this.isHolstered) {
      if (isCombatActive || this.reloading) {
        this.idleHolsterTimer = 10.0;
      } else {
        this.idleHolsterTimer -= dt;
        if (this.idleHolsterTimer <= 0) {
          this.holsterWeapon();
        }
      }
    }

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const def = this.getCurrentDef();
        const st = this.getCurrentState();
        const needed = def.magSize - st.mag;
        const take = Math.min(needed, st.reserve);
        st.mag += take;
        st.reserve -= take;
        this.reloading = false;
      }
    }
  }

  public tryGrab(
    playerPos: THREE.Vector3,
    playerForward: THREE.Vector3,
    isSafeZone: boolean,
    targets: CombatHitTarget[]
  ): boolean {
    if (this.fireCooldown > 0) return false;
    if (isSafeZone) {
      this.onSafeZoneBlocked?.();
      return false;
    }

    let nearest: CombatHitTarget | null = null;
    let nearestDist = 2.9;
    for (const t of targets) {
      const d = Math.hypot(t.position.x - playerPos.x, t.position.z - playerPos.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    if (!nearest) return false;

    this.fireCooldown = 0.65;
    const throwDir = playerForward.clone().normalize();
    nearest.applyHit(48, throwDir, 22, false);
    this.vfx.spawnSparks(
      nearest.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      throwDir.clone().negate(),
      10,
      0x38e8ff
    );
    this.onHitConfirmed?.(false);
    return true;
  }

  /**
   * Acquires the exact person currently under (or closest to) the crosshair ray,
   * returning exact 3D hit point, distance, and whether it is a HEAD or BODY lock.
   */
  public acquireAimTarget(
    aimOrigin: THREE.Vector3,
    aimDir: THREE.Vector3,
    targets: CombatHitTarget[],
    excludeCollider: any
  ): { aimTarget: AimTargetInfo | null; worldPoint: THREE.Vector3 | null; worldDist: number } {
    const maxRange = Math.max(95, this.getCurrentDef().range);
    const worldHit = this.physics.castRay(aimOrigin, aimDir, maxRange, excludeCollider);
    const maxDist = worldHit ? worldHit.distance : maxRange;

    let best: AimTargetInfo | null = null;
    let bestDist = maxDist;

    // 1. Direct precise ray intersection on person's head/body cylinder
    for (const t of targets) {
      const res = intersectRayCylinder(aimOrigin, aimDir, t.position, t.radius + 0.34, t.height, bestDist);
      if (res) {
        bestDist = res.dist;
        best = {
          target: t,
          hitPoint: res.point,
          distance: res.dist,
          isHeadshot: res.point.y > t.position.y + t.height * 0.72
        };
      }
    }

    // 2. Soft cone target acquisition (shows shooting position bracket when aiming near a person)
    if (!best) {
      let bestConeScore = Infinity;
      for (const t of targets) {
        const chest = new THREE.Vector3(t.position.x, t.position.y + t.height * 0.68, t.position.z);
        const toT = chest.clone().sub(aimOrigin);
        const dist = toT.length();
        if (dist < 1.2 || dist > maxDist) continue;
        const dirT = toT.divideScalar(dist);
        const dot = dirT.dot(aimDir);
        if (dot < 0.988) continue; // ~8.8 degree cone around crosshair
        const score = (1 - dot) * dist;
        if (score < bestConeScore) {
          bestConeScore = score;
          best = {
            target: t,
            hitPoint: chest,
            distance: dist,
            isHeadshot: false
          };
        }
      }
    }

    return {
      aimTarget: best,
      worldPoint: best ? best.hitPoint : worldHit ? worldHit.point : null,
      worldDist: best ? best.distance : worldHit ? worldHit.distance : maxRange
    };
  }

  public tryAttack(
    aimOrigin: THREE.Vector3,
    aimDir: THREE.Vector3,
    playerPos: THREE.Vector3,
    playerForward: THREE.Vector3,
    isAiming: boolean,
    justPressed: boolean,
    isSafeZone: boolean,
    targets: CombatHitTarget[],
    excludeCollider: any,
    isScoped = false
  ): { fired: boolean; recoilPitch: number; recoilYaw: number; melee: boolean } {
    const def = this.getCurrentDef();
    if (this.fireCooldown > 0 || this.reloading) {
      return { fired: false, recoilPitch: 0, recoilYaw: 0, melee: false };
    }
    if (!def.auto && !justPressed) {
      return { fired: false, recoilPitch: 0, recoilYaw: 0, melee: false };
    }

    // Strictly honor Sacred Safe Zones (temples, mosques, churches)
    if (isSafeZone) {
      if (justPressed) this.onSafeZoneBlocked?.();
      return { fired: false, recoilPitch: 0, recoilYaw: 0, melee: false };
    }

    if (def.category === 'melee') {
      this.fireCooldown = 1 / def.fireRate;
      this.comboStep = (this.comboStep % 3) + 1;
      this.comboResetTimer = 1.1;
      this.onMeleeSwing?.(def, this.comboStep);

      const comboMult = this.comboStep === 3 ? 1.55 : 1.0;
      const hitCenter = playerPos.clone().add(new THREE.Vector3(0, 1.1, 0)).addScaledVector(playerForward, 1.2);

      for (const t of targets) {
        const toT = t.position.clone().sub(playerPos);
        const dist = Math.hypot(toT.x, toT.z);
        if (dist > def.range + t.radius) continue;
        const fwdDot = toT.normalize().dot(playerForward);
        if (fwdDot < 0.25 && dist > 1.2) continue;
        t.applyHit(def.damage * comboMult, playerForward, def.knockback * comboMult, false);
        this.vfx.spawnSparks(t.position.clone().add(new THREE.Vector3(0, 1.2, 0)), playerForward.clone().negate(), 6, 0xffd166);
        this.onHitConfirmed?.(false);
      }

      // Check world obstacle sparks for bat/chain clanks
      const worldHit = this.physics.castRay(hitCenter, playerForward, 1.4, excludeCollider);
      if (worldHit) {
        this.vfx.spawnSparks(worldHit.point, worldHit.normal, 5, 0xffb347);
      }
      return { fired: true, recoilPitch: 0, recoilYaw: 0, melee: true };
    }

    // Firearm — auto-draw out of pocket if player starts firing!
    if (this.isHolstered || this.drawPendingSwapTimer > 0) {
      if (this.isHolstered) {
        this.drawWeapon();
      }
      this.drawPendingSwapTimer = 0;
      this.attachModelToActiveMount();
    }
    this.idleHolsterTimer = 10.0;

    const st = this.getCurrentState();
    if (st.mag <= 0) {
      this.startReload();
      return { fired: false, recoilPitch: 0, recoilYaw: 0, melee: false };
    }

    st.mag--;
    this.fireCooldown = 1 / def.fireRate;

    const muzzlePos = new THREE.Vector3();
    this.muzzleTip.getWorldPosition(muzzlePos);
    this.vfx.spawnMuzzleFlash(muzzlePos);
    this.onShotFired?.(def, muzzlePos);

    const spreadScale = isScoped ? 0.08 : isAiming ? 0.35 : 1.0;
    let anyHit = false;
    let anyHeadshot = false;
    let primaryHitInfo: {
      target: CombatHitTarget;
      hitPoint: THREE.Vector3;
      damage: number;
      isHeadshot: boolean;
      distance: number;
    } | null = null;

    for (let p = 0; p < def.pellets; p++) {
      const dir = aimDir.clone();
      const s = def.spread * spreadScale;
      dir.x += (Math.random() - 0.5) * s * 2;
      dir.y += (Math.random() - 0.5) * s * 2;
      dir.z += (Math.random() - 0.5) * s * 2;
      dir.normalize();

      // Test world obstacle distance first
      const worldHit = this.physics.castRay(aimOrigin, dir, def.range, excludeCollider);
      const maxDist = worldHit ? worldHit.distance : def.range;

      // Test combat targets along ray (cylinder intersection for crisp headshots & torso hits)
      let hitTarget: CombatHitTarget | null = null;
      let hitDist = maxDist;
      let hitPoint = worldHit ? worldHit.point : aimOrigin.clone().addScaledVector(dir, def.range);
      let headshot = false;

      for (const t of targets) {
        const res = intersectRayCylinder(aimOrigin, dir, t.position, t.radius + 0.24, t.height, hitDist);
        if (res) {
          hitDist = res.dist;
          hitPoint = res.point;
          hitTarget = t;
          headshot = res.point.y > t.position.y + t.height * 0.72;
        }
      }

      this.vfx.spawnTracer(muzzlePos, hitPoint, def.explosiveRadius ? 0xff7b29 : 0xffd97d);

      if (def.explosiveRadius) {
        // Explosive splash damage + dramatic spark/fireball burst!
        this.vfx.spawnSparks(hitPoint, new THREE.Vector3(0, 1, 0), 28, 0xff6b2b);
        this.vfx.spawnSparks(hitPoint, new THREE.Vector3(0, 1, 0), 16, 0xffe066);
        this.onExplosion?.(hitPoint);
        for (const t of targets) {
          const distExp = t.position.distanceTo(hitPoint);
          if (distExp <= def.explosiveRadius) {
            const falloff = 1 - (distExp / def.explosiveRadius) * 0.55;
            const blastDir = t.position.clone().sub(hitPoint).setY(0.4).normalize();
            t.applyHit(def.damage * falloff, blastDir, def.knockback * falloff, false);
            anyHit = true;
          }
        }
      } else if (hitTarget) {
        const dmg = def.damage * (headshot ? 2.1 * this.headshotDamageMult : 1.0);
        hitTarget.applyHit(dmg, dir, def.knockback, headshot);
        this.vfx.spawnSparks(hitPoint, dir.clone().negate(), headshot ? 10 : 5, headshot ? 0xff4757 : 0xffc857);
        anyHit = true;
        if (headshot) anyHeadshot = true;
        if (!primaryHitInfo) {
          primaryHitInfo = { target: hitTarget, hitPoint, damage: dmg, isHeadshot: headshot, distance: hitDist };
        } else {
          primaryHitInfo.damage += dmg;
          if (headshot) primaryHitInfo.isHeadshot = true;
        }
      } else if (worldHit) {
        this.vfx.spawnSparks(worldHit.point, worldHit.normal, 5, 0xffd07a);
        this.vfx.spawnDecal(worldHit.point, worldHit.normal);
      }
    }

    if (anyHit) this.onHitConfirmed?.(anyHeadshot);
    if (primaryHitInfo) this.onHitDetails?.(primaryHitInfo);
    if (st.mag === 0 && st.reserve > 0) this.startReload();

    return {
      fired: true,
      recoilPitch: def.recoilPitch * (isAiming ? 0.65 : 1.0),
      recoilYaw: (Math.random() - 0.5) * def.recoilYaw * 2,
      melee: false
    };
  }
}

function intersectRayCylinder(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  basePos: THREE.Vector3,
  radius: number,
  height: number,
  maxDist: number
): { dist: number; point: THREE.Vector3 } | null {
  const ox = origin.x - basePos.x;
  const oz = origin.z - basePos.z;
  const a = dir.x * dir.x + dir.z * dir.z;
  if (a < 1e-6) return null;
  const b = 2 * (ox * dir.x + oz * dir.z);
  const c = ox * ox + oz * oz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0.4 || t > maxDist) return null;
  const py = origin.y + dir.y * t;
  if (py < basePos.y || py > basePos.y + height) return null;
  return {
    dist: t,
    point: new THREE.Vector3(origin.x + dir.x * t, py, origin.z + dir.z * t)
  };
}
