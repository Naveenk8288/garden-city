import * as THREE from 'three';
import { AimTargetInfo, CombatHitTarget, WEAPON_DEFS, WeaponId, WeaponSystem } from '../combat/WeaponSystem';

/**
 * Manages the Weapon Wheel (Q / 1-8), Tactical Optical Scope Overlay ([Z] / RMB),
 * Live On-Person Shooting Position Bracket, 3D Red Laser Aim Dot, and Hit Callouts.
 */
export class WeaponUI {
  private wheelEl: HTMLElement;
  private slotsEl: HTMLElement;
  private hitmarkerEl: HTMLElement;
  private crosshairEl: HTMLElement;
  private scopeOverlayEl: HTMLElement;
  private scopeZoomEl: HTMLElement;
  private scopeRangeEl: HTMLElement;
  private scopeBadgeEl: HTMLElement;
  private targetLockEl: HTMLElement;
  private tlNameEl: HTMLElement;
  private tlZoneEl: HTMLElement;
  private tlPosEl: HTMLElement;
  private shotCalloutEl: HTMLElement;

  private hitTimer = 0;
  private calloutTimer = 0;
  private calloutWorldPos = new THREE.Vector3();
  private lastShotTarget: CombatHitTarget | null = null;
  private lastShotPos = new THREE.Vector3();
  private lastShotPinTimer = 0;
  private lastShotHeadshot = false;
  public isOpen = false;

  // 3D glowing red tactical laser aim dot placed directly on the exact shot point
  private laserDot: THREE.Mesh | null = null;

  constructor() {
    this.wheelEl = document.getElementById('weapon-wheel')!;
    this.slotsEl = document.getElementById('wheel-slots')!;
    this.hitmarkerEl = document.getElementById('hitmarker')!;
    this.crosshairEl = document.getElementById('crosshair')!;
    this.scopeOverlayEl = document.getElementById('scope-overlay')!;
    this.scopeZoomEl = document.getElementById('scope-zoom-label')!;
    this.scopeRangeEl = document.getElementById('scope-rangefinder')!;
    this.scopeBadgeEl = document.getElementById('hud-scope-badge')!;
    this.targetLockEl = document.getElementById('target-lock-hud')!;
    this.tlNameEl = document.getElementById('tl-name')!;
    this.tlZoneEl = document.getElementById('tl-zone')!;
    this.tlPosEl = document.getElementById('tl-pos')!;
    this.shotCalloutEl = document.getElementById('shot-callout')!;
  }

  public attachScene(scene: THREE.Scene): void {
    const geo = new THREE.SphereGeometry(0.065, 10, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff2e4c,
      depthTest: false,
      transparent: true,
      opacity: 0.92
    });
    this.laserDot = new THREE.Mesh(geo, mat);
    this.laserDot.renderOrder = 999;
    this.laserDot.visible = false;
    scene.add(this.laserDot);
  }

  public showHitmarker(headshot: boolean): void {
    this.hitTimer = 0.18;
    this.hitmarkerEl.classList.remove('hidden');
    this.hitmarkerEl.style.borderColor = headshot ? '#ff2e4c' : '#ffd166';
  }

  public showShotHit(info: {
    target: CombatHitTarget;
    hitPoint: THREE.Vector3;
    damage: number;
    isHeadshot: boolean;
    distance: number;
  }): void {
    // Keep shooting HUD clean: do not display target person details/coordinates on screen
    this.lastShotTarget = null;
    this.lastShotPinTimer = 0;
    this.calloutTimer = 0;
    this.shotCalloutEl.classList.add('hidden');
    this.targetLockEl.classList.add('hidden');
    void info;
  }

  public getPinnedShotWorldPos(): THREE.Vector3 | null {
    return this.lastShotPinTimer > 0 ? this.lastShotPos : null;
  }

  public setOpen(open: boolean, weapons: WeaponSystem, onSelect: (id: WeaponId) => void): void {
    if (this.isOpen === open) return;
    this.isOpen = open;
    this.wheelEl.classList.toggle('hidden', !open);
    if (open) {
      this.renderSlots(weapons, onSelect);
    }
  }

  private renderSlots(weapons: WeaponSystem, onSelect: (id: WeaponId) => void): void {
    this.slotsEl.innerHTML = '';
    for (const def of WEAPON_DEFS) {
      const st = weapons.states.get(def.id)!;
      const div = document.createElement('div');
      div.className = `wheel-slot${weapons.currentId === def.id ? ' active' : ''}${st.unlocked ? '' : ' locked'}`;
      const ammoTxt = def.category === 'melee'
        ? `DMG ${def.damage} • MELEE`
        : st.unlocked
          ? `${st.mag} / ${st.reserve}`
          : `LOCKED (₹${def.price})`;
      const keyLabel =
        def.slot <= 9 ? `[${def.slot}]` :
        def.slot === 10 ? '[0]' :
        def.slot === 11 ? '[-]' :
        def.slot === 12 ? '[=]' : '[Q]';
      div.innerHTML = `
        <div class="slot-key">${keyLabel} ${def.subType}</div>
        <div class="slot-name">${def.name}</div>
        <div class="slot-meta">${ammoTxt}</div>
      `;
      if (st.unlocked) {
        div.addEventListener('click', () => onSelect(def.id));
      }
      this.slotsEl.appendChild(div);
    }
  }

  public updateTargeting(
    dt: number,
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    isFirearm: boolean,
    isAiming: boolean,
    isScoped: boolean,
    scopeZoom: number,
    aimInfo: { aimTarget: AimTargetInfo | null; worldPoint: THREE.Vector3 | null; worldDist: number }
  ): void {
    // 1. Optical Scope Overlay & Clean Rangefinder (no other person details)
    this.scopeOverlayEl.classList.toggle('hidden', !isScoped);
    this.crosshairEl.classList.toggle('hidden', isScoped);
    if (isScoped) {
      this.scopeZoomEl.textContent = `OPTICAL SCOPE • ${scopeZoom.toFixed(1)}x`;
      this.scopeRangeEl.textContent = `RANGE: ${aimInfo.worldDist.toFixed(1)}m`;
    }

    // Scope HUD indicator pill
    if (!isFirearm) {
      this.scopeBadgeEl.textContent = 'MELEE (EQUIP GUN FOR SCOPE)';
      this.scopeBadgeEl.classList.remove('active');
    } else if (isScoped) {
      this.scopeBadgeEl.textContent = `[Z] SCOPE ON • ${scopeZoom.toFixed(1)}x [Scroll]`;
      this.scopeBadgeEl.classList.add('active');
    } else {
      this.scopeBadgeEl.textContent = '[Z] SCOPE: OFF (Mid-Click / Z)';
      this.scopeBadgeEl.classList.remove('active');
    }

    // 2. 3D Red Laser Aim Dot on exact aim point when aiming or scoped with firearm
    if (this.laserDot) {
      if (isFirearm && (isAiming || isScoped) && aimInfo.worldPoint) {
        this.laserDot.visible = true;
        this.laserDot.position.copy(aimInfo.worldPoint);
        const s = Math.max(0.7, Math.min(2.2, aimInfo.worldDist * 0.035));
        this.laserDot.scale.setScalar(s);
      } else {
        this.laserDot.visible = false;
      }
    }

    // 3. Keep target-lock person details & shot coordinate callouts hidden
    this.targetLockEl.classList.add('hidden');
    this.shotCalloutEl.classList.add('hidden');
    void dt;
    void camera;
    void playerPos;
  }

  public update(dt: number, weapons: WeaponSystem, isAiming: boolean): void {
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) this.hitmarkerEl.classList.add('hidden');
    }

    this.crosshairEl.classList.toggle('aiming', isAiming);

    const def = weapons.getCurrentDef();
    const st = weapons.getCurrentState();
    const nameEl = document.getElementById('hud-weapon-name');
    const ammoEl = document.getElementById('hud-weapon-ammo');
    if (nameEl) nameEl.textContent = def.name.toUpperCase();
    if (ammoEl) {
      if (def.category === 'melee') {
        ammoEl.textContent = weapons.comboStep > 0 ? `MELEE • COMBO x${weapons.comboStep}` : 'MELEE';
      } else if (weapons.reloading) {
        ammoEl.textContent = 'RELOADING...';
      } else {
        ammoEl.textContent = `${st.mag} / ${st.reserve}`;
      }
    }
  }
}
