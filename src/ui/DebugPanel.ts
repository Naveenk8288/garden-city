import { BENGALURU_ZONES, ZoneId } from '../world/bengaluruData';
import { gdIconHTML, GD_PALETTE } from './GDIcon';

export interface DebugPanelHooks {
  getStats: () => {
    fps: number;
    chunks: number;
    npcs: number;
    vehicles: number;
    cash: number;
    loyalty: number;
    power: number;
    chapterLabel: string;
    holstered: boolean;
  };
  onGiveCash: (amount: number) => void;
  onSpawnEnemies: () => void;
  onTeleportZone: (zone: ZoneId) => void;
  onTriggerDialogueTest: () => void;
  onTriggerCutsceneTest: () => void;
  onCompleteMission: () => void;
  onTriggerEnding: (ending: 'loyalty' | 'power') => void;
  onToggle?: () => void;
}

/**
 * Toggleable F3 Developer & QA Debug Panel styled with GDIcon & Neon Palette
 * (#0B0F1A, #FF2E88, #00E5C3, #FFB020).
 */
export class DebugPanel {
  public isOpen = false;
  private root: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private hooks: DebugPanelHooks;
  private accum = 0;

  constructor(hooks: DebugPanelHooks) {
    this.hooks = hooks;

    this.root = document.createElement('div');
    this.root.id = 'gd-debug-panel';
    this.root.className = 'gd-debug-panel hidden';
    this.root.innerHTML = `
      <div class="gd-debug-head">
        <span>${gdIconHTML('debug', 16, GD_PALETTE.pink)} <b>DEBUG OVERLAY [F3]</b></span>
        <button id="gd-dbg-close" class="gd-mini-btn">✕</button>
      </div>
      <div id="gd-dbg-stats" class="gd-debug-stats"></div>
      <div class="gd-debug-actions">
        <button id="gd-dbg-cash" class="gd-mini-btn">${gdIconHTML('cash', 13, GD_PALETTE.amber)} +₹10,000</button>
        <button id="gd-dbg-spawn" class="gd-mini-btn">${gdIconHTML('skull', 13, GD_PALETTE.pink)} Spawn Rivals</button>
        <button id="gd-dbg-dlg" class="gd-mini-btn">${gdIconHTML('dialogue', 13, GD_PALETTE.cyan)} Test Dialogue</button>
        <button id="gd-dbg-cut" class="gd-mini-btn">${gdIconHTML('cutscene', 13, GD_PALETTE.amber)} Play Cutscene</button>
        <button id="gd-dbg-complete" class="gd-mini-btn">${gdIconHTML('trophy', 13, GD_PALETTE.cyan)} Complete Mission</button>
        <button id="gd-dbg-end-l" class="gd-mini-btn">${gdIconHTML('loyalty', 13, GD_PALETTE.cyan)} Loyalty Ending</button>
        <button id="gd-dbg-end-p" class="gd-mini-btn">${gdIconHTML('power', 13, GD_PALETTE.pink)} Power Ending</button>
      </div>
      <div class="gd-debug-sub">TELEPORT TO BENGALURU ZONE</div>
      <div id="gd-dbg-zones" class="gd-debug-zones"></div>
    `;
    document.body.appendChild(this.root);
    this.statsEl = this.root.querySelector('#gd-dbg-stats') as HTMLDivElement;

    this.root.querySelector('#gd-dbg-close')?.addEventListener('click', () => this.toggle(false));
    this.root.querySelector('#gd-dbg-cash')?.addEventListener('click', () => this.hooks.onGiveCash(10000));
    this.root.querySelector('#gd-dbg-spawn')?.addEventListener('click', () => this.hooks.onSpawnEnemies());
    this.root.querySelector('#gd-dbg-dlg')?.addEventListener('click', () => this.hooks.onTriggerDialogueTest());
    this.root.querySelector('#gd-dbg-cut')?.addEventListener('click', () => this.hooks.onTriggerCutsceneTest());
    this.root.querySelector('#gd-dbg-complete')?.addEventListener('click', () => this.hooks.onCompleteMission());
    this.root.querySelector('#gd-dbg-end-l')?.addEventListener('click', () => this.hooks.onTriggerEnding('loyalty'));
    this.root.querySelector('#gd-dbg-end-p')?.addEventListener('click', () => this.hooks.onTriggerEnding('power'));

    const zonesBox = this.root.querySelector('#gd-dbg-zones') as HTMLDivElement;
    for (const z of BENGALURU_ZONES) {
      const btn = document.createElement('button');
      btn.className = 'gd-zone-chip';
      btn.textContent = z.name.split('/')[0].trim();
      btn.addEventListener('click', () => this.hooks.onTeleportZone(z.id));
      zonesBox.appendChild(btn);
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  public toggle(force?: boolean): void {
    this.isOpen = force ?? !this.isOpen;
    this.root.classList.toggle('hidden', !this.isOpen);
    if (this.isOpen) this.refreshStats();
    this.hooks.onToggle?.();
  }

  public update(dt: number): void {
    if (!this.isOpen) return;
    this.accum += dt;
    if (this.accum >= 0.35) {
      this.accum = 0;
      this.refreshStats();
    }
  }

  private refreshStats(): void {
    const s = this.hooks.getStats();
    const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const memStr = perfMem
      ? `${(perfMem.usedJSHeapSize / 1048576).toFixed(1)} / ${(perfMem.jsHeapSizeLimit / 1048576).toFixed(0)} MB`
      : 'N/A';

    this.statsEl.innerHTML = `
      <div><b>FPS:</b> <span style="color:${GD_PALETTE.cyan}">${s.fps}</span> &nbsp;|&nbsp; <b>Heap:</b> ${memStr}</div>
      <div><b>Tiles:</b> ${s.chunks} &nbsp;|&nbsp; <b>NPCs:</b> ${s.npcs} &nbsp;|&nbsp; <b>Vehicles:</b> ${s.vehicles}</div>
      <div><b>Cash:</b> ₹${s.cash.toLocaleString()} &nbsp;|&nbsp; <b>Gun:</b> ${s.holstered ? 'In Pocket' : 'Drawn'}</div>
      <div><b>Loyalty:</b> <span style="color:${GD_PALETTE.cyan}">${s.loyalty}</span> &nbsp;|&nbsp; <b>Power:</b> <span style="color:${GD_PALETTE.pink}">${s.power}</span></div>
      <div><b>Story:</b> ${s.chapterLabel}</div>
    `;
  }
}
