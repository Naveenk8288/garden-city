import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const scratchBundle = '/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch/phase_1_quality_tests.mjs';
fs.mkdirSync('/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch', { recursive: true });

await build({
  stdin: {
    contents: `
      import { classifyHardwareTier, isLikelyHybridGpu } from './src/engine/DeviceProfiler.ts';
      import { QualityManager } from './src/engine/QualityManager.ts';
      export const exportsForTest = { classifyHardwareTier, isLikelyHybridGpu, QualityManager };
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  outfile: scratchBundle,
  format: 'esm',
  platform: 'node'
});

const { exportsForTest } = await import(scratchBundle);
const { classifyHardwareTier, isLikelyHybridGpu, QualityManager } = exportsForTest;

const makeProfile = (overrides = {}) => ({
  platform: 'windows',
  isMobile: false,
  isMacRetina: false,
  isHybridGpuLikely: false,
  webgl2Supported: true,
  webgpuAvailable: false,
  gpuVendor: 'NVIDIA',
  gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)',
  deviceMemoryGB: 16,
  hardwareConcurrency: 12,
  screenWidth: 1920,
  screenHeight: 1080,
  devicePixelRatio: 1,
  refreshRateHz: 120,
  benchmarkFps: 90,
  benchmarkP95Ms: 14,
  recommendedTier: 'high',
  benchmarkedAt: Date.now(),
  ...overrides
});

// 1. Hardware classifier across Support Matrix devices (Android, macOS, Windows)
{
  assert.equal(
    classifyHardwareTier({
      platform: 'android', isMobile: true, gpuRenderer: 'Adreno (TM) 610',
      deviceMemoryGB: 3, hardwareConcurrency: 8, benchmarkFps: 36, benchmarkP95Ms: 34
    }),
    'lite',
    '3 GB Android phone must classify as LITE'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'windows', isMobile: false, gpuRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)',
      deviceMemoryGB: 8, hardwareConcurrency: 4, benchmarkFps: 29, benchmarkP95Ms: 39
    }),
    'lite',
    'Intel UHD 620 / 8 GB Windows laptop must classify as LITE'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'windows', isMobile: false, gpuRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)',
      deviceMemoryGB: 16, hardwareConcurrency: 8, benchmarkFps: 48, benchmarkP95Ms: 24
    }),
    'medium',
    'Intel Iris Xe laptop must classify as MEDIUM'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'macos', isMobile: false, gpuRenderer: 'Intel(R) Iris(R) Plus Graphics',
      deviceMemoryGB: 8, hardwareConcurrency: 4, benchmarkFps: 46, benchmarkP95Ms: 25
    }),
    'medium',
    'Intel MacBook Air must classify as MEDIUM'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'windows', isMobile: false, gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650)',
      deviceMemoryGB: 16, hardwareConcurrency: 8, benchmarkFps: 58, benchmarkP95Ms: 19
    }),
    'medium',
    'GTX 1650 laptop must classify as MEDIUM'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'windows', isMobile: false, gpuRenderer: 'AMD Radeon(TM) Vega 3 Graphics',
      deviceMemoryGB: 8, hardwareConcurrency: 4, benchmarkFps: 28, benchmarkP95Ms: 41
    }),
    'lite',
    'AMD Vega 3 / 8 GB laptop must classify as LITE'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'macos', isMobile: false, gpuRenderer: 'Apple M3 Pro',
      deviceMemoryGB: 16, hardwareConcurrency: 12, benchmarkFps: 118, benchmarkP95Ms: 11
    }),
    'high',
    'Apple M3 Pro must classify as HIGH'
  );

  assert.equal(
    classifyHardwareTier({
      platform: 'android', isMobile: true, gpuRenderer: 'Adreno (TM) 750',
      deviceMemoryGB: 8, hardwareConcurrency: 8, benchmarkFps: 60, benchmarkP95Ms: 17
    }),
    'high',
    'Flagship Adreno 750 phone must classify as HIGH'
  );

  assert.equal(isLikelyHybridGpu('windows', 'Intel(R) UHD Graphics 620'), true);
  assert.equal(isLikelyHybridGpu('macos', 'Apple M2'), false);
  assert.equal(isLikelyHybridGpu('windows', 'NVIDIA GeForce RTX 3050'), false);
  console.log('✓ Test 1: Hardware tier classifier & hybrid GPU detector passed');
}

// 2. DPR Caps: <=2 on LITE, <=2 on MacBook Retina MEDIUM, 3 ONLY on HIGH phones
{
  globalThis.window = { devicePixelRatio: 3 };

  const litePhone = new QualityManager(makeProfile({ platform: 'android', isMobile: true, recommendedTier: 'lite' }));
  assert.equal(litePhone.getTierConfig('lite').maxDpr, 2, 'LITE DPR cap must be 2');
  assert.ok(litePhone.getEffectiveDpr() <= 2.0, 'LITE effective DPR must not exceed 2');

  const macRetinaMed = new QualityManager(makeProfile({ platform: 'macos', isMobile: false, isMacRetina: true, recommendedTier: 'medium' }));
  assert.equal(macRetinaMed.getTierConfig('medium').maxDpr, 2, 'MacBook Retina MEDIUM DPR cap must be 2');
  assert.equal(macRetinaMed.getTierConfig('medium').reflections, true, 'Desktop MEDIUM keeps reflections');

  const highPhone = new QualityManager(makeProfile({ platform: 'android', isMobile: true, recommendedTier: 'high' }));
  assert.equal(highPhone.getTierConfig('high').maxDpr, 3, 'HIGH phone allows DPR cap 3');
  assert.equal(highPhone.getTierConfig('high').reflections, false, 'Reflections must stay disabled on phones');

  const highDesktop = new QualityManager(makeProfile({ platform: 'macos', isMobile: false, isMacRetina: true, recommendedTier: 'high' }));
  assert.equal(highDesktop.getTierConfig('high').maxDpr, 2, 'HIGH desktop DPR cap stays 2');
  assert.equal(highDesktop.getTierConfig('high').reflections, true, 'Desktop HIGH enables reflections');
  console.log('✓ Test 2: Platform DPR caps & mobile reflection guard passed');
}

// 3. Dynamic Resolution Scaling (drops after 2s low FPS down to 0.6, recovers when stable)
{
  const qm = new QualityManager(makeProfile({ recommendedTier: 'high', refreshRateHz: 60 }));
  qm.setFrameLimit(60);
  const startScale = qm.renderScale;
  // Simulate 10 seconds at 25 FPS (0.04s per frame)
  for (let i = 0; i < 250; i++) qm.recordFrame(0.04);
  assert.ok(qm.renderScale < startScale, 'DRS must scale down when FPS stays below target');
  // Simulate another 15 seconds at 20 FPS to hit floor
  for (let i = 0; i < 300; i++) qm.recordFrame(0.05);
  assert.equal(qm.renderScale, 0.6, 'DRS must clamp at minimum 0.6');
  // Simulate 12 seconds of stable 60 FPS
  for (let i = 0; i < 720; i++) qm.recordFrame(1 / 60);
  assert.ok(qm.renderScale > 0.6, 'DRS must recover when FPS stabilizes');
  console.log(`✓ Test 3: Dynamic Resolution Scaling (floor 0.6 → recovered ${qm.renderScale}) passed`);
}

// 4. Fixed-timestep physics consistency across 30, 60, 120, and 144 Hz screens
{
  const simulateOneSecond = (hz) => {
    const qm = new QualityManager(makeProfile());
    const dt = 1 / hz;
    let totalSteps = 0;
    for (let f = 0; f < hz; f++) {
      totalSteps += qm.consumePhysicsSteps(dt);
    }
    return totalSteps;
  };
  const s30 = simulateOneSecond(30);
  const s60 = simulateOneSecond(60);
  const s120 = simulateOneSecond(120);
  const s144 = simulateOneSecond(144);
  for (const [hz, steps] of [[30, s30], [60, s60], [120, s120], [144, s144]]) {
    assert.ok(steps >= 59 && steps <= 60, `${hz}Hz produced ${steps} physics steps/sec (expected ~60)`);
  }
  console.log(`✓ Test 4: Fixed-timestep physics parity passed (30Hz=${s30}, 60Hz=${s60}, 120Hz=${s120}, 144Hz=${s144} steps/s)`);
}

// 5. Frame limiter & Power Saver mode (30 FPS + LITE)
{
  const qm = new QualityManager(makeProfile({ recommendedTier: 'high', refreshRateHz: 120 }));
  qm.setPowerSaver(true);
  assert.equal(qm.activeTier, 'lite', 'Power Saver must switch active tier to LITE');
  assert.equal(qm.getEffectiveFrameLimit(), 30, 'Power Saver must enforce 30 FPS limit');

  let rendered = 0;
  // Feed 120Hz timestamps for 1 full second
  for (let i = 0; i < 120; i++) {
    const g = qm.shouldRenderFrame(1000 + i * (1000 / 120));
    if (g.render) rendered++;
  }
  assert.ok(rendered >= 28 && rendered <= 32, `30 FPS limiter rendered ${rendered} frames in 1s (expected ~30)`);
  // Manual tier override exits Power Saver cleanly
  qm.setSelection('medium');
  assert.equal(qm.prefs.powerSaver, false, 'Manual tier selection must exit Power Saver');
  assert.equal(qm.activeTier, 'medium', 'Active tier must switch to MEDIUM');
  console.log(`✓ Test 5: Frame limiter, Power Saver & manual override (${rendered} frames/s @ 30 FPS cap) passed`);
}

// 6. Thermal throttling protection: steps down 1 tier after sustained rising frame times
{
  // Use 60s window in unit test to exercise the exact 10-minute (600s default) state machine rapidly
  const qm = new QualityManager(makeProfile({ recommendedTier: 'high', refreshRateHz: 60 }), 60);
  qm.setFrameLimit(60);
  qm.setDynamicResEnabled(false); // isolate thermal step-down
  // Establish healthy 60 FPS baseline for 10s
  for (let i = 0; i < 600; i++) qm.recordFrame(1 / 60);
  assert.equal(qm.activeTier, 'high');
  // Simulate rising frame times (34ms = ~29 FPS) for 70 seconds
  for (let i = 0; i < 2100; i++) qm.recordFrame(0.034);
  assert.equal(qm.activeTier, 'medium', 'Thermal guard must step HIGH → MEDIUM on sustained frame-time rise');
  assert.equal(qm.thermalSteppedDown, true);
  console.log('✓ Test 6: Thermal throttling step-down (HIGH → MEDIUM) passed');
}

console.log('\nALL PHASE 1 CROSS-PLATFORM QUALITY TESTS PASSED!');
