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

    this.gridEl.innerHTML = '';

    if (this.activeTab === 'characters') {
      for (const p of CHARACTER_PRESETS) {
        const card = document.createElement('button');
        card.className = `vault-card${this.loadout.presetId === p.id ? ' selected' : ''}`;
        card.style.borderLeftColor = p.accent;
        card.innerHTML = `
          <div class="vc-top">
            <span class="vc-name">${p.name} <small style="color:${p.accent}">${p.codename}</small></span>
            <span class="vc-swatch" style="background:${p.accent}"></span>
          </div>
          <div class="vc-tag">${p.role}</div>
          <div class="vc-perk">⚡ ${p.perkTitle}: ${p.perkDesc}</div>
        `;
        card.addEventListener('click', () => {
          this.loadout = { presetId: p.id, ...p.loadout };
          this.onLoadoutChange?.({ ...this.loadout });
          this.render();
        });
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
        const card = document.createElement('button');
        card.className = `vault-card${currentId === item.id ? ' selected' : ''}`;
        const swBg = item.accent
          ? `linear-gradient(135deg, ${item.swatch} 55%, ${item.accent} 100%)`
          : item.swatch;
        card.innerHTML = `
          <div class="vc-top">
            <span class="vc-name">${item.name}</span>
            <span class="vc-swatch" style="background:${swBg}"></span>
          </div>
          <div class="vc-tag">${item.tag}</div>
        `;
        card.addEventListener('click', () => {
          onPick(item.id);
          this.onLoadoutChange?.({ ...this.loadout });
          this.render();
        });
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
