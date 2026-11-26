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

/**
 * Mobile-Safe Lazy Post-Processing Pipeline:
 * - On Android/iOS phones and LITE tier, never allocates HalfFloat/MSAA/SSAO/Bokeh FBOs,
 *   preventing Mali/Adreno framebuffer crashes and GPU OOM on startup.
 * - Lazily builds EffectComposer only when post-processing is enabled, with UnsignedByte fallback
 *   if EXT_color_buffer_float/half_float is unavailable.
 */
export class PostProcessingPipeline {
  public composer: EffectComposer | null = null;
  public renderPass: RenderPass | null = null;
  public ssaoPass: SSAOPass | null = null;
  public bloomPass: UnrealBloomPass | null = null;
  public bokehPass: BokehPass | null = null;
  public motionBlurPass: ShaderPass | null = null;
  public sharpenPass: ShaderPass | null = null;
  public outputPass: OutputPass | null = null;

  public quality: GraphicsQuality = 'low';
  public postMode: 'none' | 'medium' | 'high' = 'none';
  public lastDrawCalls = 0;
  public lastTriangles = 0;

  private isMobile: boolean;
  private allowDesktopHeavyFx = false;
  private bloomHalfRes = true;
  private composerFailed = false;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isMobile = false
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.isMobile = isMobile;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  private ensureComposer(wantDesktopHeavy: boolean): boolean {
    if (this.composerFailed) return false;
    if (this.composer) return true;

    try {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const supportsHalfFloatFbo =
        !this.isMobile &&
        Boolean(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

      const rt = new THREE.WebGLRenderTarget(width, height, {
        type: supportsHalfFloatFbo ? THREE.HalfFloatType : THREE.UnsignedByteType,
        samples: wantDesktopHeavy && !this.isMobile ? 2 : 0
      });

      this.composer = new EffectComposer(this.renderer, rt);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      if (!this.isMobile) {
        this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
        this.ssaoPass.kernelRadius = 8;
        this.ssaoPass.minDistance = 0.002;
        this.ssaoPass.maxDistance = 0.09;
        this.ssaoPass.enabled = false;
        this.composer.addPass(this.ssaoPass);
      }

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.floor(width * 0.5)), Math.max(1, Math.floor(height * 0.5))),
        0.28,
        0.42,
        0.84
      );
      this.composer.addPass(this.bloomPass);

      if (!this.isMobile) {
        this.bokehPass = new BokehPass(this.scene, this.camera, {
          focus: 24.0,
          aperture: 0.000045,
          maxblur: 0.0025
        });
        this.bokehPass.enabled = false;
        this.composer.addPass(this.bokehPass);
      }

      this.motionBlurPass = new ShaderPass(MotionBlurShader);
      this.motionBlurPass.enabled = false;
      this.composer.addPass(this.motionBlurPass);

      this.sharpenPass = new ShaderPass(SharpenClarityShader);
      this.sharpenPass.enabled = false;
      this.composer.addPass(this.sharpenPass);

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
      return true;
    } catch {
      this.composerFailed = true;
      this.composer = null;
      return false;
    }
  }

  public setQuality(q: GraphicsQuality): void {
    this.quality = q;
    const nativeDpr = window.devicePixelRatio || 1;
    if (q === 'low' || this.isMobile) {
      this.postMode = 'none';
      this.renderer.setPixelRatio(Math.min(nativeDpr, this.isMobile ? 1.5 : 1.0));
      return;
    }
    if (!this.ensureComposer(q === 'high' || q === 'ultra')) {
      this.postMode = 'none';
      return;
    }
    this.postMode = q === 'medium' ? 'medium' : 'high';
    this.renderer.setPixelRatio(Math.min(nativeDpr, q === 'medium' ? 1.5 : 2.0));
    if (this.ssaoPass) this.ssaoPass.enabled = q === 'ultra';
    if (this.bloomPass) {
      this.bloomPass.enabled = true;
      this.bloomPass.strength = q === 'medium' ? 0.28 : 0.34;
    }
    if (this.bokehPass) this.bokehPass.enabled = q === 'ultra';
    if (this.motionBlurPass) this.motionBlurPass.enabled = true;
    if (this.sharpenPass) {
      this.sharpenPass.enabled = true;
      this.sharpenPass.uniforms.uStrength.value = q === 'medium' ? 0.22 : 0.3;
    }
    this.resize(window.innerWidth, window.innerHeight);
  }

  public applyQualityConfig(cfg: QualityTierConfig, effectiveDpr: number): void {
    this.allowDesktopHeavyFx = cfg.reflections && !this.isMobile;
    this.bloomHalfRes = cfg.postMode === 'medium' || this.isMobile;
    this.renderer.setPixelRatio(effectiveDpr);

    // On mobile phones, keep direct tone-mapped rendering for guaranteed GPU stability & 60 FPS!
    const effectivePostMode: 'none' | 'medium' | 'high' =
      this.isMobile && cfg.tier !== 'high' ? 'none' : cfg.postMode;

    if (effectivePostMode === 'none') {
      this.postMode = 'none';
      this.quality = 'low';
      return;
    }

    if (!this.ensureComposer(effectivePostMode === 'high' && this.allowDesktopHeavyFx)) {
      this.postMode = 'none';
      this.quality = 'low';
      return;
    }

    this.postMode = effectivePostMode;
    const targetSamples = effectivePostMode === 'high' && this.allowDesktopHeavyFx ? 2 : 0;
    if (this.composer && this.composer.renderTarget1.samples !== targetSamples) {
      this.composer.renderTarget1.samples = targetSamples;
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.samples = targetSamples;
      this.composer.renderTarget2.dispose();
    }

    if (effectivePostMode === 'medium') {
      this.quality = 'medium';
      if (this.ssaoPass) this.ssaoPass.enabled = false;
      if (this.bloomPass) {
        this.bloomPass.enabled = true;
        this.bloomPass.strength = 0.26;
      }
      if (this.bokehPass) this.bokehPass.enabled = false;
      if (this.motionBlurPass) this.motionBlurPass.enabled = false;
      if (this.sharpenPass) {
        this.sharpenPass.enabled = true;
        this.sharpenPass.uniforms.uStrength.value = 0.2;
      }
    } else {
      this.quality = 'high';
      if (this.ssaoPass) this.ssaoPass.enabled = false;
      if (this.bloomPass) {
        this.bloomPass.enabled = true;
        this.bloomPass.strength = 0.34;
      }
      if (this.bokehPass) this.bokehPass.enabled = false;
      if (this.motionBlurPass) this.motionBlurPass.enabled = !this.isMobile;
      if (this.sharpenPass) {
        this.sharpenPass.enabled = !this.isMobile;
        this.sharpenPass.uniforms.uStrength.value = 0.28;
      }
    }
    this.resize(window.innerWidth, window.innerHeight);
  }

  public setMotionBlur(speed01: number, yawDelta: number): void {
    if (!this.motionBlurPass || !this.motionBlurPass.enabled) return;
    this.motionBlurPass.uniforms.uStrength.value = THREE.MathUtils.clamp(speed01, 0, 1);
    this.motionBlurPass.uniforms.uVelocity.value.set(
      THREE.MathUtils.clamp(yawDelta * 6, -1, 1),
      0
    );
  }

  public setDepthOfField(focusDist: number, aiming: boolean): void {
    if (!this.bokehPass) return;
    if (this.quality !== 'ultra' && !(this.postMode === 'high' && this.allowDesktopHeavyFx)) {
      this.bokehPass.enabled = false;
      return;
    }
    this.bokehPass.enabled = aiming;
    const uniforms = this.bokehPass.uniforms as Record<string, THREE.IUniform>;
    uniforms.focus.value = THREE.MathUtils.clamp(focusDist, 6, 80);
    uniforms.aperture.value = 0.00014;
    uniforms.maxblur.value = 0.0045;
  }

  public resize(width: number, height: number): void {
    if (!this.composer) return;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const dpr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    if (this.bloomPass) {
      if (this.bloomHalfRes) {
        this.bloomPass.setSize(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
      } else {
        this.bloomPass.setSize(w, h);
      }
    }
    this.ssaoPass?.setSize(w, h);
    if (this.sharpenPass) {
      this.sharpenPass.uniforms.uResolution.value.set(w * dpr, h * dpr);
    }
  }

  public render(): void {
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    if (this.postMode === 'none' || this.quality === 'low' || !this.composer) {
      this.renderer.render(this.scene, this.camera);
    } else {
      try {
        this.composer.render();
      } catch {
        // Automatic fallback to direct WebGL2 render if a mobile GPU rejects post FBOs
        this.composerFailed = true;
        this.postMode = 'none';
        this.renderer.render(this.scene, this.camera);
      }
    }
    this.lastDrawCalls = this.renderer.info.render.calls;
    this.lastTriangles = this.renderer.info.render.triangles;
  }
}
