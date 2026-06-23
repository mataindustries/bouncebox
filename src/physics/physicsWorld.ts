import Matter from 'matter-js';
import type { PerformanceEffectId } from '../app/performanceControls';
import type { BallSnapshot, DemoPattern, PadPattern, PadSnapshot, PhysicsSnapshot } from '../types';
import { demoPatterns } from '../patterns/demoPatterns';

type PadHitHandler = (pad: PadPattern, speed: number) => void;

export const MAX_ACTIVE_BALLS = 6;

const wallThickness = 96;
const normalGravityY = 0.035;
const gravityFlipY = -0.16;
const slowMoGravityY = 0.015;
const orbitGravityY = 0;
const minSurfaceSpeed = 1.45;
const targetSurfaceSpeed = 2.85;
const maxSurfaceSpeed = 8.8;

export class PhysicsWorld {
  private engine = Matter.Engine.create();
  private balls: Matter.Body[] = [];
  private pads: Matter.Body[] = [];
  private walls: Matter.Body[] = [];
  private padConfigById = new Map<string, PadPattern>();
  private lastPadHitAt = new Map<string, number>();
  private activePadUntil = new Map<string, number>();
  private width = 320;
  private height = 480;
  private nextBallId = 1;
  private chaosTimer: number | null = null;
  private pendingBallCount = 0;
  private spawnTimers: number[] = [];
  private activeEffect: PerformanceEffectId | null = null;
  private readonly onPadHit: PadHitHandler;

  tempo = demoPatterns[0].tempo;
  key = demoPatterns[0].key;

  constructor(onPadHit: PadHitHandler) {
    this.onPadHit = onPadHit;
    this.setNormalGravity();
    this.loadPattern(demoPatterns[0]);

    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair.bodyA, pair.bodyB);
      }
    });
  }

  resize(width: number, height: number): void {
    this.width = Math.max(240, width);
    this.height = Math.max(320, height);
    this.rebuildStaticBodies();
  }

  loadPattern(pattern: DemoPattern): void {
    this.tempo = pattern.tempo;
    this.key = pattern.key;
    this.padConfigById = new Map(pattern.pads.map((pad) => [pad.id, pad]));
    this.lastPadHitAt.clear();
    this.activePadUntil.clear();
    this.rebuildStaticBodies();
  }

  launchBall(count = 1): number {
    const requestedCount = Math.max(1, Math.floor(count));
    const launchCount = Math.min(requestedCount, this.availableBallSlots);

    for (let index = 0; index < launchCount; index += 1) {
      this.scheduleBall(index * 95, () => {
        const angle = -0.28 + Math.random() * 0.56;
        const speed = 3.2 + Math.random() * 1.6;

        return {
          x: this.width * (0.32 + Math.random() * 0.36),
          y: this.height * (0.14 + Math.random() * 0.1),
          velocity: {
            x: Math.sin(angle) * speed + (Math.random() - 0.5) * 2.4,
            y: Math.cos(angle) * speed
          }
        };
      });
    }

    return launchCount;
  }

  rainBalls(count = MAX_ACTIVE_BALLS): number {
    const requestedCount = Math.min(MAX_ACTIVE_BALLS, Math.max(3, Math.floor(count)));
    const rainCount = Math.min(requestedCount, this.availableBallSlots);

    for (let index = 0; index < rainCount; index += 1) {
      this.scheduleBall(index * 72, () => {
        const spread = rainCount <= 1 ? 0.5 : index / (rainCount - 1);
        const sideBias = spread - 0.5;

        return {
          x: this.width * (0.14 + spread * 0.72) + (Math.random() - 0.5) * this.width * 0.045,
          y: this.height * (0.1 + Math.random() * 0.08),
          velocity: {
            x: sideBias * 3.4 + (Math.random() - 0.5) * 1.8,
            y: -1.6 - Math.random() * 1.25
          }
        };
      });
    }

    return rainCount;
  }

  stopBalls(): void {
    this.clearBalls();
  }

  movePad(padId: string, x: number, y: number): PadPattern | null {
    const padConfig = this.padConfigById.get(padId);
    const padBody = this.pads.find((pad) => String(pad.plugin.padId) === padId);

    if (!padConfig || !padBody) {
      return null;
    }

    const radius = padBody.circleRadius ?? padConfig.radius * this.width;
    const nextX = Math.min(this.width - radius, Math.max(radius, x));
    const nextY = Math.min(this.height - radius, Math.max(radius, y));
    const nextConfig = {
      ...padConfig,
      x: nextX / this.width,
      y: nextY / this.height
    };

    this.padConfigById.set(padId, nextConfig);
    Matter.Body.setPosition(padBody, { x: nextX, y: nextY });
    return nextConfig;
  }

  applyPerformanceEffect(effectId: PerformanceEffectId): void {
    this.resetPerformanceEffect();
    this.activeEffect = effectId;

    if (effectId === 'gravity-flip') {
      this.engine.gravity.x = 0;
      this.engine.gravity.y = gravityFlipY;
      this.kickBalls(0.8, -2.1);
    }

    if (effectId === 'slow-mo') {
      this.engine.timing.timeScale = 0.48;
      this.engine.gravity.x = 0;
      this.engine.gravity.y = slowMoGravityY;
    }

    if (effectId === 'orbit-chaos') {
      this.engine.gravity.x = 0;
      this.engine.gravity.y = orbitGravityY;
      this.kickBalls(2.2, -1.4);
    }
  }

  resetPerformanceEffect(): void {
    this.activeEffect = null;
    this.setNormalGravity();
    this.engine.timing.timeScale = 1;
  }

  private addBall(x = this.width * (0.35 + Math.random() * 0.3), y?: number, velocity?: { x: number; y: number }): boolean {
    if (this.balls.length >= MAX_ACTIVE_BALLS) {
      return false;
    }

    const radius = Math.max(10, Math.min(16, this.width * 0.035));
    const ball = Matter.Bodies.circle(x, y ?? radius + 20, radius, {
      label: 'ball',
      restitution: 0.985,
      friction: 0,
      frictionAir: 0.0016,
      density: 0.0018,
      render: { visible: false }
    });

    ball.plugin = { bounceBoxId: this.nextBallId, lastNudgedAt: 0 };
    Matter.Body.setVelocity(ball, velocity ?? { x: (Math.random() - 0.5) * 6, y: 2.2 + Math.random() * 1.8 });

    this.nextBallId += 1;
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
    return true;
  }

  clearBalls(): void {
    this.clearPendingSpawns();
    Matter.Composite.remove(this.engine.world, this.balls);
    this.balls = [];
    this.lastPadHitAt.clear();
    this.activePadUntil.clear();
  }

  triggerChaos(): void {
    if (this.chaosTimer) {
      window.clearTimeout(this.chaosTimer);
    }

    this.engine.gravity.x = (Math.random() - 0.5) * 1.4;
    this.engine.gravity.y = -0.12 - Math.random() * 0.18;

    for (const ball of this.balls) {
      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x * 1.18 + (Math.random() - 0.5) * 5,
        y: ball.velocity.y * 1.18 - Math.random() * 5
      });
    }

    this.chaosTimer = window.setTimeout(() => {
      this.setNormalGravity();
      this.chaosTimer = null;
    }, 3200);
  }

  step(deltaMs: number): void {
    this.applyOrbitForces();
    Matter.Engine.update(this.engine, Math.min(deltaMs, 1000 / 30));
    this.stabilizeBalls();
    this.removeEscapedBalls();
  }

  getSnapshot(): PhysicsSnapshot {
    const now = performance.now();
    return {
      balls: this.balls.map((ball) => this.toBallSnapshot(ball)),
      pads: this.pads.map((pad) => this.toPadSnapshot(pad, now))
    };
  }

  get activeBallCount(): number {
    return this.balls.length;
  }

  get maxBallCount(): number {
    return MAX_ACTIVE_BALLS;
  }

  get availableBallSlots(): number {
    return Math.max(0, MAX_ACTIVE_BALLS - this.balls.length - this.pendingBallCount);
  }

  private rebuildStaticBodies(): void {
    Matter.Composite.remove(this.engine.world, [...this.walls, ...this.pads]);
    this.walls = this.createWalls();
    this.pads = this.createPads();
    Matter.Composite.add(this.engine.world, [...this.walls, ...this.pads]);
  }

  private createWalls(): Matter.Body[] {
    const options: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 1.02,
      friction: 0,
      render: { visible: false }
    };

    return [
      Matter.Bodies.rectangle(this.width / 2, -wallThickness / 2, this.width + wallThickness * 2, wallThickness, options),
      Matter.Bodies.rectangle(
        this.width / 2,
        this.height + wallThickness / 2,
        this.width + wallThickness * 2,
        wallThickness,
        options
      ),
      Matter.Bodies.rectangle(-wallThickness / 2, this.height / 2, wallThickness, this.height + wallThickness * 2, options),
      Matter.Bodies.rectangle(
        this.width + wallThickness / 2,
        this.height / 2,
        wallThickness,
        this.height + wallThickness * 2,
        options
      )
    ];
  }

  private createPads(): Matter.Body[] {
    return [...this.padConfigById.values()].map((pad) => {
      const restitution = pad.kind === 'portal' ? 1.26 : pad.kind === 'drum' ? 1.18 : 1.1;
      const body = Matter.Bodies.circle(pad.x * this.width, pad.y * this.height, pad.radius * this.width, {
        label: `pad:${pad.id}`,
        isStatic: true,
        restitution,
        friction: 0,
        render: { visible: false }
      });

      body.plugin = { padId: pad.id };
      return body;
    });
  }

  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
    const pad = bodyA.label.startsWith('pad:') ? bodyA : bodyB.label.startsWith('pad:') ? bodyB : null;

    if (!ball || !pad) {
      return;
    }

    const padId = String(pad.plugin.padId);
    const padConfig = this.padConfigById.get(padId);
    const now = performance.now();
    const lastHitAt = this.lastPadHitAt.get(padId) ?? 0;

    if (!padConfig || now - lastHitAt < 95) {
      return;
    }

    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    this.lastPadHitAt.set(padId, now);
    this.activePadUntil.set(padId, now + 180);

    if (padConfig.kind === 'portal') {
      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x * 1.08 + (Math.random() - 0.5) * 4,
        y: Math.min(ball.velocity.y - 4.5, -2)
      });
    }

    this.onPadHit(padConfig, speed);
  }

  private toBallSnapshot(ball: Matter.Body): BallSnapshot {
    const radius = ball.circleRadius ?? 12;

    return {
      id: Number(ball.plugin.bounceBoxId),
      x: ball.position.x,
      y: ball.position.y,
      radius,
      speed: Math.hypot(ball.velocity.x, ball.velocity.y)
    };
  }

  private toPadSnapshot(pad: Matter.Body, now: number): PadSnapshot {
    const padId = String(pad.plugin.padId);
    const config = this.padConfigById.get(padId);

    if (!config) {
      throw new Error(`Missing pad config for ${padId}`);
    }

    return {
      ...config,
      x: pad.position.x,
      y: pad.position.y,
      radius: pad.circleRadius ?? config.radius * this.width,
      isActive: (this.activePadUntil.get(padId) ?? 0) > now
    };
  }

  private removeEscapedBalls(): void {
    const keep: Matter.Body[] = [];

    for (const ball of this.balls) {
      const escaped =
        ball.position.x < -this.width ||
        ball.position.x > this.width * 2 ||
        ball.position.y < -this.height ||
        ball.position.y > this.height * 2;

      if (escaped) {
        Matter.Composite.remove(this.engine.world, ball);
      } else {
        keep.push(ball);
      }
    }

    this.balls = keep;
  }

  private stabilizeBalls(): void {
    const now = performance.now();

    for (const ball of this.balls) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const radius = ball.circleRadius ?? 12;
      const nearLeft = ball.position.x < radius * 2.2;
      const nearRight = ball.position.x > this.width - radius * 2.2;
      const nearTop = ball.position.y < radius * 2.2;
      const nearBottom = ball.position.y > this.height - radius * 2.2;
      const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);

      if (speed > maxSurfaceSpeed) {
        const scale = maxSurfaceSpeed / speed;
        Matter.Body.setVelocity(ball, {
          x: ball.velocity.x * scale,
          y: ball.velocity.y * scale
        });
        continue;
      }

      if (nearBottom && ball.velocity.y > -0.15) {
        Matter.Body.setVelocity(ball, {
          x: ball.velocity.x + (Math.random() - 0.5) * 0.8,
          y: -Math.max(1.9, Math.abs(ball.velocity.y) + 1.2)
        });
        ball.plugin.lastNudgedAt = now;
        continue;
      }

      const lastNudgedAt = Number(ball.plugin.lastNudgedAt ?? 0);

      if ((speed < minSurfaceSpeed || inCorner) && now - lastNudgedAt > 520) {
        const centerAngle = Math.atan2(this.height * 0.5 - ball.position.y, this.width * 0.5 - ball.position.x);
        const angle = inCorner ? centerAngle : Math.random() * Math.PI * 2;
        const impulseSpeed = inCorner ? targetSurfaceSpeed + 0.55 : targetSurfaceSpeed;

        Matter.Body.setVelocity(ball, {
          x: Math.cos(angle) * impulseSpeed,
          y: Math.sin(angle) * impulseSpeed
        });
        ball.plugin.lastNudgedAt = now;
      }
    }
  }

  private kickBalls(xBoost: number, yBoost: number): void {
    for (const ball of this.balls) {
      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x + (Math.random() - 0.5) * xBoost,
        y: ball.velocity.y + yBoost
      });
    }
  }

  private applyOrbitForces(): void {
    if (this.activeEffect !== 'orbit-chaos') {
      return;
    }

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (const ball of this.balls) {
      const dx = centerX - ball.position.x;
      const dy = centerY - ball.position.y;
      const distance = Math.max(80, Math.hypot(dx, dy));
      const pull = 0.000014 * ball.mass;
      const swirl = 0.000018 * ball.mass;

      Matter.Body.applyForce(ball, ball.position, {
        x: (dx / distance) * pull + (-dy / distance) * swirl,
        y: (dy / distance) * pull + (dx / distance) * swirl
      });
    }
  }

  private scheduleBall(
    delayMs: number,
    createOptions: () => { x: number; y: number; velocity: { x: number; y: number } }
  ): void {
    this.pendingBallCount += 1;
    const timer = window.setTimeout(() => {
      this.spawnTimers = this.spawnTimers.filter((id) => id !== timer);
      this.pendingBallCount = Math.max(0, this.pendingBallCount - 1);

      if (this.balls.length >= MAX_ACTIVE_BALLS) {
        return;
      }

      const options = createOptions();
      this.addBall(options.x, options.y, options.velocity);
    }, delayMs);

    this.spawnTimers.push(timer);
  }

  private clearPendingSpawns(): void {
    for (const timer of this.spawnTimers) {
      window.clearTimeout(timer);
    }

    this.spawnTimers = [];
    this.pendingBallCount = 0;
  }

  private setNormalGravity(): void {
    this.engine.gravity.x = 0;
    this.engine.gravity.y = normalGravityY;
  }
}
