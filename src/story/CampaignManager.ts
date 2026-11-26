import { gameBus } from '../core/EventBus';
import { createGDIconElement, GD_PALETTE } from '../ui/GDIcon';
import { clearChildren, el } from '../security/SafeDOM';
import { safeStorageGet, safeStorageSet } from '../security/PrivacyManager';
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
    const tabChapters = el(
      'button',
      { className: 'gd-stab active', attrs: { 'data-tab': 'chapters' } },
      createGDIconElement('story', 14, GD_PALETTE.cyan),
      ' 8 CHAPTERS'
    );
    const tabCast = el(
      'button',
      { className: 'gd-stab', attrs: { 'data-tab': 'cast' } },
      createGDIconElement('boss', 14, GD_PALETTE.pink),
      ' CAST (12 CHARACTERS)'
    );

    const activateTab = (tab: 'chapters' | 'cast') => {
      tabChapters.classList.toggle('active', tab === 'chapters');
      tabCast.classList.toggle('active', tab === 'cast');
      this.renderJournal(tab);
    };
    tabChapters.addEventListener('click', () => activateTab('chapters'));
    tabCast.addEventListener('click', () => activateTab('cast'));

    this.modalEl = el(
      'div',
      { id: 'gd-story-modal', className: 'modal-overlay hidden' },
      el(
        'div',
        { className: 'gd-story-panel' },
        el(
          'div',
          { className: 'panel-header' },
          el(
            'div',
            {},
            el('h2', {}, createGDIconElement('story', 22, GD_PALETTE.amber), ' STORY CAMPAIGN • 8 CHAPTERS'),
            el('span', {
              className: 'panel-sub',
              text: 'Phase A • Choices shape Loyalty vs. Power and unlock two distinct Bengaluru endings'
            })
          ),
          el('button', {
            id: 'gd-story-close',
            className: 'btn-close',
            text: '✕ [J]',
            onClick: () => this.toggleJournal(false)
          })
        ),
        el('div', { id: 'gd-rep-bar', className: 'gd-rep-bar' }),
        el('div', { className: 'gd-story-tabs' }, tabChapters, tabCast),
        el('div', { id: 'gd-story-body', className: 'gd-story-body' })
      )
    );
    document.body.appendChild(this.modalEl);
  }

  private createEndingDOM(): void {
    this.endingModalEl = el(
      'div',
      { id: 'gd-ending-modal', className: 'modal-overlay hidden' },
      el(
        'div',
        { className: 'gd-ending-card' },
        el('div', { id: 'gd-end-kicker', className: 'gd-end-kicker' }),
        el('h2', { id: 'gd-end-title' }),
        el('p', { id: 'gd-end-body' }),
        el('div', { id: 'gd-end-stats', className: 'gd-end-stats' }),
        el('button', {
          id: 'gd-end-continue',
          className: 'gd-btn-cyan',
          text: 'CONTINUE FREE ROAM IN BENGALURU',
          onClick: () => {
            this.endingModalEl?.classList.add('hidden');
            this.onSyncUIBlock?.();
          }
        })
      )
    );
    document.body.appendChild(this.endingModalEl);
  }

  private showEndingCard(endingType: 'loyalty' | 'power'): void {
    if (!this.endingModalEl) return;
    const def = STORY_ENDINGS[endingType];
    const kicker = this.endingModalEl.querySelector('#gd-end-kicker')!;
    const title = this.endingModalEl.querySelector('#gd-end-title')!;
    const body = this.endingModalEl.querySelector('#gd-end-body')!;
    const stats = this.endingModalEl.querySelector('#gd-end-stats')!;
    clearChildren(kicker);
    kicker.append(
      createGDIconElement(
        endingType === 'loyalty' ? 'loyalty' : 'power',
        18,
        endingType === 'loyalty' ? GD_PALETTE.cyan : GD_PALETTE.pink
      ),
      ` ${def.subtitle}`
    );
    title.textContent = def.title;
    body.textContent =
      this.language === 'kn' ? `${def.epilogue.kn} (${def.epilogue.en})` :
      this.language === 'hi' ? `${def.epilogue.hi} (${def.epilogue.en})` :
      def.epilogue.en;
    clearChildren(stats);
    stats.append(
      'LOYALTY: ',
      el('b', { text: String(this.loyalty), style: { color: GD_PALETTE.cyan } }),
      ' • POWER: ',
      el('b', { text: String(this.power), style: { color: GD_PALETTE.pink } }),
      ' • CHAPTERS: ',
      el('b', { text: `${this.completedChapterIds.size}/8` })
    );
    this.endingModalEl.classList.remove('hidden');
  }

  private renderJournal(tab: 'chapters' | 'cast' = 'chapters'): void {
    if (!this.modalEl) return;
    const total = Math.max(1, this.loyalty + this.power);
    const lPct = Math.round((this.loyalty / total) * 100);
    const pPct = 100 - lPct;
    const predicted = this.getEndingType();

    const repEl = this.modalEl.querySelector('#gd-rep-bar')!;
    clearChildren(repEl);
    repEl.append(
      el(
        'div',
        { className: 'gd-rep-labels' },
        el('span', { style: { color: GD_PALETTE.cyan } }, createGDIconElement('loyalty', 14, GD_PALETTE.cyan), ` LOYALTY ${this.loyalty} (${lPct}%)`),
        el(
          'span',
          { style: { color: GD_PALETTE.amber } },
          'ENDING PATH: ',
          el('b', { text: predicted === 'loyalty' ? 'PROTECTOR OF GARDEN CITY' : 'SILICON UNDERWORLD EMPEROR' })
        ),
        el('span', { style: { color: GD_PALETTE.pink } }, `POWER ${this.power} (${pPct}%) `, createGDIconElement('power', 14, GD_PALETTE.pink))
      ),
      el(
        'div',
        { className: 'gd-rep-track' },
        el('div', { className: 'gd-rep-l', style: { width: `${lPct}%` } }),
        el('div', { className: 'gd-rep-p', style: { width: `${pPct}%` } })
      )
    );

    const body = this.modalEl.querySelector('#gd-story-body')!;
    clearChildren(body);

    if (tab === 'cast') {
      const grid = el('div', { className: 'gd-cast-grid' });
      for (const c of STORY_CHARACTERS) {
        const bio = this.language === 'kn' ? c.bio.kn : this.language === 'hi' ? c.bio.hi : c.bio.en;
        grid.appendChild(
          el(
            'div',
            { className: 'gd-cast-card', style: { borderLeftColor: c.accentColor } },
            el('div', { className: 'gd-cast-role', text: c.roleLabel, style: { color: c.accentColor } }),
            el('div', { className: 'gd-cast-name' }, `${c.name} `, el('small', { text: `"${c.alias}"` })),
            el('div', { className: 'gd-cast-bio', text: bio })
          )
        );
      }
      body.appendChild(grid);
      return;
    }

    const list = el('div', { className: 'gd-chapter-grid' });
    for (const ch of CAMPAIGN_CHAPTERS) {
      const doneCount = ch.missions.filter((m) => this.completedMissionIds.has(m.id)).length;
      const done = this.completedChapterIds.has(ch.id);
      const boss = STORY_CHARACTERS.find((c) => c.id === ch.bossId);
      const card = el(
        'div',
        { className: `gd-chapter-card${done ? ' done' : ''}` },
        el(
          'div',
          { className: 'gd-ch-top' },
          el('span', { className: 'gd-ch-num', text: `CH ${ch.number} • ${ch.zone.toUpperCase()}` }),
          el('span', { className: 'gd-ch-prog', text: done ? '✓ CLAIMED' : `${doneCount}/${ch.missions.length} MISSIONS` })
        ),
        el('div', { className: 'gd-ch-title', text: ch.title }),
        el('div', { className: 'gd-ch-kn', text: ch.titleKn }),
        el(
          'div',
          { className: 'gd-ch-boss' },
          createGDIconElement('boss', 13, GD_PALETTE.pink),
          ` Boss: ${boss?.name ?? ''} "${boss?.alias ?? ''}"`
        ),
        el(
          'div',
          { className: 'gd-ch-actions' },
          el(
            'button',
            {
              className: 'gd-mini-btn act-play',
              onClick: () => {
                const targetM = ch.missions.find((m) => !this.completedMissionIds.has(m.id)) || ch.missions[0];
                this.toggleJournal(false);
                this.launchMissionInternal(targetM);
              }
            },
            createGDIconElement('gun', 12, GD_PALETTE.cyan),
            ' Play Chapter'
          ),
          el(
            'button',
            {
              className: 'gd-mini-btn act-cut',
              onClick: () => {
                this.toggleJournal(false);
                this.cutscenes?.play(ch.introCutscene, () => this.onSyncUIBlock?.());
                this.onSyncUIBlock?.();
              }
            },
            createGDIconElement('cutscene', 12, GD_PALETTE.amber),
            ' Cutscene'
          ),
          el(
            'button',
            {
              className: 'gd-mini-btn act-dlg',
              onClick: () => {
                this.toggleJournal(false);
                this.dialogue?.open(ch.dialogue, (choice) => {
                  if (choice) this.applyDialogueChoice(choice);
                  this.onSyncUIBlock?.();
                });
                this.onSyncUIBlock?.();
              }
            },
            createGDIconElement('dialogue', 12, GD_PALETTE.pink),
            ' Choice'
          )
        )
      );
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
    safeStorageSet(CAMPAIGN_SAVE_KEY, JSON.stringify(this.toSnapshot()));
  }

  public load(): void {
    try {
      const raw = safeStorageGet(CAMPAIGN_SAVE_KEY);
      if (!raw) return;
      this.loadSnapshot(JSON.parse(raw));
    } catch {
      // ignore corrupted save
    }
  }
}
