import * as THREE from 'three';
import { latLonToWorld } from '../world/bengaluruData';
import { gameBus } from '../core/EventBus';
import { createGDIconElement, GD_PALETTE } from '../ui/GDIcon';
import { el } from '../security/SafeDOM';
import { CutsceneDef, StoryLanguage } from './StoryData';

/**
 * Camera-Driven Skippable 3D Cutscene Engine:
 * - Sweeps the Three.js camera smoothly across real Bengaluru zone landmarks
 * - Renders cinema letterbox bars, GDIcon title badges, live progress & multilingual captions
 * - Skippable anytime with [Space], [Esc], or the Skip button
 */
export class CutsceneManager {
  public isPlaying = false;
  public language: StoryLanguage = 'en';

  private overlayEl: HTMLDivElement;
  private titleEl: HTMLElement;
  private subEl: HTMLElement;
  private captionEl: HTMLElement;
  private barFillEl: HTMLElement;

  private active: CutsceneDef | null = null;
  private shotIdx = 0;
  private shotElapsed = 0;
  private totalDuration = 1;
  private totalElapsed = 0;
  private onDone?: (skipped: boolean) => void;

  private currentCamPos = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  constructor() {
    this.titleEl = el('span', { id: 'gd-cut-title', text: 'CHAPTER 1' });
    this.subEl = el('span', { id: 'gd-cut-sub', text: 'GARDEN CITY UNDERWORLD' });
    this.captionEl = el('div', { id: 'gd-cut-caption', className: 'gd-cut-caption' });
    this.barFillEl = el('div', { id: 'gd-cut-fill', className: 'gd-cut-fill' });

    this.overlayEl = el(
      'div',
      { id: 'gd-cutscene-overlay', className: 'gd-cutscene-overlay hidden' },
      el(
        'div',
        { className: 'gd-letterbox gd-lb-top' },
        el(
          'div',
          { className: 'gd-cut-badge' },
          createGDIconElement('cutscene', 16, GD_PALETTE.amber),
          this.titleEl,
          el('span', { className: 'gd-cut-dot', text: '•' }),
          this.subEl
        ),
        el(
          'button',
          { id: 'gd-cut-skip', className: 'gd-skip-btn', onClick: () => this.skip() },
          createGDIconElement('skip', 14, GD_PALETTE.pink),
          ' SKIP CUTSCENE [Space]'
        )
      ),
      el(
        'div',
        { className: 'gd-letterbox gd-lb-bot' },
        this.captionEl,
        el('div', { className: 'gd-cut-bar' }, this.barFillEl)
      )
    );
    document.body.appendChild(this.overlayEl);

    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        this.skip();
      }
    });
  }

  public play(cutscene: CutsceneDef, onDone?: (skipped: boolean) => void): void {
    this.active = cutscene;
    this.shotIdx = 0;
    this.shotElapsed = 0;
    this.totalElapsed = 0;
    this.totalDuration = Math.max(0.1, cutscene.shots.reduce((s, sh) => s + sh.duration, 0));
    this.onDone = onDone;
    this.isPlaying = true;

    this.titleEl.textContent = cutscene.title;
    this.subEl.textContent = cutscene.subtitle;
    this.overlayEl.classList.remove('hidden');

    const first = cutscene.shots[0];
    if (first) {
      const w = latLonToWorld(first.lat, first.lon);
      this.currentCamPos.set(w.x + first.camOffset[0], first.camOffset[1], w.z + first.camOffset[2]);
      this.currentLookAt.set(w.x + first.lookOffset[0], first.lookOffset[1], w.z + first.lookOffset[2]);
    }

    gameBus.emit('cutscene:started', { cutsceneId: cutscene.id, title: cutscene.title });
  }

  public skip(): void {
    if (!this.isPlaying) return;
    this.finish(true);
  }

  private finish(skipped: boolean): void {
    const id = this.active?.id || '';
    const cb = this.onDone;
    this.isPlaying = false;
    this.active = null;
    this.onDone = undefined;
    this.overlayEl.classList.add('hidden');
    gameBus.emit('cutscene:ended', { cutsceneId: id, skipped });
    cb?.(skipped);
  }

  /**
   * Advances cutscene camera trajectory; returns current camera focus point so chunk streamer keeps city loaded!
   */
  public update(dt: number, camera: THREE.PerspectiveCamera): THREE.Vector3 | null {
    if (!this.isPlaying || !this.active) return null;

    const shot = this.active.shots[this.shotIdx];
    if (!shot) {
      this.finish(false);
      return null;
    }

    this.shotElapsed += dt;
    this.totalElapsed += dt;
    const t = Math.min(1, this.shotElapsed / Math.max(0.1, shot.duration));

    const w = latLonToWorld(shot.lat, shot.lon);
    // Smooth cinematic pan + subtle orbit arc around the landmark
    const panAngle = (t - 0.5) * 0.45;
    const cos = Math.cos(panAngle);
    const sin = Math.sin(panAngle);
    const ox = shot.camOffset[0] * cos - shot.camOffset[2] * sin;
    const oz = shot.camOffset[0] * sin + shot.camOffset[2] * cos;

    const desiredPos = new THREE.Vector3(w.x + ox, shot.camOffset[1] - t * 3.5, w.z + oz);
    const desiredLook = new THREE.Vector3(w.x + shot.lookOffset[0], shot.lookOffset[1], w.z + shot.lookOffset[2]);

    this.currentCamPos.lerp(desiredPos, Math.min(1, dt * 3.5));
    this.currentLookAt.lerp(desiredLook, Math.min(1, dt * 4.5));

    camera.position.copy(this.currentCamPos);
    camera.lookAt(this.currentLookAt);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 52, dt * 3);
    camera.updateProjectionMatrix();

    const cap =
      this.language === 'kn' ? `${shot.caption.kn} (${shot.caption.en})` :
      this.language === 'hi' ? `${shot.caption.hi} (${shot.caption.en})` :
      shot.caption.en;
    this.captionEl.textContent = cap;
    this.barFillEl.style.width = `${Math.min(100, (this.totalElapsed / this.totalDuration) * 100)}%`;

    if (this.shotElapsed >= shot.duration) {
      this.shotIdx++;
      this.shotElapsed = 0;
      if (this.shotIdx >= this.active.shots.length) {
        this.finish(false);
        return desiredLook;
      }
    }

    return desiredLook;
  }
}
