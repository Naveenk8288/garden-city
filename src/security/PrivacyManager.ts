import { clearChildren, el } from './SafeDOM';
import { createGDIconElement, GD_PALETTE } from '../ui/GDIcon';

export type ConsentChoice = 'unset' | 'accepted' | 'session_only';

export interface PrivacyConsentRecord {
  version: number;
  choice: ConsentChoice;
  updatedAt: string;
}

export const PRIVACY_CONSENT_KEY = 'garden_city_privacy_consent_v1';

export const KNOWN_LOCAL_STORAGE_KEYS = [
  'garden_city_privacy_consent_v1',
  'garden_city_account_v1',
  'garden_city_underworld_save_v1',
  'garden_city_character_loadout_v2',
  'garden_city_campaign_v1',
  'garden_city_hw_profile_v1',
  'garden_city_quality_prefs_v1'
] as const;

let activeSessionOnlyMode = false;

/**
 * Checks whether the player has permitted local persistence.
 * If the player chose Session-Only (No Storage), all localStorage writes become no-ops.
 */
export function isLocalStoragePermitted(): boolean {
  if (activeSessionOnlyMode) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(PRIVACY_CONSENT_KEY);
    if (!raw) return true; // default local save until explicitly opted into session-only
    const parsed = JSON.parse(raw) as Partial<PrivacyConsentRecord>;
    return parsed.choice !== 'session_only';
  } catch {
    return false;
  }
}

export function safeStorageGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    if (!isLocalStoragePermitted() && key !== PRIVACY_CONSENT_KEY) return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (!isLocalStoragePermitted() && key !== PRIVACY_CONSENT_KEY) return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export interface DataExportBundle {
  schemaVersion: number;
  exportedAt: string;
  application: string;
  compliance: string[];
  personalDataCollected: string;
  consent: PrivacyConsentRecord;
  localStorageData: Record<string, unknown>;
}

/**
 * DPDP Act 2023 (India) & GDPR Privacy & Data Rights Manager:
 * - Zero personal data collected; local-only storage inventory.
 * - First-launch Consent Notice ("Accept Local Saves" vs "Session-Only / No Storage").
 * - In-game Privacy Policy modal, "Export My Data (JSON)", and "Delete My Account & Data".
 */
export class PrivacyManager {
  public isModalOpen = false;
  public isConsentOpen = false;
  public consent: PrivacyConsentRecord;

  private modalEl: HTMLDivElement | null = null;
  private consentEl: HTMLDivElement | null = null;
  private inventoryBox: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;
  private deleteArmed = false;

  public onModalToggle?: () => void;
  public onNotify?: (msg: string) => void;
  public onDataDeleted?: () => void;

  constructor(mountUI = true) {
    this.consent = this.loadConsent();
    activeSessionOnlyMode = this.consent.choice === 'session_only';
    if (mountUI && typeof document !== 'undefined') {
      this.createConsentBanner();
      this.createPrivacyModal();
    }
  }

  public loadConsent(): PrivacyConsentRecord {
    try {
      if (typeof localStorage === 'undefined') {
        return { version: 1, choice: 'unset', updatedAt: new Date().toISOString() };
      }
      const raw = localStorage.getItem(PRIVACY_CONSENT_KEY);
      if (!raw) {
        return { version: 1, choice: 'unset', updatedAt: new Date().toISOString() };
      }
      const parsed = JSON.parse(raw) as Partial<PrivacyConsentRecord>;
      if (parsed.choice === 'accepted' || parsed.choice === 'session_only') {
        return {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          choice: parsed.choice,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString()
        };
      }
    } catch {
      // fall through
    }
    return { version: 1, choice: 'unset', updatedAt: new Date().toISOString() };
  }

  public setConsent(choice: 'accepted' | 'session_only'): void {
    this.consent = {
      version: 1,
      choice,
      updatedAt: new Date().toISOString()
    };
    activeSessionOnlyMode = choice === 'session_only';

    try {
      if (typeof localStorage !== 'undefined') {
        if (choice === 'session_only') {
          // Immediately clear persisted game keys when switching to session-only
          for (const k of KNOWN_LOCAL_STORAGE_KEYS) {
            if (k !== PRIVACY_CONSENT_KEY) localStorage.removeItem(k);
          }
        }
        localStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(this.consent));
      }
    } catch {
      // ignore storage restrictions
    }

    this.setConsentOpen(false);
    this.refreshInventory();
    this.onNotify?.(
      choice === 'accepted'
        ? 'Privacy preference saved: Local on-device game saves enabled.'
        : 'Session-Only mode enabled: Local saves cleared and disabled.'
    );
  }

  public maybeShowFirstLaunchConsent(): void {
    if (this.consent.choice === 'unset') {
      this.setConsentOpen(true);
    }
  }

  public setConsentOpen(open: boolean): void {
    this.isConsentOpen = open;
    this.consentEl?.classList.toggle('hidden', !open);
    this.onModalToggle?.();
  }

  public setModalOpen(open: boolean): void {
    this.isModalOpen = open;
    this.deleteArmed = false;
    this.modalEl?.classList.toggle('hidden', !open);
    if (open) this.refreshInventory();
    this.onModalToggle?.();
  }

  /**
   * Builds a portable JSON snapshot of every local key owned by Garden City Underworld.
   */
  public buildDataExport(): DataExportBundle {
    const localDataMap = new Map<string, unknown>();
    try {
      if (typeof localStorage !== 'undefined') {
        const keys = new Set<string>([...KNOWN_LOCAL_STORAGE_KEYS]);
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('garden_city_')) keys.add(k);
        }
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw === null) continue;
          try {
            localDataMap.set(k, JSON.parse(raw));
          } catch {
            localDataMap.set(k, raw);
          }
        }
      }
    } catch {
      // ignore
    }

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      application: 'Garden City Underworld',
      compliance: ['India DPDP Act 2023', 'EU GDPR'],
      personalDataCollected: 'None — all stored data is local gameplay state and device quality preferences.',
      consent: this.consent,
      localStorageData: Object.fromEntries(localDataMap)
    };
  }

  public downloadDataExport(): DataExportBundle {
    const bundle = this.buildDataExport();
    if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `garden-city-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    this.onNotify?.('Exported your local game data as JSON.');
    return bundle;
  }

  /**
   * Permanently deletes all local game data, consent records, IndexedDB databases, and SW caches.
   */
  public async deleteAllUserData(): Promise<{ deletedKeys: string[]; clearedCaches: number }> {
    const deletedKeys: string[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const toDelete = new Set<string>([...KNOWN_LOCAL_STORAGE_KEYS]);
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('garden_city_')) toDelete.add(k);
        }
        for (const k of toDelete) {
          if (localStorage.getItem(k) !== null) {
            localStorage.removeItem(k);
            deletedKeys.push(k);
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    } catch {
      // ignore
    }

    // Clear any future IndexedDB databases owned by the app
    try {
      const idb = typeof indexedDB !== 'undefined' ? (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }) : null;
      if (idb?.databases) {
        const dbs = await idb.databases();
        for (const db of dbs) {
          if (db.name && db.name.toLowerCase().includes('garden')) {
            idb.deleteDatabase(db.name);
          }
        }
      }
    } catch {
      // ignore unsupported indexedDB.databases()
    }

    // Clear PWA Service Worker caches
    let clearedCaches = 0;
    try {
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
          clearedCaches++;
        }
      }
    } catch {
      // ignore
    }

    this.consent = { version: 1, choice: 'unset', updatedAt: new Date().toISOString() };
    activeSessionOnlyMode = false;
    this.refreshInventory();
    this.onDataDeleted?.();
    this.onNotify?.(`Deleted all local account & game data (${deletedKeys.length} records, ${clearedCaches} caches).`);
    return { deletedKeys, clearedCaches };
  }

  private createConsentBanner(): void {
    const overlay = el('div', { id: 'gd-consent-banner', className: 'gd-consent-banner hidden' });
    const card = el(
      'div',
      { className: 'gd-consent-card' },
      el(
        'div',
        { className: 'gd-consent-title' },
        createGDIconElement('globe', 16, GD_PALETTE.cyan),
        el('span', { text: ' PRIVACY & LOCAL STORAGE NOTICE (DPDP ACT 2023 • GDPR)' })
      ),
      el('p', {
        className: 'gd-consent-text',
        text: 'Garden City Underworld collects ZERO personal data (no location, contacts, ads, or analytics). We store only local game progress, avatar choices, and auto-detected graphics settings on your device. You can export or permanently delete this data anytime.'
      }),
      el(
        'div',
        { className: 'gd-consent-actions' },
        el('button', {
          id: 'btn-consent-accept',
          className: 'gd-btn-cyan',
          text: 'ACCEPT LOCAL SAVES',
          onClick: () => this.setConsent('accepted')
        }),
        el('button', {
          id: 'btn-consent-session',
          className: 'gd-mini-btn',
          text: 'SESSION-ONLY (NO STORAGE)',
          onClick: () => this.setConsent('session_only')
        }),
        el('button', {
          id: 'btn-consent-policy',
          className: 'gd-mini-btn',
          text: 'PRIVACY POLICY & DATA CONTROLS',
          onClick: () => {
            this.setConsentOpen(false);
            this.setModalOpen(true);
          }
        })
      )
    );
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.consentEl = overlay;
  }

  private createPrivacyModal(): void {
    const overlay = el('div', { id: 'gd-privacy-modal', className: 'modal-overlay hidden' });
    this.inventoryBox = el('div', { className: 'gd-privacy-inventory' });
    this.statusEl = el('div', { className: 'gd-privacy-status' });

    const delBtn = el('button', {
      id: 'btn-privacy-delete',
      className: 'gd-btn-danger',
      text: 'DELETE MY ACCOUNT & DATA'
    });
    delBtn.addEventListener('click', () => {
      if (!this.deleteArmed) {
        this.deleteArmed = true;
        delBtn.textContent = 'CONFIRM PERMANENT DELETE';
        if (this.statusEl) {
          this.statusEl.textContent = 'Click again to permanently erase all local saves, story progress, settings, and offline caches.';
        }
        return;
      }
      this.deleteArmed = false;
      delBtn.textContent = 'DELETE MY ACCOUNT & DATA';
      void this.deleteAllUserData().then((res) => {
        if (this.statusEl) {
          this.statusEl.textContent = `Erased ${res.deletedKeys.length} local records and ${res.clearedCaches} offline caches.`;
        }
      });
    });

    const card = el(
      'div',
      { className: 'gd-privacy-panel' },
      el(
        'div',
        { className: 'panel-header' },
        el(
          'div',
          {},
          el(
            'h2',
            {},
            createGDIconElement('globe', 20, GD_PALETTE.cyan),
            ' PRIVACY POLICY & DATA CONTROLS'
          ),
          el('span', {
            className: 'panel-sub',
            text: 'Aligned with India DPDP Act 2023 & EU GDPR • Zero Personal Data Collected'
          })
        ),
        el('button', {
          id: 'btn-close-privacy',
          className: 'btn-close',
          text: '✕',
          onClick: () => this.setModalOpen(false)
        })
      ),
      el(
        'div',
        { className: 'gd-privacy-section' },
        el('h3', { text: '1. Data Minimization Guarantee' }),
        el('p', {
          text: 'We do NOT collect or transmit your name, email, phone number, precise GPS location, contacts, camera/microphone, advertising IDs, or behavioral analytics. Offline single-player runs strictly inside your browser or installed app.'
        }),
        el('h3', { text: '2. What Is Stored Locally On Your Device' }),
        this.inventoryBox,
        el('h3', { text: '3. Your DPDP Act 2023 & GDPR Rights' }),
        el('p', {
          text: 'You have the right to grant or withdraw storage consent (Session-Only mode), export a machine-readable JSON copy of all stored data, or permanently delete all local data and caches.'
        })
      ),
      this.statusEl,
      el(
        'div',
        { className: 'gd-privacy-actions' },
        el('button', {
          id: 'btn-privacy-accept',
          className: 'gd-mini-btn',
          text: 'ENABLE LOCAL SAVES',
          onClick: () => this.setConsent('accepted')
        }),
        el('button', {
          id: 'btn-privacy-session',
          className: 'gd-mini-btn',
          text: 'SWITCH TO SESSION-ONLY',
          onClick: () => this.setConsent('session_only')
        }),
        el('button', {
          id: 'btn-privacy-export',
          className: 'gd-btn-cyan',
          text: 'EXPORT MY DATA (JSON)',
          onClick: () => {
            this.downloadDataExport();
            if (this.statusEl) this.statusEl.textContent = 'Downloaded garden-city-my-data.json.';
          }
        }),
        delBtn
      )
    );

    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.setModalOpen(false);
    });
    document.body.appendChild(overlay);
    this.modalEl = overlay;
  }

  private refreshInventory(): void {
    if (!this.inventoryBox) return;
    clearChildren(this.inventoryBox);

    const modeLabel =
      this.consent.choice === 'session_only'
        ? 'Session-Only (Local storage disabled)'
        : this.consent.choice === 'accepted'
          ? 'Local Saves Enabled (On-device only)'
          : 'Not yet selected';

    this.inventoryBox.appendChild(
      el('div', { className: 'gd-inv-row' }, el('strong', { text: 'Consent Status: ' }), modeLabel)
    );

    const descriptions = new Map<string, string>([
      ['garden_city_privacy_consent_v1', 'Privacy consent preference'],
      ['garden_city_account_v1', 'Player callsign & Gmail account profile (no password/token)'],
      ['garden_city_underworld_save_v1', 'Single-player cash, turf & unlocked weapons'],
      ['garden_city_character_loadout_v2', 'Selected avatar outfit & character preset'],
      ['garden_city_campaign_v1', '8-chapter story choices & mission progress'],
      ['garden_city_hw_profile_v1', 'Local GPU benchmark tier & display refresh rate'],
      ['garden_city_quality_prefs_v1', 'Graphics tier, FPS cap, DRS & Power Saver settings']
    ]);

    let presentCount = 0;
    for (const key of KNOWN_LOCAL_STORAGE_KEYS) {
      let bytes = 0;
      try {
        const val = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        if (val !== null) {
          bytes = val.length;
          presentCount++;
        }
      } catch {
        // ignore
      }
      const desc = descriptions.get(key) || 'Game state';
      const status = bytes > 0 ? `${bytes} bytes (stored locally)` : 'Not stored';
      this.inventoryBox.appendChild(
        el(
          'div',
          { className: 'gd-inv-row' },
          el('code', { text: key }),
          ` — ${desc} • `,
          el('span', { text: status, style: { color: bytes > 0 ? GD_PALETTE.cyan : '#94a3b8' } })
        )
      );
    }

    if (presentCount === 0) {
      this.inventoryBox.appendChild(
        el('div', { className: 'gd-inv-row', text: 'Zero local records currently stored on this device.' })
      );
    }
  }
}
