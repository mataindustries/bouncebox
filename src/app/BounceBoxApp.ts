import { AudioEngine } from '../audio/audioEngine';
import { Transport } from '../audio/transport';
import { MidiLabPanel } from './MidiLabPanel';
import { PadInteraction } from './padInteraction';
import { PerformanceControls, type PerformanceEffectId } from './performanceControls';
import { getBigHitIntensity, type Ripple, type TrailPoint } from './visualEffects';
import { demoPatterns } from '../patterns/demoPatterns';
import { LoopRecorder } from '../patterns/loopRecorder';
import { clonePattern, mutatePattern } from '../patterns/mutations';
import { PhysicsWorld } from '../physics/physicsWorld';
import type { AppStatus, DemoPattern, GrooveEvent, PadPattern, PhysicsSnapshot, TransportState } from '../types';

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
  private patternNode!: HTMLElement;
  private tempoValueNode!: HTMLElement;
  private beatNode!: HTMLElement;
  private effectReadoutNode!: HTMLElement;
  private toastNode!: HTMLElement;
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
  private trails = new Map<number, TrailPoint[]>();
  private padNoteCursor = new Map<string, number>();
  private mutatedPadPulseUntil = new Map<string, number>();
  private latestSnapshot: PhysicsSnapshot = { balls: [], pads: [] };
  private draggingPadId: string | null = null;
  private hasActiveMutation = false;
  private effectWasActive = false;
  private shakeUntil = 0;
  private toastTimer: number | null = null;
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
    this.root.innerHTML = `
      <main class="shell" aria-label="BounceBox physics groovebox">
        <section class="hero">
          <div>
            <p class="eyebrow">Mobile Physics Instrument</p>
            <h1>BounceBox</h1>
            <p class="subtitle">Physics Groovebox</p>
          </div>
          <div class="hero-actions">
            <button type="button" data-action="performance-mode">Performance Mode</button>
            <button type="button" data-action="exit-performance" hidden>Exit Lab</button>
            <div class="pulse-badge" aria-hidden="true">Bar 1.1</div>
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
            <button type="button" data-action="audio">Start Audio</button>
            <button type="button" data-action="launch">Launch Ball</button>
            <button type="button" data-action="launch-3">Launch 3</button>
            <button type="button" data-action="rain">Marble Rain</button>
          </div>
          <div class="control-group control-group-groove">
            <small>Groove</small>
            <button type="button" data-action="capture">Capture Loop</button>
            <button type="button" data-action="stop-balls">Stop Balls</button>
            <button type="button" data-action="clear-loop">Clear Loop</button>
            <button type="button" data-action="clear">Clear</button>
          </div>
          <div class="control-group control-group-fx">
            <small>FX</small>
            <button type="button" data-action="effect" data-effect="gravity-flip">Gravity Flip</button>
            <button type="button" data-action="effect" data-effect="slow-mo">Slow-Mo</button>
            <button type="button" data-action="effect" data-effect="orbit-chaos">Orbit Chaos</button>
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
    const patternNode = this.root.querySelector<HTMLElement>('[data-pattern-name]');
    const tempoValueNode = this.root.querySelector<HTMLElement>('[data-tempo-value]');
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
      !patternNode ||
      !tempoValueNode ||
      !beatNode ||
      !effectReadoutNode ||
      !toastNode ||
      !midiLabNode
    ) {
      throw new Error('BounceBox UI failed to initialize.');
    }

    this.shell = shell;
    this.canvas = canvas;
    this.context = context;
    this.statusNode = statusNode;
    this.audioButton = audioButton;
    this.captureButton = captureButton;
    this.performanceButton = performanceButton;
    this.exitPerformanceButton = exitPerformanceButton;
    this.patternNode = patternNode;
    this.tempoValueNode = tempoValueNode;
    this.beatNode = beatNode;
    this.effectReadoutNode = effectReadoutNode;
    this.toastNode = toastNode;
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
        this.physics.launchBall();
      }

      if (action === 'launch-3') {
        await this.startAudio();
        this.physics.launchBall(3);
      }

      if (action === 'rain') {
        await this.startAudio();
        this.physics.rainBalls();
        this.shakeUntil = performance.now() + 140;
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
        this.performance.clear();
        this.physics.resetPerformanceEffect();
        this.status.lastTriggeredNote = '-';
        this.updateCaptureButton();
        this.renderEffectStatus();
      }

      this.syncStatus();
    });
  }

  private async startAudio(): Promise<void> {
    await this.audio.start();
    this.status.audioReady = this.audio.isReady;
    this.audioButton.textContent = this.status.audioReady ? 'Audio Ready' : 'Start Audio';
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
    this.captureButton.textContent = frozen ? 'Groove Frozen' : 'Capture Loop';
    this.captureButton.classList.toggle('is-ready', frozen);
  }

  private handlePadHit(pad: PadPattern, speed: number): void {
    const now = performance.now();
    const quantized = this.transport.getQuantizedStep(now);
    const event = this.createGrooveEvent(pad, speed, quantized.step, now);
    const bigHit = getBigHitIntensity(pad.role, speed);

    this.loopRecorder.record(event, this.transport.stepsPerLoop);
    this.audio.triggerEvent(event, quantized.delayMs);
    this.status.lastTriggeredNote = `${pad.label} ${event.note}`;
    this.addRipple(pad, speed, true, bigHit > 1.05 ? 'big' : 'hit');

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

  private addRipple(pad: PadPattern, speed: number, recorded: boolean, kind: Ripple['kind'] = 'hit'): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ripples.push({
      id: `${pad.id}-${performance.now()}`,
      x: pad.x > 1 ? pad.x : pad.x * rect.width,
      y: pad.y > 1 ? pad.y : pad.y * rect.height,
      color: recorded ? '#ffffff' : pad.color,
      startedAt: performance.now(),
      intensity: Math.min(1.9, Math.max(0.6, speed / 7)),
      kind
    });
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
          color: event.color,
          startedAt: now,
          intensity: event.velocity,
          kind: 'loop'
        });
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
    this.drawBalls(ctx, snapshot);
    ctx.restore();
    this.renderBeatGrid(transport);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, transport: TransportState): void {
    const activeEffect = this.performance.active;
    const beatGlow = transport.beat === 1 ? 0.2 : 0.08;
    const effectGlow = activeEffect ? 0.12 : 0;
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.15, 20, width * 0.5, height * 0.55, height);
    gradient.addColorStop(0, `rgba(34, 211, 238, ${0.22 + beatGlow + effectGlow})`);
    gradient.addColorStop(0.52, '#0a1028');
    gradient.addColorStop(1, '#040711');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1;

    const grid = Math.max(28, width / 10);
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
  }

  private drawPads(ctx: CanvasRenderingContext2D, snapshot: PhysicsSnapshot): void {
    for (const pad of snapshot.pads) {
      const isDragging = this.draggingPadId === pad.id;
      const isMutatedPulse = (this.mutatedPadPulseUntil.get(pad.id) ?? 0) > performance.now();
      const glow = isDragging || isMutatedPulse ? 44 : pad.isActive ? 34 : pad.kind === 'portal' ? 18 : 12;

      ctx.save();
      ctx.shadowBlur = glow;
      ctx.shadowColor = pad.color;
      ctx.fillStyle = pad.color;
      ctx.globalAlpha = isDragging || isMutatedPulse ? 0.46 : pad.isActive ? 0.38 : 0.18;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.radius * (isDragging || isMutatedPulse ? 1.62 : pad.kind === 'portal' ? 1.45 : 1.28), 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.lineWidth = isDragging || isMutatedPulse || pad.isActive ? 3 : 2;
      ctx.strokeStyle = pad.color;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (pad.kind === 'portal') {
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, pad.radius * (0.58 + Math.sin(performance.now() / 180) * 0.05), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = `${isMutatedPulse ? '900' : '800'} ${pad.radius > 24 ? 12 : 11}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad.label, pad.x, pad.y - 5);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `700 ${pad.radius > 24 ? 11 : 10}px Inter, system-ui, sans-serif`;
      ctx.fillText(pad.kind === 'drum' ? pad.role.toUpperCase() : pad.note, pad.x, pad.y + 8);
      ctx.restore();
    }
  }

  private updateTrails(snapshot: PhysicsSnapshot, width: number, height: number): void {
    const liveBallIds = new Set(snapshot.balls.map((ball) => ball.id));

    for (const [id, points] of this.trails) {
      if (!liveBallIds.has(id)) {
        this.trails.set(
          id,
          points.map((point) => ({ ...point, age: point.age + 1 })).filter((point) => point.age < 18)
        );
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
      this.trails.set(ball.id, [clippedPoint, ...existing.map((point) => ({ ...point, age: point.age + 1 }))].slice(0, 12));
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D): void {
    for (const points of this.trails.values()) {
      points.forEach((point, index) => {
        const speedBoost = Math.min(0.2, point.speed / 70);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.22 + speedBoost - index * 0.019);
        ctx.fillStyle = '#22d3ee';
        ctx.shadowBlur = 12 + Math.min(18, point.speed * 1.2);
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(2, point.radius * (0.95 - index * 0.04)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    this.ripples = this.ripples.filter((ripple) => now - ripple.startedAt < 540);

    for (const ripple of this.ripples) {
      const progress = (now - ripple.startedAt) / 540;
      const bigMultiplier = ripple.kind === 'big' ? 1.45 : ripple.kind === 'loop' ? 0.82 : 1;

      ctx.save();
      ctx.globalAlpha = (1 - progress) * (ripple.kind === 'big' ? 0.82 : 0.62);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 2 + ripple.intensity * bigMultiplier;
      ctx.shadowBlur = 18 + ripple.intensity * 10;
      ctx.shadowColor = ripple.color;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 10 + progress * 70 * ripple.intensity * bigMultiplier, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBalls(ctx: CanvasRenderingContext2D, snapshot: PhysicsSnapshot): void {
    for (const ball of snapshot.balls) {
      const speedGlow = Math.min(26, 8 + ball.speed * 2.5);
      const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.35,
        ball.y - ball.radius * 0.45,
        2,
        ball.x,
        ball.y,
        ball.radius
      );

      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.42, '#67e8f9');
      gradient.addColorStop(1, '#2563eb');

      ctx.save();
      ctx.shadowBlur = speedGlow;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
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

    const badge = this.root.querySelector<HTMLElement>('.pulse-badge');
    if (badge) {
      badge.textContent = `Bar ${state.bar}.${state.beat}`;
    }
  }

  private buildBeatGrid(): void {
    this.beatNode.innerHTML = Array.from({ length: 16 }, (_, index) => `<span data-step="${index}"></span>`).join('');
  }

  private renderBeatGrid(transport: TransportState): void {
    this.beatNode.querySelectorAll('span').forEach((node, index) => {
      node.classList.toggle('is-active', index === transport.step % 16);
      node.classList.toggle('is-downbeat', index % 4 === 0);
    });

    const badge = this.root.querySelector<HTMLElement>('.pulse-badge');
    if (badge) {
      badge.textContent = `Bar ${transport.bar}.${transport.beat}`;
    }
  }

  private renderEffectStatus(): void {
    const activeEffect = this.performance.active;
    const remainingSeconds = this.performance.getRemainingSeconds();

    this.effectReadoutNode.hidden = !activeEffect;
    this.effectReadoutNode.textContent = activeEffect ? `${activeEffect.label} ${remainingSeconds}s` : '';

    this.root.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach((button) => {
      const isActive = Boolean(activeEffect && button.dataset.effect === activeEffect.id);
      button.classList.toggle('is-effect-active', isActive);

      if (isActive && activeEffect) {
        button.textContent = `${activeEffect.label} ${remainingSeconds}s`;
      } else {
        button.textContent = button.dataset.effect === 'gravity-flip' ? 'Gravity Flip' : button.dataset.effect === 'slow-mo' ? 'Slow-Mo' : 'Orbit Chaos';
      }
    });
  }

  destroy(): void {
    window.cancelAnimationFrame(this.animationFrame);
  }
}
