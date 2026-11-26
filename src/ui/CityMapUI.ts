import { clearChildren, el } from '../security/SafeDOM';
import {
  BENGALURU_LANDMARKS,
  BENGALURU_ZONES,
  NAMMA_METRO_STATIONS
} from '../world/bengaluruData';
import { ChunkStreamer } from '../world/ChunkStreamer';
import { MissionSystem } from '../missions/MissionSystem';

/**
 * Interactive Full-City Bengaluru Turf & Transit Map (Tab).
 * Renders real OSM highway corridors, Namma Metro Purple & Green lines,
 * all 8 turf zones with ownership colors, landmarks, safehouses, and live player pin.
 */
export class CityMapUI {
  public isOpen = false;
  private modalEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private listEl: HTMLElement;

  // Greater Bengaluru lat/lon map bounds
  private minLat = 12.825;
  private maxLat = 13.220;
  private minLon = 77.475;
  private maxLon = 77.775;

  public onFastTravel?: (lat: number, lon: number, label: string) => void;

  constructor() {
    this.modalEl = document.getElementById('city-map-modal')!;
    this.canvas = document.getElementById('city-map-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.listEl = document.getElementById('map-zone-list')!;

    document.getElementById('btn-close-map')?.addEventListener('click', () => {
      this.setOpen(false);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      const my = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
      // Check if user clicked a zone safehouse or metro station
      for (const z of BENGALURU_ZONES) {
        const pt = this.latLonToPx(z.safehouseLat, z.safehouseLon);
        if (Math.hypot(mx - pt.x, my - pt.y) < 18) {
          this.onFastTravel?.(z.safehouseLat, z.safehouseLon, z.safehouseName);
          this.setOpen(false);
          return;
        }
      }
      for (const st of NAMMA_METRO_STATIONS) {
        const pt = this.latLonToPx(st.lat, st.lon);
        if (Math.hypot(mx - pt.x, my - pt.y) < 12) {
          this.onFastTravel?.(st.lat, st.lon, `Metro: ${st.name}`);
          this.setOpen(false);
          return;
        }
      }
    });
  }

  private latLonToPx(lat: number, lon: number): { x: number; y: number } {
    const pad = 26;
    const u = (lon - this.minLon) / (this.maxLon - this.minLon);
    const v = 1 - (lat - this.minLat) / (this.maxLat - this.minLat);
    return {
      x: pad + u * (this.canvas.width - pad * 2),
      y: pad + v * (this.canvas.height - pad * 2)
    };
  }

  public setOpen(open: boolean, streamer?: ChunkStreamer, missions?: MissionSystem, playerLatLon?: { lat: number; lon: number }): void {
    this.isOpen = open;
    this.modalEl.classList.toggle('hidden', !open);
    if (open && streamer && missions && playerLatLon) {
      this.render(streamer, missions, playerLatLon);
    }
  }

  public render(
    streamer: ChunkStreamer,
    missions: MissionSystem,
    playerLatLon: { lat: number; lon: number }
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#070d17';
    ctx.fillRect(0, 0, w, h);

    // Subtle map grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 1. Zone Turf Circles (Player Gold vs Rival Crew Color)
    for (const z of BENGALURU_ZONES) {
      const pt = this.latLonToPx(z.centerLat, z.centerLon);
      const owned = missions.ownedZones.has(z.id);
      const color = owned ? '#facc15' : z.crewColor;
      const rPx = Math.max(26, (z.radiusMeters / 42000) * h * 1.15);

      ctx.fillStyle = `${color}28`;
      ctx.strokeStyle = `${color}aa`;
      ctx.lineWidth = owned ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Real OSM Major Highway Corridors (ORR, Hosur Rd, Bellary Rd, Tumkur Rd, MG Rd, etc.)
    const corridors = streamer.corridorGeoJSON?.features || [];
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.36)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (const f of corridors) {
      if (f.geometry.type !== 'LineString') continue;
      const coords: [number, number][] = f.geometry.coordinates;
      if (coords.length < 2) continue;
      const p0 = this.latLonToPx(coords[0][1], coords[0][0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < coords.length; i++) {
        const pi = this.latLonToPx(coords[i][1], coords[i][0]);
        ctx.lineTo(pi.x, pi.y);
      }
    }
    ctx.stroke();

    // 3. Real OSM Namma Metro Lines (Purple & Green)
    const metro = streamer.metroGeoJSON?.features || [];
    for (const line of ['purple', 'green']) {
      ctx.strokeStyle = line === 'purple' ? '#a855f7' : '#22c55e';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (const f of metro) {
        if (f.properties.kind !== 'metro_track' || f.properties.line !== line) continue;
        const coords: [number, number][] = f.geometry.coordinates;
        if (coords.length < 2) continue;
        const p0 = this.latLonToPx(coords[0][1], coords[0][0]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < coords.length; i++) {
          const pi = this.latLonToPx(coords[i][1], coords[i][0]);
          ctx.lineTo(pi.x, pi.y);
        }
      }
      ctx.stroke();
    }

    // 4. Metro Stations
    for (const st of NAMMA_METRO_STATIONS) {
      const p = this.latLonToPx(st.lat, st.lon);
      ctx.fillStyle = st.line === 'green' ? '#22c55e' : st.line === 'interchange' ? '#facc15' : '#a855f7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, st.line === 'interchange' ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Key Landmarks & Safe Zones
    ctx.font = '600 10px Inter, sans-serif';
    for (const lm of BENGALURU_LANDMARKS) {
      const p = this.latLonToPx(lm.lat, lm.lon);
      if (lm.kind === 'safe_zone') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      } else if (lm.kind === 'nogo') {
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ff6b81';
        ctx.fillText('NO-GO AIRFIELD', p.x + 14, p.y + 3);
      }
    }

    // 6. Zone Labels & Safehouse Pins
    ctx.font = '700 11px Rajdhani, sans-serif';
    for (const z of BENGALURU_ZONES) {
      const pt = this.latLonToPx(z.centerLat, z.centerLon);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(z.name.toUpperCase(), pt.x - 24, pt.y - 8);

      const sh = this.latLonToPx(z.safehouseLat, z.safehouseLon);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sh.x - 4, sh.y - 4, 8, 8);
    }

    // 7. Active Mission Beacon
    if (missions.activeMission) {
      const m = missions.activeMission;
      const mp = this.latLonToPx(m.lat, m.lon);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.fillText(`★ ${m.title}`, mp.x + 12, mp.y + 4);
    }

    // 8. Live Player Marker
    const pp = this.latLonToPx(playerLatLon.lat, playerLatLon.lon);
    ctx.fillStyle = '#38e8ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Populate Sidebar Zone Cards (Click to fast-travel to zone safehouse!)
    clearChildren(this.listEl);
    for (const z of BENGALURU_ZONES) {
      const owned = missions.ownedZones.has(z.id);
      const card = el(
        'div',
        {
          className: 'zone-card',
          style: { borderLeftColor: owned ? '#facc15' : z.crewColor },
          onClick: () => {
            this.onFastTravel?.(z.safehouseLat, z.safehouseLon, z.safehouseName);
            this.setOpen(false);
          }
        },
        el(
          'div',
          { className: 'zone-card-title' },
          el('span', {}, `${z.name} `, el('small', { text: z.nameKn, style: { color: '#ffd599' } })),
          el('span', { text: owned ? 'OWNED' : z.crewName, style: { color: owned ? '#4cd137' : '#ff6b6b' } })
        ),
        el('div', { className: 'zone-card-sub', text: z.description }),
        el('div', {
          className: 'zone-card-sub',
          text: `Click to fast-travel → ${z.safehouseName}`,
          style: { color: '#38e8ff', marginTop: '4px' }
        })
      );
      this.listEl.appendChild(card);
    }
  }
}
