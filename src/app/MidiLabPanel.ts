import {
  importPatternFromJson,
  midiLabExampleJson,
  midiLabMiniPrompt
} from '../patterns/importPattern';
import type { DemoPattern, ImportPatternResult } from '../types';

type ApplyHandler = (pattern: DemoPattern) => void;

export class MidiLabPanel {
  private textarea!: HTMLTextAreaElement;
  private feedbackNode!: HTMLElement;
  private summaryNode!: HTMLElement;
  private applyButton!: HTMLButtonElement;
  private promptButton!: HTMLButtonElement;
  private lastResult: ImportPatternResult | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly onApply: ApplyHandler
  ) {}

  mount(): void {
    this.root.innerHTML = `
      <details class="lab-panel">
        <summary>
          <span>ChatGPT MIDI Lab</span>
          <small>Import a playable pattern</small>
        </summary>

        <div class="lab-body">
          <p class="lab-hint">
            Paste ChatGPT MIDI JSON and turn it into a playable physics instrument.
          </p>

          <textarea
            data-midi-json
            spellcheck="false"
            aria-label="Paste ChatGPT MIDI JSON"
            placeholder='{"name":"Skullstep Playground","tempo":112,"key":"C minor","tracks":[]}'
          ></textarea>

          <div class="lab-actions">
            <button type="button" data-midi-action="example" aria-label="Use example MIDI JSON">Example</button>
            <button type="button" data-midi-action="load" aria-label="Load MIDI JSON">Load</button>
            <button type="button" data-midi-action="apply" aria-label="Apply MIDI JSON to playfield" disabled>Apply</button>
          </div>

          <div class="lab-feedback is-idle" data-midi-feedback>Paste JSON or start from the example.</div>
          <div class="lab-summary" data-midi-summary hidden></div>

          <div class="mini-prompt">
            <small>Mini prompt</small>
            <code>${midiLabMiniPrompt}</code>
            <button type="button" data-midi-action="copy-prompt">Copy Prompt</button>
          </div>

          <p class="lab-footer">JSON in. Tactile pattern out.</p>
        </div>
      </details>
    `;

    const textarea = this.root.querySelector<HTMLTextAreaElement>('[data-midi-json]');
    const feedbackNode = this.root.querySelector<HTMLElement>('[data-midi-feedback]');
    const summaryNode = this.root.querySelector<HTMLElement>('[data-midi-summary]');
    const applyButton = this.root.querySelector<HTMLButtonElement>('[data-midi-action="apply"]');
    const promptButton = this.root.querySelector<HTMLButtonElement>('[data-midi-action="copy-prompt"]');

    if (!textarea || !feedbackNode || !summaryNode || !applyButton || !promptButton) {
      throw new Error('MIDI Lab failed to initialize.');
    }

    this.textarea = textarea;
    this.feedbackNode = feedbackNode;
    this.summaryNode = summaryNode;
    this.applyButton = applyButton;
    this.promptButton = promptButton;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const action = target.dataset.midiAction;

      if (action === 'example') {
        this.textarea.value = midiLabExampleJson;
        this.validate();
      }

      if (action === 'load') {
        this.validate();
      }

      if (action === 'apply') {
        this.apply();
      }

      if (action === 'copy-prompt') {
        this.copyPrompt();
      }
    });

    this.textarea.addEventListener('input', () => {
      this.lastResult = null;
      this.applyButton.disabled = true;
      this.summaryNode.hidden = true;
      this.setFeedback('idle', 'Edited. Load JSON again when ready.');
    });
  }

  private validate(): void {
    this.lastResult = importPatternFromJson(this.textarea.value);
    this.applyButton.disabled = !this.lastResult.ok;

    if (!this.lastResult.ok) {
      this.summaryNode.hidden = true;
      this.setFeedback('error', this.lastResult.errors.slice(0, 3).join(' '));
      return;
    }

    this.setFeedback(
      'success',
      this.lastResult.warnings.length > 0
        ? `Loaded with ${this.lastResult.warnings.length} safe adjustment${this.lastResult.warnings.length === 1 ? '' : 's'}.`
        : 'Valid BounceBox MIDI JSON. Ready to apply.'
    );
    this.renderSummary(this.lastResult);
  }

  private apply(): void {
    if (!this.lastResult?.ok) {
      this.validate();
    }

    if (!this.lastResult?.ok) {
      return;
    }

    this.onApply(this.lastResult.pattern);
    this.setFeedback('success', `Applied "${this.lastResult.summary.name}" to the playfield.`);
  }

  private async copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(midiLabMiniPrompt);
      this.promptButton.textContent = 'Copied';
      window.setTimeout(() => {
        this.promptButton.textContent = 'Copy Prompt';
      }, 1400);
    } catch {
      this.setFeedback('idle', 'Copy is blocked here. Select the mini prompt text manually.');
    }
  }

  private renderSummary(result: Extract<ImportPatternResult, { ok: true }>): void {
    this.summaryNode.hidden = false;
    this.summaryNode.innerHTML = '';

    const summaryItems = [
      ['Pattern', result.summary.name],
      ['Tempo', `${result.summary.tempo} BPM`],
      ['Key', result.summary.key],
      ['Tracks', String(result.summary.trackCount)],
      ['Instruments', result.summary.instruments.join(', ')],
      ['Events', String(result.summary.noteCount)]
    ];

    for (const [label, value] of summaryItems) {
      const item = document.createElement('span');
      const itemLabel = document.createElement('small');
      const itemValue = document.createElement('strong');

      itemLabel.textContent = label;
      itemValue.textContent = value;
      item.append(itemLabel, itemValue);
      this.summaryNode.append(item);
    }

    if (result.warnings.length > 0) {
      const warning = document.createElement('p');
      warning.textContent = result.warnings.slice(0, 2).join(' ');
      this.summaryNode.append(warning);
    }
  }

  private setFeedback(kind: 'idle' | 'success' | 'error', message: string): void {
    this.feedbackNode.className = `lab-feedback is-${kind}`;
    this.feedbackNode.textContent = message;
  }
}
