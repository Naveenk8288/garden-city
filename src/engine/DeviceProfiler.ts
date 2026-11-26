import * as THREE from 'three';
import { safeStorageGet, safeStorageSet } from '../security/PrivacyManager';

export type PlatformFamily = 'android' | 'macos' | 'windows' | 'ios' | 'linux' | 'unknown';
export type QualityTier = 'lite' | 'medium' | 'high';

export interface HardwareProfile {
  platform: PlatformFamily;
  isMobile: boolean;
  isMacRetina: boolean;
  isHybridGpuLikely: boolean;
  webgl2Supported: boolean;
  webgpuAvailable: boolean;
  gpuVendor: string;
  gpuRenderer: string;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  refreshRateHz: number;
  benchmarkFps: number;
  benchmarkP95Ms: number;
  recommendedTier: QualityTier;
  benchmarkedAt: number;
}

const PROFILE_STORAGE_KEY = 'garden_city_hw_profile_v1';

/**
 * Checks whether WebGL2 is available before booting Three.js.
 * Also probes optional WebGPU presence (kept strictly optional with WebGL2 fallback).
 */
export function checkGraphicsSupport(existingGl?: WebGLRenderingContext | WebGL2RenderingContext | null): {
  webgl2Supported: boolean;
  webgpuAvailable: boolean;
  gpuVendor: string;
  gpuRenderer: string;
} {
  let webgl2Supported = false;
  let gpuVendor = 'Unknown';
  let gpuRenderer = 'Unknown GPU';

  const readGlInfo = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        gpuVendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || gpuVendor);
        gpuRenderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || gpuRenderer);
      } else {
        gpuVendor = String(gl.getParameter(gl.VENDOR) || gpuVendor);
        gpuRenderer = String(gl.getParameter(gl.RENDERER) || gpuRenderer);
      }
    } catch {
      // ignore restricted driver parameter read
    }
  };

  if (existingGl) {
    webgl2Supported = true;
    readGlInfo(existingGl);
  } else if (typeof document !== 'undefined') {
    try {
      const probeCanvas = document.createElement('canvas');
      let gl = probeCanvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      }) as WebGL2RenderingContext | null;
      // Retry with default attributes (some Android OEM drivers reject high-performance hint)
      if (!gl) {
        gl = probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null;
      }
      if (gl) {
        webgl2Supported = true;
        readGlInfo(gl);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      webgl2Supported = false;
    }
  }

  const webgpuAvailable = typeof navigator !== 'undefined' && 'gpu' in navigator;
  return { webgl2Supported, webgpuAvailable, gpuVendor, gpuRenderer };
}

export function detectPlatform(): { platform: PlatformFamily; isMobile: boolean; isMacRetina: boolean } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const plat = typeof navigator !== 'undefined' ? ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || '') : '';
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  let platform: PlatformFamily = 'unknown';
  if (/Android/i.test(ua)) platform = 'android';
  else if (/iPhone|iPad|iPod/i.test(ua) || (plat === 'MacIntel' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) platform = 'ios';
  else if (/Mac|Macintosh/i.test(ua) || /Mac/i.test(plat)) platform = 'macos';
  else if (/Win/i.test(ua) || /Win/i.test(plat)) platform = 'windows';
  else if (/Linux/i.test(ua) || /Linux/i.test(plat)) platform = 'linux';

  const isMobile =
    platform === 'android' ||
    platform === 'ios' ||
    (typeof window !== 'undefined' && window.innerWidth <= 900 && 'ontouchstart' in window);
  const isMacRetina = platform === 'macos' && dpr >= 2;
  return { platform, isMobile, isMacRetina };
}

export function isLikelyHybridGpu(platform: PlatformFamily, gpuRenderer: string): boolean {
  if (platform !== 'windows' && platform !== 'macos') return false;
  const r = gpuRenderer.toLowerCase();
  if (/apple m[1-9]|rtx|gtx|radeon rx|radeon pro/i.test(r)) return false;
  return /intel|uhd|iris|hd graphics|vega|radeon\(tm\) graphics|swiftshader/i.test(r);
}

/**
 * Pure deterministic tier classifier combining benchmark FPS + GPU renderer string +
 * deviceMemory + CPU cores + platform + screen/DPR. Exported for unit testing.
 */
export function classifyHardwareTier(input: {
  platform: PlatformFamily;
  isMobile: boolean;
  gpuRenderer: string;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number;
  benchmarkFps: number;
  benchmarkP95Ms: number;
}): QualityTier {
  const gpu = input.gpuRenderer.toLowerCase();
  const mem = input.deviceMemoryGB;

  // Hard LITE constraints: <=3GB phones, Intel UHD 620 / HD / Vega 3 / software renderers, or low benchmark FPS
  const isLowEndGpu = /uhd 6\d\d|hd graphics|vega [23]|adreno \(tm\) [345]\d\d|adreno \(tm\) 61\d|mali-g5[12]|mali-t|powervr|swiftshader|llvmpipe/i.test(gpu);
  const isHighEndGpu = /apple m[1-9]|apple a1[5-9]|rtx [2345]\d\d\d|gtx 10[78]\d|rx [6789]\d\d\d|adreno \(tm\) [78]\d\d|immortalis|mali-g71[5-9]|mali-g72\d|xclipse/i.test(gpu);
  const isMidGpu = /iris(?:\(r\))?\s*(?:xe|plus|pro)|radeon(?:\(tm\))?\s*(?:680m|780m)|gtx 16[56]\d|gtx 10[56]\d|adreno \(tm\) 6[45689]\d|mali-g[67]\d/i.test(gpu);

  let score = 50;

  // Benchmark weight (strongest real-world signal)
  if (input.benchmarkFps >= 55 && input.benchmarkP95Ms <= 22) score += 28;
  else if (input.benchmarkFps >= 40 && input.benchmarkP95Ms <= 30) score += 10;
  else if (input.benchmarkFps < 32 || input.benchmarkP95Ms > 40) score -= 32;
  else score -= 12;

  // GPU class signal
  if (isHighEndGpu) score += 24;
  else if (isMidGpu) score += 4;
  else if (isLowEndGpu) score -= 28;

  // Memory & CPU cores signal
  if (mem !== null) {
    if (mem <= 3.5) score -= 30;
    else if (mem <= 4.5 && input.isMobile) score -= 15;
    else if (mem >= 8 && !input.isMobile) score += 6;
  }
  if (input.hardwareConcurrency <= 4 && !/apple m/i.test(gpu)) score -= 8;
  else if (input.hardwareConcurrency >= 8) score += 4;

  // Guardrails strictly aligned with the Support Matrix
  if (input.isMobile && mem !== null && mem <= 3.5) return 'lite';
  if (isLowEndGpu && (mem === null || mem <= 8) && input.benchmarkFps < 48) return 'lite';
  if (isMidGpu && !isHighEndGpu && input.benchmarkFps < 75) return score >= 38 ? 'medium' : 'lite';

  if (score >= 82 && input.benchmarkFps >= 55) return 'high';
  if (score >= 38) return 'medium';
  return 'lite';
}

export function loadSavedHardwareProfile(): HardwareProfile | null {
  try {
    const raw = safeStorageGet(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HardwareProfile;
    if (!parsed || !parsed.recommendedTier) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveHardwareProfile(profile: HardwareProfile): void {
  safeStorageSet(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function snapRefreshRate(rawHz: number): number {
  const candidates = [30, 60, 75, 90, 120, 144, 165, 240];
  let best = 60;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const d = Math.abs(rawHz - c);
    if (d < bestDiff) {
      bestDiff = d;
      best = c;
    }
  }
  return best;
}

/**
 * Runs a lightweight 5-second WebGL2 GPU & refresh-rate benchmark on first launch
 * (rendering instanced buildings, shadows, lights & specular surfaces) to classify LITE/MEDIUM/HIGH.
 */
export async function runHardwareBenchmark(
  renderer: THREE.WebGLRenderer,
  onProgress?: (msg: string, pct: number) => void,
  durationMs = 5000
): Promise<HardwareProfile> {
  // Reuse active renderer WebGL context so Android never hits WebGL context-pool limits
  const support = checkGraphicsSupport(renderer.getContext());
  const { platform, isMobile, isMacRetina } = detectPlatform();
  const deviceMemoryGB = typeof navigator !== 'undefined' && typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory === 'number'
    ? (navigator as unknown as { deviceMemory: number }).deviceMemory
    : null;
  const hardwareConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const screenWidth = typeof window !== 'undefined' ? window.screen?.width || window.innerWidth : 1280;
  const screenHeight = typeof window !== 'undefined' ? window.screen?.height || window.innerHeight : 720;
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // On mobile phones, use a lightweight 1.5s benchmark (or instant on ?safeLite=1 / ?skipBench=1)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const skipRequested = urlParams?.get('skipBench') === '1' || urlParams?.get('safeLite') === '1';
  const actualDuration = skipRequested ? 300 : isMobile ? Math.min(durationMs, 1500) : durationMs;

  // Keep benchmark at 1x DPR so 3x DPR phones never allocate huge offscreen buffers before tier selection
  const prevDpr = renderer.getPixelRatio();
  renderer.setPixelRatio(1);

  // Build self-contained miniature Bengaluru block benchmark scene
  const benchScene = new THREE.Scene();
  benchScene.background = new THREE.Color(0x0b0f1a);
  const benchCam = new THREE.PerspectiveCamera(60, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.5, 250);
  benchCam.position.set(0, 16, 36);

  const dirLight = new THREE.DirectionalLight(0xffd7a1, 2.2);
  dirLight.position.set(22, 36, 18);
  dirLight.castShadow = !isMobile;
  if (!isMobile) {
    dirLight.shadow.mapSize.set(1024, 1024);
  }
  benchScene.add(dirLight, new THREE.AmbientLight(0x3a4a6b, 0.8));

  const boxGeo = new THREE.BoxGeometry(1.8, 1.0, 1.8);
  const bldMat = new THREE.MeshStandardMaterial({ color: 0x4b6584, roughness: 0.35, metalness: 0.45 });
  const count = isMobile ? 169 : 420;
  const gridSide = isMobile ? 13 : 21;
  const halfSide = Math.floor(gridSide / 2);
  const inst = new THREE.InstancedMesh(boxGeo, bldMat, count);
  inst.castShadow = !isMobile;
  inst.receiveShadow = !isMobile;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const gx = (i % gridSide) - halfSide;
    const gz = Math.floor(i / gridSide) - halfSide;
    const h = 2 + ((i * 19) % 14);
    dummy.position.set(gx * 3.1, h * 0.5, gz * 3.1);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  benchScene.add(inst);

  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.28, metalness: 0.35 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !isMobile;
  benchScene.add(ground);

  const frameTimes: number[] = [];
  const start = performance.now();
  let last = start;

  await new Promise<void>((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    // Hard wall-clock ceiling so throttled/backgrounded mobile browsers can NEVER stall startup
    const hardTimer = window.setTimeout(done, actualDuration + 1200);

    const tick = (now: number) => {
      if (finished) return;
      const elapsed = now - start;
      const dtMs = now - last;
      last = now;
      if (elapsed > 200 && dtMs > 1 && dtMs < 250) {
        frameTimes.push(dtMs);
      }

      const angle = elapsed * 0.0009;
      benchCam.position.set(Math.cos(angle) * 34, 15 + Math.sin(angle * 2) * 3, Math.sin(angle) * 34);
      benchCam.lookAt(0, 4, 0);
      try {
        renderer.render(benchScene, benchCam);
      } catch {
        window.clearTimeout(hardTimer);
        done();
        return;
      }

      const pct = Math.min(1, elapsed / actualDuration);
      const secLeft = Math.max(0, (actualDuration - elapsed) / 1000).toFixed(1);
      onProgress?.(`Benchmarking device GPU & refresh rate (${secLeft}s)...`, 12 + Math.round(pct * 24));

      if (elapsed >= actualDuration) {
        window.clearTimeout(hardTimer);
        done();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

  renderer.setPixelRatio(prevDpr);

  // Dispose benchmark GPU resources completely!
  boxGeo.dispose();
  bldMat.dispose();
  groundGeo.dispose();
  groundMat.dispose();
  dirLight.shadow.map?.dispose();

  frameTimes.sort((a, b) => a - b);
  const avgMs = frameTimes.length > 0 ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 16.7;
  const p95Ms = frameTimes.length > 0 ? frameTimes[Math.floor(frameTimes.length * 0.95)] : 20;
  const minMs = frameTimes.length > 4 ? frameTimes[Math.floor(frameTimes.length * 0.1)] : avgMs;
  const benchmarkFps = Math.round(1000 / Math.max(4, avgMs));
  const refreshRateHz = snapRefreshRate(1000 / Math.max(3.8, minMs));

  const recommendedTier = classifyHardwareTier({
    platform,
    isMobile,
    gpuRenderer: support.gpuRenderer,
    deviceMemoryGB,
    hardwareConcurrency,
    benchmarkFps,
    benchmarkP95Ms: p95Ms
  });

  const profile: HardwareProfile = {
    platform,
    isMobile,
    isMacRetina,
    isHybridGpuLikely: isLikelyHybridGpu(platform, support.gpuRenderer),
    webgl2Supported: support.webgl2Supported,
    webgpuAvailable: support.webgpuAvailable,
    gpuVendor: support.gpuVendor,
    gpuRenderer: support.gpuRenderer,
    deviceMemoryGB,
    hardwareConcurrency,
    screenWidth,
    screenHeight,
    devicePixelRatio,
    refreshRateHz,
    benchmarkFps,
    benchmarkP95Ms: Math.round(p95Ms * 10) / 10,
    recommendedTier,
    benchmarkedAt: Date.now()
  };

  saveHardwareProfile(profile);
  return profile;
}
