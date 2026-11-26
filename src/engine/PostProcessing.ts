import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { QualityTierConfig } from './QualityManager';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVelocity: { value: new THREE.Vector2(0, 0) },
    uStrength: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uVelocity;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      if (uStrength < 0.004) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }
      vec2 dir = (vUv - vec2(0.5)) * uStrength * 0.024 + uVelocity * uStrength * 0.012;
      vec4 sum = texture2D(tDiffuse, vUv) * 0.40;
      sum += texture2D(tDiffuse, clamp(vUv - dir * 0.5, 0.001, 0.999)) * 0.20;
      sum += texture2D(tDiffuse, clamp(vUv - dir * 1.0, 0.001, 0.999)) * 0.10;
      sum += texture2D(tDiffuse, clamp(vUv + dir * 0.5, 0.001, 0.999)) * 0.20;
      sum += texture2D(tDiffuse, clamp(vUv + dir * 1.0, 0.001, 0.999)) * 0.10;
      gl_FragColor = sum;
    }
  `
};

// Subtle 4K-style unsharp clarity + micro-contrast pass so textures & silhouettes stay razor crisp
const SharpenClarityShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uStrength: { value: 0.28 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec2 step = 1.0 / uResolution;
      vec4 center = texture2D(tDiffuse, vUv);
      vec4 n = texture2D(tDiffuse, vUv + vec2(0.0, step.y));
      vec4 s = texture2D(tDiffuse, vUv - vec2(0.0, step.y));
      vec4 e = texture2D(tDiffuse, vUv + vec2(step.x, 0.0));
      vec4 w = texture2D(tDiffuse, vUv - vec2(step.x, 0.0));
      vec4 edge = center * 4.0 - (n + s + e + w);
      vec3 col = clamp(center.rgb + edge.rgb * uStrength, 0.0, 1.0);
      gl_FragColor = vec4(col, center.a);
    }
  `
};

export class PostProcessingPipeline {
  public composer: EffectComposer;
  public renderPass: RenderPass;
  public ssaoPass: SSAOPass;
  public bloomPass: UnrealBloomPass;
  public bokehPass: BokehPass;
  public motionBlurPass: ShaderPass;
  public sharpenPass: ShaderPass;
  public outputPass: OutputPass;
  public quality: GraphicsQuality = 'high';
  public postMode: 'none' | 'medium' | 'high' = 'high';
  public lastDrawCalls = 0;
  public lastTriangles = 0;
  private allowDesktopHeavyFx = true;
  private bloomHalfRes = false;
  private renderer: THREE.WebGLRenderer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    // WebGL2 Half-Float RenderTarget (samples tuned dynamically by quality tier)
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 2
    });
    this.composer = new EffectComposer(renderer, rt);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.ssaoPass = new SSAOPass(scene, camera, width, height);
    this.ssaoPass.kernelRadius = 8;
    this.ssaoPass.minDistance = 0.002;
    this.ssaoPass.maxDistance = 0.09;
    this.ssaoPass.enabled = false;
    this.composer.addPass(this.ssaoPass);

    // Crisp controlled bloom (doesn't wash out textures)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.32,
      0.42,
      0.84
    );
    this.composer.addPass(this.bloomPass);

    this.bokehPass = new BokehPass(scene, camera, {
      focus: 24.0,
      aperture: 0.000045,
      maxblur: 0.0025
    });
    this.bokehPass.enabled = false;
    this.composer.addPass(this.bokehPass);

    this.motionBlurPass = new ShaderPass(MotionBlurShader);
    this.composer.addPass(this.motionBlurPass);

    this.sharpenPass = new ShaderPass(SharpenClarityShader);
    this.composer.addPass(this.sharpenPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.setQuality('high');
  }

  public setQuality(q: GraphicsQuality): void {
    this.quality = q;
    const nativeDpr = window.devicePixelRatio || 1;
    if (q === 'low') {
      this.renderer.setPixelRatio(Math.min(nativeDpr, 1.0));
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = false;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = false;
      this.sharpenPass.enabled = false;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(nativeDpr, 1.5));
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.28;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = true;
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = 0.22;
    } else if (q === 'high') {
      this.renderer.setPixelRatio(Math.min(nativeDpr, 2.0));
      this.ssaoPass.enabled = false; // Keep ultra-sharp 60 FPS on laptops; Ultra enables SSAO
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.34;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = true;
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = 0.30;
    } else {
      // 'ultra' (4K Ultra Crisp mode)
      this.renderer.setPixelRatio(Math.min(nativeDpr * 1.25, 2.5));
      this.ssaoPass.enabled = true;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.38;
      this.bokehPass.enabled = true;
      this.motionBlurPass.enabled = true;
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = 0.36;
    }
    this.resize(window.innerWidth, window.innerHeight);
  }

  public applyQualityConfig(cfg: QualityTierConfig, effectiveDpr: number): void {
    this.postMode = cfg.postMode;
    this.allowDesktopHeavyFx = cfg.reflections; // Desktop Windows/Mac only, never on phones
    this.bloomHalfRes = cfg.postMode === 'medium';

    this.renderer.setPixelRatio(effectiveDpr);

    // Adjust composer MSAA samples per tier to prevent mobile/MEDIUM bandwidth bottlenecks
    const targetSamples = cfg.postMode === 'high' && cfg.reflections ? 2 : 0;
    if (this.composer.renderTarget1.samples !== targetSamples) {
      this.composer.renderTarget1.samples = targetSamples;
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.samples = targetSamples;
      this.composer.renderTarget2.dispose();
    }

    if (cfg.postMode === 'none') {
      this.quality = 'low';
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = false;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = false;
      this.sharpenPass.enabled = false;
    } else if (cfg.postMode === 'medium') {
      this.quality = 'medium';
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.26;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = false;
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = 0.2;
    } else {
      this.quality = 'high';
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.34;
      this.bokehPass.enabled = false;
      this.motionBlurPass.enabled = true;
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = 0.28;
    }
    this.resize(window.innerWidth, window.innerHeight);
  }

  public setMotionBlur(speed01: number, yawDelta: number): void {
    if (!this.motionBlurPass.enabled) return;
    this.motionBlurPass.uniforms.uStrength.value = THREE.MathUtils.clamp(speed01, 0, 1);
    this.motionBlurPass.uniforms.uVelocity.value.set(
      THREE.MathUtils.clamp(yawDelta * 6, -1, 1),
      0
    );
  }

  public setDepthOfField(focusDist: number, aiming: boolean): void {
    if (this.quality !== 'ultra' && !(this.postMode === 'high' && this.allowDesktopHeavyFx)) {
      this.bokehPass.enabled = false;
      return;
    }
    this.bokehPass.enabled = aiming; // Crisp sharp view normally, shallow DoF on desktop HIGH when ADS!
    const uniforms = this.bokehPass.uniforms as Record<string, THREE.IUniform>;
    uniforms.focus.value = THREE.MathUtils.clamp(focusDist, 6, 80);
    uniforms.aperture.value = 0.00014;
    uniforms.maxblur.value = 0.0045;
  }

  public resize(width: number, height: number): void {
    const dpr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    if (this.bloomHalfRes) {
      this.bloomPass.setSize(Math.max(1, Math.floor(width * 0.5)), Math.max(1, Math.floor(height * 0.5)));
    } else {
      this.bloomPass.setSize(width, height);
    }
    this.ssaoPass.setSize(width, height);
    this.sharpenPass.uniforms.uResolution.value.set(width * dpr, height * dpr);
  }

  public render(): void {
    // Accumulate true full-frame draw calls & triangles across shadow + scene + post passes
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    if (this.postMode === 'none' || this.quality === 'low') {
      this.renderer.render(this.renderPass.scene, this.renderPass.camera);
    } else {
      this.composer.render();
    }
    this.lastDrawCalls = this.renderer.info.render.calls;
    this.lastTriangles = this.renderer.info.render.triangles;
  }
}
