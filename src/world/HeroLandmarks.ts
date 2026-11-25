import * as THREE from 'three';
import { latLonToWorld } from './bengaluruData';
import { PhysicsWorld } from '../engine/PhysicsWorld';

export interface HeroLandmarkHandle {
  id: string;
  mesh: THREE.Group;
  x: number;
  z: number;
}

/**
 * Handcrafted signature Bengaluru architectural landmarks placed at their real OSM
 * lat/lon coordinates so iconic sites look unmistakable alongside real OSM footprints.
 */
export class HeroLandmarks {
  public handles: HeroLandmarkHandle[] = [];
  private built = new Set<string>();
  private scene: THREE.Scene;
  private physics: PhysicsWorld;

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
  }

  public ensureNear(playerPos: THREE.Vector3): void {
    const specs: Array<{ id: string; lat: number; lon: number; build: (x: number, z: number) => THREE.Group }> = [
      { id: 'vidhana_soudha', lat: 12.9796, lon: 77.5907, build: (x, z) => this.buildVidhanaSoudha(x, z) },
      { id: 'high_court', lat: 12.9779, lon: 77.5925, build: (x, z) => this.buildHighCourt(x, z) },
      { id: 'lalbagh_glasshouse', lat: 12.9507, lon: 77.5848, build: (x, z) => this.buildLalbaghGlasshouse(x, z) },
      { id: 'silk_board_flyover', lat: 12.9177, lon: 77.6238, build: (x, z) => this.buildFlyoverMonument(x, z, 'SILK BOARD JUNCTION • ಸಿಲ್ಕ್ ಬೋರ್ಡ್', 0xff9f2e) },
      { id: 'hebbal_flyover', lat: 13.0358, lon: 77.5970, build: (x, z) => this.buildFlyoverMonument(x, z, 'HEBBAL FLYOVER • ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆ', 0x38bdf8) },
      { id: 'kia_terminal', lat: 13.1986, lon: 77.7066, build: (x, z) => this.buildAirportTerminal(x, z) }
    ];

    for (const s of specs) {
      const p = latLonToWorld(s.lat, s.lon);
      const dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (dist < 1400 && !this.built.has(s.id)) {
        this.built.add(s.id);
        const grp = s.build(p.x, p.z);
        this.scene.add(grp);
        this.handles.push({ id: s.id, mesh: grp, x: p.x, z: p.z });
      }
    }
  }

  private buildVidhanaSoudha(x: number, z: number): THREE.Group {
    // Neo-Dravidian granite palace with grand colonnade, central stepped dome & warm uplighting
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const granite = new THREE.MeshStandardMaterial({ color: 0xded3be, roughness: 0.62, metalness: 0.08 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xc2ab84, roughness: 0.55, metalness: 0.14 });
    const domeGold = new THREE.MeshStandardMaterial({
      color: 0xe8c77b,
      emissive: 0x6b4b12,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.55
    });

    // Stepped grand plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(108, 4.5, 58), trim);
    plinth.position.y = 2.25;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    g.add(plinth);

    // Main Neo-Dravidian granite body
    const main = new THREE.Mesh(new THREE.BoxGeometry(96, 22, 46), granite);
    main.position.y = 15.5;
    main.castShadow = true;
    main.receiveShadow = true;
    g.add(main);

    // Grand entrance portico columns
    const colGeo = new THREE.CylinderGeometry(0.95, 1.1, 18, 10);
    for (let i = -5; i <= 5; i++) {
      const col = new THREE.Mesh(colGeo, trim);
      col.position.set(i * 4.2, 13.5, 25.5);
      col.castShadow = true;
      g.add(col);
    }

    // Central pavilion & iconic dome + four corner chhatris
    const centralDrum = new THREE.Mesh(new THREE.CylinderGeometry(11, 12.5, 9, 16), granite);
    centralDrum.position.y = 31;
    g.add(centralDrum);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(11.5, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), domeGold);
    dome.position.y = 35;
    dome.castShadow = true;
    g.add(dome);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 8), domeGold);
    finial.position.y = 48;
    g.add(finial);

    for (const sx of [-38, 38]) {
      for (const sz of [-17, 17]) {
        const corner = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 7, 12), trim);
        corner.position.set(sx, 29.5, sz);
        g.add(corner);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), domeGold);
        cap.position.set(sx, 32.8, sz);
        g.add(cap);
      }
    }

    // Warm golden ceremonial floodlight accent
    const flood = new THREE.PointLight(0xffcf82, 45, 95, 1.5);
    flood.position.set(0, 26, 36);
    g.add(flood);

    this.physics.addChunkBoxCollider('hero_vidhana', x, 14, z, 52, 14, 28, 0, 'landmark');
    return g;
  }

  private buildHighCourt(x: number, z: number): THREE.Group {
    // Attara Kacheri — iconic Pompeian-red neoclassical heritage building facing Vidhana Soudha
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const redBrick = new THREE.MeshStandardMaterial({ color: 0xa4332a, roughness: 0.72, metalness: 0.06 });
    const whiteTrim = new THREE.MeshStandardMaterial({ color: 0xf0e9dd, roughness: 0.65 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(74, 15, 26), redBrick);
    body.position.y = 7.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const cornice = new THREE.Mesh(new THREE.BoxGeometry(76, 1.8, 28), whiteTrim);
    cornice.position.y = 15.6;
    g.add(cornice);

    const pediment = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 30), redBrick);
    pediment.position.y = 18.5;
    g.add(pediment);

    this.physics.addChunkBoxCollider('hero_highcourt', x, 8, z, 37, 8, 13, 0, 'landmark');
    return g;
  }

  private buildLalbaghGlasshouse(x: number, z: number): THREE.Group {
    // Crystal-Palace inspired iron & luminous glass conservatory inside Lalbagh Botanical Garden
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const glass = new THREE.MeshStandardMaterial({
      color: 0xaee8ff,
      emissive: 0x387899,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.75,
      transparent: true,
      opacity: 0.78
    });
    const iron = new THREE.MeshStandardMaterial({ color: 0x26323e, roughness: 0.45, metalness: 0.6 });

    const nave = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 48, 16, 1, false, 0, Math.PI), glass);
    nave.rotation.z = Math.PI / 2;
    nave.position.y = 7;
    g.add(nave);

    const cross = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 36, 16, 1, false, 0, Math.PI), glass);
    cross.rotation.x = Math.PI / 2;
    cross.rotation.z = Math.PI / 2;
    cross.position.y = 7;
    g.add(cross);

    const base = new THREE.Mesh(new THREE.BoxGeometry(50, 7, 34), iron);
    base.position.y = 3.5;
    g.add(base);

    const lantern = new THREE.PointLight(0x88e5ff, 35, 75, 1.6);
    lantern.position.set(0, 14, 0);
    g.add(lantern);

    this.physics.addChunkBoxCollider('hero_lalbagh', x, 8, z, 25, 8, 17, 0, 'landmark');
    return g;
  }

  private buildFlyoverMonument(x: number, z: number, _label: string, accentHex: number): THREE.Group {
    // Multi-level elevated Bengaluru concrete flyover piers + sodium overhead deck
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const concrete = new THREE.MeshStandardMaterial({ color: 0x737982, roughness: 0.82 });
    const stripe = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.65,
      roughness: 0.4
    });

    const deck1 = new THREE.Mesh(new THREE.BoxGeometry(160, 1.6, 14), concrete);
    deck1.position.y = 9.2;
    deck1.castShadow = true;
    g.add(deck1);

    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 160), concrete);
    deck2.position.y = 14.5;
    deck2.castShadow = true;
    g.add(deck2);

    const glowRail = new THREE.Mesh(new THREE.BoxGeometry(160, 0.35, 14.4), stripe);
    glowRail.position.y = 10.1;
    g.add(glowRail);

    const pierGeo = new THREE.CylinderGeometry(1.4, 1.7, 9.2, 10);
    for (let d = -64; d <= 64; d += 32) {
      if (Math.abs(d) < 12) continue;
      const p1 = new THREE.Mesh(pierGeo, concrete);
      p1.position.set(d, 4.6, 0);
      g.add(p1);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 14.5, 10), concrete);
      p2.position.set(0, 7.25, d);
      g.add(p2);
    }

    return g;
  }

  private buildAirportTerminal(x: number, z: number): THREE.Group {
    // Kempegowda International Airport sweeping curved roof canopy + ATC control tower
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const canopy = new THREE.MeshStandardMaterial({ color: 0xdbe5ef, roughness: 0.3, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x4ca6c9,
      emissive: 0x1c5875,
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0.78
    });

    const hall = new THREE.Mesh(new THREE.BoxGeometry(140, 14, 48), glass);
    hall.position.y = 7;
    g.add(hall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(156, 2.4, 62), canopy);
    roof.position.y = 15.2;
    roof.castShadow = true;
    g.add(roof);

    // ATC Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.8, 44, 12), canopy);
    tower.position.set(92, 22, -26);
    g.add(tower);

    const cab = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 5.2, 6, 12), glass);
    cab.position.set(92, 46, -26);
    g.add(cab);

    const beacon = new THREE.PointLight(0xff4757, 30, 80);
    beacon.position.set(92, 51, -26);
    g.add(beacon);

    this.physics.addChunkBoxCollider('hero_kia', x, 8, z, 70, 8, 24, 0, 'landmark');
    return g;
  }
}
