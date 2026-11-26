import { gameBus } from '../core/EventBus';
import { gdIconHTML, GD_PALETTE } from '../ui/GDIcon';
import {
  DialogueChoice,
  DialogueSceneDef,
  StoryLanguage,
  getCharacterById
} from './StoryData';

/**
 * Interactive Branching Dialogue System:
 * - Styled with GDIcon & Neon Palette (#0B0F1A, #FF2E88, #00E5C3, #FFB020)
 * - Supports English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी) live switching
 * - Voice-over placeholder via Web Speech API (with gentle mute toggle)
 * - Choices update Loyalty vs. Power reputation & unlock downstream consequences
 */
export class DialogueSystem {
  public isOpen = false;
  public language: StoryLanguage = 'en';
  public voiceEnabled = true;

  private modalEl: HTMLDivElement;
  private speakerEl: HTMLElement;
  private roleEl: HTMLElement;
  private textEl: HTMLElement;
  private choicesEl: HTMLElement;
  private titleEl: HTMLElement;
  private nextBtn: HTMLButtonElement;

  private activeScene: DialogueSceneDef | null = null;
  private lineIdx = 0;
  private showingReply = false;
  private pendingChoice: DialogueChoice | null = null;
  private onComplete?: (choice: DialogueChoice | null) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'gd-dialogue-modal';
    this.modalEl.className = 'gd-dialogue-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="gd-dialogue-card">
        <div class="gd-dlg-top">
          <div class="gd-dlg-title">${gdIconHTML('dialogue', 16, GD_PALETTE.cyan)} <span id="gd-dlg-scene-title">STORY CONVERSATION</span></div>
          <div class="gd-dlg-lang-pills">
            <button class="gd-lang-btn active" data-lang="en">EN</button>
            <button class="gd-lang-btn" data-lang="kn">ಕನ್ನಡ</button>
            <button class="gd-lang-btn" data-lang="hi">हिन्दी</button>
            <button id="gd-dlg-voice" class="gd-lang-btn active" title="Toggle Voice-Over Placeholder">🔊 VO</button>
          </div>
        </div>
        <div class="gd-dlg-speaker-row">
          <span id="gd-dlg-speaker" class="gd-dlg-speaker">RAGHAV "ANNA" RAO</span>
          <span id="gd-dlg-role" class="gd-dlg-role">MENTOR</span>
        </div>
        <div id="gd-dlg-text" class="gd-dlg-text"></div>
        <div id="gd-dlg-choices" class="gd-dlg-choices"></div>
        <div class="gd-dlg-footer">
          <button id="gd-dlg-next" class="gd-btn-cyan">CONTINUE ▸</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    this.titleEl = this.modalEl.querySelector('#gd-dlg-scene-title')!;
    this.speakerEl = this.modalEl.querySelector('#gd-dlg-speaker')!;
    this.roleEl = this.modalEl.querySelector('#gd-dlg-role')!;
    this.textEl = this.modalEl.querySelector('#gd-dlg-text')!;
    this.choicesEl = this.modalEl.querySelector('#gd-dlg-choices')!;
    this.nextBtn = this.modalEl.querySelector('#gd-dlg-next') as HTMLButtonElement;

    this.nextBtn.addEventListener('click', () => this.advance());

    this.modalEl.querySelectorAll('.gd-lang-btn[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = (btn as HTMLElement).dataset.lang as StoryLanguage;
        this.setLanguage(lang);
      });
    });

    const voBtn = this.modalEl.querySelector('#gd-dlg-voice')!;
    voBtn.addEventListener('click', () => {
      this.voiceEnabled = !this.voiceEnabled;
      voBtn.classList.toggle('active', this.voiceEnabled);
      voBtn.textContent = this.voiceEnabled ? '🔊 VO' : '🔇 VO';
      if (!this.voiceEnabled) this.stopSpeech();
    });
  }

  public setLanguage(lang: StoryLanguage): void {
    this.language = lang;
    this.modalEl.querySelectorAll('.gd-lang-btn[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.lang === lang);
    });
    if (this.isOpen) this.renderCurrent();
  }

  public open(scene: DialogueSceneDef, onComplete?: (choice: DialogueChoice | null) => void): void {
    this.activeScene = scene;
    this.lineIdx = 0;
    this.showingReply = false;
    this.pendingChoice = null;
    this.onComplete = onComplete;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    const firstChar = getCharacterById(scene.lines[0]?.speakerId || 'raghav_anna');
    gameBus.emit('dialogue:opened', { dialogueId: scene.id, speaker: firstChar.name });
    this.renderCurrent();
  }

  public close(): void {
    if (!this.isOpen) return;
    const id = this.activeScene?.id || '';
    const chosen = this.pendingChoice;
    const cb = this.onComplete;
    this.stopSpeech();
    this.isOpen = false;
    this.activeScene = null;
    this.onComplete = undefined;
    this.modalEl.classList.add('hidden');
    gameBus.emit('dialogue:closed', { dialogueId: id });
    cb?.(chosen);
  }

  private renderCurrent(): void {
    const scene = this.activeScene;
    if (!scene) return;
    this.titleEl.textContent = scene.title.toUpperCase();
    this.choicesEl.innerHTML = '';

    if (this.showingReply && this.pendingChoice) {
      const ch = getCharacterById(this.pendingChoice.replySpeakerId);
      const replyStr = this.pickLang(this.pendingChoice.reply);
      this.setSpeaker(ch.name, ch.alias, ch.roleLabel, ch.accentColor);
      this.textEl.textContent = replyStr;
      this.nextBtn.classList.remove('hidden');
      this.nextBtn.textContent = 'START MISSION ▸';
      this.speakPlaceholder(replyStr, ch.voicePitch, ch.voiceRate);
      return;
    }

    const line = scene.lines[this.lineIdx];
    if (!line) {
      this.close();
      return;
    }

    const ch = getCharacterById(line.speakerId);
    const spoken = this.pickLang(line.text);
    this.setSpeaker(ch.name, ch.alias, ch.roleLabel, ch.accentColor);
    this.textEl.textContent = spoken;
    this.speakPlaceholder(spoken, ch.voicePitch, ch.voiceRate);

    const isLastLine = this.lineIdx >= scene.lines.length - 1;
    if (isLastLine && scene.choices.length > 0) {
      this.nextBtn.classList.add('hidden');
      for (const c of scene.choices) {
        const btn = document.createElement('button');
        btn.className = `gd-choice-btn ${c.alignment}`;
        const ico =
          c.alignment === 'loyalty'
            ? gdIconHTML('loyalty', 16, GD_PALETTE.cyan)
            : c.alignment === 'power'
              ? gdIconHTML('power', 16, GD_PALETTE.pink)
              : gdIconHTML('dialogue', 16, GD_PALETTE.amber);
        btn.innerHTML = `${ico} <span>${this.pickLang(c.label)}</span>`;
        btn.addEventListener('click', () => this.selectChoice(c));
        this.choicesEl.appendChild(btn);
      }
    } else {
      this.nextBtn.classList.remove('hidden');
      this.nextBtn.textContent = isLastLine ? 'CLOSE ▸' : 'CONTINUE ▸';
    }
  }

  private setSpeaker(name: string, alias: string, roleLabel: string, color: string): void {
    this.speakerEl.textContent = `${name} "${alias}"`;
    this.speakerEl.style.color = color;
    this.roleEl.textContent = roleLabel;
  }

  private selectChoice(choice: DialogueChoice): void {
    if (!this.activeScene) return;
    this.pendingChoice = choice;
    this.showingReply = true;
    gameBus.emit('dialogue:choice', {
      dialogueId: this.activeScene.id,
      choiceId: choice.id,
      alignment: choice.alignment,
      deltaLoyalty: choice.deltaLoyalty,
      deltaPower: choice.deltaPower
    });
    this.renderCurrent();
  }

  private advance(): void {
    if (!this.activeScene) return;
    if (this.showingReply) {
      this.close();
      return;
    }
    this.lineIdx++;
    if (this.lineIdx >= this.activeScene.lines.length) {
      this.close();
    } else {
      this.renderCurrent();
    }
  }

  private pickLang(t: { en: string; kn: string; hi: string }): string {
    if (this.language === 'kn') return `${t.kn}\n(${t.en})`;
    if (this.language === 'hi') return `${t.hi}\n(${t.en})`;
    return t.en;
  }

  private stopSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore speech synthesis sandbox errors
    }
  }

  private speakPlaceholder(text: string, pitch: number, rate: number): void {
    if (!this.voiceEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        // Speak primary English/selected line cleanly as non-blocking voice-over placeholder
        const utter = new SpeechSynthesisUtterance(text.split('\n')[0]);
        utter.lang = this.language === 'kn' ? 'kn-IN' : this.language === 'hi' ? 'hi-IN' : 'en-IN';
        utter.pitch = pitch;
        utter.rate = rate;
        utter.volume = 0.45;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // ignore if speech synthesis unavailable
    }
  }
}
