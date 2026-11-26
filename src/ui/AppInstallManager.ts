interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Cross-platform App Installer & Service Worker Manager:
 * - Registers ./sw.js so Android, iOS, macOS, and Windows treat the game as an installable app.
 * - Captures beforeinstallprompt for 1-click native installation on Android Chrome/Edge and Desktop Chrome/Edge.
 * - Provides platform-tailored Install Guide modal for iOS Safari ("Add to Home Screen"),
 *   macOS Safari ("Add to Dock"), and browsers without beforeinstallprompt.
 */
export class AppInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  public isInstalled = false;
  public isModalOpen = false;
  private modalEl: HTMLDivElement;
  public onModalToggle?: (open: boolean) => void;
  public onNotify?: (msg: string) => void;

  constructor() {
    this.isInstalled = this.checkStandaloneMode();
    this.modalEl = this.createInstallGuideModal();
    document.body.appendChild(this.modalEl);

    this.registerServiceWorker();
    this.listenInstallEvents();
    this.syncInstallButtons();
  }

  private checkStandaloneMode(): boolean {
    if (typeof window === 'undefined') return false;
    const mqStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
    const mqFullscreen = window.matchMedia?.('(display-mode: fullscreen)')?.matches;
    const iosStandalone = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
    return Boolean(mqStandalone || mqFullscreen || iosStandalone);
  }

  private registerServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return;
    }
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Non-fatal in private tabs or restricted embedded WebViews
    });
  }

  private listenInstallEvents(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.syncInstallButtons();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      this.setModalOpen(false);
      this.syncInstallButtons();
      this.onNotify?.('App installed! Launch Garden City Underworld directly from your home screen or desktop.');
    });
  }

  public syncInstallButtons(): void {
    const btns = document.querySelectorAll<HTMLButtonElement>('[data-install-app-btn]');
    btns.forEach((btn) => {
      if (this.isInstalled) {
        btn.textContent = '✓ INSTALLED AS APP';
        btn.disabled = true;
        btn.classList.add('app-installed');
      } else if (this.deferredPrompt) {
        btn.textContent = '⬇ INSTALL APP (1-TAP)';
        btn.disabled = false;
        btn.classList.remove('app-installed');
      } else {
        btn.textContent = '⬇ INSTALL APP';
        btn.disabled = false;
        btn.classList.remove('app-installed');
      }
    });
  }

  public async triggerInstall(): Promise<void> {
    if (this.isInstalled) {
      this.onNotify?.('Garden City Underworld is already running as an installed app!');
      return;
    }
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          this.syncInstallButtons();
          return;
        }
      } catch {
        // Fall through to manual platform instructions modal
      }
    }
    this.setModalOpen(true);
  }

  public setModalOpen(open: boolean): void {
    this.isModalOpen = open;
    this.modalEl.classList.toggle('hidden', !open);
    if (open) this.populatePlatformGuide();
    this.onModalToggle?.(open);
  }

  private createInstallGuideModal(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'app-install-modal';
    el.className = 'modal-overlay hidden';
    el.innerHTML = `
      <div class="install-modal-card">
        <div class="install-card-head">
          <img src="./icons/icon-192.png" alt="Garden City App Icon" class="install-app-icon" />
          <div>
            <div class="install-kicker">ONE APP • ANDROID • iOS • macOS • WINDOWS</div>
            <h2>INSTALL GARDEN CITY UNDERWORLD</h2>
            <p class="install-sub">Launch full-screen with the custom emblem icon right from your Home Screen, Dock, or Desktop.</p>
          </div>
          <button id="btn-close-install" class="btn-close" aria-label="Close">✕</button>
        </div>
        <div id="install-guide-body" class="install-guide-body"></div>
        <div class="install-card-foot">
          <button id="btn-install-done" class="btn-primary">GOT IT</button>
        </div>
      </div>
    `;
    el.querySelector('#btn-close-install')?.addEventListener('click', () => this.setModalOpen(false));
    el.querySelector('#btn-install-done')?.addEventListener('click', () => this.setModalOpen(false));
    el.addEventListener('click', (e) => {
      if (e.target === el) this.setModalOpen(false);
    });
    return el;
  }

  private populatePlatformGuide(): void {
    const body = this.modalEl.querySelector('#install-guide-body');
    if (!body) return;

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMac = /Mac|Macintosh/i.test(ua) && !isIOS;
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|CriOS|FxiOS/i.test(ua);

    const activeHighlight = (match: boolean) => (match ? ' active' : '');

    body.innerHTML = `
      <div class="install-platform-grid">
        <div class="install-step-card${activeHighlight(isAndroid)}">
          <div class="install-plat-title">🤖 Android Phones &amp; Tablets</div>
          <ol>
            <li>Open in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Samsung Internet</strong>.</li>
            <li>Tap the <strong>⋮ Menu</strong> (top-right) → <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</li>
            <li>Tap <strong>Install</strong> — the app icon appears on your home screen &amp; app drawer.</li>
          </ol>
        </div>
        <div class="install-step-card${activeHighlight(isIOS)}">
          <div class="install-plat-title">📱 iPhone &amp; iPad (iOS / iPadOS)</div>
          <ol>
            <li>Open this link in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> icon (square with upward arrow) at the bottom/top bar.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.</li>
          </ol>
        </div>
        <div class="install-step-card${activeHighlight(isMac)}">
          <div class="install-plat-title">💻 MacBook &amp; macOS</div>
          <ol>
            <li><strong>Safari (macOS Sonoma+):</strong> Click <strong>File → Add to Dock…</strong> (or Share → Add to Dock).</li>
            <li><strong>Chrome / Edge:</strong> Click the <strong>Install icon (⊕ / monitor-arrow)</strong> on the right side of the address bar → <strong>Install</strong>.</li>
          </ol>
        </div>
        <div class="install-step-card${activeHighlight(!isAndroid && !isIOS && !isMac)}">
          <div class="install-plat-title">🖥️ Windows 10 / 11 &amp; Laptops</div>
          <ol>
            <li>Open in <strong>Chrome</strong> or <strong>Microsoft Edge</strong>.</li>
            <li>Click the <strong>Install App</strong> icon on the right of the address bar (or Menu → <strong>Apps → Install this site as an app</strong>).</li>
            <li>Pin it to your <strong>Taskbar</strong> or <strong>Desktop</strong> for 1-click launch.</li>
          </ol>
        </div>
      </div>
      ${isIOS && !isSafari ? '<div class="install-tip">💡 Tip: On iPhone/iPad, open this URL in <strong>Safari</strong> to enable full-screen Home Screen app installation.</div>' : ''}
    `;
  }
}
