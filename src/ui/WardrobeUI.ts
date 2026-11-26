import { clearChildren, el } from '../security/SafeDOM';
import {
  CHARACTER_PRESETS,
  CharacterLoadout,
  DRESS_OPTIONS,
  FACE_OPTIONS,
  PANTS_OPTIONS,
  SHOES_OPTIONS,
  getPresetById
} from '../entities/CustomizationData';

type VaultTab = 'characters' | 'face' | 'dress' | 'pants' | 'shoes';

/**
 * Free Fire-style Character Selector & Wardrobe Vault Drawer.
 * Docks cleanly on the right while your 3D protagonist stands in full-body
 * turntable showcase view on the left so every Face, Dress, Pants, and Shoe change updates live!
 */
export class WardrobeUI {
  public isOpen = false;
  private modalEl: HTMLElement;
  private gridEl: HTMLElement;
  private perkTitleEl: HTMLElement;
  private perkDescEl: HTMLElement;
  private tabButtons: HTMLElement[] = [];
  private activeTab: VaultTab = 'characters';
  private loadout: CharacterLoadout;

  public onLoadoutChange?: (loadout: CharacterLoadout) => void;
  public onRotateToggle?: () => void;
  public onClose?: () => void;

  constructor(initialLoadout: CharacterLoadout) {
    this.loadout = { ...initialLoadout };
    this.modalEl = document.getElementById('wardrobe-modal')!;
    this.gridEl = document.getElementById('vault-grid')!;
    this.perkTitleEl = document.getElementById('vault-perk-title')!;
    this.perkDescEl = document.getElementById('vault-perk-desc')!;

    this.tabButtons = Array.from(document.querySelectorAll('.vault-tab')) as HTMLElement[];
    for (const btn of this.tabButtons) {
      btn.addEventListener('click', () => {
        this.activeTab = (btn.dataset.tab as VaultTab) || 'characters';
        this.render();
      });
    }

    document.getElementById('btn-vault-rotate')?.addEventListener('click', () => {
      this.onRotateToggle?.();
    });

    document.getElementById('btn-vault-random')?.addEventListener('click', () => {
      const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
      this.loadout = {
        presetId: pick(CHARACTER_PRESETS).id,
        faceId: pick(FACE_OPTIONS).id,
        dressId: pick(DRESS_OPTIONS).id,
        pantsId: pick(PANTS_OPTIONS).id,
        shoesId: pick(SHOES_OPTIONS).id
      };
      this.onLoadoutChange?.({ ...this.loadout });
      this.render();
    });

    document.getElementById('btn-vault-done')?.addEventListener('click', () => {
      this.setOpen(false);
      this.onClose?.();
    });
  }

  public getLoadout(): CharacterLoadout {
    return { ...this.loadout };
  }

  public setOpen(open: boolean): void {
    this.isOpen = open;
    this.modalEl.classList.toggle('hidden', !open);
    if (open) this.render();
  }

  private render(): void {
    for (const btn of this.tabButtons) {
      btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
    }

    const preset = getPresetById(this.loadout.presetId);
    this.perkTitleEl.textContent = `${preset.name} "${preset.codename}" • SKILL: ${preset.perkTitle}`;
    this.perkTitleEl.style.color = preset.accent;
    this.perkDescEl.textContent = `${preset.role} — ${preset.perkDesc}`;

    clearChildren(this.gridEl);

    if (this.activeTab === 'characters') {
      for (const p of CHARACTER_PRESETS) {
        const card = el(
          'button',
          {
            className: `vault-card${this.loadout.presetId === p.id ? ' selected' : ''}`,
            style: { borderLeftColor: p.accent },
            onClick: () => {
              this.loadout = { presetId: p.id, ...p.loadout };
              this.onLoadoutChange?.({ ...this.loadout });
              this.render();
            }
          },
          el(
            'div',
            { className: 'vc-top' },
            el('span', { className: 'vc-name' }, `${p.name} `, el('small', { text: p.codename, style: { color: p.accent } })),
            el('span', { className: 'vc-swatch', style: { background: p.accent } })
          ),
          el('div', { className: 'vc-tag', text: p.role }),
          el('div', { className: 'vc-perk', text: `⚡ ${p.perkTitle}: ${p.perkDesc}` })
        );
        this.gridEl.appendChild(card);
      }
      return;
    }

    const renderOptions = <T extends string>(
      items: Array<{ id: T; name: string; tag: string; swatch: string; accent?: string }>,
      currentId: T,
      onPick: (id: T) => void
    ) => {
      for (const item of items) {
        const swBg = item.accent
          ? `linear-gradient(135deg, ${item.swatch} 55%, ${item.accent} 100%)`
          : item.swatch;
        const card = el(
          'button',
          {
            className: `vault-card${currentId === item.id ? ' selected' : ''}`,
            onClick: () => {
              onPick(item.id);
              this.onLoadoutChange?.({ ...this.loadout });
              this.render();
            }
          },
          el(
            'div',
            { className: 'vc-top' },
            el('span', { className: 'vc-name', text: item.name }),
            el('span', { className: 'vc-swatch', style: { background: swBg } })
          ),
          el('div', { className: 'vc-tag', text: item.tag })
        );
        this.gridEl.appendChild(card);
      }
    };

    if (this.activeTab === 'face') {
      renderOptions(FACE_OPTIONS, this.loadout.faceId, (id) => { this.loadout.faceId = id; });
    } else if (this.activeTab === 'dress') {
      renderOptions(DRESS_OPTIONS, this.loadout.dressId, (id) => { this.loadout.dressId = id; });
    } else if (this.activeTab === 'pants') {
      renderOptions(PANTS_OPTIONS, this.loadout.pantsId, (id) => { this.loadout.pantsId = id; });
    } else if (this.activeTab === 'shoes') {
      renderOptions(SHOES_OPTIONS, this.loadout.shoesId, (id) => { this.loadout.shoesId = id; });
    }
  }
}
