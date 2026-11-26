import * as THREE from 'three';
import { BENGALURU_ZONES, ZoneId, latLonToWorld } from '../world/bengaluruData';
import { EnemyAIManager } from '../ai/EnemyAI';
import { WantedSystem } from '../ai/WantedSystem';
import { VehicleSystem } from '../vehicles/VehicleSystem';

export interface MissionDef {
  id: string;
  index: number;
  title: string;
  zone: ZoneId;
  locationName: string;
  lat: number;
  lon: number;
  type: 'combat' | 'chase' | 'heist' | 'boss';
  description: string;
  targetLat?: number; // For escape/chase destination
  targetLon?: number;
  enemyWave: Array<'grunt' | 'shooter' | 'brute' | 'boss'>;
  rewardCash: number;
  rewardRespect: number;
  wantedTrigger?: number;
  spawnBike?: boolean;
  briefingEn: string;
  briefingKn: string;
  briefingHi: string;
}

export const STORY_MISSIONS: MissionDef[] = [
  {
    id: 'm1_central_mg',
    index: 1,
    title: 'Monsoon Spark on MG Road',
    zone: 'central',
    locationName: 'MG Road & Cubbon Edge',
    lat: 12.9762,
    lon: 77.6012,
    type: 'combat',
    description: 'Cantonment Syndicate scouts are shaking down darshini stalls near Cubbon Park. Clear their crew to claim Central.',
    enemyWave: ['grunt', 'grunt', 'shooter', 'shooter'],
    rewardCash: 1800,
    rewardRespect: 150,
    briefingEn: 'Fixer Contact: "Cantonment Syndicate thinks MG Road belongs to them. Drop their lookout crew near Cubbon Park, macha."',
    briefingKn: 'ಸಂಪರ್ಕ: "ಕಂಟೋನ್ಮೆಂಟ್ ಸಿಂಡಿಕೇಟ್ ಎಂ.ಜಿ. ರಸ್ತೆಯಲ್ಲಿ ದೌರ್ಜನ್ಯ ಮಾಡ್ತಿದ್ದಾರೆ. ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಹತ್ತಿರ ಅವರನ್ನು ತಡೆಯಿರಿ."',
    briefingHi: 'कॉन्टैक्ट: "कैंटोनमेंट सिंडिकेट एम.जी. रोड पर वसूली कर रहा है। कब्बन पार्क के पास उन्हें सबक सिखाओ।"'
  },
  {
    id: 'm2_majestic_deal',
    index: 2,
    title: 'Majestic Terminal Ambush',
    zone: 'old_city',
    locationName: 'Majestic Bus & Rail Hub',
    lat: 12.9768,
    lon: 77.5720,
    type: 'combat',
    description: 'A handover at Kempegowda Bus Station went sideways. Survive the Pettah Cobras ambush in Majestic.',
    enemyWave: ['grunt', 'shooter', 'shooter', 'brute'],
    rewardCash: 2800,
    rewardRespect: 220,
    briefingEn: 'Old City Broker: "It is a trap! Pettah Cobras locked down Majestic bay 4 — fight your way clear!"',
    briefingKn: 'ಹಳೆಯ ನಗರ ದಲ್ಲಾಳಿ: "ಇದು ಬಲೆ! ಮೆಜೆಸ್ಟಿಕ್ ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ಪೇಟೆ ಕೋಬ್ರಾಗಳು ಸುತ್ತುವರಿದಿದ್ದಾರೆ!"',
    briefingHi: 'ओल्ड सिटी ब्रोकर: "ये जाल है! मैजेस्टिक बस टर्मिनल में पेट्टा कोब्राज़ ने घेर लिया है!"'
  },
  {
    id: 'm3_lalbagh_standoff',
    index: 3,
    title: 'Lalbagh Glasshouse Standoff',
    zone: 'old_city',
    locationName: 'Lalbagh Botanical Glasshouse',
    lat: 12.9507,
    lon: 77.5844,
    type: 'combat',
    description: 'A misty night parley at Lalbagh Glasshouse erupted into gunfire. Neutralize the rival enforcers.',
    enemyWave: ['shooter', 'shooter', 'shooter', 'brute', 'grunt'],
    rewardCash: 3400,
    rewardRespect: 280,
    briefingEn: 'Rival Enforcer: "No peace in Basavanagudi! Take cover behind the Glasshouse arches!"',
    briefingKn: 'ವಿರೋಧಿ: "ಲಾಲ್‌ಬಾಗ್ ಗ್ಲಾಸ್ ಹೌಸ್ ಹತ್ತಿರ ಯಾರೂ ಬದುಕಿ ಹೋಗಬಾರದು!"',
    briefingHi: 'दुश्मन: "लालबाग ग्लासहाउस में कोई समझौता नहीं होगा! कवर लो!"'
  },
  {
    id: 'm4_silk_board_escape',
    index: 4,
    title: 'Silk Board Gridlock Escape',
    zone: 'south',
    locationName: 'Silk Board Junction',
    lat: 12.9178,
    lon: 77.6232,
    targetLat: 12.9278,
    targetLon: 77.5855,
    type: 'chase',
    description: 'Grab the street bike at Silk Board Junction and weave through gridlock to the Jayanagar 4th Block Safehouse!',
    enemyWave: ['grunt', 'shooter', 'shooter'],
    rewardCash: 3800,
    rewardRespect: 320,
    wantedTrigger: 110,
    spawnBike: true,
    briefingEn: 'Fixer Contact: "Silk Board is jam-packed! Grab the 250cc bike, split lanes past the autos, and reach Jayanagar Safehouse!"',
    briefingKn: 'ಸಂಪರ್ಕ: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಫುಲ್ ಟ್ರಾಫಿಕ್ ಜಾಮ್! ಬೈಕ್ ತಗೊಂಡು ಜಯನಗರ ಸೇಫ್‌ಹೌಸ್ ತಲುಪಿ!"',
    briefingHi: 'कॉन्टैक्ट: "सिल्क बोर्ड पूरा जाम है! बाइक पकड़ो, ऑटो के बीच से निकलकर जयनगर सेफहाउस पहुंचो!"'
  },
  {
    id: 'm5_indiranagar_vipers',
    index: 5,
    title: '100ft Road Neon Showdown',
    zone: 'east',
    locationName: '100 Feet Road Indiranagar',
    lat: 12.9782,
    lon: 77.6406,
    type: 'combat',
    description: 'Take down the 100ft Neon Vipers protecting their Indiranagar nightlife rackets and claim East Bengaluru.',
    enemyWave: ['shooter', 'shooter', 'brute', 'shooter', 'boss'],
    rewardCash: 4800,
    rewardRespect: 400,
    briefingEn: 'Fixer Contact: "100ft Neon Vipers run the whole East corridor from Indiranagar to ITPL. Take down their lieutenant!"',
    briefingKn: 'ಸಂಪರ್ಕ: "೧೦೦ ಅಡಿ ರಸ್ತೆಯ ನಿಯಾನ್ ವೈಪರ್ಸ್ ನಾಯಕನನ್ನು ಸೋಲಿಸಿ ಪೂರ್ವ ಬೆಂಗಳೂರು ವಶಪಡಿಸಿಕೊಳ್ಳಿ!"',
    briefingHi: 'कॉन्टैक्ट: "100 फीट रोड के नियॉन वाइपर्स के लीडर को हराओ और ईस्ट बेंगलुरु पर कब्ज़ा करो!"'
  },
  {
    id: 'm6_peenya_raid',
    index: 6,
    title: 'Peenya Warehouse Stash Raid',
    zone: 'west',
    locationName: 'Peenya Industrial Area',
    lat: 13.0282,
    lon: 77.5265,
    type: 'heist',
    description: 'Storm the Peenya Iron Wolves factory warehouse, defeat their heavy guards, and seize the contraband stash.',
    enemyWave: ['grunt', 'shooter', 'brute', 'brute', 'shooter'],
    rewardCash: 5600,
    rewardRespect: 460,
    briefingEn: 'Fixer Contact: "Peenya Iron Wolves hid their cash crates inside Sector 3 sheds. Watch out for armored brutes!"',
    briefingKn: 'ಸಂಪರ್ಕ: "ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶದ ಗೋದಾಮಿನಲ್ಲಿ ಅವರ ಹಣ ಅಡಗಿದೆ. ಎಚ್ಚರಿಕೆಯಿಂದ ದಾಳಿ ಮಾಡಿ!"',
    briefingHi: 'कॉन्टैक्ट: "पीन्या इंडस्ट्रियल वेयरहाउस में उनका माल छुपा है। भारी गार्ड्स से सावधान!"'
  },
  {
    id: 'm7_hebbal_flyover',
    index: 7,
    title: 'Hebbal Flyover Pursuit',
    zone: 'north',
    locationName: 'Hebbal Flyover & Bellary Road',
    lat: 13.0358,
    lon: 77.5968,
    targetLat: 13.0068,
    targetLon: 77.5735,
    type: 'chase',
    description: 'Metro Patrol boxed you in at Hebbal Flyover! Break through the blockade and reach Sankey Tank Safehouse.',
    enemyWave: ['shooter', 'shooter', 'brute'],
    rewardCash: 6200,
    rewardRespect: 520,
    wantedTrigger: 190,
    spawnBike: true,
    briefingEn: 'Fixer Contact: "Patrol choppers and interceptors on Bellary Road! Blast off Hebbal Flyover to Sankey Tank!"',
    briefingKn: 'ಸಂಪರ್ಕ: "ಬಳ್ಳಾರಿ ರಸ್ತೆಯಲ್ಲಿ ಪೆಟ್ರೋಲ್ ತಡೆ! ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆ ದಾಟಿ ಸ್ಯಾಂಕಿ ಕೆರೆ ತಲುಪಿ!"',
    briefingHi: 'कॉन्टैक्ट: "बेल्लारी रोड पर नाकाबंदी है! हेब्बाल फ्लाईओवर से निकलकर सैंकी टैंक सेफहाउस जाओ!"'
  },
  {
    id: 'm8_ecity_heist',
    index: 8,
    title: 'Electronic City Server Heist',
    zone: 'southeast',
    locationName: 'Electronic City Phase 1',
    lat: 12.8458,
    lon: 77.6634,
    type: 'heist',
    description: 'Breach the Silicon Syndicate corporate plaza in Electronic City Phase 1 and take out the security detail.',
    enemyWave: ['shooter', 'shooter', 'shooter', 'brute', 'boss'],
    rewardCash: 7500,
    rewardRespect: 650,
    wantedTrigger: 90,
    briefingEn: 'Fixer Contact: "Silicon Syndicate keeps their ledger in Phase 1. Clear the plaza security and claim Electronic City!"',
    briefingKn: 'ಸಂಪರ್ಕ: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ಹಂತ ೧ ರಲ್ಲಿ ಸಿಲಿಕಾನ್ ಸಿಂಡಿಕೇಟ್ ಭದ್ರತೆಯನ್ನು ಭೇದಿಸಿ!"',
    briefingHi: 'कॉन्टैक्ट: "इलेक्ट्रॉनिक सिटी फेज़ 1 में सिलिकॉन सिंडिकेट के सर्वर गार्ड्स को साफ करो!"'
  },
  {
    id: 'm9_airport_finale',
    index: 9,
    title: 'Devanahalli Runway Reckoning',
    zone: 'airport',
    locationName: 'Kempegowda International Airport Cargo Road',
    lat: 13.1978,
    lon: 77.7052,
    type: 'boss',
    description: 'Final Confrontation! Intercept the Devanahalli Sky Cartel Boss before the smuggling cargo leaves Bengaluru.',
    enemyWave: ['shooter', 'shooter', 'brute', 'brute', 'boss'],
    rewardCash: 15000,
    rewardRespect: 1200,
    wantedTrigger: 180,
    briefingEn: 'Sky Cartel Boss: "You climbed all the way from MG Road to Devanahalli? Let us finish this on the runway!"',
    briefingKn: 'ಸ್ಕೈ ಕಾರ್ಟೆಲ್ ಬಾಸ್: "ಎಂ.ಜಿ. ರಸ್ತೆಯಿಂದ ದೇವನಹಳ್ಳಿ ವಿಮಾನ ನಿಲ್ದಾಣದವರೆಗೆ ಬಂದಿದ್ದೀಯಾ? ಇಲ್ಲಿಯೇ ಮುಗಿಸೋಣ!"',
    briefingHi: 'स्काई कार्टेल बॉस: "एम.जी. रोड से देवनहल्ली एयरपोर्ट तक आ गए? चलो यहीं फैसला करते हैं!"'
  }
];

export class MissionSystem {
  public completedMissions = new Set<string>();
  public ownedZones = new Set<ZoneId>();
  public activeMission: MissionDef | null = null;
  public activeStage: 'travel' | 'engage' | 'escape' = 'travel';
  public remainingEnemies = 0;

  public cash = 2500;
  public respect = 0;
  public waypoint: { x: number; z: number; label: string } | null = null;

  private beaconMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private enemies: EnemyAIManager;
  private wanted: WantedSystem;
  private vehicles: VehicleSystem;

  public onNotify?: (msg: string) => void;
  public onSubtitle?: (speaker: string, en: string, kn: string, hi: string) => void;
  public onMissionComplete?: (mission: MissionDef) => void;
  public useExternalCampaign = true;

  constructor(
    scene: THREE.Scene,
    enemies: EnemyAIManager,
    wanted: WantedSystem,
    vehicles: VehicleSystem
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.wanted = wanted;
    this.vehicles = vehicles;

    // Tall translucent golden mission beacon column visible across city streets
    const geo = new THREE.CylinderGeometry(1.6, 2.2, 65, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconMesh = new THREE.Mesh(geo, mat);
    this.beaconMesh.position.y = 32.5;
    this.beaconMesh.visible = false;
    this.scene.add(this.beaconMesh);

    if (!this.useExternalCampaign) {
      this.startNextMission();
    }
  }

  public startNextMission(): void {
    const next = STORY_MISSIONS.find((m) => !this.completedMissions.has(m.id));
    if (!next) {
      this.activeMission = null;
      this.beaconMesh.visible = false;
      this.updateTrackerUI('BENGALURU CONQUERED!', 'All 8 zones belong to your crew. Free-roam Garden City or replay zones.', '100% UNDERWORLD KINGPIN');
      return;
    }
    this.startMission(next);
  }

  public startMission(m: MissionDef): void {
    if (this.activeMission) {
      this.enemies.clearMissionUnits(this.activeMission.id);
    }
    this.activeMission = m;
    this.activeStage = 'travel';
    this.remainingEnemies = m.enemyWave.length;

    const pt = latLonToWorld(m.lat, m.lon);
    this.waypoint = { x: pt.x, z: pt.z, label: m.locationName };
    this.beaconMesh.position.set(pt.x, 32.5, pt.z);
    this.beaconMesh.visible = true;

    this.onSubtitle?.('MISSION BRIEF', m.briefingEn, m.briefingKn, m.briefingHi);
    this.updateTrackerUI(
      `${m.index}. ${m.title}`,
      m.description,
      `Go to ${m.locationName} (use Vehicle or [M] Namma Metro)`
    );
  }

  public onUnitKnockedOut(missionTag?: string): void {
    if (!this.activeMission || missionTag !== this.activeMission.id) return;
    this.remainingEnemies = Math.max(0, this.remainingEnemies - 1);
    if (this.activeStage === 'engage') {
      if (this.remainingEnemies === 0) {
        this.completeActiveMission();
      } else {
        this.updateTrackerUI(
          `${this.activeMission.index}. ${this.activeMission.title}`,
          this.activeMission.description,
          `Hostiles remaining: ${this.remainingEnemies}`
        );
      }
    }
  }

  public forceCompleteActive(): void {
    if (this.activeMission) {
      this.completeActiveMission();
    }
  }

  private completeActiveMission(): void {
    const m = this.activeMission;
    if (!m) return;
    this.completedMissions.add(m.id);
    this.ownedZones.add(m.zone);
    this.cash += m.rewardCash;
    this.respect += m.rewardRespect;
    this.enemies.clearMissionUnits(m.id);
    this.beaconMesh.visible = false;

    const zDef = BENGALURU_ZONES.find((z) => z.id === m.zone);
    this.onNotify?.(`MISSION COMPLETE: ${m.title}! +₹${m.rewardCash.toLocaleString()} • +${m.rewardRespect} Respect • ${zDef?.name || m.zone}`);
    this.onMissionComplete?.(m);

    if (!this.useExternalCampaign) {
      setTimeout(() => {
        this.startNextMission();
      }, 3200);
    }
  }

  public update(dt: number, playerPos: THREE.Vector3): void {
    if (this.beaconMesh.visible) {
      this.beaconMesh.rotation.y += dt * 1.1;
    }

    const m = this.activeMission;
    if (!m) return;

    if (this.activeStage === 'travel') {
      const target = latLonToWorld(m.lat, m.lon);
      const dist = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
      this.updateTrackerUI(
        `${m.index}. ${m.title}`,
        m.description,
        `Distance to ${m.locationName}: ${dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`}`
      );

      if (dist < 62) {
        // Trigger mission encounter!
        if (m.wantedTrigger) this.wanted.reportCrime(m.wantedTrigger);
        if (m.spawnBike) {
          this.vehicles.spawnVehicle('bike', new THREE.Vector3(target.x + 4, 0.1, target.z + 4), 0, false);
        }

        if (m.type === 'chase' && m.targetLat && m.targetLon) {
          this.activeStage = 'escape';
          // Spawn pursuing wave behind player
          for (let i = 0; i < m.enemyWave.length; i++) {
            const ang = (i / m.enemyWave.length) * Math.PI * 2;
            const ep = new THREE.Vector3(target.x + Math.cos(ang) * 28, 0, target.z + Math.sin(ang) * 28);
            const u = this.enemies.spawnUnit(m.zone === 'north' ? 'police' : 'rival', m.enemyWave[i], ep, m.zone, m.id);
            u.state = 'chase';
          }
          const dest = latLonToWorld(m.targetLat, m.targetLon);
          this.waypoint = { x: dest.x, z: dest.z, label: 'Escape Safehouse' };
          this.beaconMesh.position.set(dest.x, 32.5, dest.z);
          this.onNotify?.(`${m.title}: ESCAPE TO THE GOLD BEACON!`);
        } else {
          this.activeStage = 'engage';
          this.remainingEnemies = m.enemyWave.length;
          for (let i = 0; i < m.enemyWave.length; i++) {
            const ang = (i / m.enemyWave.length) * Math.PI * 2;
            const ep = new THREE.Vector3(target.x + Math.cos(ang) * 20, 0, target.z + Math.sin(ang) * 20);
            const u = this.enemies.spawnUnit('rival', m.enemyWave[i], ep, m.zone, m.id);
            u.state = 'alert';
          }
          this.beaconMesh.visible = false;
          this.onNotify?.(`${m.title}: ELIMINATE ${this.remainingEnemies} HOSTILES!`);
          this.updateTrackerUI(
            `${m.index}. ${m.title}`,
            m.description,
            `Hostiles remaining: ${this.remainingEnemies}`
          );
        }
      }
    } else if (this.activeStage === 'escape' && m.targetLat && m.targetLon) {
      const dest = latLonToWorld(m.targetLat, m.targetLon);
      const dist = Math.hypot(playerPos.x - dest.x, playerPos.z - dest.z);
      this.updateTrackerUI(
        `${m.index}. ${m.title}`,
        'Outrun pursuers through Bengaluru traffic and reach the extraction safehouse!',
        `Extraction distance: ${dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`}`
      );
      if (dist < 48) {
        this.wanted.clearWanted();
        this.completeActiveMission();
      }
    }
  }

  private updateTrackerUI(title: string, desc: string, progress: string): void {
    const tEl = document.getElementById('hud-mission-title');
    const dEl = document.getElementById('hud-mission-desc');
    const pEl = document.getElementById('hud-mission-progress');
    if (tEl) tEl.textContent = title;
    if (dEl) dEl.textContent = desc;
    if (pEl) pEl.textContent = progress;
  }
}
