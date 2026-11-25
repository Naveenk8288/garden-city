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
