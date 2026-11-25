import * as THREE from 'three';
import { BENGALURU_LANDMARKS, latLonToWorld } from '../world/bengaluruData';

/**
 * Escalating 0-5 star Wanted system with fictional City Patrol / Tactical response
 * that pursues the player seamlessly across Bengaluru zone boundaries.
 */
export class WantedSystem {
  public stars = 0; // 0..5
  public heat = 0;  // 0..500
  public evadeTimer = 0;
  public inNoGoZone = false;

  private starEls: HTMLElement[] = [];
  private containerEl: HTMLElement | null = null;
  private yelahankaPos = latLonToWorld(
    BENGALURU_LANDMARKS.find((l) => l.id === 'yelahanka_afb')!.lat,
    BENGALURU_LANDMARKS.find((l) => l.id === 'yelahanka_afb')!.lon
  );

  public onWantedChange?: (stars: number) => void;
  public onNoGoAlert?: () => void;

  constructor() {
    this.containerEl = document.getElementById('hud-wanted');
    if (this.containerEl) {
      this.starEls = Array.from(this.containerEl.querySelectorAll('.star'));
    }
  }

  public reportCrime(heatAmount: number): void {
    const prevStars = this.stars;
    this.heat = Math.min(500, this.heat + heatAmount);
    this.evadeTimer = 0;
    this.recomputeStars();
    if (this.stars !== prevStars) {
      this.onWantedChange?.(this.stars);
    }
  }

  public clearWanted(): void {
    const prev = this.stars;
    this.heat = 0;
    this.stars = 0;
    this.evadeTimer = 0;
    this.updateDOM();
    if (prev > 0) this.onWantedChange?.(0);
  }

  private recomputeStars(): void {
    let s = 0;
    if (this.heat >= 380) s = 5;
    else if (this.heat >= 260) s = 4;
    else if (this.heat >= 160) s = 3;
    else if (this.heat >= 80) s = 2;
    else if (this.heat >= 25) s = 1;
    this.stars = s;
    this.updateDOM();
  }

  public getDesiredPoliceCount(): number {
    if (this.stars === 0) return 0;
    return Math.min(10, this.stars * 2);
  }

  public update(dt: number, playerPos: THREE.Vector3, policeHasLineOfSight: boolean): void {
    // Check Yelahanka Air Force restricted no-go zone
    const dAirfield = Math.hypot(playerPos.x - this.yelahankaPos.x, playerPos.z - this.yelahankaPos.z);
    const insideNoGo = dAirfield < 520;
    if (insideNoGo && !this.inNoGoZone) {
      this.inNoGoZone = true;
      this.heat = Math.max(this.heat, 280);
      this.recomputeStars();
      this.onNoGoAlert?.();
    } else if (!insideNoGo) {
      this.inNoGoZone = false;
    }

    if (this.heat > 0) {
      if (policeHasLineOfSight) {
        this.evadeTimer = 0;
      } else {
        this.evadeTimer += dt;
        // Cool down after evading patrol sightlines for 9 seconds
        if (this.evadeTimer > 9) {
          const prev = this.stars;
          this.heat = Math.max(0, this.heat - dt * 18);
          this.recomputeStars();
          if (this.stars !== prev) this.onWantedChange?.(this.stars);
        }
      }
    }

    if (this.containerEl) {
      this.containerEl.classList.toggle('flashing', this.stars > 0 && policeHasLineOfSight);
    }
  }

  private updateDOM(): void {
    this.starEls.forEach((el, idx) => {
      el.classList.toggle('active', idx < this.stars);
    });
  }
}
