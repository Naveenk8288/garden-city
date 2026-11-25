import { NAMMA_METRO_STATIONS, MetroStationDef, ZoneDef } from '../world/bengaluruData';
import { WEAPON_DEFS, WeaponSystem } from '../combat/WeaponSystem';

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

    this.metroList.innerHTML = '';
    for (const stn of NAMMA_METRO_STATIONS) {
      const btn = document.createElement('button');
      btn.className = 'metro-btn';
      btn.innerHTML = `
        <span class="metro-line-tag ${stn.line}">${stn.line.toUpperCase()} LINE</span>
        <div style="font-weight:700;font-size:14px;">${stn.name}</div>
        <div style="font-size:12px;color:#ffd599;margin-top:2px;">${stn.nameKn}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${stn.elevated ? 'Elevated Viaduct' : 'Underground Station'} • ₹30</div>
      `;
      btn.addEventListener('click', () => {
        this.onMetroSelect?.(stn);
        this.closeAll();
      });
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
      this.shopItems.innerHTML = '';

      // Safehouse Rest & Clear Wanted Heat
      const restCard = document.createElement('button');
      restCard.className = 'shop-card';
      restCard.innerHTML = `
        <div style="color:#4cd137;font-weight:700;font-size:11px;">SAFEHOUSE SERVICE</div>
        <div style="font-weight:700;font-size:16px;margin:2px 0;">Rest, Full Health &amp; Clear Wanted</div>
        <div style="font-size:12px;color:#a6b4cb;">Lay low inside ${zone.safehouseName}. FREE</div>
      `;
      restCard.addEventListener('click', () => {
        onHealAndRest();
        this.showToast('Rested at Safehouse — Health restored & Wanted cleared!');
        rebuild();
      });
      this.shopItems.appendChild(restCard);

      // Kevlar Armor Vest
      const armorCard = document.createElement('button');
      armorCard.className = 'shop-card';
      armorCard.innerHTML = `
        <div style="color:#38bdf8;font-weight:700;font-size:11px;">PROTECTION</div>
        <div style="font-weight:700;font-size:16px;margin:2px 0;">Reinforced Street Vest (100 AR)</div>
        <div style="font-size:12px;color:#ffd599;">Cost: ₹450</div>
      `;
      armorCard.addEventListener('click', () => {
        if (spendCash(450)) {
          onBuyArmor();
          this.showToast('Armor refilled to 100!');
          rebuild();
        } else {
          this.showToast('Not enough cash (need ₹450)');
        }
      });
      this.shopItems.appendChild(armorCard);

      // Weapons & Ammo
      for (const def of WEAPON_DEFS) {
        if (def.id === 'fists') continue;
        const st = weapons.states.get(def.id)!;
        const card = document.createElement('button');
        card.className = 'shop-card';
        const actionLabel = !st.unlocked
          ? `BUY WEAPON — ₹${def.price.toLocaleString()}`
          : def.category === 'firearm'
            ? `BUY AMMO (+${def.magSize * 2}) — ₹${def.ammoPrice}`
            : 'OWNED (Click to Equip)';
        card.innerHTML = `
          <div style="color:#ff9f2e;font-weight:700;font-size:11px;">${def.category.toUpperCase()} • DMG ${def.damage}</div>
          <div style="font-weight:700;font-size:16px;margin:2px 0;">${def.name}</div>
          <div style="font-size:12px;color:${st.unlocked ? '#4cd137' : '#ffd599'};">${actionLabel}</div>
        `;
        card.addEventListener('click', () => {
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
        });
        this.shopItems.appendChild(card);
      }
    };

    rebuild();
  }
}
