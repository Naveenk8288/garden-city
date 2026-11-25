export interface InputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  crouch: boolean;
  crouchJustPressed: boolean;
  jumpPressed: boolean;
  rollPressed: boolean;
  grabPressed: boolean;
  interactPressed: boolean;
  reloadPressed: boolean;
  aim: boolean;
  fire: boolean;
  fireJustPressed: boolean;
  meleeBlock: boolean;
  handbrake: boolean;
  horn: boolean;
  radioNextPressed: boolean;
  weaponWheel: boolean;
  mapTogglePressed: boolean;
  metroTogglePressed: boolean;
  pauseTogglePressed: boolean;
  cameraFlipPressed: boolean;
  wardrobeTogglePressed: boolean;
  scopeTogglePressed: boolean;
  wheelDelta: number;
  weaponSlotPressed: number; // 0 = none, 1..8
  lookDeltaX: number;
  lookDeltaY: number;
}

export class InputManager {
  private keys = new Set<string>();
  private charKeys = new Set<string>();
  private justPressed = new Set<string>();
  private mouseButtons = new Set<number>();
  private mouseJustPressed = new Set<number>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheelDelta = 0;
  private lastCrouchTap = 0;
  private doubleTapCrouch = false;
  private draggingLook = false;

  public pointerLocked = false;
  public sensitivity = 1.0;
  public interactKey = 'KeyE';
  public uiBlocked = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.tabIndex = 0;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) {
        if (!this.uiBlocked) e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
        if (e.code === 'KeyC' || k === 'c') {
          const now = performance.now();
          if (now - this.lastCrouchTap < 320) {
            this.doubleTapCrouch = true;
          }
          this.lastCrouchTap = now;
        }
      }
      this.keys.add(e.code);
      this.charKeys.add(k);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.charKeys.delete(e.key.toLowerCase());
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.charKeys.clear();
      this.mouseButtons.clear();
      this.draggingLook = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (this.uiBlocked) return;
      canvas.focus();
      if (!this.pointerLocked) {
        try { canvas.requestPointerLock?.(); } catch { /* fallback drag look */ }
      }
      if (e.button === 0 || e.button === 2) {
        this.draggingLook = true;
      }
      if (!this.mouseButtons.has(e.button)) {
        this.mouseJustPressed.add(e.button);
      }
      this.mouseButtons.add(e.button);
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
      if (this.mouseButtons.size === 0) this.draggingLook = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (e.target === canvas) e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if ((this.pointerLocked || this.draggingLook) && !this.uiBlocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.uiBlocked) {
        this.wheelDelta += Math.sign(e.deltaY);
      }
    }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  public requestPointerLock(): void {
    if (!this.uiBlocked && document.pointerLockElement !== this.canvas) {
      this.canvas.focus();
      try { this.canvas.requestPointerLock?.(); } catch { /* ignore */ }
    }
  }

  public releasePointerLock(): void {
    if (document.pointerLockElement) {
      try { document.exitPointerLock?.(); } catch { /* ignore */ }
    }
  }

  public poll(dt: number): InputState {
    let moveX = 0;
    let moveZ = 0;
    if (!this.uiBlocked) {
      if (this.keys.has('KeyA') || this.charKeys.has('a') || this.keys.has('ArrowLeft')) moveX -= 1;
      if (this.keys.has('KeyD') || this.charKeys.has('d') || this.keys.has('ArrowRight')) moveX += 1;
      if (this.keys.has('KeyW') || this.charKeys.has('w') || this.keys.has('ArrowUp')) moveZ += 1;
      if (this.keys.has('KeyS') || this.charKeys.has('s') || this.keys.has('ArrowDown')) moveZ -= 1;
    }

    let lookDeltaX = this.mouseDX * 0.0022 * this.sensitivity;
    let lookDeltaY = this.mouseDY * 0.0022 * this.sensitivity;
    this.mouseDX = 0;
    this.mouseDY = 0;

    let gpJump = false;
    let gpFire = false;
    let gpAim = false;
    let gpSprint = false;
    let gpCrouch = false;
    let gpInteract = false;

    // Gamepad support (Standard XInput / DualSense layout)
    if (!this.uiBlocked && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      const gp = pads[0];
      if (gp) {
        const dz = (v: number) => (Math.abs(v) > 0.16 ? v : 0);
        const lx = dz(gp.axes[0] || 0);
        const ly = dz(gp.axes[1] || 0);
        if (Math.abs(lx) > 0 || Math.abs(ly) > 0) {
          moveX = lx;
          moveZ = -ly;
        }
        const rx = dz(gp.axes[2] || 0);
        const ry = dz(gp.axes[3] || 0);
        lookDeltaX += rx * 2.4 * dt * this.sensitivity;
        lookDeltaY += ry * 1.8 * dt * this.sensitivity;

        gpJump = Boolean(gp.buttons[0]?.pressed);
        gpCrouch = Boolean(gp.buttons[1]?.pressed);
        gpInteract = Boolean(gp.buttons[2]?.pressed);
        gpAim = (gp.buttons[6]?.value || 0) > 0.3;
        gpFire = (gp.buttons[7]?.value || 0) > 0.3;
        gpSprint = Boolean(gp.buttons[10]?.pressed);
      }
    }

    let weaponSlotPressed = 0;
    for (let i = 1; i <= 8; i++) {
      if (this.justPressed.has(`Digit${i}`)) weaponSlotPressed = i;
    }

    const state: InputState = {
      moveX,
      moveZ,
      sprint: !this.uiBlocked && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || gpSprint),
      crouch: !this.uiBlocked && (this.keys.has('KeyC') || gpCrouch),
      crouchJustPressed: !this.uiBlocked && this.justPressed.has('KeyC'),
      jumpPressed: !this.uiBlocked && (this.justPressed.has('Space') || gpJump),
      rollPressed: !this.uiBlocked && (this.justPressed.has('AltLeft') || this.justPressed.has('ControlLeft') || this.doubleTapCrouch),
      grabPressed: !this.uiBlocked && this.justPressed.has('KeyG'),
      interactPressed: !this.uiBlocked && (this.justPressed.has(this.interactKey) || gpInteract),
      reloadPressed: !this.uiBlocked && this.justPressed.has('KeyR'),
      aim: !this.uiBlocked && (this.mouseButtons.has(2) || gpAim),
      fire: !this.uiBlocked && (this.mouseButtons.has(0) || gpFire),
      fireJustPressed: !this.uiBlocked && this.mouseJustPressed.has(0),
      meleeBlock: !this.uiBlocked && this.mouseButtons.has(2),
      handbrake: !this.uiBlocked && this.keys.has('Space'),
      horn: !this.uiBlocked && this.keys.has('KeyH'),
      radioNextPressed: !this.uiBlocked && this.justPressed.has('KeyX'),
      weaponWheel: this.keys.has('KeyQ'),
      mapTogglePressed: this.justPressed.has('Tab'),
      metroTogglePressed: this.justPressed.has('KeyM'),
      pauseTogglePressed: this.justPressed.has('Escape'),
      cameraFlipPressed: !this.uiBlocked && this.justPressed.has('KeyV'),
      wardrobeTogglePressed: this.justPressed.has('KeyK'),
      scopeTogglePressed: !this.uiBlocked && (this.justPressed.has('KeyZ') || this.mouseJustPressed.has(1)),
      wheelDelta: this.wheelDelta,
      weaponSlotPressed,
      lookDeltaX,
      lookDeltaY
    };

    this.justPressed.clear();
    this.mouseJustPressed.clear();
    this.wheelDelta = 0;
    this.doubleTapCrouch = false;
    return state;
  }
}
