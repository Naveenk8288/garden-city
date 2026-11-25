import * as THREE from 'three';

export type WeatherMode = 'day' | 'auto' | 'dusk' | 'rain' | 'dawn' | 'night';

export class EnvironmentSystem {
  public timeOfDay = 11.5; // 11:30 AM — Bright sunlit Bengaluru daytime play!
  public weatherMode: WeatherMode = 'day';
  public rainIntensity = 0.0; // Clear bright daytime by default
  public wetness = 0.14; // Subtle crisp specular road sheen
  public nightFactor = 0.0; // 0 = bright day, 1 = deep night

  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private lastEnvBucket = -1;

  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public lightningLight: THREE.DirectionalLight;
  private fog: THREE.FogExp2;

  // Monsoon GPU Rain particles
  private rainLines!: THREE.LineSegments;
  private rainPositions!: Float32Array;
  private rainCount = 1600;
  private lightningTimer = 14;
  private lightningFlash = 0;

  // Sky dome gradient sphere
  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;

  // Callbacks to adjust road roughness/emissives dynamically
  public roadMaterials: THREE.MeshStandardMaterial[] = [];
  public windowMaterials: THREE.MeshStandardMaterial[] = [];
  public streetLightMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();

    this.fog = new THREE.FogExp2(0xaed4ec, 0.00055);
    this.scene.fog = this.fog;

    // Sky dome shader (bright clear Bengaluru daytime blue sky default)
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x2876cf) },
        uMidColor: { value: new THREE.Color(0x6fb3e8) },
        uHorizonColor: { value: new THREE.Color(0xbce0f7) },
        uSunDir: { value: new THREE.Vector3(0.2, 0.94, -0.28).normalize() },
        uSunColor: { value: new THREE.Color(0xfff7e2) }
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
          col = mix(col, uTopColor, smoothstep(0.22, 0.85, h));
          float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sunAmt, 36.0) * 0.9;
          col += uSunColor * pow(sunAmt, 5.0) * 0.22;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(2800, 24, 16), this.skyMat);
    this.scene.add(this.skyMesh);

    // Primary Sun / Moon shadow-casting light
    this.sunLight = new THREE.DirectionalLight(0xffba78, 2.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 260;
    const s = 95;
    this.sunLight.shadow.camera.left = -s;
    this.sunLight.shadow.camera.right = s;
    this.sunLight.shadow.camera.top = s;
    this.sunLight.shadow.camera.bottom = -s;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0x9ab8e8, 0x38322c, 0.75);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x2d3548, 0.35);
    this.scene.add(this.ambientLight);

    this.lightningLight = new THREE.DirectionalLight(0xd8ecff, 0);
    this.lightningLight.position.set(40, 120, -30);
    this.scene.add(this.lightningLight);

    this.initRainSystem();
    this.rebuildHDRIEnvironment(this.skyMat.uniforms.uTopColor.value, this.skyMat.uniforms.uHorizonColor.value);
  }

  private initRainSystem(): void {
    this.rainPositions = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const ry = Math.random() * 42;
      const rz = (Math.random() - 0.5) * 90;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.14;
      this.rainPositions[idx + 4] = ry - 1.45;
      this.rainPositions[idx + 5] = rz - 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xcbe2ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.rainLines = new THREE.LineSegments(geo, mat);
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);
  }

  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    const mapSize = quality === 'low' ? 1024 : quality === 'ultra' ? 4096 : 2048;
    if (this.sunLight.shadow.mapSize.x !== mapSize) {
      this.sunLight.shadow.mapSize.set(mapSize, mapSize);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.rainLines.visible = this.rainIntensity > 0.05;
  }

  private rebuildHDRIEnvironment(top: THREE.Color, horizon: THREE.Color): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, `#${top.getHexString()}`);
    grad.addColorStop(0.46, `#${horizon.getHexString()}`);
    grad.addColorStop(0.55, '#1d222c');
    grad.addColorStop(1.0, '#0a0d14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Subtle glowing city horizon bands for wet road reflections
    ctx.fillStyle = 'rgba(255, 165, 70, 0.35)';
    ctx.fillRect(0, 56, 256, 8);
    ctx.fillStyle = 'rgba(130, 190, 255, 0.25)';
    ctx.fillRect(0, 48, 256, 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const newRT = this.pmrem.fromEquirectangular(tex);
    tex.dispose();
    if (this.envRT) this.envRT.dispose();
    this.envRT = newRT;
    this.scene.environment = newRT.texture;
  }

  public getWeatherLabel(): string {
    const hh = Math.floor(this.timeOfDay) % 24;
    const mm = Math.floor((this.timeOfDay - Math.floor(this.timeOfDay)) * 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    let mood = 'Sunny Bengaluru Day';
    if (this.rainIntensity > 0.65) mood = 'Monsoon Downpour';
    else if (this.rainIntensity > 0.2) mood = 'Light Drizzle';
    else if (hh >= 5 && hh < 8) mood = 'Misty Dawn';
    else if (hh >= 17 && hh < 20) mood = 'Warm Dusk';
    else if (hh >= 20 || hh < 5) mood = 'Neon Night';
    return `${clock} • ${mood}`;
  }

  public update(dt: number, playerPos: THREE.Vector3, bellandurMist = 0): void {
    // Advance clock smoothly in auto mode (1 full day ~ 18 minutes)
    if (this.weatherMode === 'day') {
      this.timeOfDay = 11.5;
      this.rainIntensity += (0.0 - this.rainIntensity) * Math.min(1, dt * 2.5);
    } else if (this.weatherMode === 'auto') {
      this.timeOfDay = (this.timeOfDay + dt * (24 / 1080)) % 24;
      // Sudden monsoon rain cycles every few minutes
      const rainWave = Math.sin(this.timeOfDay * 1.45 + 0.6) * 0.5 + 0.5;
      const targetRain = rainWave > 0.62 ? (rainWave - 0.62) / 0.38 : 0.08;
      this.rainIntensity += (targetRain - this.rainIntensity) * Math.min(1, dt * 0.35);
    } else if (this.weatherMode === 'dusk') {
      this.timeOfDay = 17.85;
      this.rainIntensity += (0.18 - this.rainIntensity) * dt * 1.5;
    } else if (this.weatherMode === 'rain') {
      this.timeOfDay = 19.2;
      this.rainIntensity += (0.95 - this.rainIntensity) * dt * 1.5;
    } else if (this.weatherMode === 'dawn') {
      this.timeOfDay = 6.2;
      this.rainIntensity += (0.12 - this.rainIntensity) * dt * 1.5;
    } else if (this.weatherMode === 'night') {
      this.timeOfDay = 22.3;
      this.rainIntensity += (0.35 - this.rainIntensity) * dt * 1.5;
    }

    // Wetness rises quickly in rain and dries slowly
    const targetWet = Math.min(1, 0.25 + this.rainIntensity * 0.85);
    this.wetness += (targetWet - this.wetness) * dt * 0.4;

    // Solar angle
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 0.85;
    const sunZ = -0.45;
    const sunDir = new THREE.Vector3(sunX, Math.max(-0.2, sunY), sunZ).normalize();

    this.nightFactor = THREE.MathUtils.clamp(1 - (sunY + 0.12) * 2.4, 0, 1);
    const duskFactor = Math.max(0, 1 - Math.abs(sunY - 0.08) * 4.5);

    // Sky & Fog colors tuned for authentic Bengaluru monsoon sky
    const dayTop = new THREE.Color(0x2b6cb0);
    const duskTop = new THREE.Color(0x1f2247);
    const nightTop = new THREE.Color(0x070a18);
    const rainTint = new THREE.Color(0x283242);

    const topCol = dayTop.clone().lerp(duskTop, duskFactor).lerp(nightTop, this.nightFactor);
    topCol.lerp(rainTint, this.rainIntensity * 0.55);

    const dayHor = new THREE.Color(0xaed4ec);
    const duskHor = new THREE.Color(0xff8e4f);
    const nightHor = new THREE.Color(0x181f36);
    const horCol = dayHor.clone().lerp(duskHor, duskFactor).lerp(nightHor, this.nightFactor);
    horCol.lerp(new THREE.Color(0x3a4658), this.rainIntensity * 0.55);

    const midCol = topCol.clone().lerp(horCol, 0.52);

    this.skyMat.uniforms.uTopColor.value.copy(topCol);
    this.skyMat.uniforms.uMidColor.value.copy(midCol);
    this.skyMat.uniforms.uHorizonColor.value.copy(horCol);
    this.skyMat.uniforms.uSunDir.value.copy(sunDir);
    this.skyMat.uniforms.uSunColor.value.set(duskFactor > 0.3 ? 0xff9b4a : 0xfff0d4);
    this.skyMesh.position.copy(playerPos);

    // Crisp minimal haze in sunny daytime; denser mist in rain/dawn/Bellandur Lake
    const dawnMist = this.timeOfDay >= 5 && this.timeOfDay <= 8 ? 0.0022 : 0;
    this.fog.color.copy(horCol).lerp(new THREE.Color(0xd8e4ee), bellandurMist * 0.45);
    this.fog.density = 0.00055 + this.rainIntensity * 0.0026 + this.nightFactor * 0.0006 + dawnMist + bellandurMist * 0.0038;

    // Position shadow-casting directional light around player
    const lightDir = sunY > -0.05 ? sunDir : new THREE.Vector3(0.4, 0.72, 0.5).normalize();
    this.sunLight.position.copy(playerPos).addScaledVector(lightDir, 110);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    if (this.nightFactor > 0.75) {
      this.sunLight.color.setHex(0x6d93d6);
      this.sunLight.intensity = 0.85;
    } else {
      const sCol = new THREE.Color(0xfff8eb).lerp(new THREE.Color(0xff8f42), duskFactor);
      this.sunLight.color.copy(sCol);
      this.sunLight.intensity = (3.15 - this.rainIntensity * 1.2) * (1 - this.nightFactor * 0.65);
    }

    this.hemiLight.color.copy(midCol).offsetHSL(0, 0, 0.14);
    this.hemiLight.groundColor.setHex(this.nightFactor > 0.5 ? 0x1a1e2e : 0x56544c);
    this.hemiLight.intensity = 1.15 - this.nightFactor * 0.5;
    this.ambientLight.intensity = 0.48 + this.nightFactor * 0.1;

    // Occasional monsoon lightning flash
    if (this.rainIntensity > 0.55) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 4.5;
        this.lightningTimer = 7 + Math.random() * 14;
      }
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 16);
    this.lightningLight.intensity = this.lightningFlash;

    // Periodically refresh PMREM HDRI when lighting shifts significantly
    const envBucket = Math.floor(this.timeOfDay * 2) * 10 + Math.round(this.rainIntensity * 4);
    if (envBucket !== this.lastEnvBucket) {
      this.lastEnvBucket = envBucket;
      this.rebuildHDRIEnvironment(topCol, horCol);
    }

    // Dynamic wet-road PBR reflections + night window glow
    const roadRoughness = THREE.MathUtils.lerp(0.76, 0.14, this.wetness);
    const roadMetalness = THREE.MathUtils.lerp(0.05, 0.42, this.wetness);
    for (const rm of this.roadMaterials) {
      rm.roughness = roadRoughness;
      rm.metalness = roadMetalness;
    }
    const winGlow = 0.12 + this.nightFactor * 1.15 + duskFactor * 0.45;
    for (const wm of this.windowMaterials) {
      wm.emissiveIntensity = winGlow;
    }
    const lampGlow = 0.3 + this.nightFactor * 2.2 + duskFactor * 1.0;
    for (const sm of this.streetLightMaterials) {
      sm.emissiveIntensity = lampGlow;
    }

    // Animate monsoon rain streaks around the player
    const showRain = this.rainIntensity > 0.06;
    this.rainLines.visible = showRain;
    if (showRain) {
      const mat = this.rainLines.material as THREE.LineBasicMaterial;
      mat.opacity = Math.min(0.68, this.rainIntensity * 0.65);
      const speed = 28 + this.rainIntensity * 22;
      const arr = this.rainPositions;
      const px = playerPos.x;
      const py = playerPos.y;
      const pz = playerPos.z;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let x = arr[idx] - dt * 3.5;
        let y = arr[idx + 1] - dt * speed;
        let z = arr[idx + 2] - dt * 1.8;
        if (y < py - 2 || Math.abs(x - px) > 48 || Math.abs(z - pz) > 48) {
          x = px + (Math.random() - 0.5) * 86;
          y = py + 24 + Math.random() * 20;
          z = pz + (Math.random() - 0.5) * 86;
        }
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
        arr[idx + 3] = x - 0.18;
        arr[idx + 4] = y - (1.2 + this.rainIntensity * 0.9);
        arr[idx + 5] = z - 0.1;
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    }
  }
}
