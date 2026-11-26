import { gameBus } from '../core/EventBus';
import { HardwareProfile, QualityTier } from './DeviceProfiler';

export type FrameLimitOption = 30 | 60 | 120 | 0; // 0 = uncapped
export type QualitySelection = 'auto' | QualityTier;

export interface QualityTierConfig {
  tier: QualityTier;
  targetFps: number;
  baseRenderScale: number;
  maxDpr: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  drawDistance: number;
  chunkRadius: number;
  maxTraffic: number;
  maxNpcs: number;
  particleScale: number;
  textureSizeCap: number;
  postMode: 'none' | 'medium' | 'high';
  reflections: boolean;
  maxAudioVoices: number;
}

export interface QualityPreferences {
  selection: QualitySelection;
  frameLimit: FrameLimitOption;
  dynamicResEnabled: boolean;
  powerSaver: boolean;
}

const PREFS_STORAGE_KEY = 'garden_city_quality_prefs_v1';

interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  level: number;
}

/**
 * Unified QualityManager for Android, macOS (Apple Silicon & Intel), and Windows (10/11):
 * - Controls render scale, DPR caps, shadows, draw distance, chunk radius, traffic/NPC counts,
 *   particles, texture caps, post-processing, reflections, and audio voice limits.
 * - Dynamic Resolution Scaling (down to 0.6) when FPS drops below target for 2s, recovering cleanly.
 * - Fixed-timestep physics accumulator & configurable frame limiter (30 / 60 / 120 / uncapped).
 * - Battery Status API & Power Saver mode + 10-minute thermal throttling auto step-down.
 */
export class QualityManager {
  public profile: HardwareProfile;
  public prefs: QualityPreferences;
  public activeTier: QualityTier;
  public renderScale = 1.0;

  // Battery & thermal telemetry
  public batteryLevel: number | null = null;
  public batteryCharging = true;
  public batterySuggestedPowerSaver = false;
  public thermalSteppedDown = false;

  // DRS tracking
  private lowFpsDuration = 0;
  private stableFpsDuration = 0;
  private smoothedFps = 60;
  private smoothedFrameMs = 16.6;

  // Thermal tracking (10 min = 600s default; injectable for unit tests)
  private thermalBaselineMs: number | null = null;
  private thermalElapsedSec = 0;
  private thermalRisingSec = 0;
  private thermalWindowSec = 600;

  // Frame pacing & fixed-timestep physics accumulator
  public readonly fixedPhysicsStep = 1 / 60;
  private lastFrameTimestamp = 0;
  private physicsAccumulator = 0;

  public onApplyConfig?: (cfg: QualityTierConfig, renderScale: number, effectiveDpr: number) => void;
  public onNotify?: (msg: string) => void;

  constructor(profile: HardwareProfile, thermalWindowSec = 600) {
    this.profile = profile;
    this.thermalWindowSec = thermalWindowSec;
    this.prefs = this.loadPrefs();
    this.activeTier = this.resolveInitialTier();
    this.renderScale = this.getTierConfig(this.activeTier).baseRenderScale;
    this.initBatteryMonitor();
  }

  private loadPrefs(): QualityPreferences {
    const defaults: QualityPreferences = {
      selection: 'auto',
      frameLimit: this.profile.recommendedTier === 'lite' ? 30 : this.profile.recommendedTier === 'high' && this.profile.refreshRateHz >= 120 ? 120 : 60,
      dynamicResEnabled: true,
      powerSaver: false
    };
    try {
      if (typeof localStorage === 'undefined') return defaults;
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return defaults;
      const p = JSON.parse(raw);
      return {
        selection: p.selection === 'lite' || p.selection === 'medium' || p.selection === 'high' ? p.selection : 'auto',
        frameLimit: p.frameLimit === 30 || p.frameLimit === 60 || p.frameLimit === 120 || p.frameLimit === 0 ? p.frameLimit : defaults.frameLimit,
        dynamicResEnabled: typeof p.dynamicResEnabled === 'boolean' ? p.dynamicResEnabled : true,
        powerSaver: typeof p.powerSaver === 'boolean' ? p.powerSaver : false
      };
    } catch {
      return defaults;
    }
  }

  public savePrefs(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.prefs));
      }
    } catch {
      // ignore storage errors
    }
  }

  private resolveInitialTier(): QualityTier {
    if (this.prefs.powerSaver) return 'lite';
    return this.prefs.selection === 'auto' ? this.profile.recommendedTier : this.prefs.selection;
  }

  public getTierConfig(tier: QualityTier = this.activeTier): QualityTierConfig {
    const isPhone = this.profile.isMobile;
    const isMacRetina = this.profile.isMacRetina;
    const highRefresh = this.profile.refreshRateHz >= 115;

    if (tier === 'lite') {
      return {
        tier: 'lite',
        targetFps: 30,
        baseRenderScale: isPhone ? 0.78 : 0.75,
        maxDpr: 2, // Capped at 2 for LITE
        shadowMapSize: 1024,
        shadowsEnabled: true,
        drawDistance: 1200,
        chunkRadius: 1,
        maxTraffic: 10,
        maxNpcs: 10,
        particleScale: 0.35,
        textureSizeCap: 512,
        postMode: 'none', // Tone mapping only
        reflections: false,
        maxAudioVoices: 16
      };
    }

    if (tier === 'medium') {
      return {
        tier: 'medium',
        targetFps: isPhone ? 45 : 60,
        baseRenderScale: isPhone ? 0.88 : 0.95,
        maxDpr: isMacRetina ? 2 : 2, // Explicitly capped at 2 for MacBook Retina on MEDIUM
        shadowMapSize: 2048,
        shadowsEnabled: true,
        drawDistance: 2100,
        chunkRadius: 2,
        maxTraffic: 20,
        maxNpcs: 18,
        particleScale: 0.7,
        textureSizeCap: 1024,
        postMode: 'medium',
        reflections: !isPhone,
        maxAudioVoices: 24
      };
    }

    // HIGH tier: flagship phones (DPR cap 3), Apple M1-M4, RTX 3050+, RX 6600+
    return {
      tier: 'high',
      targetFps: highRefresh ? 120 : 60,
      baseRenderScale: 1.0,
      maxDpr: isPhone ? 3 : 2, // 3 ONLY on HIGH phones
      shadowMapSize: 4096,
      shadowsEnabled: true,
      drawDistance: 3200,
      chunkRadius: 2,
      maxTraffic: 34,
      maxNpcs: 28,
      particleScale: 1.0,
      textureSizeCap: 2048,
      postMode: 'high',
      reflections: !isPhone, // Desktop Windows/Mac only, never on phones!
      maxAudioVoices: 32
    };
  }

  public getEffectiveDpr(): number {
    const cfg = this.getTierConfig(this.activeTier);
    const nativeDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const capped = Math.min(nativeDpr, cfg.maxDpr);
    return Math.max(0.6, capped * this.renderScale);
  }

  public getEffectiveFrameLimit(): FrameLimitOption {
    if (this.prefs.powerSaver) return 30;
    return this.prefs.frameLimit;
  }

  /**
   * Frame limiter gate for requestAnimationFrame loop.
   * Returns true if this frame should render, plus the frame delta in seconds.
   */
  public shouldRenderFrame(nowMs: number): { render: boolean; frameDt: number } {
    if (this.lastFrameTimestamp === 0) {
      this.lastFrameTimestamp = nowMs;
      return { render: true, frameDt: 1 / 60 };
    }
    const elapsedMs = nowMs - this.lastFrameTimestamp;
    const limit = this.getEffectiveFrameLimit();
    if (limit > 0) {
      const minMs = 1000 / limit - 0.85;
      if (elapsedMs < minMs) {
        return { render: false, frameDt: 0 };
      }
    }
    this.lastFrameTimestamp = nowMs;
    const frameDt = Math.min(0.1, Math.max(0.001, elapsedMs / 1000));
    return { render: true, frameDt };
  }

  /**
   * Fixed-timestep physics helper: guarantees identical simulation speed on 30, 60, 120, and 144 Hz screens.
   */
  public consumePhysicsSteps(frameDt: number): number {
    this.physicsAccumulator = Math.min(0.1, this.physicsAccumulator + frameDt);
    let steps = 0;
    while (this.physicsAccumulator >= this.fixedPhysicsStep && steps < 4) {
      this.physicsAccumulator -= this.fixedPhysicsStep;
      steps++;
    }
    return steps;
  }

  public setSelection(selection: QualitySelection): void {
    this.prefs.selection = selection;
    // Explicit manual tier selection exits Power Saver so tier & frame limiter work predictably
    if (selection !== 'auto') {
      this.prefs.powerSaver = false;
    }
    this.thermalSteppedDown = false;
    this.activeTier = this.resolveInitialTier();
    const cfg = this.getTierConfig(this.activeTier);
    this.renderScale = cfg.baseRenderScale;
    this.lowFpsDuration = 0;
    this.stableFpsDuration = 0;
    this.savePrefs();
    this.applyNow('user_override');
  }

  public setFrameLimit(limit: FrameLimitOption): void {
    this.prefs.frameLimit = limit;
    this.savePrefs();
  }

  public setDynamicResEnabled(enabled: boolean): void {
    this.prefs.dynamicResEnabled = enabled;
    if (!enabled) {
      this.renderScale = this.getTierConfig(this.activeTier).baseRenderScale;
      this.applyNow('drs_disabled');
    }
    this.savePrefs();
  }

  public setPowerSaver(enabled: boolean): void {
    this.prefs.powerSaver = enabled;
    this.activeTier = this.resolveInitialTier();
    this.renderScale = this.getTierConfig(this.activeTier).baseRenderScale;
    this.savePrefs();
    this.applyNow(enabled ? 'power_saver_on' : 'power_saver_off');
  }

  public applyProfile(profile: HardwareProfile): void {
    this.profile = profile;
    this.thermalSteppedDown = false;
    this.activeTier = this.resolveInitialTier();
    this.renderScale = this.getTierConfig(this.activeTier).baseRenderScale;
    this.applyNow('benchmark_profile');
  }

  public applyNow(reason = 'init'): void {
    const cfg = this.getTierConfig(this.activeTier);
    const effectiveDpr = this.getEffectiveDpr();
    this.onApplyConfig?.(cfg, this.renderScale, effectiveDpr);
    gameBus.emit('quality:changed', { tier: this.activeTier, renderScale: this.renderScale, reason });
  }

  /**
   * Per-frame performance monitor driving Dynamic Resolution Scaling (2s drop threshold, min 0.6)
   * and Thermal Slowdown Protection (steps down 1 tier after 10 minutes of rising frame times).
   */
  public recordFrame(frameDt: number): void {
    const frameMs = frameDt * 1000;
    const instantFps = 1000 / Math.max(1, frameMs);
    this.smoothedFrameMs = this.smoothedFrameMs * 0.92 + frameMs * 0.08;
    this.smoothedFps = this.smoothedFps * 0.92 + instantFps * 0.08;

    const cfg = this.getTierConfig(this.activeTier);
    const effLimit = this.getEffectiveFrameLimit();
    const targetFps = effLimit > 0 ? Math.min(cfg.targetFps, effLimit) : cfg.targetFps;

    // 1. Dynamic Resolution Scaling (down to 0.6 after 2s below target, recover when stable)
    if (this.prefs.dynamicResEnabled) {
      if (this.smoothedFps < targetFps * 0.88) {
        this.lowFpsDuration += frameDt;
        this.stableFpsDuration = 0;
        if (this.lowFpsDuration >= 2.0) {
          this.lowFpsDuration = 0;
          if (this.renderScale > 0.601) {
            this.renderScale = Math.max(0.6, Math.round((this.renderScale - 0.08) * 100) / 100);
            this.applyNow('drs_scale_down');
            gameBus.emit('quality:drs', { renderScale: this.renderScale, fps: Math.round(this.smoothedFps) });
          }
        }
      } else if (this.smoothedFps >= targetFps * 0.96) {
        this.stableFpsDuration += frameDt;
        this.lowFpsDuration = 0;
        if (this.stableFpsDuration >= 4.0) {
          this.stableFpsDuration = 0;
          if (this.renderScale < cfg.baseRenderScale - 0.01) {
            this.renderScale = Math.min(cfg.baseRenderScale, Math.round((this.renderScale + 0.05) * 100) / 100);
            this.applyNow('drs_recover');
            gameBus.emit('quality:drs', { renderScale: this.renderScale, fps: Math.round(this.smoothedFps) });
          }
        }
      } else {
        this.lowFpsDuration = Math.max(0, this.lowFpsDuration - frameDt * 0.5);
      }
    }

    // 2. Thermal throttling guard: compare sustained frame times against early steady baseline
    this.thermalElapsedSec += frameDt;
    if (this.thermalBaselineMs === null && this.thermalElapsedSec >= Math.min(15, this.thermalWindowSec * 0.1)) {
      this.thermalBaselineMs = Math.max(8, this.smoothedFrameMs);
    }
    if (this.thermalBaselineMs !== null && !this.thermalSteppedDown && this.activeTier !== 'lite') {
      if (this.smoothedFrameMs > this.thermalBaselineMs * 1.25 && this.smoothedFps < targetFps * 0.9) {
        this.thermalRisingSec += frameDt;
      } else {
        this.thermalRisingSec = Math.max(0, this.thermalRisingSec - frameDt * 0.25);
      }

      if (this.thermalRisingSec >= this.thermalWindowSec) {
        const prev = this.activeTier;
        const next: QualityTier = prev === 'high' ? 'medium' : 'lite';
        this.activeTier = next;
        this.thermalSteppedDown = true;
        this.thermalRisingSec = 0;
        this.renderScale = this.getTierConfig(next).baseRenderScale;
        this.applyNow('thermal_stepdown');
        gameBus.emit('quality:thermal', {
          previousTier: prev,
          nextTier: next,
          avgFrameMs: Math.round(this.smoothedFrameMs * 10) / 10
        });
        this.onNotify?.(`🌡 Thermal slowdown detected — stepped down ${prev.toUpperCase()} → ${next.toUpperCase()} to keep FPS smooth`);
      }
    }
  }

  public getTelemetry(): {
    tier: QualityTier;
    renderScale: number;
    effectiveDpr: number;
    fps: number;
    frameMs: number;
    frameLimit: FrameLimitOption;
    batteryLevel: number | null;
    batteryCharging: boolean;
    powerSaver: boolean;
    gpuRenderer: string;
    refreshRateHz: number;
    platform: string;
  } {
    return {
      tier: this.activeTier,
      renderScale: this.renderScale,
      effectiveDpr: Math.round(this.getEffectiveDpr() * 100) / 100,
      fps: Math.round(this.smoothedFps),
      frameMs: Math.round(this.smoothedFrameMs * 10) / 10,
      frameLimit: this.getEffectiveFrameLimit(),
      batteryLevel: this.batteryLevel,
      batteryCharging: this.batteryCharging,
      powerSaver: this.prefs.powerSaver,
      gpuRenderer: this.profile.gpuRenderer,
      refreshRateHz: this.profile.refreshRateHz,
      platform: this.profile.platform
    };
  }

  private initBatteryMonitor(): void {
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { getBattery?: () => Promise<BatteryManagerLike> }) : null;
    if (!nav?.getBattery) return;

    nav.getBattery().then((bat) => {
      const sync = () => {
        this.batteryLevel = Math.round(bat.level * 100);
        this.batteryCharging = bat.charging;
        const onBattery = !bat.charging;
        if (onBattery && !this.batterySuggestedPowerSaver && !this.prefs.powerSaver) {
          this.batterySuggestedPowerSaver = true;
          // Auto-switch if critically low (<= 25%) and still on Auto, otherwise suggest Power Saver!
          if (this.batteryLevel <= 25 && this.prefs.selection === 'auto') {
            this.setPowerSaver(true);
            this.onNotify?.(`🔋 Low battery (${this.batteryLevel}%) — auto-enabled Power Saver (30 FPS • LITE)`);
          } else {
            this.onNotify?.(`🔋 Running on battery (${this.batteryLevel}%) — enable Power Saver in [Esc] Settings for 30 FPS & longer battery life`);
          }
        }
        gameBus.emit('quality:battery', {
          level: this.batteryLevel,
          charging: this.batteryCharging,
          suggestedPowerSaver: onBattery
        });
      };
      sync();
      bat.addEventListener('chargingchange', sync);
      bat.addEventListener('levelchange', sync);
    }).catch(() => {
      // Battery Status API unavailable (e.g., Safari/Firefox)
    });
  }
}
