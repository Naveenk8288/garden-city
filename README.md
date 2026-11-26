# Garden City Underworld

**Play Live:** [GitHub Pages](https://naveenk8288.github.io/garden-city/) • [Vercel](https://garden-city-underworld.vercel.app/)

A 3D open-world gangster action game set in a monsoon-lit recreation of **Bengaluru (Bangalore), India**, built with **Vite + Three.js (WebGL2) + Rapier3D (WASM)** and real **OpenStreetMap** geometry streamed in chunked GeoJSON tiles.

> All gangs, characters, story missions, shop names, radio stations, and brands are **100% fictional and original**. Temples, mosques, and churches are automatically detected from OpenStreetMap and enforced as **Sacred Safe Zones** where combat is disabled.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a WebGL2-capable browser.

### Optional: Re-fetching OpenStreetMap Data

Pre-processed chunked GeoJSON tiles for all 8 Bengaluru zones, highway corridors, and Namma Metro lines are already included in `public/map-data/`. To re-fetch fresh OSM data:

```bash
npm run osm:central   # Central zone + Namma Metro + major highway corridors
npm run osm:all       # All 8 Bengaluru zones + Metro + corridors
```

## Supported Platforms, Browsers & Minimum Specifications

Garden City Underworld runs from a single codebase across **Android phones & tablets**, **MacBooks & Macs (Apple Silicon & Intel)**, and **Windows 10/11 laptops & desktops**. On first launch, a 5-second GPU & refresh-rate benchmark automatically selects the best quality tier (overridable anytime in `Esc` → Settings).

### Supported Browsers
- **Chrome 100+**, **Edge 100+**, **Safari 16.4+**, **Firefox 110+**, and **Android Chrome / WebView**
- **WebGL2 is required** (a friendly fallback screen is shown if unavailable). **WebGPU** is strictly optional and always falls back to WebGL2.

### Quality Tiers & Hardware Spec Matrix

| Tier | Target FPS & Resolution | Example Hardware (Minimum / Target) | Render / Effect Profile |
|---|---|---|---|
| **LITE** | 30 FPS @ 720p-eq | 3 GB RAM Android phones; Intel UHD 620 / AMD Vega 3 laptops (8 GB RAM) | DPR cap `2`, 1024 shadows, 1.2 km draw dist, 3×3 chunks, 10 traffic / 10 NPCs, 512px textures, tone mapping only, 16 audio voices |
| **MEDIUM** | 45–60 FPS @ 1080p-eq | Mid-range Android phones; Intel Iris Xe, Radeon 680M, MacBook Air Intel, GTX 1650 | DPR cap `2` (incl. MacBook Retina), 2048 shadows, 2.1 km draw dist, 5×5 chunks, 20 traffic / 18 NPCs, 1024px textures, half-res bloom, 24 audio voices |
| **HIGH** | 60 FPS (120 FPS on ProMotion / high-Hz) | Flagship phones; Apple M1/M2/M3/M4; RTX 3050+, Radeon RX 6600+ | DPR cap `3` (HIGH phones only) / `2` desktop, 4096 shadows, 3.2 km draw dist, 5×5 chunks, 34 traffic / 28 NPCs, 2048px textures, full post + desktop-only reflections, 32 audio voices |

### Performance & Laptop Power Features
- **Dynamic Resolution Scaling (DRS):** Automatically scales resolution down to `0.6x` if FPS drops below target for 2 seconds and recovers when frame times stabilize.
- **Fixed-Timestep Physics & Frame Limiter:** Physics runs at a fixed `60 Hz` accumulator so game speed is identical on 30, 60, 120, and 144 Hz screens; frame rate can be capped to `30`, `60`, `120`, or `Uncapped`.
- **Battery & Thermal Protection:** Detects battery state where supported, offers **Power Saver** (`30 FPS + LITE`), and automatically steps down one tier after 10 minutes of sustained thermal frame-time rise.
- **Hybrid GPU Tip (Windows & older Intel Macs):** The WebGL2 context requests `powerPreference: "high-performance"`. On dual-GPU Windows laptops, set your browser to **High Performance** in *Windows Settings → System → Display → Graphics*. On Intel MacBooks, disable *Automatic Graphics Switching* in Battery settings.

## Controls

| Action | Key / Input |
|---|---|
| Move / Steer | `W A S D` / Left Stick |
| Sprint | `Shift` |
| Jump / Vault / Handbrake Drift | `Space` |
| Crouch / Cover Snap | `C` |
| Combat Roll / Dodge | `Double-tap C` / `Alt` / `Ctrl` |
| Look / Aim Camera | `Mouse` / Right Stick |
| Shoot / Melee Combo | `LMB` / Right Trigger |
| Aim Down Sights / Melee Block | `RMB` / Left Trigger |
| Reload | `R` |
| Enter Vehicle / Safehouse / Shop | `E` (rebindable to `F` in Settings) |
| Weapon Wheel / Quick Equip | Hold `Q` or press `1`–`8` |
| Vehicle Horn / FM Radio Station | `H` / `X` |
| Full Bengaluru Turf & Transit Map | `Tab` |
| Namma Metro Fast Travel | `M` |
| Pause & Settings | `Esc` |

## Map Attribution

Real road geometry, building footprints, parks, lakes, places of worship, and Namma Metro routes are sourced from OpenStreetMap:

**© OpenStreetMap contributors** (ODbL 1.0)
