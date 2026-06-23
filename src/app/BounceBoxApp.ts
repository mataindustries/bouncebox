import { AudioEngine } from '../audio/audioEngine';
import { Transport } from '../audio/transport';
import { MidiLabPanel } from './MidiLabPanel';
import { PadInteraction } from './padInteraction';
import { PerformanceControls, type PerformanceEffectId } from './performanceControls';
import { getBigHitIntensity, getRoleVisual, type HitParticle, type Ripple, type TrailPoint } from './visualEffects';
import { demoPatterns } from '../patterns/demoPatterns';
import { LoopRecorder } from '../patterns/loopRecorder';
import { clonePattern, mutatePattern } from '../patterns/mutations';
import { PhysicsWorld } from '../physics/physicsWorld';
import { applyTheme } from '../theme/applyTheme';
import { getTheme, themes } from '../theme/themes';
import { loadStoredThemeId, storeThemeId } from '../theme/themeStore';
import type { BounceBoxTheme, CanvasRoleTokens } from '../theme/themeTypes';
import type { AppStatus, DemoPattern, GrooveEvent, PadPattern, PhysicsSnapshot, TransportState } from '../types';

const maxParticles = 72;
const busyMaxParticles = 42;
const maxRipples = 36;
const busyMaxRipples = 24;
const trailPoints = 10;
const busyTrailPoints = 7;

export class BounceBoxApp {
  private readonly root: HTMLElement;
  private readonly audio = new AudioEngine();
  private readonly transport = new Transport(demoPatterns[0].tempo);
  private readonly loopRecorder = new LoopRecorder();
  private readonly performance = new PerformanceControls();
  private readonly physics = new PhysicsWorld((pad, speed) => this.handlePadHit(pad, speed));
  private shell!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private statusNode!: HTMLElement;
  private audioButton!: HTMLButtonElement;
  private captureButton!: HTMLButtonElement;
  private performanceButton!: HTMLButtonElement;
  private exitPerformanceButton!: HTMLButtonElement;
  private themeSelect!: HTMLSelectElement;
  private patternNode!: HTMLElement;
  private tempoValueNode!: HTMLElement;
  private barBeatNode!: HTMLElement;
  private beatNode!: HTMLElement;
  private effectReadoutNode!: HTMLElement;
  private toastNode!: HTMLElement;
  private effectButtons: HTMLButtonElement[] = [];
  private beatStepNodes: HTMLElement[] = [];
  private midiLab!: MidiLabPanel;
  private padInteraction!: PadInteraction;
  private patternIndex = 0;
  private currentPattern: DemoPattern = demoPatterns[0];
  private mutationBasePattern: DemoPattern = clonePattern(demoPatterns[0]);
  private mutationCount = 0;
  private animationFrame = 0;
  private lastFrameAt = performance.now();
  private lastStatusRenderAt = 0;
  private ripples: Ripple[] = [];
  private particles: HitParticle[] = [];
  private trails = new Map<number, TrailPoint[]>();
  private padNoteCursor = new Map<string, number>();
  private mutatedPadPulseUntil = new Map<string, number>();
  private latestSnapshot: PhysicsSnapshot = { balls: [], pads: [] };
  private draggingPadId: string | null = null;
  private activeTheme: BounceBoxTheme = getTheme(loadStoredThemeId());
  private hasActiveMutation = false;
  private effectWasActive = false;
  private shakeUntil = 0;
  private toastTimer: number | null = null;
  private lastRenderedBeatStep = -1;
  private lastRenderedBarBeat = '';
  private lastRenderedEffectKey = '';
  private status: AppStatus = {
    tempo: this.physics.tempo,
    key: this.physics.key,
    patternName: this.currentPattern.name,
    activeBalls: 0,
    lastTriggeredNote: '-',
    audioReady: false,
    loopEvents: 0,
    loopFrozen: false
  };

  constructor(root: HTMLElement) {
    this.root = root;
  }

  mount(): void {
    applyTheme(this.activeTheme);

    this.root.innerHTML = `
      <main class="shell" aria-label="BounceBox physics groovebox">
        <section class="hero">
          <div>
            <p class="eyebrow">Hardware-Inspired Physics Instrument</p>
            <h1>BounceBox</h1>
            <p class="subtitle">Tactile sequencer for bouncing MIDI patterns</p>
          </div>
          <div class="hero-actions">
            <label class="theme-picker">
              <span>Theme</span>
              <select data-theme-select aria-label="Visual theme">
                ${themes
                  .map(
                    (theme) =>
                      `<option value="${theme.id}" ${theme.id === this.activeTheme.id ? 'selected' : ''}>${theme.name}</option>`
                  )
                  .join('')}
              </select>
            </label>
            <button type="button" data-action="performance-mode" aria-label="Enter Performance Mode">Perform</button>
            <button type="button" data-action="exit-performance" aria-label="Exit Performance Mode" hidden>Exit</button>
            <div class="pulse-badge" aria-live="off">
              <small>Bar</small>
              <strong data-bar-beat>1.1</strong>
            </div>
          </div>
        </section>

        <section class="pattern-strip" aria-label="Pattern and tempo">
          <div class="pattern-card">
            <small>Pattern</small>
            <strong data-pattern-name>Neon Bounce</strong>
          </div>
          <div class="tempo-card">
            <button type="button" data-action="tempo-down" aria-label="Decrease tempo">-</button>
            <span><strong data-tempo-value>124</strong><small>BPM</small></span>
            <button type="button" data-action="tempo-up" aria-label="Increase tempo">+</button>
          </div>
        </section>

        <section class="playfield-wrap">
          <canvas class="playfield" aria-label="Physics note playfield"></canvas>
          <div class="scanline" aria-hidden="true"></div>
          <div class="beat-grid" aria-label="Beat and bar indicator"></div>
          <div class="effect-readout" data-effect-readout hidden></div>
          <div class="toast" data-toast hidden></div>
        </section>

        <section class="status-panel" aria-live="polite"></section>

        <section class="midi-lab" data-midi-lab></section>

        <nav class="controls" aria-label="Groovebox controls">
          <div class="control-group control-group-launch">
            <small>Launch</small>
            <button type="button" data-action="audio">Audio</button>
            <button type="button" data-action="launch">Ball</button>
            <button type="button" data-action="launch-3">Launch 3</button>
            <button type="button" data-action="rain">Rain</button>
          </div>
          <div class="control-group control-group-groove">
            <small>Groove</small>
            <button type="button" data-action="capture">Capture</button>
            <button type="button" data-action="stop-balls">Stop</button>
            <button type="button" data-action="clear-loop">Clear Loop</button>
            <button type="button" data-action="clear">Clear</button>
          </div>
          <div class="control-group control-group-fx">
            <small>FX</small>
            <button type="button" data-action="effect" data-effect="gravity-flip">Gravity</button>
            <button type="button" data-action="effect" data-effect="slow-mo">Slow-Mo</button>
            <button type="button" data-action="effect" data-effect="orbit-chaos">Orbit</button>
          </div>
          <div class="control-group control-group-pattern">
            <small>Pattern</small>
            <button type="button" data-action="pattern">Generate</button>
            <button type="button" data-action="mutate">Mutate</button>
            <button type="button" data-action="reset-pattern">Reset</button>
          </div>
        </nav>
      </main>
    `;

    const canvas = this.root.querySelector<HTMLCanvasElement>('canvas');
    const shell = this.root.querySelector<HTMLElement>('.shell');
    const context = canvas?.getContext('2d');
    const statusNode = this.root.querySelector<HTMLElement>('.status-panel');
    const audioButton = this.root.querySelector<HTMLButtonElement>('[data-action="audio"]');
    const captureButton = this.root.querySelector<HTMLButtonElement>('[data-action="capture"]');
    const performanceButton = this.root.querySelector<HTMLButtonElement>('[data-action="performance-mode"]');
    const exitPerformanceButton = this.root.querySelector<HTMLButtonElement>('[data-action="exit-performance"]');
    const themeSelect = this.root.querySelector<HTMLSelectElement>('[data-theme-select]');
    const patternNode = this.root.querySelector<HTMLElement>('[data-pattern-name]');
    const tempoValueNode = this.root.querySelector<HTMLElement>('[data-tempo-value]');
    const barBeatNode = this.root.querySelector<HTMLElement>('[data-bar-beat]');
    const beatNode = this.root.querySelector<HTMLElement>('.beat-grid');
    const effectReadoutNode = this.root.querySelector<HTMLElement>('[data-effect-readout]');
    const toastNode = this.root.querySelector<HTMLElement>('[data-toast]');
    const midiLabNode = this.root.querySelector<HTMLElement>('[data-midi-lab]');

    if (
      !shell ||
      !canvas ||
      !context ||
      !statusNode ||
      !audioButton ||
      !captureButton ||
      !performanceButton ||
      !exitPerformanceButton ||
      !themeSelect ||
      !patternNode ||
      !tempoValueNode ||
      !barBeatNode ||
      !beatNode ||
      !effectReadoutNode ||
      !toastNode ||
      !midiLabNode
    ) {
      throw new Error('BounceBox UI failed to initialize.');
    }

    this.shell = shell;
    this.shell.dataset.theme = this.activeTheme.id;
    this.canvas = canvas;
    this.context = context;
    this.statusNode = statusNode;
    this.audioButton = audioButton;
    this.captureButton = captureButton;
    this.performanceButton = performanceButton;
    this.exitPerformanceButton = exitPerformanceButton;
    this.themeSelect = themeSelect;
    this.patternNode = patternNode;
    this.tempoValueNode = tempoValueNode;
    this.barBeatNode = barBeatNode;
    this.beatNode = beatNode;
    this.effectReadoutNode = effectReadoutNode;
    this.toastNode = toastNode;
    this.effectButtons = [...this.root.querySelectorAll<HTMLButtonElement>('[data-effect]')];
    this.midiLab = new MidiLabPanel(midiLabNode, (pattern) => this.applyImportedPattern(pattern));
    this.padInteraction = new PadInteraction({
      canvas: this.canvas,
      getPads: () => this.latestSnapshot.pads,
      onDragStart: (padId) => {
        this.draggingPadId = padId;
        this.canvas.classList.add('is-dragging-pad');
      },
      onDragMove: (padId, x, y) => this.movePad(padId, x, y),
      onDragEnd: () => {
        this.draggingPadId = null;
        this.canvas.classList.remove('is-dragging-pad');
      }
    });

    this.bindControls();
    this.bindThemeSelector();
    this.midiLab.mount();
    this.buildBeatGrid();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.resizeCanvas(), 250));

    this.renderStatus();
    this.renderPatternHeader();
    this.loop();
  }

  private bindControls(): void {
    this.root.addEventListener('click', async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const action = target.dataset.action;

      if (action === 'audio') {
        await this.startAudio();
      }

      if (action === 'launch') {
        await this.startAudio();
        this.notifyBallCap(this.physics.launchBall(), 1);
      }

      if (action === 'launch-3') {
        await this.startAudio();
        this.notifyBallCap(this.physics.launchBall(3), 3);
      }

      if (action === 'rain') {
        await this.startAudio();
        const requestedBalls = this.physics.maxBallCount;
        const addedBalls = this.physics.rainBalls(requestedBalls);
        this.notifyBallCap(addedBalls, requestedBalls);

        if (addedBalls > 0) {
          this.shakeUntil = performance.now() + 110;
        }
      }

      if (action === 'pattern') {
        this.loadNextPattern();
      }

      if (action === 'tempo-down') {
        this.setTempo(this.transport.getTempo() - 2);
      }

      if (action === 'tempo-up') {
        this.setTempo(this.transport.getTempo() + 2);
      }

      if (action === 'performance-mode') {
        this.setPerformanceMode(true);
      }

      if (action === 'exit-performance') {
        this.setPerformanceMode(false);
      }

      if (action === 'effect') {
        const effectId = target.dataset.effect as PerformanceEffectId | undefined;
        if (effectId) {
          this.startPerformanceEffect(effectId);
        }
      }

      if (action === 'capture') {
        this.toggleCapture();
      }

      if (action === 'stop-balls') {
        this.physics.stopBalls();
      }

      if (action === 'clear-loop') {
        this.loopRecorder.clearLoop();
        this.updateCaptureButton();
      }

      if (action === 'mutate') {
        this.mutateCurrentPattern();
      }

      if (action === 'reset-pattern') {
        this.resetMutatedPattern();
      }

      if (action === 'clear') {
        this.physics.clearBalls();
        this.loopRecorder.clearLoop();
        this.trails.clear();
        this.ripples = [];
        this.particles = [];
        this.performance.clear();
        this.physics.resetPerformanceEffect();
        this.status.lastTriggeredNote = '-';
        this.updateCaptureButton();
        this.renderEffectStatus();
      }

      this.syncStatus();
    });
  }

  private bindThemeSelector(): void {
    this.themeSelect.addEventListener('change', () => {
      this.setTheme(this.themeSelect.value);
    });
  }

  private setTheme(themeId: string): void {
    const nextTheme = getTheme(themeId);
    this.activeTheme = nextTheme;
    this.themeSelect.value = nextTheme.id;
    this.shell.dataset.theme = nextTheme.id;
    applyTheme(nextTheme);
    storeThemeId(nextTheme.id);
  }

  private async startAudio(): Promise<void> {
    await this.audio.start();
    this.status.audioReady = this.audio.isReady;
    this.audioButton.textContent = this.status.audioReady ? 'Ready' : 'Audio';
    this.audioButton.classList.toggle('is-ready', this.status.audioReady);
  }

  private setTempo(tempo: number): void {
    this.transport.setTempo(tempo);
    this.physics.tempo = this.transport.getTempo();
    this.status.tempo = this.transport.getTempo();
    this.renderPatternHeader();
  }

  private loadNextPattern(): void {
    this.patternIndex = (this.patternIndex + 1) % demoPatterns.length;
    this.activatePattern(clonePattern(demoPatterns[this.patternIndex]), 'builtin');
  }

  private applyImportedPattern(pattern: DemoPattern): void {
    this.activatePattern(pattern, 'imported');
  }

  private activatePattern(pattern: DemoPattern, source: 'builtin' | 'imported' | 'mutation' | 'reset'): void {
    this.currentPattern = pattern;
    this.physics.loadPattern(pattern);
    this.transport.setTempo(pattern.tempo);
    this.loopRecorder.clearLoop();
    this.ripples = [];
    this.particles = [];
    this.padNoteCursor.clear();
    this.latestSnapshot = this.physics.getSnapshot();

    if (source === 'builtin' || source === 'imported' || source === 'reset') {
      this.mutationBasePattern = clonePattern(pattern);
      this.mutationCount = 0;
      this.hasActiveMutation = false;
    }

    this.status.patternName = pattern.name;
    this.status.tempo = pattern.tempo;
    this.status.key = pattern.key;
    this.status.lastTriggeredNote = source === 'imported' ? `Imported ${pattern.name}` : pattern.name;
    this.updateCaptureButton();
    this.renderPatternHeader();
    this.syncStatus();
  }

  private mutateCurrentPattern(): void {
    if (!this.hasActiveMutation) {
      this.mutationBasePattern = clonePattern(this.currentPattern);
    }

    this.mutationCount += 1;
    const result = mutatePattern(this.currentPattern, this.mutationCount);

    if (!result.changed) {
      this.showToast(result.summary);
      this.status.lastTriggeredNote = 'No mutation target';
      return;
    }

    this.hasActiveMutation = true;
    this.activatePattern(result.pattern, 'mutation');
    this.pulsePads(result.changedPadIds);
    this.flashActionButton('mutate');
    this.status.lastTriggeredNote = result.summary.replace('Pattern mutated: ', '').replace('.', '');
    this.showToast(result.summary);
    this.syncStatus();
  }

  private resetMutatedPattern(): void {
    this.activatePattern(clonePattern(this.mutationBasePattern), 'reset');
    this.mutatedPadPulseUntil.clear();
    this.status.lastTriggeredNote = 'Pattern reset';
    this.flashActionButton('reset-pattern');
    this.showToast('Pattern reset: restored pre-mutation pads.');
    this.syncStatus();
  }

  private setPerformanceMode(enabled: boolean): void {
    this.shell.classList.toggle('is-performance', enabled);
    this.performanceButton.hidden = enabled;
    this.exitPerformanceButton.hidden = !enabled;

    if (enabled) {
      const labPanel = this.root.querySelector<HTMLDetailsElement>('.lab-panel');
      labPanel?.removeAttribute('open');
    }

    window.setTimeout(() => this.resizeCanvas(), 60);
  }

  private startPerformanceEffect(effectId: PerformanceEffectId): void {
    this.performance.start(effectId);
    this.physics.applyPerformanceEffect(effectId);
    this.effectWasActive = true;
    this.shakeUntil = performance.now() + 180;
    this.renderEffectStatus();
  }

  private toggleCapture(): void {
    this.loopRecorder.toggleFreeze();
    this.updateCaptureButton();
  }

  private updateCaptureButton(): void {
    const frozen = this.loopRecorder.isFrozen;
    this.captureButton.textContent = frozen ? 'Frozen' : 'Capture';
    this.captureButton.classList.toggle('is-ready', frozen);
  }

  private handlePadHit(pad: PadPattern, speed: number): void {
    const now = performance.now();
    const quantized = this.transport.getQuantizedStep(now);
    const event = this.createGrooveEvent(pad, speed, quantized.step, now);
    const bigHit = getBigHitIntensity(pad.role, speed);
    const visual = {
      ...getRoleVisual(pad.role),
      accentColor: this.getRoleCanvasTokens(pad.role, pad.color).accent
    };

    this.loopRecorder.record(event, this.transport.stepsPerLoop);
    this.audio.triggerEvent(event, quantized.delayMs);
    this.status.lastTriggeredNote = `${pad.label} ${event.note}`;
    this.addRipple(pad, speed, true, bigHit > 1.05 ? 'big' : 'hit', visual.ringScale);
    this.spawnParticles(pad, visual, bigHit);

    if (bigHit > 1.05 || speed > 8.5 || pad.kind === 'portal') {
      this.shakeUntil = now + 120 + bigHit * 70;
    }

    this.syncStatus();
  }

  private createGrooveEvent(pad: PadPattern, speed: number, step: number, now: number): GrooveEvent {
    const noteSelection = this.choosePadNotes(pad);

    return {
      id: `${pad.id}-${now.toFixed(0)}`,
      padId: pad.id,
      instrumentId: pad.instrumentId,
      role: pad.role,
      kind: pad.kind,
      note: noteSelection.note,
      notes: noteSelection.notes,
      color: pad.color,
      velocity: Math.min(1, Math.max(0.35, speed / 10)),
      step,
      recordedAt: now
    };
  }

  private choosePadNotes(pad: PadPattern): Pick<GrooveEvent, 'note' | 'notes'> {
    const notes = pad.notes?.length ? pad.notes : [pad.note];

    if (pad.kind === 'chord' || pad.role === 'pad' || pad.role === 'chord') {
      return { note: notes[0], notes };
    }

    if (pad.kind === 'portal' || pad.role === 'portal' || pad.role === 'arp' || pad.role === 'fx') {
      return { note: notes[0], notes };
    }

    const cursor = this.padNoteCursor.get(pad.id) ?? 0;
    const note = notes[cursor % notes.length];
    this.padNoteCursor.set(pad.id, cursor + 1);

    return { note };
  }

  private addRipple(pad: PadPattern, speed: number, recorded: boolean, kind: Ripple['kind'] = 'hit', scale = 1): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ripples.push({
      id: `${pad.id}-${performance.now()}`,
      x: pad.x > 1 ? pad.x : pad.x * rect.width,
      y: pad.y > 1 ? pad.y : pad.y * rect.height,
      color: recorded ? this.getRoleCanvasTokens(pad.role, pad.color).accent : this.activeTheme.canvas.ripples.fallback,
      startedAt: performance.now(),
      intensity: Math.min(2.2, Math.max(0.6, (speed / 7) * scale)),
      kind
    });
    this.capRipples();
  }

  private spawnParticles(pad: PadPattern, visual: ReturnType<typeof getRoleVisual>, intensity: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = pad.x > 1 ? pad.x : pad.x * rect.width;
    const y = pad.y > 1 ? pad.y : pad.y * rect.height;
    const now = performance.now();
    const activeBalls = this.physics.activeBallCount;
    const particleLimit = activeBalls > 4 ? busyMaxParticles : maxParticles;
    const baseCount = Math.min(10, Math.max(3, Math.round(visual.particleCount * Math.min(1.2, intensity))));
    const count = activeBalls > 4 ? Math.min(4, Math.max(2, Math.round(baseCount * 0.48))) : baseCount;
    const availableParticles = particleLimit - this.particles.length;
    const emitCount = Math.max(0, Math.min(count, availableParticles));

    if (emitCount <= 0) {
      return;
    }

    for (let index = 0; index < emitCount; index += 1) {
      const angle = (index / emitCount) * Math.PI * 2 + Math.random() * 0.55;
      const speed = visual.particleSpeed * (0.55 + Math.random() * 0.75);
      this.particles.push({
        id: `${pad.id}-spark-${now}-${index}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: visual.accentColor,
        size: 1.6 + Math.random() * 2.8,
        lifeMs: 360 + Math.random() * 260,
        startedAt: now
      });
    }
  }

  private getRoleCanvasTokens(role: PadPattern['role'], fallbackColor?: string): CanvasRoleTokens {
    const padTheme = this.activeTheme.canvas.pads;
    const roleTokens = padTheme.roles[role] ?? padTheme.defaultRole;

    if (!padTheme.usePatternColors || !fallbackColor) {
      return roleTokens;
    }

    return {
      ...roleTokens,
      accent: fallbackColor,
      fill: fallbackColor
    };
  }

  private getPadCanvasTokens(pad: PadPattern): CanvasRoleTokens {
    return this.getRoleCanvasTokens(pad.role, pad.color);
  }

  private movePad(padId: string, x: number, y: number): void {
    const movedPad = this.physics.movePad(padId, x, y);

    if (!movedPad) {
      return;
    }

    this.currentPattern = {
      ...this.currentPattern,
      pads: this.currentPattern.pads.map((pad) => (pad.id === padId ? movedPad : pad))
    };

    if (!this.hasActiveMutation) {
      this.mutationBasePattern = clonePattern(this.currentPattern);
    }

    this.latestSnapshot = this.physics.getSnapshot();
  }

  private pulsePads(padIds: string[]): void {
    const now = performance.now();
    const pulseUntil = now + 900;

    for (const padId of padIds) {
      this.mutatedPadPulseUntil.set(padId, pulseUntil);
    }

    window.setTimeout(() => {
      for (const padId of padIds) {
        if ((this.mutatedPadPulseUntil.get(padId) ?? 0) <= performance.now()) {
          this.mutatedPadPulseUntil.delete(padId);
        }
      }
    }, 950);
  }

  private showToast(message: string): void {
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastNode.hidden = false;
    this.toastNode.textContent = message;
    this.toastNode.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastNode.classList.remove('is-visible');
      this.toastNode.hidden = true;
      this.toastTimer = null;
    }, 2200);
  }

  private flashActionButton(action: string): void {
    const button = this.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!button) {
      return;
    }

    button.classList.add('is-flash');
    window.setTimeout(() => button.classList.remove('is-flash'), 520);
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const maxDpr = rect.width <= 720 ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.physics.resize(rect.width, rect.height);
  }

  private loop(): void {
    const now = performance.now();
    const delta = now - this.lastFrameAt;
    this.lastFrameAt = now;

    this.updatePerformanceEffect(now);
    this.physics.step(delta);
    this.playLoopSteps(now);
    this.syncStatus(false);
    this.latestSnapshot = this.physics.getSnapshot();
    this.draw(this.latestSnapshot, this.transport.getState(now));
    this.animationFrame = window.requestAnimationFrame(() => this.loop());
  }

  private updatePerformanceEffect(now: number): void {
    const active = this.performance.update(now);

    if (!active && this.effectWasActive) {
      this.physics.resetPerformanceEffect();
      this.effectWasActive = false;
    }

    this.renderEffectStatus();
  }

  private playLoopSteps(now: number): void {
    for (const step of this.transport.consumeAdvancedSteps(now)) {
      const events = this.loopRecorder.getEventsForStep(step);

      for (const event of events) {
        this.audio.triggerEvent(event);
        this.ripples.push({
          id: `${event.id}-loop-${now}`,
          x: this.canvas.clientWidth * 0.5,
          y: this.canvas.clientHeight * 0.14,
          color: this.getRoleCanvasTokens(event.role, event.color).accent,
          startedAt: now,
          intensity: event.velocity,
          kind: 'loop'
        });
        this.capRipples();
        this.status.lastTriggeredNote = `Loop ${event.note}`;
      }
    }
  }

  private draw(snapshot: PhysicsSnapshot, transport: TransportState): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.context;
    const shake = Math.max(0, this.shakeUntil - performance.now()) / 160;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 4 * shake, (Math.random() - 0.5) * 4 * shake);
    }

    this.drawBackground(ctx, width, height, transport);
    this.updateTrails(snapshot, width, height);
    this.drawTrails(ctx);
    this.drawPads(ctx, snapshot);
    this.drawRipples(ctx);
    this.drawParticles(ctx);
    this.drawBalls(ctx, snapshot);
    ctx.restore();
    this.renderBeatGrid(transport);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, transport: TransportState): void {
    const activeEffect = this.performance.active;
    const theme = this.activeTheme.canvas.background;
    const now = performance.now();
    const beatGlow = transport.beat === 1 ? theme.beatGlow : theme.beatGlow * 0.4;
    const effectGlow = activeEffect ? theme.effectGlow : 0;
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.15, 20, width * 0.5, height * 0.55, height);
    gradient.addColorStop(0, colorWithAlpha(theme.glow, theme.glowAlpha + beatGlow + effectGlow));
    gradient.addColorStop(0.52, theme.middle);
    gradient.addColorStop(1, theme.base);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = theme.gridAlpha + Math.sin(now / 900) * theme.gridPulse;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    const grid = Math.max(theme.gridMinSize, width / 10);
    for (let x = grid; x < width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = grid; y < height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = theme.gridAlpha * 1.55;
    ctx.strokeStyle = theme.horizon;
    for (let index = 1; index < 16; index += 1) {
      const x = (width / 16) * index;
      ctx.lineWidth = index % 4 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(x, height * 0.08);
      ctx.lineTo(x, height * 0.94);
      ctx.stroke();
    }
    ctx.restore();

    const floor = ctx.createLinearGradient(0, height * 0.66, 0, height);
    floor.addColorStop(0, theme.floor.start);
    floor.addColorStop(0.55, theme.floor.mid);
    floor.addColorStop(1, theme.floor.end);
    ctx.fillStyle = floor;
    ctx.fillRect(0, height * 0.66, width, height * 0.34);

    ctx.save();
    ctx.globalAlpha = theme.horizonAlpha;
    ctx.strokeStyle = colorWithAlpha(theme.horizon, 0.28 + beatGlow);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.12, height * 0.82);
    ctx.quadraticCurveTo(width * 0.5, height * 0.76, width * 0.88, height * 0.82);
    ctx.stroke();
    ctx.restore();

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, height * 0.18, width * 0.5, height * 0.5, height * 0.78);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, theme.vignette);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  private drawPads(ctx: CanvasRenderingContext2D, snapshot: PhysicsSnapshot): void {
    const padTheme = this.activeTheme.canvas.pads;

    for (const pad of snapshot.pads) {
      const isDragging = this.draggingPadId === pad.id;
      const isMutatedPulse = (this.mutatedPadPulseUntil.get(pad.id) ?? 0) > performance.now();
      const isPressed = isDragging || isMutatedPulse;
      const isRubber = padTheme.shape === 'rubber';
      const tokens = this.getPadCanvasTokens(pad);
      const glow =
        (isPressed ? padTheme.pressedGlow : pad.isActive ? padTheme.activeGlow : pad.kind === 'portal' ? padTheme.activeGlow : padTheme.inactiveGlow) *
        padTheme.glowScale;
      const roleVisual = getRoleVisual(pad.role);
      const auraAlpha = isPressed ? padTheme.pressedAura : pad.isActive ? padTheme.activeAura : pad.kind === 'portal' ? padTheme.portalAura : padTheme.inactiveAura;
      const outerScale = isPressed ? 1.62 : pad.kind === 'portal' ? 1.45 : 1.28;
      const padWidth = pad.radius * (isRubber ? 2.1 : 2);
      const padHeight = pad.radius * (isRubber ? 1.55 : 2);
      const padLeft = pad.x - padWidth / 2;
      const padTop = pad.y - padHeight / 2;
      const cornerRadius = Math.max(7, Math.min(14, pad.radius * 0.24));

      ctx.save();
      ctx.shadowBlur = glow;
      ctx.shadowColor = tokens.accent;
      ctx.fillStyle = tokens.accent;
      ctx.globalAlpha = auraAlpha;
      ctx.beginPath();
      if (isRubber) {
        drawRoundedRectPath(
          ctx,
          pad.x - (padWidth * outerScale) / 2,
          pad.y - (padHeight * outerScale) / 2,
          padWidth * outerScale,
          padHeight * outerScale,
          cornerRadius * 1.4
        );
      } else {
        ctx.arc(pad.x, pad.y, pad.radius * outerScale, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.globalAlpha = 1;

      if (isRubber) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        drawRoundedRectPath(ctx, padLeft, padTop + 3, padWidth, padHeight, cornerRadius);
        ctx.fill();
        ctx.strokeStyle = colorWithAlpha(tokens.accent, isPressed || pad.isActive ? 0.52 : 0.24);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        drawRoundedRectPath(ctx, padLeft - 1, padTop - 1, padWidth + 2, padHeight + 2, cornerRadius + 1);
        ctx.stroke();
      }

      const coreGradient = isRubber
        ? ctx.createLinearGradient(pad.x, padTop, pad.x, padTop + padHeight)
        : ctx.createRadialGradient(pad.x - pad.radius * 0.28, pad.y - pad.radius * 0.34, 2, pad.x, pad.y, pad.radius);
      coreGradient.addColorStop(0, isRubber ? tokens.inner : tokens.inner);
      coreGradient.addColorStop(0.22, isRubber ? tokens.fill : roleVisual.accentColor);
      coreGradient.addColorStop(0.62, tokens.fill);
      coreGradient.addColorStop(1, padTheme.edge);
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      if (isRubber) {
        drawRoundedRectPath(ctx, padLeft, padTop, padWidth, padHeight, cornerRadius);
      } else {
        ctx.arc(pad.x, pad.y, pad.radius * 0.9, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.lineWidth = isPressed || pad.isActive ? 3 : 2;
      ctx.strokeStyle = isRubber ? (isPressed || pad.isActive ? padTheme.strokeActive : padTheme.stroke) : tokens.accent;
      ctx.beginPath();
      if (isRubber) {
        drawRoundedRectPath(ctx, padLeft, padTop, padWidth, padHeight, cornerRadius);
      } else {
        ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
      }
      ctx.stroke();

      if (isRubber) {
        ctx.globalAlpha = isPressed || pad.isActive ? 0.86 : 0.56;
        ctx.strokeStyle = tokens.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padLeft + cornerRadius, padTop + padHeight - 4);
        ctx.lineTo(padLeft + padWidth - cornerRadius, padTop + padHeight - 4);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.82;
      ctx.strokeStyle = padTheme.highlight;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (isRubber) {
        ctx.moveTo(padLeft + pad.radius * 0.34, padTop + pad.radius * 0.32);
        ctx.lineTo(padLeft + padWidth - pad.radius * 0.34, padTop + pad.radius * 0.32);
      } else {
        ctx.arc(pad.x, pad.y, pad.radius * 0.68, Math.PI * 1.08, Math.PI * 1.72);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (pad.kind === 'portal') {
        const orbit = performance.now() / 430;
        for (let index = 0; index < 3; index += 1) {
          const angle = orbit + index * ((Math.PI * 2) / 3);
          ctx.fillStyle = tokens.accent;
          ctx.globalAlpha = 0.86;
          ctx.beginPath();
          ctx.arc(pad.x + Math.cos(angle) * pad.radius * 0.78, pad.y + Math.sin(angle) * pad.radius * 0.78, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius * (0.58 + Math.sin(performance.now() / 180) * 0.05), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.font = `${isMutatedPulse ? '900' : '800'} ${pad.radius > 24 ? 12 : 11}px ${padTheme.labelFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = padTheme.labelStroke;
      ctx.strokeText(pad.label, pad.x, pad.y - 5);
      ctx.fillStyle = tokens.text ?? padTheme.label;
      ctx.fillText(pad.label, pad.x, pad.y - 5);
      ctx.font = `700 ${pad.radius > 24 ? 11 : 10}px ${padTheme.labelFont}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = padTheme.labelStroke;
      ctx.strokeText(pad.kind === 'drum' ? pad.role.toUpperCase() : pad.note, pad.x, pad.y + 8);
      ctx.fillStyle = padTheme.subLabel;
      ctx.fillText(pad.kind === 'drum' ? pad.role.toUpperCase() : pad.note, pad.x, pad.y + 8);
      ctx.restore();
    }
  }

  private updateTrails(snapshot: PhysicsSnapshot, width: number, height: number): void {
    const liveBallIds = new Set<number>();
    const maxTrailPoints = snapshot.balls.length > 4 ? busyTrailPoints : trailPoints;

    for (const ball of snapshot.balls) {
      liveBallIds.add(ball.id);
    }

    for (const [id, points] of this.trails) {
      for (let index = points.length - 1; index >= 0; index -= 1) {
        points[index].age += 1;

        if (!liveBallIds.has(id) && points[index].age >= 16) {
          points.splice(index, 1);
        }
      }

      if (!points.length && !liveBallIds.has(id)) {
        this.trails.delete(id);
      }
    }

    for (const ball of snapshot.balls) {
      const existing = this.trails.get(ball.id) ?? [];
      const clippedPoint = {
        x: Math.min(width + ball.radius, Math.max(-ball.radius, ball.x)),
        y: Math.min(height + ball.radius, Math.max(-ball.radius, ball.y)),
        radius: ball.radius,
        speed: ball.speed,
        age: 0
      };
      existing.unshift(clippedPoint);
      existing.length = Math.min(existing.length, maxTrailPoints);
      this.trails.set(ball.id, existing);
    }

    if (this.trails.size > this.physics.maxBallCount + 2) {
      const liveIds = [...this.trails.keys()].slice(-(this.physics.maxBallCount + 2));
      this.trails = new Map(liveIds.map((id) => [id, this.trails.get(id) ?? []]));
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D): void {
    const trailTheme = this.activeTheme.canvas.balls;

    for (const points of this.trails.values()) {
      for (let index = 0; index < points.length - 1; index += 1) {
        const point = points[index];
        const nextPoint = points[index + 1];
        const speedBoost = Math.min(0.16, point.speed / 84);
        ctx.save();
        ctx.globalAlpha = Math.max(0, trailTheme.trailAlpha + speedBoost - index * 0.018);
        ctx.strokeStyle = trailTheme.trail;
        ctx.lineWidth = Math.max(1.4, point.radius * (0.62 - index * 0.022));
        ctx.lineCap = 'round';
        ctx.shadowBlur = (8 + Math.min(14, point.speed)) * trailTheme.glowScale;
        ctx.shadowColor = trailTheme.trailShadow;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
        ctx.restore();
      }

      for (let index = 0; index < Math.min(3, points.length); index += 1) {
        const point = points[index];
        ctx.save();
        ctx.globalAlpha = Math.max(0, trailTheme.trailAlpha * 1.3 - index * 0.035);
        ctx.fillStyle = trailTheme.trail;
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(1.5, point.radius * (0.55 - index * 0.09)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    const particleTheme = this.activeTheme.canvas.particles;
    let writeIndex = 0;

    ctx.save();

    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const age = now - particle.startedAt;

      if (age >= particle.lifeMs) {
        continue;
      }

      this.particles[writeIndex] = particle;
      writeIndex += 1;
      const progress = (now - particle.startedAt) / particle.lifeMs;
      const ease = 1 - progress;
      const x = particle.x + particle.vx * progress * 46;
      const y = particle.y + particle.vy * progress * 46 + progress * progress * 12;

      ctx.globalAlpha = ease * particleTheme.alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = particleTheme.shadowBlur;
      ctx.shadowColor = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size * ease, 0, Math.PI * 2);
      ctx.fill();
    }

    this.particles.length = writeIndex;
    ctx.restore();
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    const rippleTheme = this.activeTheme.canvas.ripples;
    let writeIndex = 0;

    for (let index = 0; index < this.ripples.length; index += 1) {
      const ripple = this.ripples[index];
      const age = now - ripple.startedAt;

      if (age >= 540) {
        continue;
      }

      this.ripples[writeIndex] = ripple;
      writeIndex += 1;
      const progress = age / 540;
      const bigMultiplier = ripple.kind === 'big' ? 1.45 : ripple.kind === 'loop' ? 0.82 : 1;

      ctx.save();
      ctx.globalAlpha = (1 - progress) * (ripple.kind === 'big' ? rippleTheme.bigAlpha : rippleTheme.alpha);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 1.2 + ripple.intensity * bigMultiplier;
      ctx.shadowBlur = (12 + ripple.intensity * 7) * rippleTheme.shadowScale;
      ctx.shadowColor = ripple.color;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 10 + progress * 70 * ripple.intensity * bigMultiplier, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.46;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 5 + progress * 38 * ripple.intensity * bigMultiplier, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.ripples.length = writeIndex;
  }

  private drawBalls(ctx: CanvasRenderingContext2D, snapshot: PhysicsSnapshot): void {
    const ballTheme = this.activeTheme.canvas.balls;

    for (const ball of snapshot.balls) {
      const speedGlow = Math.min(26, 8 + ball.speed * 2.5) * ballTheme.glowScale;
      const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.35,
        ball.y - ball.radius * 0.45,
        2,
        ball.x,
        ball.y,
        ball.radius
      );

      gradient.addColorStop(0, ballTheme.highlight);
      gradient.addColorStop(0.42, ballTheme.mid);
      gradient.addColorStop(1, ballTheme.edge);

      ctx.save();
      ctx.shadowBlur = speedGlow;
      ctx.shadowColor = ballTheme.shadow;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = colorWithAlpha(ballTheme.highlight, 0.34);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = colorWithAlpha(ballTheme.edge, 0.66);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius - 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = colorWithAlpha(ballTheme.highlight, 0.82);
      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.28, ball.y - ball.radius * 0.34, Math.max(2, ball.radius * 0.24), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private syncStatus(render = true): void {
    this.status.activeBalls = this.physics.activeBallCount;
    this.status.tempo = this.transport.getTempo();
    this.status.key = this.physics.key;
    this.status.patternName = this.currentPattern.name;
    this.status.loopEvents = this.loopRecorder.eventCount;
    this.status.loopFrozen = this.loopRecorder.isFrozen;

    const now = performance.now();
    const shouldRender = render || now - this.lastStatusRenderAt > 250;

    if (shouldRender) {
      this.renderStatus();
      this.renderPatternHeader();
      this.lastStatusRenderAt = now;
    }
  }

  private renderStatus(): void {
    this.statusNode.replaceChildren(
      this.createStatusItem(this.status.key, 'key'),
      this.createStatusItem(String(this.status.activeBalls), 'balls'),
      this.createStatusItem(String(this.status.loopEvents), this.status.loopFrozen ? 'looped' : 'captured'),
      this.createStatusItem(this.status.lastTriggeredNote, 'last hit')
    );
  }

  private createStatusItem(value: string, label: string): HTMLElement {
    const item = document.createElement('span');
    const strong = document.createElement('strong');
    const small = document.createElement('small');

    strong.textContent = value;
    small.textContent = label;
    item.append(strong, small);
    return item;
  }

  private renderPatternHeader(): void {
    const state = this.transport.getState();
    this.patternNode.textContent = this.currentPattern.name;
    this.tempoValueNode.textContent = String(this.transport.getTempo());
    this.barBeatNode.textContent = `${state.bar}.${state.beat}`;
  }

  private buildBeatGrid(): void {
    this.beatNode.innerHTML = Array.from({ length: 16 }, (_, index) => `<span data-step="${index}"></span>`).join('');
    this.beatStepNodes = [...this.beatNode.querySelectorAll<HTMLElement>('span')];
  }

  private renderBeatGrid(transport: TransportState): void {
    const activeStep = transport.step % 16;
    const barBeat = `${transport.bar}.${transport.beat}`;

    if (activeStep !== this.lastRenderedBeatStep) {
      this.beatStepNodes.forEach((node, index) => {
        node.classList.toggle('is-active', index === activeStep);
        node.classList.toggle('is-downbeat', index % 4 === 0);
      });
      this.lastRenderedBeatStep = activeStep;
    }

    if (barBeat !== this.lastRenderedBarBeat) {
      this.barBeatNode.textContent = barBeat;
      this.lastRenderedBarBeat = barBeat;
    }
  }

  private renderEffectStatus(): void {
    const activeEffect = this.performance.active;
    const remainingSeconds = this.performance.getRemainingSeconds();
    const renderKey = activeEffect ? `${activeEffect.id}:${remainingSeconds}` : 'none';

    if (renderKey === this.lastRenderedEffectKey) {
      return;
    }

    this.lastRenderedEffectKey = renderKey;

    this.effectReadoutNode.hidden = !activeEffect;
    this.effectReadoutNode.textContent = activeEffect ? `${activeEffect.label} ${remainingSeconds}s` : '';

    this.effectButtons.forEach((button) => {
      const isActive = Boolean(activeEffect && button.dataset.effect === activeEffect.id);
      button.classList.toggle('is-effect-active', isActive);

      if (isActive && activeEffect) {
        button.textContent =
          button.dataset.effect === 'gravity-flip'
            ? `Flip ${remainingSeconds}s`
            : button.dataset.effect === 'slow-mo'
              ? `Slow ${remainingSeconds}s`
              : `Orbit ${remainingSeconds}s`;
      } else {
        button.textContent = button.dataset.effect === 'gravity-flip' ? 'Gravity' : button.dataset.effect === 'slow-mo' ? 'Slow-Mo' : 'Orbit';
      }
    });
  }

  private notifyBallCap(addedBalls: number, requestedBalls: number): void {
    if (addedBalls < requestedBalls) {
      this.showToast(`Max ${this.physics.maxBallCount} balls.`);
    }
  }

  private capRipples(): void {
    const rippleLimit = this.physics.activeBallCount > 4 ? busyMaxRipples : maxRipples;

    if (this.ripples.length > rippleLimit) {
      this.ripples.splice(0, this.ripples.length - rippleLimit);
    }
  }

  destroy(): void {
    window.cancelAnimationFrame(this.animationFrame);
  }
}

function colorWithAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = color.trim();

  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
  }

  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const red = Number.parseInt(hex[1] + hex[1], 16);
    const green = Number.parseInt(hex[2] + hex[2], 16);
    const blue = Number.parseInt(hex[3] + hex[3], 16);
    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
  }

  return color;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}
