import { RadioStation } from '../vehicles/VehicleSystem';
import { WeaponId } from '../combat/WeaponSystem';

/**
 * 100% Procedural Web Audio API Soundscape for Bengaluru:
 * - Monsoon rain on tin roofs + rolling thunder
 * - Auto-rickshaw dual-tone horns & bus air horns
 * - Distant temple bells near sacred safe zones + calm harmonic drone
 * - Bengaluru morning/dusk crow calls & Namma Metro chime
 * - Weapon fire, melee thuds, hit confirm ticks, police sirens, vehicle engines, FM Radio groove
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private rainGain!: GainNode;
  private engineOsc!: OscillatorNode;
  private engineGain!: GainNode;
  private sirenOsc!: OscillatorNode;
  private sirenGain!: GainNode;

  public volume = 0.75;
  private initialized = false;
  private ambientTimer = 4;
  private radioStepTimer = 0;
  private radioStep = 0;
  private railClackTimer = 0;

  public init(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    // 1. Continuous Monsoon Rain on Tin Roof (filtered pink-ish noise buffer)
    const bufLen = this.ctx.sampleRate * 2;
    const rainBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = rainBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.14) * 0.45;
    }
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1450; // Metallic tin-roof rain sheen
    rainFilter.Q.value = 0.7;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.04;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSrc.start();

    // 2. Vehicle Engine Synth
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;
    const engFilter = this.ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 260;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(engFilter);
    engFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();

    // 3. Police Siren Synth
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 620;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();

    this.initialized = true;
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public playGunshot(weaponId: WeaponId, volumeScale = 1.0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (weaponId === 'silenced_pistol') {
      // Crisp suppressed "thwip" shot
      const dur = 0.08;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.22));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(2400, t);
      filt.frequency.exponentialRampToValueAtTime(520, t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18 * volumeScale, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      noise.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain);
      noise.start(t);
      return;
    }

    // White noise punch tailored per weapon class
    const dur =
      weaponId === 'sniper' ? 0.34 :
      weaponId === 'launcher' ? 0.26 :
      weaponId === 'shotgun' || weaponId === 'deagle' ? 0.24 :
      weaponId === 'rifle' || weaponId === 'lmg' ? 0.16 : 0.11;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.28));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startFreq =
      weaponId === 'launcher' ? 680 :
      weaponId === 'shotgun' ? 1100 :
      weaponId === 'deagle' ? 1450 :
      weaponId === 'sniper' ? 3200 :
      weaponId === 'smg' || weaponId === 'dual_uzi' ? 2900 : 1900;
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + dur);

    const g = this.ctx.createGain();
    const loud = weaponId === 'sniper' || weaponId === 'deagle' ? 0.46 : 0.36;
    g.gain.setValueAtTime(loud * volumeScale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(t);

    // Low bass thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const bassStart = weaponId === 'launcher' ? 95 : weaponId === 'deagle' || weaponId === 'sniper' ? 115 : weaponId === 'shotgun' ? 130 : 180;
    osc.frequency.setValueAtTime(bassStart, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + (weaponId === 'sniper' ? 0.16 : 0.09));
    const og = this.ctx.createGain();
    og.gain.setValueAtTime((weaponId === 'launcher' || weaponId === 'deagle' || weaponId === 'sniper' ? 0.42 : 0.3) * volumeScale, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + (weaponId === 'sniper' ? 0.17 : 0.095));
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playExplosion(distance = 0): void {
    if (!this.ctx) return;
    const atten = Math.max(0.08, 1 - distance / 140);
    const t = this.ctx.currentTime;
    const dur = 0.72;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.32));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(780, t);
    filt.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.62 * atten, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filt);
    filt.connect(g);
    g.connect(this.masterGain);
    noise.start(t);

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(92, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.45);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.55 * atten, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    sub.connect(sg);
    sg.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.5);
  }

  public playMeleeSwing(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.11);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playHitMarker(headshot: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(headshot ? 1480 : 920, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.065);
  }

  public playVehicleCrash(
    intensity: number,
    kind: 'vehicle' | 'building' | 'person' = 'vehicle',
    distance = 0
  ): void {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const power = Math.max(0.18, Math.min(1, intensity));
    const atten = Math.max(0.06, 1 - distance / 85);
    const gainScale = power * atten;
    const t = this.ctx.currentTime;

    // 1. Heavy low-end chassis thump / bumper impact
    const thud = this.ctx.createOscillator();
    thud.type = kind === 'person' ? 'sine' : 'triangle';
    thud.frequency.setValueAtTime(kind === 'person' ? 115 : 135 + power * 45, t);
    thud.frequency.exponentialRampToValueAtTime(28, t + 0.14 + power * 0.12);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime((kind === 'person' ? 0.34 : 0.46) * gainScale, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16 + power * 0.14);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(t);
    thud.stop(t + 0.32);

    // 2. Metal crunch & bumper scrape (filtered noisy impact burst)
    const crunchDur = kind === 'person' ? 0.12 : 0.2 + power * 0.28;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * crunchDur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp(-i / (data.length * (0.24 + power * 0.18)));
      // Add jagged crunch spikes for sheet-metal crumple texture
      const grit = Math.sin(i * 0.19) * 0.35 + (Math.random() * 2 - 1);
      data[i] = Math.max(-1, Math.min(1, grit * 0.85)) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(kind === 'building' ? 1200 : kind === 'person' ? 520 : 1650, t);
    filt.frequency.exponentialRampToValueAtTime(220, t + crunchDur);
    filt.Q.value = kind === 'vehicle' ? 1.15 : 0.85;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime((kind === 'person' ? 0.22 : 0.44) * gainScale, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + crunchDur);
    noise.connect(filt);
    filt.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(t);

    // 3. Metallic fender clang partials (especially audible on vehicle-to-vehicle touch)
    if (kind !== 'person') {
      const partials = kind === 'vehicle'
        ? [[410, 0.16], [685, 0.12], [1180, 0.08]]
        : [[280, 0.14], [510, 0.09]];
      for (const [hz, amp] of partials) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        const jitter = 0.94 + Math.random() * 0.12;
        osc.frequency.setValueAtTime(hz * jitter, t);
        osc.frequency.exponentialRampToValueAtTime(hz * 0.72 * jitter, t + 0.16 + power * 0.14);

        const pFilt = this.ctx.createBiquadFilter();
        pFilt.type = 'bandpass';
        pFilt.frequency.value = hz * 1.1;
        pFilt.Q.value = 3.2;

        const pg = this.ctx.createGain();
        pg.gain.setValueAtTime(amp * gainScale, t);
        pg.gain.exponentialRampToValueAtTime(0.0008, t + 0.16 + power * 0.16);
        osc.connect(pFilt);
        pFilt.connect(pg);
        pg.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.34);
      }
    }

    // 4. Headlight / windshield glass crackle on medium-to-heavy crashes
    if (kind !== 'person' && power >= 0.42) {
      const shards = power > 0.75 ? 5 : 3;
      for (let i = 0; i < shards; i++) {
        const off = 0.025 + i * 0.032 + Math.random() * 0.02;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2800 + Math.random() * 2800, t + off);
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(0.065 * gainScale, t + off);
        sg.gain.exponentialRampToValueAtTime(0.0005, t + off + 0.075);
        osc.connect(sg);
        sg.connect(this.masterGain);
        osc.start(t + off);
        osc.stop(t + off + 0.08);
      }
    }
  }

  public playHorn(kind: string, distance = 0): void {
    if (!this.ctx) return;
    const atten = Math.max(0.03, 1 - distance / 80);
    const t = this.ctx.currentTime;
    const baseHz = kind === 'bus' || kind === 'truck' ? 210 : kind === 'auto' ? 480 : 390;

    // Authentic Indian street double-honk ("peep-peep!")
    for (const offset of [0, 0.14]) {
      const osc = this.ctx.createOscillator();
      osc.type = kind === 'auto' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(baseHz, t + offset);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = baseHz * 1.6;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.09 * atten, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    }
  }

  public playMetroChime(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Pleasant Namma Metro announcement arpeggio
    notes.forEach((hz, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t + i * 0.12);
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.14, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.38);
    });
  }

  private playTempleBell(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Distant serene bronze temple bell partials
    for (const [hz, amp] of [[528, 0.045], [1056, 0.025], [1590, 0.014]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 2.4);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 2.5);
    }
  }

  private playCrowCall(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const off of [0, 0.24]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(760, t + off);
      osc.frequency.linearRampToValueAtTime(520, t + off + 0.14);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.028, t + off);
      g.gain.exponentialRampToValueAtTime(0.0008, t + off + 0.16);
      osc.connect(f);
      f.connect(g);
      g.connect(this.masterGain);
      osc.start(t + off);
      osc.stop(t + off + 0.17);
    }
  }

  public update(
    dt: number,
    rainIntensity: number,
    inVehicle: boolean,
    vehicleSpeedKmh: number,
    vehicleKind: string,
    wantedStars: number,
    nearSafeZone: boolean,
    radio: RadioStation,
    inMetro = false,
    metroSpeedKmh = 0
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Scale monsoon tin-roof rain sound smoothly
    this.rainGain.gain.setTargetAtTime(0.015 + rainIntensity * 0.22, t, 0.2);

    // Vehicle engine hum OR Namma Metro electric traction hum + rail clack!
    if (inMetro) {
      const metroHz = 82 + metroSpeedKmh * 1.35;
      this.engineOsc.frequency.setTargetAtTime(metroHz, t, 0.1);
      this.engineGain.gain.setTargetAtTime(metroSpeedKmh > 2 ? 0.048 : 0.012, t, 0.12);
      if (metroSpeedKmh > 12) {
        this.railClackTimer -= dt;
        if (this.railClackTimer <= 0) {
          this.railClackTimer = Math.max(0.28, 1.35 - metroSpeedKmh * 0.008);
          this.playRailClack();
        }
      }
    } else if (inVehicle) {
      const baseFreq = vehicleKind === 'auto' ? 78 : vehicleKind === 'bike' ? 92 : 55;
      const freq = baseFreq + vehicleSpeedKmh * (vehicleKind === 'bike' ? 1.85 : 1.15);
      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
      this.engineGain.gain.setTargetAtTime(0.065 + Math.min(0.06, vehicleSpeedKmh * 0.0005), t, 0.08);

      // Fictional Bengaluru FM Radio procedural synth groove!
      if (radio.bpm > 0) {
        const stepDur = 60 / radio.bpm / 2;
        this.radioStepTimer -= dt;
        if (this.radioStepTimer <= 0) {
          this.radioStepTimer = stepDur;
          this.playRadioBeat(radio, this.radioStep++);
        }
      }
    } else {
      this.engineGain.gain.setTargetAtTime(0.0, t, 0.1);
    }

    // Distant Patrol siren oscillation when wanted
    if (wantedStars > 0) {
      const wail = 660 + Math.sin(t * 5.2) * 190;
      this.sirenOsc.frequency.setTargetAtTime(wail, t, 0.04);
      this.sirenGain.gain.setTargetAtTime(0.018 + wantedStars * 0.008, t, 0.15);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.15);
    }

    // Authentic Bengaluru ambient touches: temple bells near sacred zones, crows, distant traffic horns
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 6 + Math.random() * 9;
      if (nearSafeZone) {
        this.playTempleBell();
      } else {
        const r = Math.random();
        if (r < 0.35) this.playCrowCall();
        else if (r < 0.72) this.playHorn('auto', 42);
        else this.playTempleBell();
      }
    }
  }

  private playRailClack(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Rhythmic double "ka-chunk" rail joint sound
    for (const off of [0, 0.09]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t + off);
      osc.frequency.exponentialRampToValueAtTime(48, t + off + 0.055);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.065, t + off);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.06);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t + off);
      osc.stop(t + off + 0.065);
    }
  }

  private playRadioBeat(radio: RadioStation, step: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const scale = [1, 1.125, 1.2, 1.5, 1.667, 1.875]; // Raga-inflected minor pentatonic groove
    const note = radio.rootHz * scale[(step * 3 + (step >> 2)) % scale.length];

    // Soft synth pluck / tabla pulse
    const osc = this.ctx.createOscillator();
    osc.type = step % 4 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(step % 4 === 0 ? radio.rootHz * 0.5 : note * 2, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(step % 4 === 0 ? 0.055 : 0.025, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.19);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}
