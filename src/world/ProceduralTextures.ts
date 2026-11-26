import * as THREE from 'three';

export interface BuildingMaterialSet {
  heritage: THREE.MeshStandardMaterial;
  commercial: THREE.MeshStandardMaterial;
  techGlass: THREE.MeshStandardMaterial;
  residential: THREE.MeshStandardMaterial;
  industrial: THREE.MeshStandardMaterial;
  worship: THREE.MeshStandardMaterial;
  rooftop: THREE.MeshStandardMaterial;
  lodFar: THREE.MeshLambertMaterial;
}

/**
 * 1024x1024 High-Definition PBR Texture Generator with 16x Anisotropic Filtering,
 * procedural bump/roughness/emissive maps, recessed architectural windows,
 * separate concrete rooftops, and crisp wet monsoon Bengaluru asphalt.
 */
export class ProceduralTextures {
  public roadMajorMat: THREE.MeshStandardMaterial;
  public roadMinorMat: THREE.MeshStandardMaterial;
  public sidewalkMat: THREE.MeshStandardMaterial;
  public parkMat: THREE.MeshStandardMaterial;
  public waterMat: THREE.MeshStandardMaterial;
  public bellandurWaterMat: THREE.MeshStandardMaterial;
  public metroPurpleMat: THREE.MeshStandardMaterial;
  public metroGreenMat: THREE.MeshStandardMaterial;
  public streetLampBulbMat: THREE.MeshStandardMaterial;
  public buildings: BuildingMaterialSet;

  private maxAniso: number;
  private textureSizeCap: number;
  private allTextures: THREE.CanvasTexture[] = [];
  private signCache = new Map<string, THREE.CanvasTexture>();
  private shopCache = new Map<string, THREE.CanvasTexture>();

  constructor(maxAnisotropy = 16, textureSizeCap = 1024) {
    this.maxAniso = Math.max(2, Math.min(16, maxAnisotropy));
    this.textureSizeCap = Math.max(256, Math.min(2048, textureSizeCap));

    this.roadMajorMat = this.makeRoadMaterial(true);
    this.roadMinorMat = this.makeRoadMaterial(false);

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x7b8088,
      roughness: 0.82,
      metalness: 0.06
    });

    this.parkMat = this.makeParkMaterial();
    this.waterMat = this.makeWaterMaterial(false);
    this.bellandurWaterMat = this.makeWaterMaterial(true);

    this.metroPurpleMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.42,
      roughness: 0.35,
      metalness: 0.4
    });

    this.metroGreenMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      emissive: 0x14532d,
      emissiveIntensity: 0.42,
      roughness: 0.35,
      metalness: 0.4
    });

    this.streetLampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xffb347,
      emissiveIntensity: 1.8,
      roughness: 0.15
    });

    this.buildings = {
      heritage: this.makeFacadeMaterial('#dcc29f', '#b89468', '#ffe3a3', 0.72, 0.1, 'heritage'),
      commercial: this.makeFacadeMaterial('#9aa4b4', '#6d788b', '#ffd584', 0.44, 0.28, 'commercial'),
      techGlass: this.makeFacadeMaterial('#2d5a7b', '#17344a', '#7ce8ff', 0.12, 0.82, 'glass'),
      residential: this.makeFacadeMaterial('#e0cbb8', '#bfa38c', '#ffe9b8', 0.74, 0.08, 'residential'),
      industrial: this.makeFacadeMaterial('#737c86', '#515a63', '#ffd070', 0.58, 0.42, 'industrial'),
      worship: this.makeFacadeMaterial('#f2e4ca', '#d8be8f', '#ffd275', 0.68, 0.12, 'heritage'),
      rooftop: this.makeRooftopMaterial(),
      lodFar: new THREE.MeshLambertMaterial({ color: 0x6b7485 })
    };
  }

  public setAnisotropy(aniso: number): void {
    this.maxAniso = Math.max(1, Math.min(16, aniso));
    for (const t of this.allTextures) {
      t.anisotropy = this.maxAniso;
      t.needsUpdate = true;
    }
  }

  private configureTex(tex: THREE.CanvasTexture, repeat = true, isColor = true): THREE.CanvasTexture {
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAniso;
    tex.needsUpdate = true;
    this.allTextures.push(tex);
    return tex;
  }

  private makeScaledCanvas(logicalW: number, logicalH: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const scale = Math.min(1, this.textureSizeCap / Math.max(logicalW, logicalH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(64, Math.round(logicalW * scale));
    canvas.height = Math.max(64, Math.round(logicalH * scale));
    const ctx = canvas.getContext('2d')!;
    if (scale < 1) ctx.scale(scale, scale);
    return { canvas, ctx };
  }

  private makeRoadMaterial(major: boolean): THREE.MeshStandardMaterial {
    const size = 1024;
    const { canvas: c, ctx } = this.makeScaledCanvas(size, size);

    // Rich dark charcoal asphalt with subtle wheel-track sheen
    ctx.fillStyle = major ? '#1e222a' : '#262b34';
    ctx.fillRect(0, 0, size, size);

    // Subtle tire wear lanes
    ctx.fillStyle = 'rgba(12, 15, 20, 0.32)';
    ctx.fillRect(180, 0, 180, size);
    ctx.fillRect(664, 0, 180, size);

    // Fine aggregate micro-grain (scaled down cleanly on 512px mobile textures for fast boot!)
    const grainCount = this.textureSizeCap <= 512 ? 1800 : 12000;
    for (let i = 0; i < grainCount; i++) {
      const v = 22 + ((i * 73) % 34);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect((i * 197) % size, (i * 419) % size, 2, 2);
    }

    // Subtle hairline tarmac cracks & patches
    ctx.strokeStyle = 'rgba(10, 12, 16, 0.5)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 10; k++) {
      ctx.beginPath();
      const sx = ((k * 137) % 820) + 100;
      const sy = ((k * 223) % 820) + 100;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 48, sy + 65);
      ctx.lineTo(sx + 25, sy + 130);
      ctx.stroke();
    }

    // Wet monsoon reflection puddles in roughnessMap + fine bumpMap
    const rc = document.createElement('canvas');
    rc.width = 512;
    rc.height = 512;
    const rctx = rc.getContext('2d')!;
    rctx.fillStyle = '#a8a8a8';
    rctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 24; i++) {
      const gx = ((i * 89) % 420) + 46;
      const gy = ((i * 149) % 420) + 46;
      const grad = rctx.createRadialGradient(gx, gy, 6, gx, gy, 56);
      grad.addColorStop(0, '#0a0a0a');
      grad.addColorStop(0.65, '#333333');
      grad.addColorStop(1, 'rgba(168,168,168,0)');
      rctx.fillStyle = grad;
      rctx.fillRect(gx - 60, gy - 60, 120, 120);
    }

    // Crisp Bengaluru yellow shoulder kerbs + white dashed lane dividers
    ctx.fillStyle = '#e0ae2b';
    ctx.fillRect(24, 0, 16, size);
    ctx.fillRect(size - 40, 0, 16, size);

    // Curb stone edge tint
    ctx.fillStyle = '#474f5c';
    ctx.fillRect(0, 0, 20, size);
    ctx.fillRect(size - 20, 0, 20, size);

    if (major) {
      // Double yellow center median stripe + dashed lane separators
      ctx.fillStyle = '#e5b535';
      ctx.fillRect(size / 2 - 12, 0, 8, size);
      ctx.fillRect(size / 2 + 4, 0, 8, size);

      ctx.fillStyle = 'rgba(240, 244, 248, 0.85)';
      for (let y = 32; y < size; y += 170) {
        ctx.fillRect(size * 0.25 - 5, y, 10, 88);
        ctx.fillRect(size * 0.75 - 5, y, 10, 88);
      }
    } else {
      ctx.fillStyle = 'rgba(235, 240, 245, 0.72)';
      for (let y = 40; y < size; y += 210) {
        ctx.fillRect(size / 2 - 6, y, 12, 92);
      }
    }

    const map = this.configureTex(new THREE.CanvasTexture(c), true, true);
    const rMap = this.configureTex(new THREE.CanvasTexture(rc), true, false);

    return new THREE.MeshStandardMaterial({
      map,
      roughnessMap: rMap,
      bumpMap: rMap,
      bumpScale: 0.04,
      roughness: 0.36,
      metalness: 0.28
    });
  }

  private makeRooftopMaterial(): THREE.MeshStandardMaterial {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;

    // Authentic Bengaluru weathered terrace concrete + waterproofing tiles
    ctx.fillStyle = '#6c727a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(36, 40, 46, 0.35)';
    ctx.lineWidth = 2;
    for (let x = 0; x < size; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    }
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }

    for (let i = 0; i < 4000; i++) {
      const v = 90 + ((i * 47) % 36);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
      ctx.fillRect((i * 113) % size, (i * 239) % size, 2, 2);
    }

    const map = this.configureTex(new THREE.CanvasTexture(c), true, true);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.88,
      metalness: 0.06
    });
  }

  private makeParkMaterial(): THREE.MeshStandardMaterial {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#295b32';
    ctx.fillRect(0, 0, size, size);
    const grassDots = this.textureSizeCap <= 512 ? 1400 : 7500;
    for (let i = 0; i < grassDots; i++) {
      const g = 72 + ((i * 53) % 52);
      ctx.fillStyle = `rgb(${28 + (i % 20)},${g},${32 + (i % 18)})`;
      ctx.fillRect((i * 97) % size, (i * 181) % size, 3, 3);
    }
    const map = this.configureTex(new THREE.CanvasTexture(c), true, true);
    map.repeat.set(10, 10);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
  }

  private makeWaterMaterial(foamy: boolean): THREE.MeshStandardMaterial {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = foamy ? '#24525a' : '#113a52';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = foamy
        ? `rgba(225, 240, 244, ${0.12 + (i % 5) * 0.05})`
        : `rgba(120, 200, 235, ${0.05 + (i % 4) * 0.03})`;
      ctx.beginPath();
      ctx.ellipse((i * 113) % size, (i * 79) % size, foamy ? 36 : 26, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const map = this.configureTex(new THREE.CanvasTexture(c), true, true);
    map.repeat.set(8, 8);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: foamy ? 0.32 : 0.08,
      metalness: foamy ? 0.25 : 0.72,
      transparent: true,
      opacity: 0.93,
      side: THREE.DoubleSide
    });
  }

  private makeFacadeMaterial(
    baseHex: string,
    trimHex: string,
    glowHex: string,
    roughness: number,
    metalness: number,
    style: 'heritage' | 'commercial' | 'glass' | 'residential' | 'industrial'
  ): THREE.MeshStandardMaterial {
    const size = 1024;
    const { canvas: c, ctx } = this.makeScaledCanvas(size, size);

    const { canvas: ec, ctx: ectx } = this.makeScaledCanvas(512, 512);
    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, 512, 512);

    const { canvas: bc, ctx: bctx } = this.makeScaledCanvas(512, 512);
    bctx.fillStyle = '#c8c8c8';
    bctx.fillRect(0, 0, 512, 512);

    // Base plaster / granite / glass cladding
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    // Architectural surface grain & monsoon rain streaking
    const facadeDots = this.textureSizeCap <= 512 ? 1000 : 6000;
    for (let i = 0; i < facadeDots; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
      ctx.fillRect((i * 157) % size, (i * 311) % size, 3, 5);
    }

    const cols = style === 'glass' ? 8 : style === 'industrial' ? 4 : 6;
    const rows = style === 'industrial' ? 4 : 8;
    const cellW = size / cols;
    const cellH = size / rows;

    // Horizontal slab ledges, cornices & vertical pilasters
    for (let r = 0; r < rows; r++) {
      const y = r * cellH;
      ctx.fillStyle = trimHex;
      ctx.fillRect(0, y, size, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, y + 12, size, 5); // Crisp drop-shadow under slab ledge!

      bctx.fillStyle = '#ffffff';
      bctx.fillRect(0, y * 0.5, 512, 6);
    }

    for (let col = 0; col < cols; col++) {
      const x = col * cellW;
      ctx.fillStyle = trimHex;
      ctx.fillRect(x, 0, style === 'glass' ? 6 : 12, size);
      bctx.fillStyle = '#e5e5e5';
      bctx.fillRect(x * 0.5, 0, 5, 512);
    }

    // Detailed recessed windows with frames, mullions, blinds & interior warm glow
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const padX = style === 'glass' ? 8 : 22;
        const padY = style === 'glass' ? 10 : 24;
        const wx = col * cellW + padX;
        const wy = r * cellH + padY;
        const ww = cellW - padX * 2;
        const wh = cellH - padY * 2;

        // Recessed window shadow in bump map
        bctx.fillStyle = '#383838';
        bctx.fillRect(wx * 0.5, wy * 0.5, ww * 0.5, wh * 0.5);

        // Outer metallic/stone window frame
        ctx.fillStyle = style === 'glass' ? '#12293a' : '#2a313d';
        ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

        // Reflective glass gradient inside pane
        const gGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        if (style === 'glass') {
          gGrad.addColorStop(0, '#4482a8');
          gGrad.addColorStop(0.55, '#1d4563');
          gGrad.addColorStop(1, '#10293d');
        } else {
          gGrad.addColorStop(0, '#2c3d52');
          gGrad.addColorStop(0.5, '#192433');
          gGrad.addColorStop(1, '#101824');
        }
        ctx.fillStyle = gGrad;
        ctx.fillRect(wx, wy, ww, wh);

        // Window mullion bars + balcony sill on residential/heritage
        ctx.fillStyle = style === 'glass' ? '#7098b5' : '#4a5568';
        ctx.fillRect(wx + ww * 0.5 - 2, wy, 4, wh);
        ctx.fillRect(wx, wy + wh * 0.52, ww, 4);

        // Subtle sky reflection diagonal streak
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(wx + 4, wy + wh - 6);
        ctx.lineTo(wx + ww * 0.45, wy + 4);
        ctx.lineTo(wx + ww * 0.62, wy + 4);
        ctx.lineTo(wx + ww * 0.2, wy + wh - 6);
        ctx.closePath();
        ctx.fill();

        const hash = ((r * 37 + col * 19 + style.length * 11) * 2654435761) >>> 0;
        const lit = hash % 100 < (style === 'commercial' ? 66 : style === 'glass' ? 58 : 42);
        if (lit) {
          ectx.fillStyle = glowHex;
          ectx.globalAlpha = 0.45 + ((hash % 45) / 85);
          ectx.fillRect((wx + 3) * 0.5, (wy + 3) * 0.5, (ww - 6) * 0.5, (wh - 6) * 0.5);
          // Draw subtle interior ceiling/curtain shadow lines in emissive
          ectx.fillStyle = '#000000';
          ectx.globalAlpha = 0.35;
          ectx.fillRect((wx + ww * 0.5 - 2) * 0.5, wy * 0.5, 2, wh * 0.5);
          ectx.globalAlpha = 1;
        }
      }
    }

    const map = this.configureTex(new THREE.CanvasTexture(c), true, true);
    const eMap = this.configureTex(new THREE.CanvasTexture(ec), true, true);
    const bMap = this.configureTex(new THREE.CanvasTexture(bc), true, false);

    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap: eMap,
      emissive: new THREE.Color(glowHex),
      emissiveIntensity: 0.72,
      bumpMap: bMap,
      bumpScale: 0.14,
      roughness,
      metalness
    });
  }

  public getStreetSignTexture(nameEn: string, nameKn: string): THREE.CanvasTexture {
    const key = `${nameEn}|${nameKn}`;
    const cached = this.signCache.get(key);
    if (cached) return cached;

    const { canvas: c, ctx } = this.makeScaledCanvas(1024, 384);

    ctx.fillStyle = '#0a3678';
    ctx.fillRect(0, 0, 1024, 384);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 996, 356);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(30, 30, 964, 18);

    ctx.fillStyle = '#ffe599';
    ctx.font = 'bold 72px "Noto Sans Kannada", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((nameKn || nameEn).slice(0, 26), 512, 155);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 62px "Rajdhani", sans-serif';
    ctx.fillText(nameEn.toUpperCase().slice(0, 28), 512, 275);

    const tex = this.configureTex(new THREE.CanvasTexture(c), false, true);
    this.signCache.set(key, tex);
    return tex;
  }

  public getShopSignTexture(title: string, subtitle: string, accent: string): THREE.CanvasTexture {
    const key = `${title}|${subtitle}`;
    const cached = this.shopCache.get(key);
    if (cached) return cached;

    const { canvas: c, ctx } = this.makeScaledCanvas(1024, 320);

    ctx.fillStyle = '#111624';
    ctx.fillRect(0, 0, 1024, 320);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 1000, 296);

    ctx.fillStyle = accent;
    ctx.font = 'bold 78px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 512, 114);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 46px "Noto Sans Kannada", sans-serif';
    ctx.fillText(subtitle, 512, 224);

    const tex = this.configureTex(new THREE.CanvasTexture(c), false, true);
    this.shopCache.set(key, tex);
    return tex;
  }
}
