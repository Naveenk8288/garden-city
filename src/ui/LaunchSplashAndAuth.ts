import { clearChildren, el } from '../security/SafeDOM';
import { createGDIconElement, GD_PALETTE } from './GDIcon';
import { safeStorageGet, safeStorageSet } from '../security/PrivacyManager';

export const ACCOUNT_STORAGE_KEY = 'garden_city_account_v1';

export interface PlayerAccount {
  callsign: string;
  gmail: string;
  authMode: 'google_oauth' | 'gmail_local';
  verifiedByGoogle: boolean;
  createdAt: string;
  lastLoginAt: string;
}

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]{1,64}@gmail\.com$/i;
const CALLSIGN_REGEX = /^[a-zA-Z0-9 _-]{2,24}$/;

interface BulletParticle {
  angle: number;
  radius: number;
  speed: number;
  length: number;
  width: number;
  alpha: number;
  fireDelay: number;
  fired: boolean;
  flashLife: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: {
            client_id: string;
            callback: (res: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function isValidGmailAddress(email: string): boolean {
  return GMAIL_REGEX.test(email.trim());
}

export function isValidCallsign(name: string): boolean {
  return CALLSIGN_REGEX.test(name.trim());
}

export function loadStoredAccount(): PlayerAccount | null {
  try {
    const raw = safeStorageGet(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerAccount>;
    if (!parsed || typeof parsed.gmail !== 'string' || !isValidGmailAddress(parsed.gmail)) {
      return null;
    }
    return {
      callsign: typeof parsed.callsign === 'string' && isValidCallsign(parsed.callsign) ? parsed.callsign : 'Bengaluru Player',
      gmail: parsed.gmail.toLowerCase(),
      authMode: parsed.authMode === 'google_oauth' ? 'google_oauth' : 'gmail_local',
      verifiedByGoogle: Boolean(parsed.verifiedByGoogle),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      lastLoginAt: typeof parsed.lastLoginAt === 'string' ? parsed.lastLoginAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function saveStoredAccount(acc: PlayerAccount): boolean {
  return safeStorageSet(ACCOUNT_STORAGE_KEY, JSON.stringify(acc));
}

function decodeGoogleJwtPayload(jwt: string): { email?: string; email_verified?: boolean; name?: string } | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as { email?: string; email_verified?: boolean; name?: string };
  } catch {
    return null;
  }
}

/**
 * Animated 360-Degree Bullet-Firing Emblem Launch Splash + Create Account / Original Gmail Login Gate:
 * - On app open (Android, iOS, macOS, Windows), fires 360° golden brass bullets, muzzle flashes &
 *   sparks radially around the metallic "N" emblem.
 * - Transitions cleanly into Create Account (first launch) or Login with Original Gmail (returning user).
 * - Supports live Google Identity Services (OAuth 2.0 / OIDC) when VITE_GOOGLE_CLIENT_ID is configured,
 *   plus local Gmail profile & offline guest fallback so single-player always works.
 * - Built 100% with SafeDOM (zero innerHTML).
 */
export class LaunchSplashAndAuth {
  public isSplashOpen = false;
  public isAuthOpen = false;
  public currentAccount: PlayerAccount | null = null;
  public isLoggedIn = false;

  private splashOverlay: HTMLDivElement | null = null;
  private authOverlay: HTMLDivElement | null = null;
  private authCardBody: HTMLDivElement | null = null;
  private googleClientId: string;
  private googleScriptLoaded = false;

  public onAuthComplete?: (account: PlayerAccount | null) => void;
  public onModalToggle?: () => void;
  public onNotify?: (msg: string) => void;

  constructor(mountUI = true) {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    this.googleClientId = (env?.VITE_GOOGLE_CLIENT_ID || '').trim();
    this.currentAccount = loadStoredAccount();

    if (mountUI && typeof document !== 'undefined') {
      this.createSplashDOM();
      this.createAuthDOM();
    }
  }

  /**
   * Starts the 360° bullet-firing emblem launch splash, then presents Create Account (if none)
   * or Original Gmail Login (if an account was already created).
   */
  public startLaunchFlow(): void {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const skipSplash = params?.get('skipSplash') === '1' || params?.get('skipBench') === '1' || params?.get('safeLite') === '1';

    if (skipSplash) {
      this.isLoggedIn = true;
      this.onAuthComplete?.(this.currentAccount);
      return;
    }

    this.play360BulletSplash(() => {
      this.openAuthGate();
    });
  }

  public openAuthGate(forcedMode?: 'create' | 'login'): void {
    this.currentAccount = loadStoredAccount();
    const mode: 'create' | 'login' = forcedMode ?? (this.currentAccount ? 'login' : 'create');
    this.isAuthOpen = true;
    this.authOverlay?.classList.remove('hidden');
    this.renderAuthCard(mode);
    this.onModalToggle?.();
  }

  public closeAuthGate(): void {
    this.isAuthOpen = false;
    this.authOverlay?.classList.add('hidden');
    this.onModalToggle?.();
  }

  public logout(): void {
    this.isLoggedIn = false;
    this.openAuthGate(this.currentAccount ? 'login' : 'create');
  }

  public getAccountDisplayLabel(): string {
    if (!this.currentAccount) return 'Guest (Offline)';
    return `${this.currentAccount.callsign} • ${this.currentAccount.gmail}`;
  }

  private createSplashDOM(): void {
    const canvas = el('canvas', { id: 'gcu-splash-canvas', className: 'gcu-splash-canvas' });
    const emblem = el('img', {
      className: 'gcu-splash-emblem',
      attrs: { src: './icons/n-emblem-splash.png', alt: 'Garden City Emblem' }
    });
    const caption = el(
      'div',
      { className: 'gcu-splash-caption' },
      el('div', { className: 'gcu-splash-brand', text: 'GARDEN CITY UNDERWORLD' }),
      el('div', { className: 'gcu-splash-sub', text: 'BENGALURU • TAP ANYWHERE TO SKIP' })
    );

    this.splashOverlay = el(
      'div',
      { id: 'gcu-launch-splash', className: 'gcu-launch-splash hidden' },
      canvas,
      el('div', { className: 'gcu-splash-center' }, emblem),
      caption
    );
    document.body.appendChild(this.splashOverlay);
  }

  /**
   * High-impact 360-degree radial bullet-firing canvas intro around the N emblem.
   */
  public play360BulletSplash(onDone: () => void): void {
    if (!this.splashOverlay) {
      onDone();
      return;
    }

    this.isSplashOpen = true;
    this.splashOverlay.classList.remove('hidden');
    this.onModalToggle?.();

    const canvas = this.splashOverlay.querySelector('#gcu-splash-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.finishSplash(onDone);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    };
    resize();

    const bullets: BulletParticle[] = [];
    const sparks: SparkParticle[] = [];

    // Wave 1: 36 sequential bullets sweeping full 360° around the N emblem (0.12s -> 1.15s)
    const ringCount1 = 36;
    for (let i = 0; i < ringCount1; i++) {
      bullets.push({
        angle: (i / ringCount1) * Math.PI * 2 - Math.PI / 2,
        radius: 0,
        speed: 440 + (i % 3) * 45,
        length: 28,
        width: 5.5,
        alpha: 1,
        fireDelay: 0.12 + (i / ringCount1) * 0.95,
        fired: false,
        flashLife: 0
      });
    }

    // Wave 2: Simultaneous full 360° salvo (28 heavy golden rounds at 1.25s)
    const ringCount2 = 28;
    for (let i = 0; i < ringCount2; i++) {
      bullets.push({
        angle: (i / ringCount2) * Math.PI * 2,
        radius: 0,
        speed: 560,
        length: 34,
        width: 6.5,
        alpha: 1,
        fireDelay: 1.25,
        fired: false,
        flashLife: 0
      });
    }

    const durationSec = 2.65;
    const startMs = performance.now();
    let lastMs = startMs;
    let ended = false;
    let rafId = 0;

    const finish = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      this.finishSplash(onDone);
    };

    const skipHandler = () => finish();
    this.splashOverlay.addEventListener('click', skipHandler, { once: true });
    const hardTimeout = window.setTimeout(finish, 3400);

    const frame = (now: number) => {
      if (ended) return;
      const elapsed = (now - startMs) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.46;
      const emblemR = Math.min(w, h) * 0.16;

      // Dark metallic background with subtle radial amber/cyan glow
      ctx.fillStyle = '#0B0F1A';
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(cx, cy, emblemR * 0.4, cx, cy, emblemR * 3.1);
      glow.addColorStop(0, 'rgba(255, 176, 32, 0.24)');
      glow.addColorStop(0.45, 'rgba(255, 46, 136, 0.09)');
      glow.addColorStop(1, 'rgba(11, 15, 26, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 360° golden shockwave ring during Wave 2 burst
      if (elapsed > 1.22 && elapsed < 2.2) {
        const p = (elapsed - 1.22) / 0.98;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, emblemR + p * Math.min(w, h) * 0.44, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 176, 32, ${(1 - p) * 0.7})`;
        ctx.lineWidth = Math.max(1.5, (1 - p) * 6 * dpr);
        ctx.stroke();
        ctx.restore();
      }

      // Draw & update 360° firing bullets + muzzle flashes
      for (const b of bullets) {
        if (elapsed < b.fireDelay) continue;
        if (!b.fired) {
          b.fired = true;
          b.radius = emblemR * 0.96;
          b.flashLife = 0.14;
          const mx = cx + Math.cos(b.angle) * b.radius;
          const my = cy + Math.sin(b.angle) * b.radius;
          for (let s = 0; s < 4; s++) {
            const spAng = b.angle + (Math.random() - 0.5) * 0.65;
            const spSpd = (140 + Math.random() * 240) * dpr;
            sparks.push({
              x: mx,
              y: my,
              vx: Math.cos(spAng) * spSpd,
              vy: Math.sin(spAng) * spSpd,
              life: 0.28 + Math.random() * 0.25,
              maxLife: 0.5,
              size: (1.6 + Math.random() * 2.2) * dpr,
              hue: s % 2 === 0 ? '#FFB020' : '#FFF1B8'
            });
          }
        }

        b.radius += b.speed * dpr * dt;
        b.flashLife = Math.max(0, b.flashLife - dt);
        const maxDist = Math.hypot(w, h) * 0.62;
        b.alpha = Math.max(0, 1 - Math.max(0, (b.radius - maxDist * 0.55) / (maxDist * 0.45)));

        const cos = Math.cos(b.angle);
        const sin = Math.sin(b.angle);

        // Muzzle flash star right on the circular emblem rim
        if (b.flashLife > 0) {
          const fx = cx + cos * (emblemR * 1.02);
          const fy = cy + sin * (emblemR * 1.02);
          const fRatio = b.flashLife / 0.14;
          const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 20 * dpr * fRatio);
          fGrad.addColorStop(0, `rgba(255, 250, 210, ${fRatio})`);
          fGrad.addColorStop(0.5, `rgba(255, 160, 30, ${fRatio * 0.75})`);
          fGrad.addColorStop(1, 'rgba(255, 46, 136, 0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, 20 * dpr * fRatio, 0, Math.PI * 2);
          ctx.fill();
        }

        if (b.alpha <= 0.01) continue;

        // Glowing tracer tail
        const bx = cx + cos * b.radius;
        const by = cy + sin * b.radius;
        const tailLen = b.length * 2.6 * dpr;
        const tx = bx - cos * tailLen;
        const ty = by - sin * tailLen;
        const tGrad = ctx.createLinearGradient(tx, ty, bx, by);
        tGrad.addColorStop(0, 'rgba(255, 176, 32, 0)');
        tGrad.addColorStop(1, `rgba(255, 210, 95, ${b.alpha * 0.85})`);
        ctx.strokeStyle = tGrad;
        ctx.lineWidth = b.width * 0.55 * dpr;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Sculpted golden brass bullet cartridge + copper nose cone
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.angle);
        ctx.globalAlpha = b.alpha;
        const bl = b.length * dpr;
        const bw = b.width * dpr;

        // Brass casing body
        const bodyGrad = ctx.createLinearGradient(0, -bw * 0.5, 0, bw * 0.5);
        bodyGrad.addColorStop(0, '#fff2b2');
        bodyGrad.addColorStop(0.45, '#e5a928');
        bodyGrad.addColorStop(1, '#7a4d09');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-bl * 0.65, -bw * 0.45, bl * 0.72, bw * 0.9);

        // Pointed copper bullet tip
        ctx.fillStyle = '#d97724';
        ctx.beginPath();
        ctx.moveTo(bl * 0.07, -bw * 0.44);
        ctx.quadraticCurveTo(bl * 0.45, -bw * 0.3, bl * 0.58, 0);
        ctx.quadraticCurveTo(bl * 0.45, bw * 0.3, bl * 0.07, bw * 0.44);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw flying golden sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.fillStyle = sp.hue;
        ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
      }
      ctx.globalAlpha = 1;

      if (elapsed >= durationSec) {
        window.clearTimeout(hardTimeout);
        finish();
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    window.addEventListener('resize', resize);
    rafId = requestAnimationFrame(frame);
  }

  private finishSplash(onDone: () => void): void {
    this.isSplashOpen = false;
    this.splashOverlay?.classList.add('hidden');
    this.onModalToggle?.();
    onDone();
  }

  private createAuthDOM(): void {
    this.authCardBody = el('div', { id: 'gcu-auth-body', className: 'gcu-auth-body' });

    this.authOverlay = el(
      'div',
      { id: 'gcu-auth-modal', className: 'modal-overlay gcu-auth-overlay hidden' },
      el(
        'div',
        { className: 'gcu-auth-card' },
        el(
          'div',
          { className: 'gcu-auth-head' },
          el('img', {
            className: 'gcu-auth-emblem',
            attrs: { src: './icons/n-emblem-splash.png', alt: 'N Emblem' }
          }),
          el(
            'div',
            {},
            el('div', { className: 'gcu-auth-kicker', text: 'GARDEN CITY UNDERWORLD • GMAIL ACCOUNT' }),
            el('h2', { id: 'gcu-auth-title', text: 'CREATE ACCOUNT' })
          )
        ),
        this.authCardBody
      )
    );
    document.body.appendChild(this.authOverlay);
  }

  private renderAuthCard(mode: 'create' | 'login'): void {
    if (!this.authCardBody || !this.authOverlay) return;
    clearChildren(this.authCardBody);

    const titleEl = this.authOverlay.querySelector('#gcu-auth-title');
    if (titleEl) {
      titleEl.textContent = mode === 'create' ? 'CREATE ACCOUNT' : 'LOGIN WITH GMAIL';
    }

    const errBox = el('div', { className: 'gcu-auth-error hidden' });
    const showError = (msg: string) => {
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    };

    // Live Google OAuth2 / OIDC button slot (active when VITE_GOOGLE_CLIENT_ID is configured)
    const googleSlot = el('div', { className: 'gcu-google-slot' });

    if (mode === 'login' && this.currentAccount) {
      const acc = this.currentAccount;
      const gmailInput = el('input', {
        id: 'gcu-login-gmail',
        className: 'gcu-auth-input',
        attrs: {
          type: 'email',
          autocomplete: 'email',
          placeholder: 'yourname@gmail.com',
          value: acc.gmail
        }
      });

      const handleLocalGmailLogin = () => {
        const entered = gmailInput.value.trim().toLowerCase();
        if (!isValidGmailAddress(entered)) {
          showError('Please enter your valid original @gmail.com address.');
          return;
        }
        if (entered !== acc.gmail.toLowerCase()) {
          showError(`Gmail does not match your created account (${acc.gmail}). Tap "Create New Account" below to register another Gmail.`);
          return;
        }
        acc.lastLoginAt = new Date().toISOString();
        saveStoredAccount(acc);
        this.completeSignIn(acc, `Signed in as ${acc.callsign} (${acc.gmail})`);
      };

      const form = el(
        'form',
        { className: 'gcu-auth-form' },
        el(
          'div',
          { className: 'gcu-account-pill' },
          createGDIconElement('loyalty', 16, GD_PALETTE.cyan),
          el(
            'div',
            {},
            el('div', { className: 'gcu-pill-name', text: acc.callsign }),
            el('div', {
              className: 'gcu-pill-mail',
              text: `${acc.gmail}${acc.verifiedByGoogle ? ' • Verified Google Account' : ''}`
            })
          )
        ),
        googleSlot,
        el('label', { className: 'gcu-auth-label', text: 'Original Gmail Account' }, gmailInput),
        errBox,
        el('button', {
          id: 'btn-auth-login-submit',
          className: 'btn-primary gcu-auth-submit',
          text: 'LOG IN WITH GMAIL',
          attrs: { type: 'submit' }
        })
      );
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLocalGmailLogin();
      });

      this.authCardBody.append(
        el('p', {
          className: 'gcu-auth-desc',
          text: 'Your account is ready. Sign in using your original Gmail account to load your Bengaluru progress.'
        }),
        form,
        el(
          'div',
          { className: 'gcu-auth-links' },
          el('button', {
            className: 'gd-mini-btn',
            text: 'Create Different Account',
            onClick: () => this.renderAuthCard('create')
          }),
          el('button', {
            className: 'gd-mini-btn',
            text: 'Continue Offline',
            onClick: () => this.completeSignIn(acc, `Continuing as ${acc.callsign}`)
          })
        )
      );

      this.mountGoogleOAuthButton(googleSlot, 'signin_with', showError, acc.gmail);
      return;
    }

    // CREATE ACCOUNT MODE (First-time player)
    const callsignInput = el('input', {
      id: 'gcu-create-callsign',
      className: 'gcu-auth-input',
      attrs: {
        type: 'text',
        maxlength: '24',
        autocomplete: 'nickname',
        placeholder: 'e.g. Naveen_BLR'
      }
    });
    const gmailInput = el('input', {
      id: 'gcu-create-gmail',
      className: 'gcu-auth-input',
      attrs: {
        type: 'email',
        autocomplete: 'email',
        placeholder: 'yourname@gmail.com'
      }
    });

    const form = el(
      'form',
      { className: 'gcu-auth-form' },
      googleSlot,
      el('label', { className: 'gcu-auth-label', text: 'Player Callsign (2–24 letters/numbers)' }, callsignInput),
      el('label', { className: 'gcu-auth-label', text: 'Original Gmail Account (@gmail.com)' }, gmailInput),
      errBox,
      el('button', {
        id: 'btn-auth-create-submit',
        className: 'btn-primary gcu-auth-submit',
        text: 'CREATE ACCOUNT WITH GMAIL',
        attrs: { type: 'submit' }
      })
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const callsign = callsignInput.value.trim();
      const gmail = gmailInput.value.trim().toLowerCase();
      if (!isValidCallsign(callsign)) {
        showError('Enter a callsign of 2–24 characters (letters, numbers, spaces, _ or -).');
        return;
      }
      if (!isValidGmailAddress(gmail)) {
        showError('Please enter a valid original Gmail address ending in @gmail.com.');
        return;
      }
      const nowIso = new Date().toISOString();
      const account: PlayerAccount = {
        callsign,
        gmail,
        authMode: 'gmail_local',
        verifiedByGoogle: false,
        createdAt: nowIso,
        lastLoginAt: nowIso
      };
      saveStoredAccount(account);
      this.currentAccount = account;
      this.completeSignIn(account, `Account created for ${account.callsign} (${account.gmail})! Next time you open the app, log in with your Gmail.`);
    });

    this.authCardBody.append(
      el('p', {
        className: 'gcu-auth-desc',
        text: 'Create your Garden City Underworld profile with your original Gmail account. Once created, you will see the Gmail Login option every time you launch the app.'
      }),
      form,
      el(
        'div',
        { className: 'gcu-auth-links' },
        this.currentAccount
          ? el('button', {
              className: 'gd-mini-btn',
              text: 'Already Created? Log In with Gmail',
              onClick: () => this.renderAuthCard('login')
            })
          : null,
        el('button', {
          className: 'gd-mini-btn',
          text: 'Play Offline Guest',
          onClick: () => this.completeSignIn(null, 'Playing in Offline Guest mode')
        })
      )
    );

    this.mountGoogleOAuthButton(googleSlot, 'signup_with', showError);
  }

  private mountGoogleOAuthButton(
    container: HTMLElement,
    textMode: 'signin_with' | 'signup_with',
    onError: (msg: string) => void,
    expectedGmail?: string
  ): void {
    clearChildren(container);

    if (!this.googleClientId) {
      container.appendChild(
        el(
          'div',
          { className: 'gcu-oauth-hint' },
          createGDIconElement('globe', 14, GD_PALETTE.amber),
          ' Live Google OAuth Sign-In activates automatically once VITE_GOOGLE_CLIENT_ID is added in Vercel Project Environment Variables. Until then, enter your @gmail.com below to create & log in.'
        )
      );
      return;
    }

    const btnHost = el('div', { className: 'gcu-google-btn-host' });
    container.appendChild(btnHost);

    const initGsi = () => {
      const gsi = window.google?.accounts?.id;
      if (!gsi) return;
      gsi.initialize({
        client_id: this.googleClientId,
        callback: (res) => {
          void this.handleGoogleCredential(res.credential || '', expectedGmail, onError);
        }
      });
      gsi.renderButton(btnHost, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: textMode,
        width: 280
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }

    if (!this.googleScriptLoaded) {
      this.googleScriptLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGsi();
      script.onerror = () => onError('Could not reach Google Sign-In (offline). Use your Gmail below.');
      document.head.appendChild(script);
    }
  }

  private async handleGoogleCredential(
    credential: string,
    expectedGmail: string | undefined,
    onError: (msg: string) => void
  ): Promise<void> {
    if (!credential) {
      onError('Google Sign-In did not return a credential.');
      return;
    }

    let verifiedEmail = '';
    let verifiedName = '';
    let verifiedByServer = false;

    // 1. Prefer authoritative server-side verification (/api/auth/google on Vercel)
    try {
      const apiRes = await fetch('./api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ credential })
      });
      if (apiRes.ok) {
        const data = (await apiRes.json()) as { email?: string; name?: string; verified?: boolean };
        if (data.verified && data.email) {
          verifiedEmail = data.email.toLowerCase();
          verifiedName = data.name || '';
          verifiedByServer = true;
        }
      }
    } catch {
      // Static hosts (e.g. GitHub Pages) lack /api; fall back to decoded OIDC claim for client UX only
    }

    if (!verifiedEmail) {
      const payload = decodeGoogleJwtPayload(credential);
      if (!payload?.email || !payload.email_verified) {
        onError('Google account email is not verified.');
        return;
      }
      verifiedEmail = payload.email.toLowerCase();
      verifiedName = payload.name || '';
    }

    if (!isValidGmailAddress(verifiedEmail)) {
      onError('Please sign in with an original @gmail.com Google account.');
      return;
    }

    if (expectedGmail && verifiedEmail !== expectedGmail.toLowerCase()) {
      onError(`Signed in with ${verifiedEmail}, which does not match your saved account (${expectedGmail}).`);
      return;
    }

    const cleanName = (verifiedName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || verifiedEmail.split('@')[0]).slice(0, 24);
    const nowIso = new Date().toISOString();
    const account: PlayerAccount = {
      callsign: this.currentAccount?.gmail === verifiedEmail ? this.currentAccount.callsign : cleanName,
      gmail: verifiedEmail,
      authMode: 'google_oauth',
      verifiedByGoogle: true,
      createdAt: this.currentAccount?.createdAt || nowIso,
      lastLoginAt: nowIso
    };
    saveStoredAccount(account);
    this.currentAccount = account;
    this.completeSignIn(
      account,
      `Verified Gmail login: ${account.gmail}${verifiedByServer ? ' (Server Verified)' : ''}`
    );
  }

  private completeSignIn(account: PlayerAccount | null, toastMsg: string): void {
    this.currentAccount = account;
    this.isLoggedIn = true;
    this.closeAuthGate();
    this.onNotify?.(toastMsg);
    this.onAuthComplete?.(account);
  }
}
