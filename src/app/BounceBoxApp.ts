import { AudioEngine } from '../audio/audioEngine';
import { demoPatterns } from '../patterns/demoPatterns';
import { PhysicsWorld } from '../physics/physicsWorld';
import type { AppStatus, PadPattern, PhysicsSnapshot } from '../types';

export class BounceBoxApp {
  private readonly root: HTMLElement;
  private readonly audio = new AudioEngine();
  private readonly physics = new PhysicsWorld((pad, speed) => this.handlePadHit(pad, speed));
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private statusNode!: HTMLElement;
  private audioButton!: HTMLButtonElement;
  private patternIndex = 0;
  private animationFrame = 0;
  private lastFrameAt = performance.now();
  private status: AppStatus = {
    tempo: this.physics.tempo,
    key: this.physics.key,
    activeBalls: 0,
    lastTriggeredNote: '-',
    audioReady: false
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
          <div class="pulse-badge" aria-hidden="true">124 BPM</div>
        </section>

        <section class="playfield-wrap">
          <canvas class="playfield" aria-label="Physics note playfield"></canvas>
          <div class="scanline" aria-hidden="true"></div>
        </section>

        <section class="status-panel" aria-live="polite"></section>

        <nav class="controls" aria-label="Groovebox controls">
          <button type="button" data-action="audio">Start Audio</button>
          <button type="button" data-action="launch">Launch Ball</button>
          <button type="button" data-action="pattern">Generate Pattern</button>
          <button type="button" data-action="chaos">Chaos</button>
          <button type="button" data-action="clear">Clear</button>
        </nav>
      </main>
    `;

    const canvas = this.root.querySelector<HTMLCanvasElement>('canvas');
    const context = canvas?.getContext('2d');
    const statusNode = this.root.querySelector<HTMLElement>('.status-panel');
    const audioButton = this.root.querySelector<HTMLButtonElement>('[data-action="audio"]');

    if (!canvas || !context || !statusNode || !audioButton) {
      throw new Error('BounceBox UI failed to initialize.');
    }

    this.canvas = canvas;
    this.context = context;
    this.statusNode = statusNode;
    this.audioButton = audioButton;

    this.bindControls();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.resizeCanvas(), 250));

    this.renderStatus();
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

      if (action === 'pattern') {
        this.loadNextPattern();
      }

      if (action === 'chaos') {
        this.physics.triggerChaos();
      }

      if (action === 'clear') {
        this.physics.clearBalls();
        this.status.lastTriggeredNote = '-';
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

  private loadNextPattern(): void {
    this.patternIndex = (this.patternIndex + 1) % demoPatterns.length;
    const pattern = demoPatterns[this.patternIndex];
    this.physics.loadPattern(pattern);
    this.status.tempo = pattern.tempo;
    this.status.key = pattern.key;
    this.status.lastTriggeredNote = pattern.name;
  }

  private handlePadHit(pad: PadPattern, speed: number): void {
    const intensity = Math.min(1.4, Math.max(0.55, speed / 9));
    this.audio.triggerNote(pad.note, intensity);
    this.status.lastTriggeredNote = pad.note;
    this.syncStatus();
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

    this.physics.step(delta);
    this.syncStatus(false);
    this.draw(this.physics.getSnapshot());
    this.animationFrame = window.requestAnimationFrame(() => this.loop());
  }

  private draw(snapshot: PhysicsSnapshot): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.context;

    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height);
    this.drawPads(ctx, snapshot);
    this.drawBalls(ctx, snapshot);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.15, 20, width * 0.5, height * 0.55, height);
    gradient.addColorStop(0, '#18224a');
    gradient.addColorStop(0.52, '#0a1028');
    gradient.addColorStop(1, '#040711');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.16;
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
      const glow = pad.isActive ? 24 : 12;

      ctx.save();
      ctx.shadowBlur = glow;
      ctx.shadowColor = pad.color;
      ctx.fillStyle = pad.color;
      ctx.globalAlpha = pad.isActive ? 0.34 : 0.2;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.radius * 1.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.lineWidth = pad.isActive ? 3 : 2;
      ctx.strokeStyle = pad.color;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad.note, pad.x, pad.y);
      ctx.restore();
    }
  }

  private drawBalls(ctx: CanvasRenderingContext2D, snapshot: PhysicsSnapshot): void {
    for (const ball of snapshot.balls) {
      const speedGlow = Math.min(24, 8 + ball.speed * 2.5);
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
    this.status.tempo = this.physics.tempo;
    this.status.key = this.physics.key;

    if (render) {
      this.renderStatus();
    }
  }

  private renderStatus(): void {
    this.statusNode.innerHTML = `
      <span><strong>${this.status.tempo}</strong><small>tempo</small></span>
      <span><strong>${this.status.key}</strong><small>key</small></span>
      <span><strong>${this.status.activeBalls}</strong><small>balls</small></span>
      <span><strong>${this.status.lastTriggeredNote}</strong><small>last note</small></span>
    `;
  }

  destroy(): void {
    window.cancelAnimationFrame(this.animationFrame);
  }
}
