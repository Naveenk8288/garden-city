import * as THREE from 'three';
import './styles/main.css';
import { PhysicsWorld } from './engine/PhysicsWorld';
import { EnvironmentSystem, WeatherMode } from './engine/EnvironmentSystem';
import { PostProcessingPipeline, GraphicsQuality } from './engine/PostProcessing';
import { InputManager } from './engine/InputManager';
import { ProceduralTextures } from './world/ProceduralTextures';
import { ChunkStreamer } from './world/ChunkStreamer';
import { HeroLandmarks } from './world/HeroLandmarks';
import { PlayerController } from './entities/PlayerController';
import { VFXSystem } from './combat/VFXSystem';
import { WeaponId, WeaponSystem } from './combat/WeaponSystem';
import { WantedSystem } from './ai/WantedSystem';
import { EnemyAIManager } from './ai/EnemyAI';
import { VehicleSystem } from './vehicles/VehicleSystem';
import { MissionSystem } from './missions/MissionSystem';
import { AudioEngine } from './audio/AudioEngine';
import { WeaponUI } from './ui/WeaponUI';
import { CityMapUI } from './ui/CityMapUI';
import { ShopMetroUI, SubtitleLang } from './ui/ShopMetroUI';
import { WardrobeUI } from './ui/WardrobeUI';
import {
  CharacterLoadout,
  loadCharacterLoadout,
  saveCharacterLoadout
} from './entities/CustomizationData';
import {
  BENGALURU_LANDMARKS,
  BENGALURU_ZONES,
  ZoneDef,
  getZoneAtWorldPos,
  latLonToWorld,
  worldToLatLon
} from './world/bengaluruData';

const SAVE_KEY = 'garden_city_underworld_save_v1';

class GardenCityGame {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private physics = new PhysicsWorld();
  private env!: EnvironmentSystem;
  private post!: PostProcessingPipeline;
  private input!: InputManager;
  private textures!: ProceduralTextures;
  private streamer!: ChunkStreamer;
  private landmarks!: HeroLandmarks;
  private player!: PlayerController;
  private vfx!: VFXSystem;
  private weapons!: WeaponSystem;
  private wanted!: WantedSystem;
  private enemies!: EnemyAIManager;
  private vehicles!: VehicleSystem;
  private missions!: MissionSystem;
  private audio = new AudioEngine();
  private weaponUI = new WeaponUI();
  private cityMapUI = new CityMapUI();
  private shopMetroUI = new ShopMetroUI();
  private wardrobeUI!: WardrobeUI;
  private characterLoadout: CharacterLoadout = loadCharacterLoadout();

  private started = false;
  private paused = false;
  private scopeMode: 'toggle' | 'auto' = 'toggle';
  private manualScopeOn = false;
  private clock = new THREE.Clock();
  private fpsFrames = 0;
  private fpsAccum = 0;
  private hudTimer = 0;
  private damageFlash = 0;
  private bellandurPos = latLonToWorld(
    BENGALURU_LANDMARKS.find((l) => l.id === 'bellandur_lake')!.lat,
    BENGALURU_LANDMARKS.find((l) => l.id === 'bellandur_lake')!.lon
  );
  private minimapCtx: CanvasRenderingContext2D;
  private safehouseBeacons: THREE.Mesh[] = [];

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 3200);
    this.minimapCtx = (document.getElementById('minimap-canvas') as HTMLCanvasElement).getContext('2d')!;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.post?.resize(window.innerWidth, window.innerHeight);
    });
  }

  private setLoadProgress(msg: string, pct: number): void {
    const fill = document.getElementById('loading-bar-fill');
    const txt = document.getElementById('loading-text');
    if (fill) fill.style.width = `${pct}%`;
    if (txt) txt.textContent = msg;
  }

  public async boot(): Promise<void> {
    this.setLoadProgress('Initializing Rapier3D WASM physics...', 12);
    await this.physics.init();

    this.textures = new ProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.env = new EnvironmentSystem(this.scene, this.renderer);
    this.env.roadMaterials.push(this.textures.roadMajorMat, this.textures.roadMinorMat);
    this.env.windowMaterials.push(
      this.textures.buildings.commercial,
      this.textures.buildings.techGlass,
      this.textures.buildings.heritage,
      this.textures.buildings.residential
    );
    this.env.streetLightMaterials.push(this.textures.streetLampBulbMat);

    this.post = new PostProcessingPipeline(this.renderer, this.scene, this.camera);
    this.input = new InputManager(this.canvas);
    this.streamer = new ChunkStreamer(this.scene, this.textures, this.physics);
    this.landmarks = new HeroLandmarks(this.scene, this.physics);

    await this.streamer.init((m, p) => this.setLoadProgress(m, p));

    // Stream Central Bengaluru first, then snap spawn cleanly onto open MG Road asphalt!
    const rawSpawn = latLonToWorld(12.9756, 77.6032);
    const probePos = new THREE.Vector3(rawSpawn.x, 0.2, rawSpawn.z);
    this.setLoadProgress('Streaming Central Bengaluru OpenStreetMap tiles...', 68);
    await this.streamer.ensureChunksAt(probePos);
    this.landmarks.ensureNear(probePos);

    const roadSpot = this.streamer.findNearestRoadPoint(rawSpawn.x, rawSpawn.z);
    const spawnPos = new THREE.Vector3(roadSpot.x, 0.15, roadSpot.z);

    this.setLoadProgress('Initializing Combat, Crews, Vehicles & Namma Metro...', 86);
    this.wardrobeUI = new WardrobeUI(this.characterLoadout);
    this.player = new PlayerController(this.scene, this.physics, spawnPos, this.characterLoadout);
    this.player.yaw = roadSpot.yaw;
    this.player.characterYaw = roadSpot.yaw;

    this.vfx = new VFXSystem(this.scene);
    this.weaponUI.attachScene(this.scene);
    this.weapons = new WeaponSystem(this.player.weaponMount, this.physics, this.vfx);
    this.applyCharacterPerks(this.characterLoadout);
    this.wanted = new WantedSystem();
    this.enemies = new EnemyAIManager(this.scene, this.streamer, this.physics, this.vfx, this.wanted);
    this.vehicles = new VehicleSystem(this.scene, this.streamer, this.physics);
    this.missions = new MissionSystem(this.scene, this.enemies, this.wanted, this.vehicles);

    // Park iconic starter Bengaluru vehicles neatly along the road ahead of the player
    const rFwdX = -Math.sin(roadSpot.yaw);
    const rFwdZ = -Math.cos(roadSpot.yaw);
    const rRightX = Math.cos(roadSpot.yaw);
    const rRightZ = -Math.sin(roadSpot.yaw);
    this.vehicles.spawnVehicle('auto', new THREE.Vector3(spawnPos.x + rFwdX * 8 + rRightX * 2.8, 0.05, spawnPos.z + rFwdZ * 8 + rRightZ * 2.8), roadSpot.yaw, false);
    this.vehicles.spawnVehicle('bike', new THREE.Vector3(spawnPos.x + rFwdX * 12.5 + rRightX * 2.4, 0.05, spawnPos.z + rFwdZ * 12.5 + rRightZ * 2.4), roadSpot.yaw, false);
    this.vehicles.spawnVehicle('car', new THREE.Vector3(spawnPos.x + rFwdX * 18 - rRightX * 2.8, 0.05, spawnPos.z + rFwdZ * 18 - rRightZ * 2.8), roadSpot.yaw + Math.PI, false);

    this.buildSafehouseMarkers();
    this.wireSystemCallbacks();
    this.loadSavedProgress();
    this.bindUI();

    this.setLoadProgress('Ready — Welcome to Garden City Underworld', 100);
    document.getElementById('loading-status')?.classList.add('hidden');
    document.getElementById('title-actions')?.classList.remove('hidden');

    this.clock.start();
    this.loop();
  }

  private buildSafehouseMarkers(): void {
    // Glowing emerald beacon rings for each zone's Safehouse & Weapon Armory
    const ringGeo = new THREE.CylinderGeometry(1.8, 1.8, 14, 16, 1, true);
    const shMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shopMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for (const z of BENGALURU_ZONES) {
      const sh = latLonToWorld(z.safehouseLat, z.safehouseLon);
      const m1 = new THREE.Mesh(ringGeo, shMat);
      m1.position.set(sh.x, 7, sh.z);
      this.scene.add(m1);
      this.safehouseBeacons.push(m1);

      const sp = latLonToWorld(z.shopLat, z.shopLon);
      const m2 = new THREE.Mesh(ringGeo, shopMat);
      m2.position.set(sp.x, 7, sp.z);
      this.scene.add(m2);
      this.safehouseBeacons.push(m2);
    }
  }

  private wireSystemCallbacks(): void {
    this.weapons.onShotFired = (def, pos) => {
      this.audio.playGunshot(def.id, 1.0);
      this.enemies.alertNearbyOnGunshot(pos, 62);
      this.wanted.reportCrime(5);
    };

    this.weapons.onMeleeSwing = () => {
      this.audio.playMeleeSwing();
      this.player.triggerMeleeAnimation();
    };

    this.weapons.onHitConfirmed = (hs) => {
      this.weaponUI.showHitmarker(hs);
      this.audio.playHitMarker(hs);
    };

    this.weapons.onHitDetails = (info) => {
      this.weaponUI.showShotHit(info);
    };

    this.weapons.onSafeZoneBlocked = () => {
      this.shopMetroUI.showToast('🕊 Sacred Safe Zone — Combat disabled near temples, mosques & churches', 2.6);
    };

    this.enemies.onEnemyShot = (pos) => {
      const d = pos.distanceTo(this.player.position);
      this.audio.playGunshot('pistol', Math.max(0.12, 1 - d / 80) * 0.55);
    };

    this.enemies.onPlayerDamaged = (dmg) => {
      const blockScale = this.player.stance.isAiming && this.weapons.getCurrentDef().category === 'melee' ? 0.3 : 1.0;
      const coverScale = this.player.stance.isInCover ? 0.45 : 1.0;
      const finalDmg = dmg * blockScale * coverScale;
      const knockedOut = this.player.takeDamage(finalDmg);
      this.damageFlash = Math.min(1, this.damageFlash + 0.65);

      if (knockedOut) {
        this.handlePlayerKnockout();
      }
    };

    this.enemies.onEnemyKnockedOut = (unit) => {
      if (unit.faction === 'rival') {
        const baseDrop = unit.archetype === 'boss' ? 1200 : unit.archetype === 'brute' ? 450 : 180;
        const cashMult = this.characterLoadout.presetId === 'vikram_don' ? 1.35 : 1.0;
        this.missions.cash += Math.round(baseDrop * cashMult);
        this.missions.respect += unit.archetype === 'boss' ? 120 : 25;
        this.missions.onUnitKnockedOut(unit.missionTag);
        this.saveProgress();
      } else if (unit.faction === 'police') {
        this.missions.respect += 15;
      }
    };

    this.enemies.onBark = (bark) => {
      this.shopMetroUI.showSubtitle(bark.speaker, bark.en, bark.kn, bark.hi, 3.8);
    };

    this.wanted.onWantedChange = (stars) => {
      if (stars > 0) {
        this.shopMetroUI.showToast(`★ WANTED LEVEL ${stars} — Metro Patrol pursuing across Bengaluru!`, 3.0);
      } else {
        this.shopMetroUI.showToast('Wanted level cleared — heat lost.', 2.5);
      }
    };

    this.wanted.onNoGoAlert = () => {
      this.shopMetroUI.showToast('⚠ YELAHANKA AIRFIELD RESTRICTED NO-GO ZONE! 4-STAR RESPONSE!', 4.2);
    };

    this.vehicles.onHonk = (kind, dist) => {
      this.audio.playHorn(kind, dist);
    };

    this.vehicles.onVehicleStolen = () => {
      this.wanted.reportCrime(32);
      this.shopMetroUI.showToast('Vehicle commandeered — Metro Patrol alerted!');
    };

    this.missions.onNotify = (msg) => {
      this.shopMetroUI.showToast(msg, 4.5);
      this.saveProgress();
    };

    this.missions.onSubtitle = (spk, en, kn, hi) => {
      this.shopMetroUI.showSubtitle(spk, en, kn, hi, 6.0);
    };

    this.cityMapUI.onFastTravel = (lat, lon, label) => {
      void this.fastTravelTo(lat, lon, label);
    };

    this.shopMetroUI.onMetroSelect = (stn) => {
      if (this.missions.cash >= 30) {
        this.missions.cash -= 30;
      }
      this.audio.playMetroChime();
      this.shopMetroUI.showSubtitle(
        'NAMMA METRO • ನಮ್ಮ ಮೆಟ್ರೋ',
        `Arriving at ${stn.name} Station. Doors will open on the left.`,
        `ಮುಂದಿನ ನಿಲ್ದಾಣ: ${stn.nameKn}. ಬಾಗಿಲುಗಳು ಎಡಭಾಗದಲ್ಲಿ ತೆರೆಯುತ್ತವೆ.`,
        `अगला स्टेशन: ${stn.name}। दरवाज़े बाईं ओर खुलेंगे।`,
        5.5
      );
      void this.fastTravelTo(stn.lat, stn.lon, `Namma Metro: ${stn.name}`);
    };

    this.shopMetroUI.onCloseModal = () => {
      this.syncUIBlockState();
    };

    this.wardrobeUI.onLoadoutChange = (newLoadout) => {
      this.characterLoadout = newLoadout;
      saveCharacterLoadout(newLoadout);
      const newMount = this.player.applyLoadout(newLoadout);
      this.weapons.setMountGroup(newMount);
      this.applyCharacterPerks(newLoadout);
    };

    this.wardrobeUI.onRotateToggle = () => {
      this.player.vaultAutoSpin = !this.player.vaultAutoSpin;
    };

    this.wardrobeUI.onClose = () => {
      if (!this.started) {
        this.started = true;
        this.audio.init();
        document.getElementById('title-screen')?.classList.add('hidden');
        document.getElementById('hud')?.classList.remove('hidden');
      }
      this.syncUIBlockState();
    };
  }

  private applyCharacterPerks(loadout: CharacterLoadout): void {
    this.weapons.headshotDamageMult = loadout.presetId === 'striker' ? 1.2 : 1.0;
    this.weapons.reloadSpeedMult = loadout.presetId === 'kavya_shadow' ? 1.25 : 1.0;
  }

  private openWardrobeVault(): void {
    if (this.player.inVehicle) {
      const exitPos = this.vehicles.exitVehicle();
      this.player.inVehicle = false;
      if (exitPos) this.player.teleport(exitPos.x, exitPos.y, exitPos.z);
    }
    this.paused = false;
    document.getElementById('pause-modal')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.add('hidden');
    this.cityMapUI.setOpen(false);
    this.shopMetroUI.closeAll();
    this.player.vaultSpinAngle = 0;
    this.wardrobeUI.setOpen(true);
    this.syncUIBlockState();
  }

  private async fastTravelTo(lat: number, lon: number, label: string): Promise<void> {
    if (this.player.inVehicle) {
      this.vehicles.exitVehicle();
      this.player.inVehicle = false;
    }
    const target = latLonToWorld(lat, lon);
    const pos = new THREE.Vector3(target.x, 0.3, target.z);
    await this.streamer.ensureChunksAt(pos);
    this.landmarks.ensureNear(pos);
    const roadSpot = this.streamer.findNearestRoadPoint(target.x, target.z);
    this.player.teleport(roadSpot.x, 0.2, roadSpot.z);
    this.player.yaw = roadSpot.yaw;

    // Ensure a fresh Auto-Rickshaw is parked neatly along the road at every destination
    const fx = -Math.sin(roadSpot.yaw);
    const fz = -Math.cos(roadSpot.yaw);
    this.vehicles.spawnVehicle('auto', new THREE.Vector3(roadSpot.x + fx * 8, 0.05, roadSpot.z + fz * 8), roadSpot.yaw, false);
    this.shopMetroUI.showToast(`Arrived at ${label}`, 3.0);
    this.syncUIBlockState();
  }

  private handlePlayerKnockout(): void {
    this.wanted.clearWanted();
    this.player.health = this.player.maxHealth;
    this.player.armor = 50;
    const zone = getZoneAtWorldPos(this.player.position.x, this.player.position.z);
    const fee = Math.min(this.missions.cash, 350);
    this.missions.cash -= fee;
    this.shopMetroUI.showToast(`Knocked out! Recovered at ${zone.safehouseName} (-₹${fee} clinic fee)`, 4.2);
    void this.fastTravelTo(zone.safehouseLat, zone.safehouseLon, zone.safehouseName);
  }

  private saveProgress(): void {
    try {
      const unlocked: WeaponId[] = [];
      for (const [id, st] of this.weapons.states.entries()) {
        if (st.unlocked) unlocked.push(id);
      }
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          cash: this.missions.cash,
          respect: this.missions.respect,
          ownedZones: [...this.missions.ownedZones],
          completedMissions: [...this.missions.completedMissions],
          unlockedWeapons: unlocked
        })
      );
    } catch {
      // ignore storage errors
    }
  }

  private loadSavedProgress(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.cash === 'number') this.missions.cash = data.cash;
      if (typeof data.respect === 'number') this.missions.respect = data.respect;
      if (Array.isArray(data.ownedZones)) {
        data.ownedZones.forEach((z: any) => this.missions.ownedZones.add(z));
      }
      if (Array.isArray(data.completedMissions)) {
        data.completedMissions.forEach((m: string) => this.missions.completedMissions.add(m));
        this.missions.startNextMission();
      }
      if (Array.isArray(data.unlockedWeapons)) {
        data.unlockedWeapons.forEach((w: WeaponId) => this.weapons.unlock(w));
      }
    } catch {
      // ignore corrupted save
    }
  }

  private syncUIBlockState(): void {
    const anyModal = this.paused || this.cityMapUI.isOpen || this.shopMetroUI.metroOpen || this.shopMetroUI.shopOpen || this.weaponUI.isOpen || this.wardrobeUI.isOpen;
    this.input.uiBlocked = anyModal;
    if (anyModal) {
      this.input.releasePointerLock();
    } else if (this.started) {
      this.input.requestPointerLock();
    }
  }

  private bindUI(): void {
    document.getElementById('btn-play')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.started = true;
      this.audio.init();
      document.getElementById('title-screen')?.classList.add('hidden');
      document.getElementById('hud')?.classList.remove('hidden');
      this.canvas.focus();
      this.syncUIBlockState();
      this.shopMetroUI.showSubtitle(
        'GARDEN CITY UNDERWORLD',
        'Welcome to Central Bengaluru! Hop in the green-yellow Auto-Rickshaw [E], check [Tab] Map, or press [M] for Namma Metro.',
        'ಕೇಂದ್ರ ಬೆಂಗಳೂರಿಗೆ ಸ್ವಾಗತ! ಆಟೋ ಹತ್ತಲು [E], ನಕ್ಷೆಗೆ [Tab], ಅಥವಾ ನಮ್ಮ ಮೆಟ್ರೋಗೆ [M] ಒತ್ತಿ.',
        'सेंट्रल बेंगलुरु में आपका स्वागत है! ऑटो के लिए [E], मैप के लिए [Tab], या नम्मा मेट्रो के लिए [M] दबाएं।',
        7.0
      );
    });

    document.getElementById('btn-title-vault')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement)?.blur();
      this.audio.init();
      this.openWardrobeVault();
    });

    document.getElementById('btn-pause-vault')?.addEventListener('click', () => {
      this.openWardrobeVault();
    });

    const openCredits = () => document.getElementById('credits-modal')?.classList.remove('hidden');
    document.getElementById('btn-credits')?.addEventListener('click', openCredits);
    document.getElementById('btn-open-credits-pause')?.addEventListener('click', openCredits);
    document.getElementById('btn-close-credits')?.addEventListener('click', () => {
      document.getElementById('credits-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause(false));
    document.getElementById('btn-respawn')?.addEventListener('click', () => {
      const central = BENGALURU_ZONES[0];
      this.togglePause(false);
      void this.fastTravelTo(central.safehouseLat, central.safehouseLon, central.safehouseName);
    });

    (document.getElementById('set-graphics') as HTMLSelectElement)?.addEventListener('change', (e) => {
      const q = (e.target as HTMLSelectElement).value as GraphicsQuality;
      this.post.setQuality(q);
      this.env.setQuality(q);
      this.streamer.setStreamRadius(q === 'low' ? 1 : 2);
    });

    (document.getElementById('set-volume') as HTMLInputElement)?.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      this.audio.setVolume(v / 100);
      const el = document.getElementById('set-vol-val');
      if (el) el.textContent = `${v}%`;
    });

    (document.getElementById('set-language') as HTMLSelectElement)?.addEventListener('change', (e) => {
      this.shopMetroUI.subtitleLang = (e.target as HTMLSelectElement).value as SubtitleLang;
    });

    (document.getElementById('set-weather') as HTMLSelectElement)?.addEventListener('change', (e) => {
      this.env.weatherMode = (e.target as HTMLSelectElement).value as WeatherMode;
    });

    (document.getElementById('set-sensitivity') as HTMLInputElement)?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value) / 100;
      this.input.sensitivity = val;
      const lbl = document.getElementById('set-sens-val');
      if (lbl) lbl.textContent = val.toFixed(2);
    });

    (document.getElementById('set-interact-key') as HTMLSelectElement)?.addEventListener('change', (e) => {
      this.input.interactKey = (e.target as HTMLSelectElement).value;
    });

    (document.getElementById('set-scope-mode') as HTMLSelectElement)?.addEventListener('change', (e) => {
      this.scopeMode = (e.target as HTMLSelectElement).value as 'toggle' | 'auto';
      this.manualScopeOn = false;
    });
  }

  private togglePause(force?: boolean): void {
    this.paused = force ?? !this.paused;
    document.getElementById('pause-modal')?.classList.toggle('hidden', !this.paused);
    if (this.paused) {
      this.cityMapUI.setOpen(false);
      this.shopMetroUI.closeAll();
    }
    this.syncUIBlockState();
  }

  private findNearbySafehouseOrShop(pos: THREE.Vector3): { zone: ZoneDef; label: string } | null {
    for (const z of BENGALURU_ZONES) {
      const sh = latLonToWorld(z.safehouseLat, z.safehouseLon);
      if (Math.hypot(pos.x - sh.x, pos.z - sh.z) < 16) {
        return { zone: z, label: `Enter ${z.safehouseName} / Armory` };
      }
      const sp = latLonToWorld(z.shopLat, z.shopLon);
      if (Math.hypot(pos.x - sp.x, pos.z - sp.z) < 16) {
        return { zone: z, label: `Open ${z.shopName}` };
      }
    }
    return null;
  }

  private updateHUD(dt: number, promptText: string): void {
    this.fpsFrames++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum);
      const el = document.getElementById('hud-fps');
      if (el) el.textContent = `${fps} FPS • ${this.streamer.getLoadedChunkCount()} tiles`;
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    // Damage screen vignette decay
    const vig = document.getElementById('damage-vignette');
    if (vig) {
      this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
      vig.style.boxShadow = `inset 0 0 130px rgba(255, 35, 50, ${(this.damageFlash * 0.65).toFixed(2)})`;
    }

    const promptEl = document.getElementById('hud-prompt');
    if (promptEl) {
      promptEl.classList.toggle('hidden', !promptText);
      promptEl.textContent = promptText;
    }

    // Vehicle HUD
    const vehHud = document.getElementById('hud-vehicle');
    if (vehHud) {
      const av = this.vehicles.activeVehicle;
      vehHud.classList.toggle('hidden', !av);
      if (av) {
        const spEl = document.getElementById('hud-speed');
        const nmEl = document.getElementById('hud-vehicle-name');
        const hpEl = document.getElementById('hud-vehicle-hp');
        const rdEl = document.getElementById('hud-radio-station');
        if (spEl) spEl.textContent = `${Math.round(Math.abs(av.speed) * 3.6)}`;
        if (nmEl) nmEl.textContent = av.name;
        if (hpEl) hpEl.style.width = `${Math.max(0, (av.health / av.maxHealth) * 100)}%`;
        const radio = this.vehicles.getCurrentRadio();
        if (rdEl) rdEl.textContent = `${radio.name} • ${radio.genre}`;
      }
    }

    this.hudTimer += dt;
    if (this.hudTimer < 0.14) return;
    this.hudTimer = 0;

    const pos = this.player.position;
    const road = this.streamer.getNearestRoad(pos.x, pos.z);
    const zone = getZoneAtWorldPos(pos.x, pos.z);
    const safe = this.streamer.getSafeZoneAt(pos.x, pos.z);

    const stEn = document.getElementById('hud-street-en');
    const stKn = document.getElementById('hud-street-kn');
    const zEl = document.getElementById('hud-zone-name');
    const twEl = document.getElementById('hud-time-weather');
    if (stEn) stEn.textContent = road.name;
    if (stKn) stKn.textContent = road.nameKn;
    if (zEl) zEl.textContent = `${zone.name.toUpperCase()} (${zone.nameKn})`;
    if (twEl) twEl.textContent = this.env.getWeatherLabel();

    const safeEl = document.getElementById('hud-safe-badge');
    if (safeEl) {
      safeEl.classList.toggle('hidden', !safe);
      if (safe) safeEl.textContent = `🕊 SAFE ZONE: ${safe.name}`;
    }

    const cashEl = document.getElementById('hud-cash');
    const repEl = document.getElementById('hud-respect');
    const turfEl = document.getElementById('hud-turf-count');
    if (cashEl) cashEl.textContent = this.missions.cash.toLocaleString();
    if (repEl) repEl.textContent = `${this.missions.respect}`;
    if (turfEl) turfEl.textContent = `${this.missions.ownedZones.size}/8`;

    const setBar = (fillId: string, valId: string, val: number, max: number) => {
      const f = document.getElementById(fillId);
      const v = document.getElementById(valId);
      if (f) f.style.width = `${Math.max(0, Math.min(100, (val / max) * 100))}%`;
      if (v) v.textContent = `${Math.round(val)}`;
    };
    setBar('hud-health-fill', 'hud-health-val', this.player.health, this.player.maxHealth);
    setBar('hud-armor-fill', 'hud-armor-val', this.player.armor, this.player.maxArmor);
    setBar('hud-stamina-fill', 'hud-stamina-val', this.player.stamina, 100);

    this.drawMinimap();
  }

  private drawMinimap(): void {
    const ctx = this.minimapCtx;
    const w = 210;
    const h = 210;
    const scale = 0.34;
    const px = this.player.position.x;
    const pz = this.player.position.z;

    ctx.fillStyle = '#09101a';
    ctx.fillRect(0, 0, w, h);

    // Real OSM streets on minimap
    const segs = this.streamer.getActiveRoadSegments();
    ctx.lineCap = 'round';
    for (const r of segs) {
      const ax = w * 0.5 + (r.ax - px) * scale;
      const ay = h * 0.5 + (r.az - pz) * scale;
      const bx = w * 0.5 + (r.bx - px) * scale;
      const by = h * 0.5 + (r.bz - pz) * scale;
      if (
        (ax < -20 && bx < -20) || (ax > w + 20 && bx > w + 20) ||
        (ay < -20 && by < -20) || (ay > h + 20 && by > h + 20)
      ) continue;
      ctx.strokeStyle = r.width >= 12 ? '#6b809e' : '#314054';
      ctx.lineWidth = Math.max(1.2, r.width * scale * 0.44);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Sacred Safe Zones (cyan)
    for (const sz of this.streamer.getAllActiveSafeZones()) {
      const sx = w * 0.5 + (sz.x - px) * scale;
      const sy = h * 0.5 + (sz.z - pz) * scale;
      ctx.fillStyle = 'rgba(56, 232, 200, 0.25)';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, sz.radius * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // Nearby Enemies & Patrol (red / blue dots)
    for (const u of this.enemies.units) {
      if (u.state === 'knockout' || u.faction === 'civilian') continue;
      const ex = w * 0.5 + (u.position.x - px) * scale;
      const ey = h * 0.5 + (u.position.z - pz) * scale;
      if (ex < 0 || ex > w || ey < 0 || ey > h) continue;
      ctx.fillStyle = u.faction === 'police' ? '#38bdf8' : u.archetype === 'boss' ? '#facc15' : '#ff4757';
      ctx.beginPath();
      ctx.arc(ex, ey, u.archetype === 'boss' ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight last shot person's exact position on minimap with pulsing red ring!
    const pinnedShot = this.weaponUI.getPinnedShotWorldPos();
    if (pinnedShot) {
      const sx = w * 0.5 + (pinnedShot.x - px) * scale;
      const sy = h * 0.5 + (pinnedShot.z - pz) * scale;
      if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
        const pulse = 5 + Math.sin(performance.now() * 0.015) * 2.5;
        ctx.strokeStyle = '#ff2e4c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Mission Waypoint Compass Pin (clamped to radar edge if far)
    if (this.missions.waypoint) {
      const dx = (this.missions.waypoint.x - px) * scale;
      const dy = (this.missions.waypoint.z - pz) * scale;
      const dist = Math.hypot(dx, dy);
      const maxR = 94;
      const clampedX = w * 0.5 + (dist > maxR ? (dx / dist) * maxR : dx);
      const clampedY = h * 0.5 + (dist > maxR ? (dy / dist) * maxR : dy);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Player heading arrow
    const heading = this.vehicles.activeVehicle ? this.vehicles.activeVehicle.yaw : this.player.yaw;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-heading);
    ctx.fillStyle = '#ff9f2e';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const input = this.input.poll(dt);

    if (this.started) {
      if (input.pauseTogglePressed) {
        if (this.wardrobeUI.isOpen) {
          this.wardrobeUI.setOpen(false);
          this.syncUIBlockState();
        } else if (this.cityMapUI.isOpen) {
          this.cityMapUI.setOpen(false);
          this.syncUIBlockState();
        } else if (this.shopMetroUI.metroOpen || this.shopMetroUI.shopOpen) {
          this.shopMetroUI.closeAll();
        } else {
          this.togglePause();
        }
      }

      if (input.wardrobeTogglePressed && !this.paused) {
        if (this.wardrobeUI.isOpen) {
          this.wardrobeUI.setOpen(false);
          this.syncUIBlockState();
        } else {
          this.openWardrobeVault();
        }
      }

      if (input.mapTogglePressed && !this.paused) {
        const nextOpen = !this.cityMapUI.isOpen;
        this.shopMetroUI.closeAll();
        this.cityMapUI.setOpen(
          nextOpen,
          this.streamer,
          this.missions,
          worldToLatLon(this.player.position.x, this.player.position.z)
        );
        this.syncUIBlockState();
      }

      if (input.metroTogglePressed && !this.paused) {
        if (this.shopMetroUI.metroOpen) {
          this.shopMetroUI.closeAll();
        } else {
          this.cityMapUI.setOpen(false);
          this.shopMetroUI.openMetro();
          this.syncUIBlockState();
        }
      }

      // Weapon Wheel (Hold Q)
      if (!this.paused && !this.wardrobeUI.isOpen && !this.cityMapUI.isOpen && !this.shopMetroUI.metroOpen && !this.shopMetroUI.shopOpen && !this.player.inVehicle) {
        this.weaponUI.setOpen(input.weaponWheel, this.weapons, (id) => {
          this.weapons.equip(id);
          this.weaponUI.setOpen(false, this.weapons, () => {});
          this.syncUIBlockState();
        });
        if (input.weaponWheel !== this.input.uiBlocked && !this.paused) {
          this.syncUIBlockState();
        }
      }
    }

    if (this.wardrobeUI.isOpen) {
      // Live 3D Free Fire Lobby Turntable Showcase!
      this.player.updateVaultShowcase(dt, this.camera);
      this.env.update(dt, this.player.position, 0);
    } else if (this.started && !this.paused && !this.cityMapUI.isOpen && !this.shopMetroUI.metroOpen && !this.shopMetroUI.shopOpen) {
      this.physics.step(dt);

      // Kaal "Cyber DJ" passive HP regen aura (+3 HP/s)
      if (this.characterLoadout.presetId === 'kaal_dj' && this.player.health < this.player.maxHealth) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + dt * 3.0);
      }

      // Weapon slot quick-keys 1-8 & Reload
      if (input.weaponSlotPressed > 0 && !this.player.inVehicle) {
        this.weapons.equipBySlot(input.weaponSlotPressed);
      }
      if (input.reloadPressed && !this.player.inVehicle) {
        this.weapons.startReload();
      }
      if (input.radioNextPressed && this.player.inVehicle) {
        const st = this.vehicles.cycleRadio();
        this.shopMetroUI.showToast(`📻 ${st.name} — ${st.genre}`, 2.0);
      }

      // Interaction prompt: Enter/Exit Vehicle OR Open Safehouse/Armory
      let promptText = '';
      if (this.player.inVehicle) {
        promptText = `Driving ${this.vehicles.activeVehicle?.name} • [${this.input.interactKey.replace('Key', '')}] Exit • [Space] Handbrake Drift • [H] Horn • [X] Radio`;
        if (input.interactPressed) {
          const exitPos = this.vehicles.exitVehicle();
          this.player.inVehicle = false;
          if (exitPos) this.player.teleport(exitPos.x, exitPos.y, exitPos.z);
        }
      } else {
        const nearShop = this.findNearbySafehouseOrShop(this.player.position);
        const nearVeh = this.vehicles.findNearestVehicle(this.player.position, 5.2);
        if (nearShop) {
          promptText = `[${this.input.interactKey.replace('Key', '')}] ${nearShop.label}`;
          if (input.interactPressed) {
            this.shopMetroUI.openShop(
              nearShop.zone,
              this.weapons,
              () => this.missions.cash,
              (amt) => {
                if (this.missions.cash < amt) return false;
                this.missions.cash -= amt;
                this.saveProgress();
                return true;
              },
              () => {
                this.player.health = this.player.maxHealth;
                this.wanted.clearWanted();
              },
              () => {
                this.player.armor = this.player.maxArmor;
              }
            );
            this.syncUIBlockState();
          }
        } else if (nearVeh) {
          promptText = `[${this.input.interactKey.replace('Key', '')}] Drive ${nearVeh.name}`;
          if (input.interactPressed) {
            this.vehicles.enterVehicle(nearVeh);
            this.player.inVehicle = true;
          }
        }
      }

      // Player on-foot update, Tactical Optical Scope option ([Z] / Middle-Click / Auto-RMB), & combat
      const isFirearm = this.weapons.getCurrentDef().category === 'firearm';
      if (!isFirearm || this.player.inVehicle) {
        this.manualScopeOn = false;
      } else if (input.scopeTogglePressed) {
        this.manualScopeOn = !this.manualScopeOn;
      }

      const isScoped = !this.player.inVehicle && isFirearm && (this.manualScopeOn || (this.scopeMode === 'auto' && input.aim));
      if (isScoped && input.wheelDelta !== 0) {
        this.player.scopeZoom = input.wheelDelta < 0 ? 5.0 : 2.5;
      }
      this.player.scopeActive = isScoped;

      // Feed current weapon posture style (melee / pistol / twohand) & reload state to character rig
      const wId = this.weapons.currentId;
      this.player.equippedWeaponStyle = !isFirearm ? 'melee' : wId === 'pistol' ? 'pistol' : 'twohand';
      this.player.isReloadingWeapon = this.weapons.reloading;

      this.player.isMeleeBlocking = !this.player.inVehicle && input.aim && !isFirearm;
      this.player.update(dt, input, this.camera);
      this.weapons.update(dt);

      const safeZone = this.streamer.getSafeZoneAt(this.player.position.x, this.player.position.z);
      const fwd = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
      const combatTargets = this.enemies.getCombatTargets();
      const aimRay = this.player.getAimRay(this.camera);

      // Acquire live person target under/near crosshair and feed exact 3D target point to player hand aiming!
      const aimInfo = this.player.inVehicle
        ? { aimTarget: null, worldPoint: null, worldDist: 0 }
        : this.weapons.acquireAimTarget(aimRay.origin, aimRay.dir, combatTargets, this.player.collider);
      this.player.aimTargetWorldPoint = aimInfo.aimTarget
        ? aimInfo.aimTarget.hitPoint
        : aimInfo.worldPoint;

      if (!this.player.inVehicle && !this.weaponUI.isOpen && input.grabPressed) {
        const grabbed = this.weapons.tryGrab(
          this.player.position,
          fwd,
          Boolean(safeZone),
          combatTargets
        );
        if (grabbed) {
          this.player.triggerGrabAnimation();
          this.audio.playMeleeSwing();
          this.shopMetroUI.showToast('GRAB & THROW!', 1.1);
        }
      }

      if (!this.player.inVehicle && !this.weaponUI.isOpen && input.fire) {
        const res = this.weapons.tryAttack(
          aimRay.origin,
          aimRay.dir,
          this.player.position,
          fwd,
          input.aim,
          input.fireJustPressed,
          Boolean(safeZone),
          combatTargets,
          this.player.collider,
          isScoped
        );
        if (res.fired && !res.melee) {
          this.player.addRecoil(res.recoilPitch * (isScoped ? 0.55 : 1.0), res.recoilYaw * (isScoped ? 0.45 : 1.0));
        }
      }

      this.weaponUI.updateTargeting(
        dt,
        this.camera,
        this.player.position,
        isFirearm,
        input.aim,
        isScoped,
        this.player.scopeZoom,
        aimInfo
      );

      // Show crisp live tactical stance hint when in cover / blocking
      if (!promptText && !this.player.inVehicle) {
        if (this.player.stance.isInCover) {
          promptText = '🛡 IN COVER • Hold [RMB] to Peek & Shoot • [C] Leave Cover';
        } else if (this.player.isMeleeBlocking) {
          promptText = '🛡 MELEE BLOCK GUARD (70% Damage Reduction)';
        }
      }

      // Vehicles & Traffic AI update + vehicle ramming knockouts
      const vehRes = this.vehicles.update(
        dt,
        this.player.position,
        input,
        this.camera,
        this.env.nightFactor,
        this.wanted.stars
      );
      if (vehRes.playerWorldPos && this.vehicles.activeVehicle) {
        this.player.teleport(vehRes.playerWorldPos.x, vehRes.playerWorldPos.y, vehRes.playerWorldPos.z);
        const av = this.vehicles.activeVehicle;
        this.enemies.checkVehicleRamming(
          av.position,
          av.speed,
          new THREE.Vector3(-Math.sin(av.yaw), 0, -Math.cos(av.yaw))
        );
      }

      // Enemy AI & Wanted update
      const { policeHasLOS } = this.enemies.update(dt, this.player.position, this.camera.position, this.missions.ownedZones);
      this.wanted.update(dt, this.player.position, policeHasLOS);

      // Missions, Chunks, Hero Landmarks, VFX, UI & Audio
      this.missions.update(dt, this.player.position);
      void this.streamer.ensureChunksAt(this.player.position);
      this.landmarks.ensureNear(this.player.position);
      this.vfx.update(dt);
      this.weaponUI.update(dt, this.weapons, this.player.stance.isAiming);
      this.shopMetroUI.update(dt);

      // Bellandur Lake iconic foam-and-mist atmospheric boost when near East lake
      const distBellandur = Math.hypot(
        this.player.position.x - this.bellandurPos.x,
        this.player.position.z - this.bellandurPos.z
      );
      const bellandurMist = Math.max(0, 1 - distBellandur / 1100);
      this.env.update(dt, this.player.position, bellandurMist);

      // Post-processing motion blur & DoF
      const speed01 = this.player.inVehicle
        ? Math.max(0, (vehRes.speedKmh - 45) / 100)
        : Math.max(0, (this.player.stance.speed - 6) / 14);
      this.post.setMotionBlur(speed01, this.player.lastYawDelta);
      this.post.setDepthOfField(this.player.stance.isAiming ? 20 : 38, this.player.stance.isAiming);

      this.audio.update(
        dt,
        this.env.rainIntensity,
        this.player.inVehicle,
        vehRes.speedKmh,
        this.vehicles.activeVehicle?.kind || 'car',
        this.wanted.stars,
        Boolean(safeZone),
        this.vehicles.getCurrentRadio()
      );

      this.updateHUD(dt, promptText);
    } else if (!this.started) {
      // Cinematic dusk orbit over MG Road / Cubbon Park / Vidhana Soudha on Title Screen
      const t = performance.now() * 0.00018;
      const base = latLonToWorld(12.9765, 77.6005);
      this.camera.position.set(base.x + Math.cos(t) * 145, 58, base.z + Math.sin(t) * 145);
      this.camera.lookAt(base.x, 12, base.z);
      this.env.update(dt, this.camera.position, 0);
    }

    this.post.render();
  };
}

const game = new GardenCityGame();
game.boot().catch((err) => {
  console.error('Boot error:', err);
  const txt = document.getElementById('loading-text');
  if (txt) txt.textContent = `Error: ${err.message}`;
});
