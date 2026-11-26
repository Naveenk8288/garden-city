# Security Policy, Threat Model & Data Inventory — Garden City Underworld

**Standards Target:** OWASP ASVS Level 2 • OWASP Top 10 (2021) • OWASP MASVS (Android/iOS) • Electron Security Guidelines • India DPDP Act 2023 • EU GDPR

---

## 1. Core Security Principle: The Client Is Untrusted

> **Every byte running in a browser, PWA, Android APK (Capacitor), or Windows/macOS package (Electron) can be inspected, modified, or replayed by the end user.**

- **Never rely on client-side obfuscation** for access control, economy integrity, or secret protection.
- **Offline single-player play** runs 100% locally without requiring a server (tamper detection for offline saves will mark modified saves as `modified` in Phase 4 rather than pretending the client cannot be edited).
- **Any feature where cheating or data theft matters** (accounts, cloud saves, purchases, leaderboards, co-op multiplayer, shared turf) **MUST be server-authoritative** and validated exclusively on a backend server.

---

## 2. Threat Model

### 2.1 Assets to Protect
| Asset | Sensitivity | Current Location | Protection Goal |
|---|---|---|---|
| Player save progression (cash, respect, unlocked weapons, story choices, loadout) | Low–Medium (High once online/cloud) | Client `localStorage` (offline only today) | Integrity (tamper-evident offline; server-authoritative online) |
| Player privacy & consent choices | High (DPDP / GDPR) | Client `localStorage` | Data minimization, informed consent, export & complete erasure |
| Future player accounts, auth sessions & tokens | Critical | Server / HttpOnly cookies / OS Keychain (Phase 3) | Confidentiality, anti-hijacking, zero `localStorage` token storage |
| Client code, WASM (Rapier3D), GeoJSON map tiles & PWA Service Worker cache | High | Static HTTPS origin (Vercel / GitHub Pages) | Integrity, strict CSP, no XSS or supply-chain tampering |
| Build pipeline, signing keys, certificates & future server secrets | Critical | CI / Server env only (NEVER in repo/client) | Secret isolation, zero leaks in client bundles, pinned CI |
| Player device resources (GPU/WebGL2, battery, memory, filesystem) | High | Browser / Android WebView / Electron | Sandboxing, no `nodeIntegration`, no WebView file leaks |

### 2.2 Threat Actors
1. **Casual Client Tamperer:** Uses Browser DevTools, `localStorage` editing, or memory editors (Cheat Engine / GameGuardian) to alter cash, ammo, turf, or mission flags.
2. **Competitive Cheater / Protocol Attacker (Future Online):** Intercepts WebSocket/API calls via proxy (Burp/mitmproxy), replays economy purchases, spoofs coordinates/damage/hit events, or runs aimbots.
3. **XSS / Web Attacker:** Attempts DOM injection via untrusted strings (WebGL renderer names, URL parameters, imported saves, future crew/chat names) or clickjacking via hostile `<iframe>` embedding.
4. **Network / MITM Attacker:** Attempts HTTP downgrade, rogue Wi-Fi script injection, or tampering with external CDN resources (e.g., Google Fonts).
5. **Supply-Chain Attacker:** Compromises an npm dependency, GitHub Action, or third-party asset CDN, or harvests accidentally committed keys from the repository or `dist/` bundle.
6. **Abuse / Automated Bot Operator (Future Backend):** Credential stuffing, API scraping, spam account creation, or DoS against backend APIs.

### 2.3 Attack Paths & Mitigations Roadmap
| Attack Path | OWASP / MASVS Category | Current Status (Phase 1) | Full Mitigation Phase |
|---|---|---|---|
| DOM XSS via dynamic `innerHTML` / inline handlers | OWASP A03 (Injection), ASVS V5 | **Mitigated in Phase 1:** Safe DOM construction (`SafeDOM` / `textContent`), `eslint-plugin-no-unsanitized`, `eslint-plugin-security`, `eval`/`new Function`/`document.write` banned | Phase 2 (Strict CSP + Trusted Types + Zod schemas) |
| Hardcoded secrets / keys leaked to client bundle or git | OWASP A02 / A07, ASVS V6 | **Mitigated in Phase 1:** `.env.example`, automated build-failing secret scanner (`src/` + `dist/`), `.gitleaks.toml`, pre-commit hook & CI gitleaks scan | Phase 6 (Pinned deps, SBOM, signed commits) |
| Excessive data collection / DPDP & GDPR non-compliance | DPDP Act 2023 / GDPR | **Mitigated in Phase 1:** Zero PII collected, first-launch consent modal (including Session-Only No-Storage mode), Privacy Policy, Export JSON & Full Data Delete | Phase 3 (Server account export/delete if accounts added) |
| Third-party CDN / font tampering & missing security headers | OWASP A05 / A08 | **Tracked:** Google Fonts currently loaded from `fonts.googleapis.com`; CSP/HSTS/COOP/COEP headers pending | Phase 2 (Self-hosted fonts + strict headers) |
| Client save / memory / speed cheating | OWASP A04 (Insecure Design) | **Offline only today:** Client save treated as untrusted | Phase 4 (HMAC tamper-flagging offline; server-authoritative online) |
| Mobile WebView / backup / cleartext traffic leaks (Capacitor) | OWASP MASVS-NETWORK / PLATFORM | **Web/PWA only today** (no Capacitor wrapper yet) | Phase 5 (Android network security config, Keystore, Play Integrity) |
| Desktop IPC / RCE / DevTools exposure (Electron) | Electron Security Checklist | **Web/PWA only today** (no Electron wrapper yet) | Phase 5 (Context isolation, sandbox, Fuses, code signing) |

### 2.4 Trust Boundaries
```
[ Untrusted Client: Browser / PWA / Future Android APK / Future Electron App ]
   ├── UI & DOM Layer (XSS boundary — zero untrusted innerHTML; strict SafeDOM + static GDIcon allowlist)
   ├── Local Persistence (localStorage / SW Cache — user-editable, controlled by PrivacyManager consent)
   ├── Third-Party Static Assets (Google Fonts today -> self-hosted in Phase 2; static OSM GeoJSON tiles)
   └── === NETWORK BOUNDARY (HTTPS / WSS only) ===
[ Trusted Hosting / Future Authoritative Backend (Phases 2–4) ]
   ├── Static Origin (Vercel / GitHub Pages with strict security headers in Phase 2)
   └── Future Server API / Game Server (Server-side secrets, Auth, Validation, Rate Limits, Authoritative State)
```

---

## 3. Data Inventory (DPDP Act 2023 & GDPR)

**Personal Data Collected:** **NONE.** Garden City Underworld does **not** collect names, emails, phone numbers, precise GPS location (`navigator.geolocation` is never called), contacts, camera/microphone feeds, advertising IDs, or third-party analytics/cookies.

All current game data is stored **strictly on the player's own device** (and is never transmitted to any server):

| Storage Key / Store | Contents | Purpose | Transmitted Off-Device? | User Control |
|---|---|---|---|---|
| `garden_city_privacy_consent_v1` | Consent choice (`accepted` or `session_only`) & timestamp | Honor DPDP Act 2023 / GDPR storage preference | Never | Change anytime / Delete |
| `garden_city_underworld_save_v1` | Fictional game cash, respect, owned zones, completed missions, unlocked weapons | Single-player save progress | Never | Export JSON / Delete |
| `garden_city_character_loadout_v2` | Selected fictional hero preset, face, outfit, pants, shoes | Remember player avatar customization | Never | Export JSON / Delete |
| `garden_city_campaign_v1` | Story chapter progress, Loyalty/Power reputation, unlocked ending | Single-player campaign state | Never | Export JSON / Delete |
| `garden_city_hw_profile_v1` | Platform family, GPU renderer string, benchmark FPS, screen size, refresh Hz | Auto-select smooth LITE/MEDIUM/HIGH tier | Never | Export JSON / Delete |
| `garden_city_quality_prefs_v1` | Graphics tier override, FPS limiter, DRS toggle, Power Saver toggle | Remember user graphics/battery settings | Never | Export JSON / Delete |
| Service Worker Cache (`gcu-app-cache-v2`) | Static app shell, icons, built JS/CSS, public OSM map chunks | Offline play & fast repeat launches | Never | Cleared on "Delete All Data" |

### Player Data Rights (Available In-Game)
Open **Privacy & Data** from the Title Screen, Pause Menu (`Esc`), or Credits to:
1. Review the Privacy Policy and exact local storage inventory.
2. Switch between **Local Storage Enabled** and **Session-Only (No Storage)** mode.
3. **Export My Data** as a portable JSON file (`garden-city-my-data.json`).
4. **Delete My Account & Data** to permanently erase all local storage keys, IndexedDB stores, and Service Worker caches on the device.

---

## 4. Vulnerability Reporting & Responsible Disclosure

If you discover a security vulnerability in **Garden City Underworld**, please report it privately so we can investigate and fix it before public disclosure:

- **Preferred Channel (GitHub Security Advisories):** https://github.com/Naveenk8288/garden-city/security/advisories/new
- **Security Email Contact:** `security@gardencityunderworld.example` *(maintainer: replace with your monitored production domain security inbox before public launch, and mirror in `/.well-known/security.txt` in Phase 7)*

### Disclosure Guidelines
- Include steps to reproduce, affected URL/platform/version, and potential impact.
- We aim to acknowledge reports within **48 hours** and provide a remediation timeline within **7 days** (standard 90-day coordinated disclosure window).
- Please do not test against other players, disrupt service availability, or access data that does not belong to you. Good-faith research following these guidelines is welcomed.
