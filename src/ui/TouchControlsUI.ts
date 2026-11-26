export interface TouchInputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  fire: boolean;
  fireJustPressed: boolean;
  aim: boolean;
  jumpPressed: boolean;
  interactPressed: boolean;
  reloadPressed: boolean;
  holsterTogglePressed: boolean;
  handbrake: boolean;
  weaponWheel: boolean;
  mapTogglePressed: boolean;
  metroTogglePressed: boolean;
  pauseTogglePressed: boolean;
}

export type TouchModePref = 'auto' | 'on' | 'off';

/**
 * Responsive Mobile & Tablet Touch Controls for Android & iOS installed apps:
 * - Left floating joystick (push past 82% to sprint)
 * - Right-half touch drag to look/aim camera
 * - Action cluster (FIRE, AIM, JUMP/DRIFT, USE [E], RELOAD, GUN) + Top bar (MAP, METRO, ARSENAL, PAUSE)
 */
export class TouchControlsUI {
  public isTouchDevice: boolean;
  public mode: TouchModePref = 'auto';
  public visible = false;

  private root: HTMLDivElement;
  private stickBase: HTMLDivElement;
  private stickKnob: HTMLDivElement;
  private lookZone: HTMLDivElement;
  private useBtn: HTMLButtonElement;

  private stickTouchId: number | null = null;
  private stickCenterX = 0;
  private stickCenterY = 0;
  private lookTouchId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;

  private state: TouchInputState = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
    fire: false,
    fireJustPressed: false,
    aim: false,
    jumpPressed: false,
    interactPressed: false,
    reloadPressed: false,
    holsterTogglePressed: false,
    handbrake: false,
    weaponWheel: false,
    mapTogglePressed: false,
    metroTogglePressed: false,
    pauseTogglePressed: false
  };

  constructor() {
    this.isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)')?.matches);

    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.className = 'touch-controls hidden';
    this.root.innerHTML = `
      <div id="touch-look-zone" class="touch-look-zone"></div>
      <div class="touch-top-bar">
        <button class="touch-pill-btn" data-tap="map">MAP</button>
        <button class="touch-pill-btn" data-tap="metro">METRO</button>
        <button class="touch-pill-btn" data-hold="weaponWheel">GUNS</button>
        <button class="touch-pill-btn" data-tap="pause">☰ MENU</button>
      </div>
      <div id="touch-stick-base" class="touch-stick-base">
        <div id="touch-stick-knob" class="touch-stick-knob"></div>
      </div>
      <div class="touch-action-pad">
        <button id="touch-btn-use" class="touch-btn touch-btn-use" data-tap="interact">USE</button>
        <button class="touch-btn touch-btn-aim" data-hold="aim">AIM</button>
        <button class="touch-btn touch-btn-jump" data-tap="jump" data-hold="handbrake">JUMP</button>
        <button class="touch-btn touch-btn-reload" data-tap="reload">RLD</button>
        <button class="touch-btn touch-btn-holster" data-tap="holster">DRAW</button>
        <button class="touch-btn touch-btn-fire" data-hold="fire">FIRE</button>
      </div>
    `;
    document.body.appendChild(this.root);

    this.stickBase = this.root.querySelector('#touch-stick-base') as HTMLDivElement;
    this.stickKnob = this.root.querySelector('#touch-stick-knob') as HTMLDivElement;
    this.lookZone = this.root.querySelector('#touch-look-zone') as HTMLDivElement;
    this.useBtn = this.root.querySelector('#touch-btn-use') as HTMLButtonElement;

    this.bindJoystick();
    this.bindLookPad();
    this.bindButtons();
  }

  public setMode(mode: TouchModePref): void {
    this.mode = mode;
  }

  public closeWeaponWheel(): void {
    this.state.weaponWheel = false;
  }

  public shouldShow(gameplayActive: boolean): boolean {
    if (!gameplayActive) return false;
    if (this.mode === 'on') return true;
    if (this.mode === 'off') return false;
    return this.isTouchDevice;
  }

  public syncVisibility(gameplayActive: boolean, promptText = ''): void {
    const show = this.shouldShow(gameplayActive);
    if (show !== this.visible) {
      this.visible = show;
      this.root.classList.toggle('hidden', !show);
      document.body.classList.toggle('touch-active', show);
      if (!show) this.resetAxes();
    }
    if (show) {
      this.useBtn.classList.toggle('highlight', Boolean(promptText));
    }
  }

  public consumeSnapshot(): TouchInputState {
    const snap: TouchInputState = { ...this.state };
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
    this.state.fireJustPressed = false;
    this.state.jumpPressed = false;
    this.state.interactPressed = false;
    this.state.reloadPressed = false;
    this.state.holsterTogglePressed = false;
    this.state.mapTogglePressed = false;
    this.state.metroTogglePressed = false;
    this.state.pauseTogglePressed = false;
    return snap;
  }

  private resetAxes(): void {
    this.stickTouchId = null;
    this.lookTouchId = null;
    this.state.moveX = 0;
    this.state.moveZ = 0;
    this.state.sprint = false;
    this.state.fire = false;
    this.state.aim = false;
    this.state.handbrake = false;
    this.state.weaponWheel = false;
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
  }

  private bindJoystick(): void {
    const maxRadius = 46;
    const updateStick = (clientX: number, clientY: number) => {
      const dx = clientX - this.stickCenterX;
      const dy = clientY - this.stickCenterY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(maxRadius, dist);
      const ang = Math.atan2(dy, dx);
      const kx = Math.cos(ang) * clamped;
      const ky = Math.sin(ang) * clamped;
      this.stickKnob.style.transform = `translate(calc(-50% + ${kx.toFixed(1)}px), calc(-50% + ${ky.toFixed(1)}px))`;

      const nx = kx / maxRadius;
      const ny = ky / maxRadius;
      this.state.moveX = Math.abs(nx) < 0.12 ? 0 : nx;
      this.state.moveZ = Math.abs(ny) < 0.12 ? 0 : -ny;
      this.state.sprint = clamped / maxRadius > 0.84;
    };

    this.stickBase.addEventListener('touchstart', (e) => {
      if (this.stickTouchId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      this.stickTouchId = t.identifier;
      const rect = this.stickBase.getBoundingClientRect();
      this.stickCenterX = rect.left + rect.width * 0.5;
      this.stickCenterY = rect.top + rect.height * 0.5;
      updateStick(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.stickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.stickTouchId) {
          updateStick(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: true });

    const endStick = (e: TouchEvent) => {
      if (this.stickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.stickTouchId) {
          this.stickTouchId = null;
          this.state.moveX = 0;
          this.state.moveZ = 0;
          this.state.sprint = false;
          this.stickKnob.style.transform = 'translate(-50%, -50%)';
          break;
        }
      }
    };
    window.addEventListener('touchend', endStick, { passive: true });
    window.addEventListener('touchcancel', endStick, { passive: true });
  }

  private bindLookPad(): void {
    this.lookZone.addEventListener('touchstart', (e) => {
      if (this.lookTouchId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      this.lookTouchId = t.identifier;
      this.lastLookX = t.clientX;
      this.lastLookY = t.clientY;
    }, { passive: false });

    this.lookZone.addEventListener('touchmove', (e) => {
      if (this.lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.lookTouchId) {
          e.preventDefault();
          this.state.lookDeltaX += (t.clientX - this.lastLookX) * 0.0052;
          this.state.lookDeltaY += (t.clientY - this.lastLookY) * 0.0042;
          this.lastLookX = t.clientX;
          this.lastLookY = t.clientY;
          break;
        }
      }
    }, { passive: false });

    const endLook = (e: TouchEvent) => {
      if (this.lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
    };
    this.lookZone.addEventListener('touchend', endLook, { passive: true });
    this.lookZone.addEventListener('touchcancel', endLook, { passive: true });
  }

  private bindButtons(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>('button[data-tap], button[data-hold]');
    buttons.forEach((btn) => {
      const tap = btn.dataset.tap;
      const hold = btn.dataset.hold;

      const press = (e: Event) => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (tap === 'jump') this.state.jumpPressed = true;
        else if (tap === 'interact') this.state.interactPressed = true;
        else if (tap === 'reload') this.state.reloadPressed = true;
        else if (tap === 'holster') this.state.holsterTogglePressed = true;
        else if (tap === 'map') this.state.mapTogglePressed = true;
        else if (tap === 'metro') this.state.metroTogglePressed = true;
        else if (tap === 'pause') this.state.pauseTogglePressed = true;

        if (hold === 'fire') {
          this.state.fire = true;
          this.state.fireJustPressed = true;
        } else if (hold === 'aim') {
          this.state.aim = true;
        } else if (hold === 'handbrake') {
          this.state.handbrake = true;
        } else if (hold === 'weaponWheel') {
          this.state.weaponWheel = !this.state.weaponWheel;
        }
      };

      const release = (e: Event) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (hold === 'fire') this.state.fire = false;
        else if (hold === 'aim') this.state.aim = false;
        else if (hold === 'handbrake') this.state.handbrake = false;
      };

      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });
  }
}
