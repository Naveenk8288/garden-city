import { gameBus } from '../core/EventBus';
import { gdIconHTML, GD_PALETTE } from '../ui/GDIcon';
import { ZoneId } from '../world/bengaluruData';
import {
  CAMPAIGN_CHAPTERS,
  CampaignChapterDef,
  ChapterMissionDef,
  DialogueChoice,
  STORY_CHARACTERS,
  STORY_ENDINGS,
  StoryLanguage
} from './StoryData';
import { DialogueSystem } from './DialogueSystem';
import { CutsceneManager } from './CutsceneManager';

export interface CampaignStateSnapshot {
  completedMissionIds: string[];
  completedChapterIds: string[];
  loyalty: number;
  power: number;
  flags: string[];
  endingUnlocked: 'loyalty' | 'power' | null;
}

const CAMPAIGN_SAVE_KEY = 'garden_city_campaign_phase_a_v1';

/**
 * Pure state machine & UI controller for Phase A:
 * - 8 Chapters (one per Bengaluru zone), 24 missions + 8 zone bosses
 * - Tracks Loyalty vs. Power choices, story flags, and determines Ending A vs Ending B
 * - Exposes Story Journal Modal ([J]) styled with GDIcon & Neon Palette
 */
export class CampaignManager {
  public completedMissionIds = new Set<string>();
  public completedChapterIds = new Set<string>();
  public flags = new Set<string>();
  public loyalty = 10;
  public power = 10;
  public endingUnlocked: 'loyalty' | 'power' | null = null;
  public isJournalOpen = false;
  public language: StoryLanguage = 'en';

  private playedChapterIntros = new Set<string>();
  private modalEl: HTMLDivElement | null = null;
  private endingModalEl: HTMLDivElement | null = null;

  public onLaunchMission?: (mission: ChapterMissionDef) => void;
  public onRewardEconomy?: (cash: number, respect: number, reason: string) => void;
  public onZoneClaimed?: (zone: ZoneId) => void;
  public onSyncUIBlock?: () => void;

  private dialogue?: DialogueSystem;
  private cutscenes?: CutsceneManager;

  constructor(dialogue?: DialogueSystem, cutscenes?: CutsceneManager, mountDOM = true) {
    this.dialogue = dialogue;
    this.cutscenes = cutscenes;
    this.load();
    if (mountDOM && typeof document !== 'undefined') {
      this.createJournalDOM();
      this.createEndingDOM();
    }
  }

  public getAllMissions(): ChapterMissionDef[] {
    return CAMPAIGN_CHAPTERS.flatMap((ch) => ch.missions);
  }

  public getCurrentChapter(): CampaignChapterDef {
    for (const ch of CAMPAIGN_CHAPTERS) {
      if (!this.completedChapterIds.has(ch.id)) return ch;
    }
    return CAMPAIGN_CHAPTERS[CAMPAIGN_CHAPTERS.length - 1];
  }

  public getNextMission(): ChapterMissionDef | null {
    for (const ch of CAMPAIGN_CHAPTERS) {
      for (const m of ch.missions) {
        if (!this.completedMissionIds.has(m.id)) return m;
      }
    }
    return null;
  }

  public getEndingType(): 'loyalty' | 'power' {
    return this.loyalty >= this.power ? 'loyalty' : 'power';
  }

  public setLanguage(lang: StoryLanguage): void {
    this.language = lang;
    this.dialogue?.setLanguage(lang);
    if (this.cutscenes) this.cutscenes.language = lang;
    if (this.isJournalOpen) this.renderJournal();
  }

  /**
   * Starts the next mission in the 8-chapter campaign, playing its Chapter Intro Cutscene
   * & Moral Choice Dialogue first if this is the start of a new chapter!
   */
  public startNextCampaignStep(skipIntro = false): ChapterMissionDef | null {
    const next = this.getNextMission();
    if (!next) {
      this.triggerEnding(this.getEndingType());
      return null;
    }

    const chapter = CAMPAIGN_CHAPTERS.find((c) => c.id === next.chapterId)!;
    const isFirstInChapter = chapter.missions[0].id === next.id;

    if (isFirstInChapter && !skipIntro && !this.playedChapterIntros.has(chapter.id) && this.cutscenes && this.dialogue) {
      this.playedChapterIntros.add(chapter.id);
      gameBus.emit('chapter:started', {
        chapterIndex: chapter.number,
        chapterId: chapter.id,
        zone: chapter.zone,
        title: chapter.title
      });
      this.cutscenes.play(chapter.introCutscene, () => {
        this.dialogue!.open(chapter.dialogue, (choice) => {
          if (choice) this.applyDialogueChoice(choice);
          this.launchMissionInternal(next);
          this.onSyncUIBlock?.();
        });
        this.onSyncUIBlock?.();
      });
      this.onSyncUIBlock?.();
      return next;
    }

    this.launchMissionInternal(next);
    return next;
  }

  private launchMissionInternal(m: ChapterMissionDef): void {
    gameBus.emit('mission:started', {
      missionId: m.id,
      chapterId: m.chapterId,
      title: m.title,
      zone: m.zone
    });
    this.onLaunchMission?.(m);
  }

  public applyDialogueChoice(choice: DialogueChoice): void {
    this.loyalty = Math.max(0, this.loyalty + choice.deltaLoyalty);
    this.power = Math.max(0, this.power + choice.deltaPower);
    if (choice.setsFlag) this.flags.add(choice.setsFlag);
    if (choice.deltaCash || choice.deltaRespect) {
      this.onRewardEconomy?.(choice.deltaCash || 0, choice.deltaRespect || 0, `Story choice: ${choice.id}`);
    }
    gameBus.emit('reputation:changed', {
      loyalty: this.loyalty,
      power: this.power,
      respect: choice.deltaRespect || 0
    });
    this.save();
  }

  /**
   * Called whenever a mission finishes. Updates chapter completion, claims zone on boss defeat,
   * and triggers one of the two story endings after Chapter 8 Boss!
   */
  public recordMissionComplete(missionId: string): {
    chapterCompleted: CampaignChapterDef | null;
    endingTriggered: 'loyalty' | 'power' | null;
  } {
    const all = this.getAllMissions();
    const m = all.find((x) => x.id === missionId);
    if (!m) return { chapterCompleted: null, endingTriggered: null };

    this.completedMissionIds.add(m.id);
    gameBus.emit('mission:completed', {
      missionId: m.id,
      chapterId: m.chapterId,
      rewardCash: m.rewardCash,
      rewardRespect: m.rewardRespect
    });

    const chapter = CAMPAIGN_CHAPTERS.find((c) => c.id === m.chapterId)!;
    const allChapterDone = chapter.missions.every((cm) => this.completedMissionIds.has(cm.id));
    let chapterCompleted: CampaignChapterDef | null = null;
    let endingTriggered: 'loyalty' | 'power' | null = null;

    if (allChapterDone && !this.completedChapterIds.has(chapter.id)) {
      this.completedChapterIds.add(chapter.id);
      chapterCompleted = chapter;
      this.onZoneClaimed?.(chapter.zone);
      gameBus.emit('chapter:completed', {
        chapterIndex: chapter.number,
        chapterId: chapter.id,
        zone: chapter.zone
      });
    }

    if (this.completedChapterIds.size >= CAMPAIGN_CHAPTERS.length && !this.endingUnlocked) {
      endingTriggered = this.getEndingType();
      this.endingUnlocked = endingTriggered;
    }

    this.save();
    if (this.isJournalOpen) this.renderJournal();
    return { chapterCompleted, endingTriggered };
  }

  public triggerEnding(endingType: 'loyalty' | 'power'): void {
    const def = STORY_ENDINGS[endingType];
    this.endingUnlocked = endingType;
    this.save();
    gameBus.emit('ending:triggered', { ending: endingType, title: def.title });

    if (this.cutscenes) {
      this.cutscenes.play(def.cutscene, () => {
        this.showEndingCard(endingType);
        this.onSyncUIBlock?.();
      });
      this.onSyncUIBlock?.();
    } else {
      this.showEndingCard(endingType);
    }
  }

  public toggleJournal(force?: boolean): void {
    this.isJournalOpen = force ?? !this.isJournalOpen;
    if (this.modalEl) {
      this.modalEl.classList.toggle('hidden', !this.isJournalOpen);
      if (this.isJournalOpen) this.renderJournal();
    }
    this.onSyncUIBlock?.();
  }

  public openCurrentChapterDialogue(): void {
    const ch = this.getCurrentChapter();
    this.toggleJournal(false);
    this.dialogue?.open(ch.dialogue, (choice) => {
      if (choice) this.applyDialogueChoice(choice);
      this.onSyncUIBlock?.();
    });
    this.onSyncUIBlock?.();
  }

  public playCurrentChapterCutscene(): void {
    const ch = this.getCurrentChapter();
    this.toggleJournal(false);
    this.cutscenes?.play(ch.introCutscene, () => {
      this.onSyncUIBlock?.();
    });
    this.onSyncUIBlock?.();
  }

  private createJournalDOM(): void {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'gd-story-modal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="gd-story-panel">
        <div class="panel-header">
          <div>
            <h2>${gdIconHTML('story', 22, GD_PALETTE.amber)} STORY CAMPAIGN • 8 CHAPTERS</h2>
            <span class="panel-sub">Phase A • Choices shape Loyalty vs. Power and unlock two distinct Bengaluru endings</span>
          </div>
          <button id="gd-story-close" class="btn-close">✕ [J]</button>
        </div>
        <div id="gd-rep-bar" class="gd-rep-bar"></div>
        <div class="gd-story-tabs">
          <button class="gd-stab active" data-tab="chapters">${gdIconHTML('story', 14, GD_PALETTE.cyan)} 8 CHAPTERS</button>
          <button class="gd-stab" data-tab="cast">${gdIconHTML('boss', 14, GD_PALETTE.pink)} CAST (12 CHARACTERS)</button>
        </div>
        <div id="gd-story-body" class="gd-story-body"></div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector('#gd-story-close')?.addEventListener('click', () => this.toggleJournal(false));
    this.modalEl.querySelectorAll('.gd-stab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.modalEl!.querySelectorAll('.gd-stab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderJournal((btn as HTMLElement).dataset.tab as 'chapters' | 'cast');
      });
    });
  }

  private createEndingDOM(): void {
    this.endingModalEl = document.createElement('div');
    this.endingModalEl.id = 'gd-ending-modal';
    this.endingModalEl.className = 'modal-overlay hidden';
    this.endingModalEl.innerHTML = `
      <div class="gd-ending-card">
        <div id="gd-end-kicker" class="gd-end-kicker"></div>
        <h2 id="gd-end-title"></h2>
        <p id="gd-end-body"></p>
        <div id="gd-end-stats" class="gd-end-stats"></div>
        <button id="gd-end-continue" class="gd-btn-cyan">CONTINUE FREE ROAM IN BENGALURU</button>
      </div>
    `;
    document.body.appendChild(this.endingModalEl);
    this.endingModalEl.querySelector('#gd-end-continue')?.addEventListener('click', () => {
      this.endingModalEl?.classList.add('hidden');
      this.onSyncUIBlock?.();
    });
  }

  private showEndingCard(endingType: 'loyalty' | 'power'): void {
    if (!this.endingModalEl) return;
    const def = STORY_ENDINGS[endingType];
    const kicker = this.endingModalEl.querySelector('#gd-end-kicker')!;
    const title = this.endingModalEl.querySelector('#gd-end-title')!;
    const body = this.endingModalEl.querySelector('#gd-end-body')!;
    const stats = this.endingModalEl.querySelector('#gd-end-stats')!;
    kicker.innerHTML = `${gdIconHTML(endingType === 'loyalty' ? 'loyalty' : 'power', 18, endingType === 'loyalty' ? GD_PALETTE.cyan : GD_PALETTE.pink)} ${def.subtitle}`;
    title.textContent = def.title;
    body.textContent =
      this.language === 'kn' ? `${def.epilogue.kn} (${def.epilogue.en})` :
      this.language === 'hi' ? `${def.epilogue.hi} (${def.epilogue.en})` :
      def.epilogue.en;
    stats.innerHTML = `LOYALTY: <b style="color:${GD_PALETTE.cyan}">${this.loyalty}</b> &nbsp;•&nbsp; POWER: <b style="color:${GD_PALETTE.pink}">${this.power}</b> &nbsp;•&nbsp; CHAPTERS: <b>${this.completedChapterIds.size}/8</b>`;
    this.endingModalEl.classList.remove('hidden');
  }

  private renderJournal(tab: 'chapters' | 'cast' = 'chapters'): void {
    if (!this.modalEl) return;
    const total = Math.max(1, this.loyalty + this.power);
    const lPct = Math.round((this.loyalty / total) * 100);
    const pPct = 100 - lPct;
    const predicted = this.getEndingType();

    const repEl = this.modalEl.querySelector('#gd-rep-bar')!;
    repEl.innerHTML = `
      <div class="gd-rep-labels">
        <span style="color:${GD_PALETTE.cyan}">${gdIconHTML('loyalty', 14, GD_PALETTE.cyan)} LOYALTY ${this.loyalty} (${lPct}%)</span>
        <span style="color:${GD_PALETTE.amber}">ENDING PATH: <b>${predicted === 'loyalty' ? 'PROTECTOR OF GARDEN CITY' : 'SILICON UNDERWORLD EMPEROR'}</b></span>
        <span style="color:${GD_PALETTE.pink}">POWER ${this.power} (${pPct}%) ${gdIconHTML('power', 14, GD_PALETTE.pink)}</span>
      </div>
      <div class="gd-rep-track">
        <div class="gd-rep-l" style="width:${lPct}%"></div>
        <div class="gd-rep-p" style="width:${pPct}%"></div>
      </div>
    `;

    const body = this.modalEl.querySelector('#gd-story-body')!;
    body.innerHTML = '';

    if (tab === 'cast') {
      const grid = document.createElement('div');
      grid.className = 'gd-cast-grid';
      for (const c of STORY_CHARACTERS) {
        const card = document.createElement('div');
        card.className = 'gd-cast-card';
        card.style.borderLeftColor = c.accentColor;
        const bio = this.language === 'kn' ? c.bio.kn : this.language === 'hi' ? c.bio.hi : c.bio.en;
        card.innerHTML = `
          <div class="gd-cast-role" style="color:${c.accentColor}">${c.roleLabel}</div>
          <div class="gd-cast-name">${c.name} <small>"${c.alias}"</small></div>
          <div class="gd-cast-bio">${bio}</div>
        `;
        grid.appendChild(card);
      }
      body.appendChild(grid);
      return;
    }

    const list = document.createElement('div');
    list.className = 'gd-chapter-grid';
    for (const ch of CAMPAIGN_CHAPTERS) {
      const doneCount = ch.missions.filter((m) => this.completedMissionIds.has(m.id)).length;
      const done = this.completedChapterIds.has(ch.id);
      const boss = STORY_CHARACTERS.find((c) => c.id === ch.bossId);
      const card = document.createElement('div');
      card.className = `gd-chapter-card${done ? ' done' : ''}`;
      card.innerHTML = `
        <div class="gd-ch-top">
          <span class="gd-ch-num">CH ${ch.number} • ${ch.zone.toUpperCase()}</span>
          <span class="gd-ch-prog">${done ? '✓ CLAIMED' : `${doneCount}/${ch.missions.length} MISSIONS`}</span>
        </div>
        <div class="gd-ch-title">${ch.title}</div>
        <div class="gd-ch-kn">${ch.titleKn}</div>
        <div class="gd-ch-boss">${gdIconHTML('boss', 13, GD_PALETTE.pink)} Boss: ${boss?.name} "${boss?.alias}"</div>
        <div class="gd-ch-actions">
          <button class="gd-mini-btn act-play">${gdIconHTML('gun', 12, GD_PALETTE.cyan)} Play Chapter</button>
          <button class="gd-mini-btn act-cut">${gdIconHTML('cutscene', 12, GD_PALETTE.amber)} Cutscene</button>
          <button class="gd-mini-btn act-dlg">${gdIconHTML('dialogue', 12, GD_PALETTE.pink)} Choice</button>
        </div>
      `;
      card.querySelector('.act-play')?.addEventListener('click', () => {
        const targetM = ch.missions.find((m) => !this.completedMissionIds.has(m.id)) || ch.missions[0];
        this.toggleJournal(false);
        this.launchMissionInternal(targetM);
      });
      card.querySelector('.act-cut')?.addEventListener('click', () => {
        this.toggleJournal(false);
        this.cutscenes?.play(ch.introCutscene, () => this.onSyncUIBlock?.());
        this.onSyncUIBlock?.();
      });
      card.querySelector('.act-dlg')?.addEventListener('click', () => {
        this.toggleJournal(false);
        this.dialogue?.open(ch.dialogue, (choice) => {
          if (choice) this.applyDialogueChoice(choice);
          this.onSyncUIBlock?.();
        });
        this.onSyncUIBlock?.();
      });
      list.appendChild(card);
    }
    body.appendChild(list);
  }

  public toSnapshot(): CampaignStateSnapshot {
    return {
      completedMissionIds: [...this.completedMissionIds],
      completedChapterIds: [...this.completedChapterIds],
      loyalty: this.loyalty,
      power: this.power,
      flags: [...this.flags],
      endingUnlocked: this.endingUnlocked
    };
  }

  public loadSnapshot(snap: Partial<CampaignStateSnapshot>): void {
    this.completedMissionIds = new Set(snap.completedMissionIds || []);
    this.completedChapterIds = new Set(snap.completedChapterIds || []);
    this.flags = new Set(snap.flags || []);
    if (typeof snap.loyalty === 'number') this.loyalty = snap.loyalty;
    if (typeof snap.power === 'number') this.power = snap.power;
    this.endingUnlocked = snap.endingUnlocked ?? null;
  }

  public save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(this.toSnapshot()));
      }
    } catch {
      // ignore storage errors
    }
  }

  public load(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(CAMPAIGN_SAVE_KEY);
      if (!raw) return;
      this.loadSnapshot(JSON.parse(raw));
    } catch {
      // ignore corrupted save
    }
  }
}
