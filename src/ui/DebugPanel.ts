import { BENGALURU_ZONES, ZoneId } from '../world/bengaluruData';
import { createGDIconElement, GD_PALETTE } from './GDIcon';
import { clearChildren, el } from '../security/SafeDOM';

export interface DebugPanelHooks {
  getStats: () => {
    fps: number;
    frameMs?: number;
    tier?: string;
    renderScale?: number;
    effectiveDpr?: number;
    drawCalls?: number;
    triangles?: number;
    gpu?: string;
    platform?: string;
    refreshHz?: number;
    battery?: string;
    powerSaver?: boolean;
    frameLimit?: number;
    chunks: number;
    npcs: number;
    vehicles: number;
    cash: number;
    loyalty: number;
    power: number;
    chapterLabel: string;
    holstered: boolean;
  };
  onSetQualityTier?: (tier: 'auto' | 'lite' | 'medium' | 'high') => void;
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
 * Toggleable F3 Developer & QA Debug Panel built with SafeDOM + GDIcon (zero innerHTML).
 */
export class DebugPanel {
  public isOpen = false;
  private root: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private hooks: DebugPanelHooks;
  private accum = 0;

  constructor(hooks: DebugPanelHooks) {
    this.hooks = hooks;
    this.statsEl = el('div', { id: 'gd-dbg-stats', className: 'gd-debug-stats' });

    const zonesBox = el('div', { id: 'gd-dbg-zones', className: 'gd-debug-zones' });
    for (const z of BENGALURU_ZONES) {
      zonesBox.appendChild(
        el('button', {
          className: 'gd-zone-chip',
          text: z.name.split('/')[0].trim(),
          onClick: () => this.hooks.onTeleportZone(z.id)
        })
      );
    }

    const tierBtn = (label: string, tier: 'auto' | 'lite' | 'medium' | 'high') =>
      el('button', {
        className: 'gd-mini-btn',
        text: label,
        onClick: () => {
          this.hooks.onSetQualityTier?.(tier);
          this.refreshStats();
        }
      });

    this.root = el(
      'div',
      { id: 'gd-debug-panel', className: 'gd-debug-panel hidden' },
      el(
        'div',
        { className: 'gd-debug-head' },
        el('span', {}, createGDIconElement('debug', 16, GD_PALETTE.pink), ' ', el('b', { text: 'DEBUG OVERLAY [F3]' })),
        el('button', { id: 'gd-dbg-close', className: 'gd-mini-btn', text: '✕', onClick: () => this.toggle(false) })
      ),
      this.statsEl,
      el('div', { className: 'gd-debug-sub', text: 'QUALITY TIER OVERRIDE (LIVE PROFILING)' }),
      el('div', { className: 'gd-debug-actions' }, tierBtn('AUTO', 'auto'), tierBtn('LITE', 'lite'), tierBtn('MEDIUM', 'medium'), tierBtn('HIGH', 'high')),
      el(
        'div',
        { className: 'gd-debug-actions' },
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onGiveCash(10000) }, createGDIconElement('cash', 13, GD_PALETTE.amber), ' +₹10,000'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onSpawnEnemies() }, createGDIconElement('skull', 13, GD_PALETTE.pink), ' Spawn Rivals'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onTriggerDialogueTest() }, createGDIconElement('dialogue', 13, GD_PALETTE.cyan), ' Test Dialogue'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onTriggerCutsceneTest() }, createGDIconElement('cutscene', 13, GD_PALETTE.amber), ' Play Cutscene'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onCompleteMission() }, createGDIconElement('trophy', 13, GD_PALETTE.cyan), ' Complete Mission'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onTriggerEnding('loyalty') }, createGDIconElement('loyalty', 13, GD_PALETTE.cyan), ' Loyalty Ending'),
        el('button', { className: 'gd-mini-btn', onClick: () => this.hooks.onTriggerEnding('power') }, createGDIconElement('power', 13, GD_PALETTE.pink), ' Power Ending')
      ),
      el('div', { className: 'gd-debug-sub', text: 'TELEPORT TO BENGALURU ZONE' }),
      zonesBox
    );
    document.body.appendChild(this.root);

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

    const tierLabel = (s.tier || 'HIGH').toUpperCase();
    const limitLabel = s.frameLimit && s.frameLimit > 0 ? `${s.frameLimit} FPS` : 'Uncapped';
    const gpuShort = (s.gpu || 'WebGL2').slice(0, 44);
    const trisStr = s.triangles ? `${(s.triangles / 1000).toFixed(1)}k` : '--';

    clearChildren(this.statsEl);
    this.statsEl.append(
      el(
        'div',
        {},
        el('b', { text: 'FPS: ' }),
        el('span', { text: String(s.fps), style: { color: GD_PALETTE.cyan } }),
        ` (${s.frameMs ?? '--'} ms • Cap: ${limitLabel}) | `,
        el('b', { text: 'Tier: ' }),
        el('span', { text: tierLabel, style: { color: GD_PALETTE.amber } })
      ),
      el(
        'div',
        {},
        el('b', { text: 'DRS: ' }), `${Math.round((s.renderScale ?? 1) * 100)}% | `,
        el('b', { text: 'DPR: ' }), `${s.effectiveDpr ?? 1}x | `,
        el('b', { text: 'Draws: ' }), el('span', { text: String(s.drawCalls ?? '--'), style: { color: GD_PALETTE.pink } }),
        ' | ', el('b', { text: 'Tris: ' }), trisStr
      ),
      el(
        'div',
        {},
        el('b', { text: 'Heap: ' }), `${memStr} | `,
        el('b', { text: 'Battery: ' }), `${s.battery || 'AC/N/A'}${s.powerSaver ? ' (Saver)' : ''}`
      ),
      el('div', {}, el('b', { text: 'Device: ' }), `${(s.platform || 'web').toUpperCase()} • ${s.refreshHz ?? 60}Hz • ${gpuShort}`),
      el(
        'div',
        {},
        el('b', { text: 'Tiles: ' }), `${s.chunks} | `,
        el('b', { text: 'NPCs: ' }), `${s.npcs} | `,
        el('b', { text: 'Vehicles: ' }), `${s.vehicles} | `,
        el('b', { text: 'Gun: ' }), s.holstered ? 'In Pocket' : 'Drawn'
      ),
      el(
        'div',
        {},
        el('b', { text: 'Cash: ' }), `₹${s.cash.toLocaleString()} | `,
        el('b', { text: 'Loyalty: ' }), el('span', { text: String(s.loyalty), style: { color: GD_PALETTE.cyan } }), ' | ',
        el('b', { text: 'Power: ' }), el('span', { text: String(s.power), style: { color: GD_PALETTE.pink } })
      ),
      el('div', {}, el('b', { text: 'Story: ' }), s.chapterLabel)
    );
  }
}
