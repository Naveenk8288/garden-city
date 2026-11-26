import { NAMMA_METRO_STATIONS, MetroStationDef, ZoneDef } from '../world/bengaluruData';
import { WEAPON_DEFS, WeaponSystem } from '../combat/WeaponSystem';
import { clearChildren, el } from '../security/SafeDOM';

export type SubtitleLang = 'en' | 'kn' | 'hi';

export class ShopMetroUI {
  public metroOpen = false;
  public shopOpen = false;
  public subtitleLang: SubtitleLang = 'en';

  private metroModal: HTMLElement;
  private metroList: HTMLElement;
  private shopModal: HTMLElement;
  private shopItems: HTMLElement;
  private subBox: HTMLElement;
  private subSpeaker: HTMLElement;
  private subText: HTMLElement;
  private toastEl: HTMLElement;

  private subTimer = 0;
  private toastTimer = 0;

  public onMetroSelect?: (stn: MetroStationDef) => void;
  public onCloseModal?: () => void;

  constructor() {
    this.metroModal = document.getElementById('metro-modal')!;
    this.metroList = document.getElementById('metro-station-list')!;
    this.shopModal = document.getElementById('shop-modal')!;
    this.shopItems = document.getElementById('shop-items')!;
    this.subBox = document.getElementById('hud-subtitle')!;
    this.subSpeaker = document.getElementById('hud-sub-speaker')!;
    this.subText = document.getElementById('hud-sub-text')!;
    this.toastEl = document.getElementById('hud-toast')!;

    document.getElementById('btn-close-metro')?.addEventListener('click', () => this.closeAll());
    document.getElementById('btn-close-shop')?.addEventListener('click', () => this.closeAll());
  }

  public showToast(msg: string, duration = 3.2): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = duration;
  }

  public showSubtitle(speaker: string, en: string, kn: string, hi: string, duration = 5.0): void {
    this.subSpeaker.textContent = speaker;
    if (this.subtitleLang === 'kn') {
      this.subText.textContent = `${kn} — (${en})`;
    } else if (this.subtitleLang === 'hi') {
      this.subText.textContent = `${hi} — (${en})`;
    } else {
      this.subText.textContent = en;
    }
    this.subBox.classList.remove('hidden');
    this.subTimer = duration;
  }

  public update(dt: number): void {
    if (this.subTimer > 0) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) this.subBox.classList.add('hidden');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.add('hidden');
    }
  }

  public closeAll(): void {
    this.metroOpen = false;
    this.shopOpen = false;
    this.metroModal.classList.add('hidden');
    this.shopModal.classList.add('hidden');
    this.onCloseModal?.();
  }

  public openMetro(): void {
    this.metroOpen = true;
    this.shopOpen = false;
    this.shopModal.classList.add('hidden');
    this.metroModal.classList.remove('hidden');

    clearChildren(this.metroList);
    for (const stn of NAMMA_METRO_STATIONS) {
      const btn = el(
        'button',
        {
          className: 'metro-btn',
          onClick: () => {
            this.onMetroSelect?.(stn);
            this.closeAll();
          }
        },
        el('span', { className: `metro-line-tag ${stn.line}`, text: `${stn.line.toUpperCase()} LINE` }),
        el('div', { text: stn.name, style: { fontWeight: '700', fontSize: '14px' } }),
        el('div', { text: stn.nameKn, style: { fontSize: '12px', color: '#ffd599', marginTop: '2px' } }),
        el('div', {
          text: `${stn.elevated ? 'Elevated Viaduct' : 'Underground Station'} • ₹30`,
          style: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' }
        })
      );
      this.metroList.appendChild(btn);
    }
  }

  public openShop(
    zone: ZoneDef,
    weapons: WeaponSystem,
    getCash: () => number,
    spendCash: (amount: number) => boolean,
    onHealAndRest: () => void,
    onBuyArmor: () => void
  ): void {
    this.shopOpen = true;
    this.metroOpen = false;
    this.metroModal.classList.add('hidden');
    this.shopModal.classList.remove('hidden');

    const title = document.getElementById('shop-title');
    const sub = document.getElementById('shop-subtitle');
    if (title) title.textContent = `${zone.shopName.toUpperCase()} & SAFEHOUSE`;
    if (sub) sub.textContent = `${zone.name} (${zone.nameKn}) • Cash Available: ₹${getCash().toLocaleString()}`;

    const rebuild = () => {
      if (sub) sub.textContent = `${zone.name} (${zone.nameKn}) • Cash Available: ₹${getCash().toLocaleString()}`;
      clearChildren(this.shopItems);

      // Safehouse Rest & Clear Wanted Heat
      const restCard = el(
        'button',
        {
          className: 'shop-card',
          onClick: () => {
            onHealAndRest();
            this.showToast('Rested at Safehouse — Health restored & Wanted cleared!');
            rebuild();
          }
        },
        el('div', { text: 'SAFEHOUSE SERVICE', style: { color: '#4cd137', fontWeight: '700', fontSize: '11px' } }),
        el('div', { text: 'Rest, Full Health & Clear Wanted', style: { fontWeight: '700', fontSize: '16px', margin: '2px 0' } }),
        el('div', { text: `Lay low inside ${zone.safehouseName}. FREE`, style: { fontSize: '12px', color: '#a6b4cb' } })
      );
      this.shopItems.appendChild(restCard);

      // Kevlar Armor Vest
      const armorCard = el(
        'button',
        {
          className: 'shop-card',
          onClick: () => {
            if (spendCash(450)) {
              onBuyArmor();
              this.showToast('Armor refilled to 100!');
              rebuild();
            } else {
              this.showToast('Not enough cash (need ₹450)');
            }
          }
        },
        el('div', { text: 'PROTECTION', style: { color: '#38bdf8', fontWeight: '700', fontSize: '11px' } }),
        el('div', { text: 'Reinforced Street Vest (100 AR)', style: { fontWeight: '700', fontSize: '16px', margin: '2px 0' } }),
        el('div', { text: 'Cost: ₹450', style: { fontSize: '12px', color: '#ffd599' } })
      );
      this.shopItems.appendChild(armorCard);

      // Weapons & Ammo
      for (const def of WEAPON_DEFS) {
        if (def.id === 'fists') continue;
        const st = weapons.states.get(def.id)!;
        const actionLabel = !st.unlocked
          ? `BUY WEAPON — ₹${def.price.toLocaleString()}`
          : def.category === 'firearm'
            ? `BUY AMMO (+${def.magSize * 2}) — ₹${def.ammoPrice}`
            : 'OWNED (Click to Equip)';
        const card = el(
          'button',
          {
            className: 'shop-card',
            onClick: () => {
              if (!st.unlocked) {
                if (spendCash(def.price)) {
                  weapons.unlock(def.id);
                  weapons.equip(def.id);
                  this.showToast(`Purchased & equipped ${def.name}!`);
                  rebuild();
                } else {
                  this.showToast(`Need ₹${def.price.toLocaleString()} to buy ${def.name}`);
                }
              } else if (def.category === 'firearm') {
                if (spendCash(def.ammoPrice)) {
                  weapons.addAmmo(def.id, def.magSize * 2);
                  this.showToast(`Refilled ammo for ${def.name}`);
                  rebuild();
                } else {
                  this.showToast(`Need ₹${def.ammoPrice} for ammo`);
                }
              } else {
                weapons.equip(def.id);
                this.showToast(`Equipped ${def.name}`);
              }
            }
          },
          el('div', { text: `${def.category.toUpperCase()} • DMG ${def.damage}`, style: { color: '#ff9f2e', fontWeight: '700', fontSize: '11px' } }),
          el('div', { text: def.name, style: { fontWeight: '700', fontSize: '16px', margin: '2px 0' } }),
          el('div', { text: actionLabel, style: { fontSize: '12px', color: st.unlocked ? '#4cd137' : '#ffd599' } })
        );
        this.shopItems.appendChild(card);
      }
    };

    rebuild();
  }
}
