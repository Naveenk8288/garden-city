import { clearChildren, el } from '../security/SafeDOM';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Cross-platform App Installer & Service Worker Manager built with SafeDOM (zero innerHTML).
 */
export class AppInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  public isInstalled = false;
  public isModalOpen = false;
  private modalEl: HTMLDivElement;
  private guideBodyEl!: HTMLDivElement;
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
    this.guideBodyEl = el('div', { id: 'install-guide-body', className: 'install-guide-body' });

    const overlay = el(
      'div',
      {
        id: 'app-install-modal',
        className: 'modal-overlay hidden',
        onClick: (e) => {
          if (e.target === overlay) this.setModalOpen(false);
        }
      },
      el(
        'div',
        { className: 'install-modal-card' },
        el(
          'div',
          { className: 'install-card-head' },
          el('img', {
            className: 'install-app-icon',
            attrs: { src: './icons/icon-192.png', alt: 'Garden City App Icon' }
          }),
          el(
            'div',
            {},
            el('div', { className: 'install-kicker', text: 'ONE APP • ANDROID • iOS • macOS • WINDOWS' }),
            el('h2', { text: 'INSTALL GARDEN CITY UNDERWORLD' }),
            el('p', {
              className: 'install-sub',
              text: 'Launch full-screen with the custom emblem icon right from your Home Screen, Dock, or Desktop.'
            })
          ),
          el('button', {
            id: 'btn-close-install',
            className: 'btn-close',
            text: '✕',
            attrs: { 'aria-label': 'Close' },
            onClick: () => this.setModalOpen(false)
          })
        ),
        this.guideBodyEl,
        el(
          'div',
          { className: 'install-card-foot' },
          el('button', {
            id: 'btn-install-done',
            className: 'btn-primary',
            text: 'GOT IT',
            onClick: () => this.setModalOpen(false)
          })
        )
      )
    );
    return overlay;
  }

  private populatePlatformGuide(): void {
    clearChildren(this.guideBodyEl);

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMac = /Mac|Macintosh/i.test(ua) && !isIOS;
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|CriOS|FxiOS/i.test(ua);

    const makeCard = (title: string, active: boolean, steps: string[]) =>
      el(
        'div',
        { className: `install-step-card${active ? ' active' : ''}` },
        el('div', { className: 'install-plat-title', text: title }),
        el('ol', {}, ...steps.map((s) => el('li', { text: s })))
      );

    this.guideBodyEl.appendChild(
      el(
        'div',
        { className: 'install-platform-grid' },
        makeCard('🤖 Android Phones & Tablets', isAndroid, [
          'Open in Chrome, Edge, or Samsung Internet.',
          'Tap the ⋮ Menu (top-right) → Install app (or Add to Home screen).',
          'Tap Install — the app icon appears on your home screen & app drawer.'
        ]),
        makeCard('📱 iPhone & iPad (iOS / iPadOS)', isIOS, [
          'Open this link in Safari.',
          'Tap the Share icon (square with upward arrow) on the toolbar.',
          'Scroll down and tap Add to Home Screen → Add.'
        ]),
        makeCard('💻 MacBook & macOS', isMac, [
          'Safari (macOS Sonoma+): Click File → Add to Dock… (or Share → Add to Dock).',
          'Chrome / Edge: Click the Install icon on the right side of the address bar → Install.'
        ]),
        makeCard('🖥️ Windows 10 / 11 & Laptops', !isAndroid && !isIOS && !isMac, [
          'Open in Chrome or Microsoft Edge.',
          'Click the Install App icon on the right of the address bar (or Menu → Apps → Install this site as an app).',
          'Pin it to your Taskbar or Desktop for 1-click launch.'
        ])
      )
    );

    if (isIOS && !isSafari) {
      this.guideBodyEl.appendChild(
        el('div', {
          className: 'install-tip',
          text: '💡 Tip: On iPhone/iPad, open this URL in Safari to enable full-screen Home Screen app installation.'
        })
      );
    }
  }
}
