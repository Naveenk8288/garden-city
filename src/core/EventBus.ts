import type { ZoneId } from '../world/bengaluruData';
import type { WeaponId } from '../combat/WeaponSystem';

export type GameEventMap = {
  'weapon:drawn': { weaponId: WeaponId; name: string };
  'weapon:holstered': { weaponId: WeaponId };
  'chapter:started': { chapterIndex: number; chapterId: string; zone: ZoneId; title: string };
  'chapter:completed': { chapterIndex: number; chapterId: string; zone: ZoneId };
  'mission:started': { missionId: string; chapterId: string; title: string; zone: ZoneId };
  'mission:completed': { missionId: string; chapterId: string; rewardCash: number; rewardRespect: number };
  'dialogue:opened': { dialogueId: string; speaker: string };
  'dialogue:choice': { dialogueId: string; choiceId: string; alignment: 'loyalty' | 'power' | 'neutral'; deltaLoyalty: number; deltaPower: number };
  'dialogue:closed': { dialogueId: string };
  'cutscene:started': { cutsceneId: string; title: string };
  'cutscene:ended': { cutsceneId: string; skipped: boolean };
  'reputation:changed': { loyalty: number; power: number; respect: number };
  'ending:triggered': { ending: 'loyalty' | 'power'; title: string };
  'economy:cash': { delta: number; total: number; reason: string };
  'debug:teleport': { zone: ZoneId };
  'quality:changed': { tier: 'lite' | 'medium' | 'high'; renderScale: number; reason: string };
  'quality:drs': { renderScale: number; fps: number };
  'quality:thermal': { previousTier: string; nextTier: string; avgFrameMs: number };
  'quality:battery': { level: number; charging: boolean; suggestedPowerSaver: boolean };
};

type Listener<T> = (payload: T) => void;

/**
 * Lightweight typed Pub/Sub EventBus connecting modular game phases
 * (Story, Crew, Heists, Customization, Weather, Save/Load, Debug) cleanly.
 */
export class EventBus {
  private listeners = new Map<keyof GameEventMap, Set<Listener<any>>>();

  public on<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => this.off(event, fn);
  }

  public off<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): void {
    this.listeners.get(event)?.delete(fn);
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${String(event)}":`, err);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const gameBus = new EventBus();
