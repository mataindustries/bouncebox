import Matter from 'matter-js';
import type { PerformanceEffectId } from '../app/performanceControls';
import type { BallSnapshot, DemoPattern, PadPattern, PadSnapshot, PhysicsSnapshot } from '../types';
import { demoPatterns } from '../patterns/demoPatterns';

type PadHitHandler = (pad: PadPattern, speed: number) => void;

export const MAX_ACTIVE_BALLS = 6;

const wallThickness = 96;
const normalGravityY = 0.045;
const gravityFlipY = -0.16;
const orbitGravityY = 0;
const minSurfaceSpeed = 2.15;
const targetSurfaceSpeed = 4.25;
const maxSurfaceSpeed = 9.8;
const turboMaxSurfaceSpeed = 11.4;
const stalledMs = 1000;

interface MotionPhysicsProfile {
  ratio: number;
  launchSpeedScale: number;
  rainSpeedScale: number;
  driftScale: number;
  fieldPulseScale: number;
  minSurfaceSpeed: number;
  targetSurfaceSpeed: number;
  stalledMs: number;
  nudgeCooldownMs: number;
  collisionCooldownMs: number;
  bottomLift: number;
  bottomBoost: number;
}

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
  private motionLevel = 0;
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

  setMotionLevel(level: number): void {
    this.motionLevel = Math.min(1, Math.max(-1, level));
    this.setBounceEnergy(this.activeEffect === 'turbo');

    for (const ball of this.balls) {
      ball.frictionAir = this.getBallFrictionAir();
    }
  }

  launchBall(count = 1): number {
    const requestedCount = Math.max(1, Math.floor(count));
    const launchCount = Math.min(requestedCount, this.availableBallSlots);

    for (let index = 0; index < launchCount; index += 1) {
      this.scheduleBall(index * 95, () => {
        const profile = this.motionProfile;
        const angle = -0.45 + Math.random() * 0.9;
        const speed = (5 + Math.random() * 2.3 + index * 0.28) * profile.launchSpeedScale;

        return {
          x: this.width * (0.32 + Math.random() * 0.36),
          y: this.height * (0.14 + Math.random() * 0.1),
          velocity: {
            x: Math.sin(angle) * speed + (Math.random() - 0.5) * 3.2 * profile.driftScale,
            y: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2 * profile.driftScale
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
        const profile = this.motionProfile;
        const spread = rainCount <= 1 ? 0.5 : index / (rainCount - 1);
        const sideBias = spread - 0.5;

        return {
          x: this.width * (0.14 + spread * 0.72) + (Math.random() - 0.5) * this.width * 0.045,
          y: this.height * (0.1 + Math.random() * 0.08),
          velocity: {
            x: (sideBias * 5.4 + (Math.random() - 0.5) * 2.8) * profile.rainSpeedScale,
            y: (-2.8 - Math.random() * 2.2) * profile.rainSpeedScale
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

    if (effectId === 'gravity-flip') {
      this.activeEffect = effectId;
      this.engine.gravity.x = 0;
      this.engine.gravity.y = gravityFlipY;
      this.kickBalls(1.2, -2.4);
    }

    if (effectId === 'turbo') {
      this.activeEffect = effectId;
      this.engine.timing.timeScale = 1.08;
      this.setNormalGravity();
      this.setBounceEnergy(true);
      this.boostBalls(1.34, 1.4);
    } else if (effectId === 'orbit-chaos') {
      this.activeEffect = effectId;
      this.engine.gravity.x = 0;
      this.engine.gravity.y = orbitGravityY;
      this.kickBalls(2.8, -1.6);
    }
  }

  resetPerformanceEffect(): void {
    this.activeEffect = null;
    this.setNormalGravity();
    this.engine.timing.timeScale = 1;
    this.setBounceEnergy(false);
  }

  private addBall(x = this.width * (0.35 + Math.random() * 0.3), y?: number, velocity?: { x: number; y: number }): boolean {
    if (this.balls.length >= MAX_ACTIVE_BALLS) {
      return false;
    }

    const radius = Math.max(10, Math.min(16, this.width * 0.035));
    const ball = Matter.Bodies.circle(x, y ?? radius + 20, radius, {
      label: 'ball',
      restitution: this.getBallRestitution(this.activeEffect === 'turbo'),
      friction: 0,
      frictionAir: this.getBallFrictionAir(),
      density: 0.0018,
      render: { visible: false }
    });

    ball.plugin = { bounceBoxId: this.nextBallId, lastNudgedAt: 0, lowSpeedSince: 0 };
    Matter.Body.setVelocity(ball, velocity ?? { x: (Math.random() - 0.5) * 7.8, y: 3.4 + Math.random() * 2.3 });

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

  pulseField(strength = 1): void {
    const now = performance.now();
    const profile = this.motionProfile;
    const pulseStrength = strength * profile.fieldPulseScale;

    for (const ball of this.balls) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);

      if (speed > profile.targetSurfaceSpeed * (this.activeEffect === 'turbo' ? 1.35 : 0.98)) {
        continue;
      }

      const centerAngle = Math.atan2(ball.position.y - this.height * 0.5, ball.position.x - this.width * 0.5);
      const angle = centerAngle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.75;
      const impulseSpeed = Math.min(
        this.currentMaxSurfaceSpeed,
        Math.max(speed + 0.8 * pulseStrength, profile.targetSurfaceSpeed * pulseStrength)
      );

      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x * 0.45 + Math.cos(angle) * impulseSpeed,
        y: ball.velocity.y * 0.45 + Math.sin(angle) * impulseSpeed
      });
      ball.plugin.lastNudgedAt = now;
      ball.plugin.lowSpeedSince = 0;
    }
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
      restitution: this.getWallRestitution(this.activeEffect === 'turbo'),
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
      const body = Matter.Bodies.circle(pad.x * this.width, pad.y * this.height, pad.radius * this.width, {
        label: `pad:${pad.id}`,
        isStatic: true,
        restitution: this.getPadRestitution(pad, this.activeEffect === 'turbo'),
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

    if (!padConfig || now - lastHitAt < this.motionProfile.collisionCooldownMs) {
      return;
    }

    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    this.lastPadHitAt.set(padId, now);
    this.activePadUntil.set(padId, now + 180);

    if (padConfig.kind === 'portal') {
      const portalBoost = 0.82 + this.motionProfile.ratio * 0.36;
      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x * (1.06 + this.motionProfile.ratio * 0.12) + (Math.random() - 0.5) * 4.8 * portalBoost,
        y: Math.min(ball.velocity.y - 5.2 * portalBoost, -2.4)
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
    const profile = this.motionProfile;

    for (const ball of this.balls) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const radius = ball.circleRadius ?? 12;
      const nearLeft = ball.position.x < radius * 2.2;
      const nearRight = ball.position.x > this.width - radius * 2.2;
      const nearTop = ball.position.y < radius * 2.2;
      const nearBottom = ball.position.y > this.height - radius * 2.2;
      const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);

      if (speed > this.currentMaxSurfaceSpeed) {
        const scale = this.currentMaxSurfaceSpeed / speed;
        Matter.Body.setVelocity(ball, {
          x: ball.velocity.x * scale,
          y: ball.velocity.y * scale
        });
        continue;
      }

      if (nearBottom && ball.velocity.y > -0.15) {
        Matter.Body.setVelocity(ball, {
          x: ball.velocity.x + (Math.random() - 0.5) * 0.8 * profile.driftScale,
          y: -Math.max(profile.bottomLift, Math.abs(ball.velocity.y) + profile.bottomBoost)
        });
        ball.plugin.lastNudgedAt = now;
        continue;
      }

      const lastNudgedAt = Number(ball.plugin.lastNudgedAt ?? 0);
      const lowSpeedSince = Number(ball.plugin.lowSpeedSince ?? 0);

      if (speed < profile.minSurfaceSpeed) {
        if (!lowSpeedSince) {
          ball.plugin.lowSpeedSince = now;
        }
      } else {
        ball.plugin.lowSpeedSince = 0;
      }

      if (
        (inCorner || (speed < profile.minSurfaceSpeed && now - (lowSpeedSince || now) > profile.stalledMs)) &&
        now - lastNudgedAt > profile.nudgeCooldownMs
      ) {
        const centerAngle = Math.atan2(this.height * 0.5 - ball.position.y, this.width * 0.5 - ball.position.x);
        const angle = inCorner ? centerAngle : Math.random() * Math.PI * 2;
        const impulseSpeed = inCorner ? profile.targetSurfaceSpeed + 0.9 : profile.targetSurfaceSpeed;

        Matter.Body.setVelocity(ball, {
          x: Math.cos(angle) * impulseSpeed,
          y: Math.sin(angle) * impulseSpeed
        });
        ball.plugin.lastNudgedAt = now;
        ball.plugin.lowSpeedSince = 0;
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
      const pull = 0.000016 * ball.mass;
      const swirl = 0.000024 * ball.mass;

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

  private boostBalls(multiplier: number, extraSpeed: number): void {
    for (const ball of this.balls) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const fallbackAngle = Math.random() * Math.PI * 2;
      const angle = speed > 0.01 ? Math.atan2(ball.velocity.y, ball.velocity.x) : fallbackAngle;
      const nextSpeed = Math.min(this.currentMaxSurfaceSpeed, Math.max(this.motionProfile.targetSurfaceSpeed, speed * multiplier + extraSpeed));

      Matter.Body.setVelocity(ball, {
        x: Math.cos(angle) * nextSpeed + (Math.random() - 0.5) * 0.7,
        y: Math.sin(angle) * nextSpeed + (Math.random() - 0.5) * 0.7
      });
      ball.plugin.lowSpeedSince = 0;
    }
  }

  private setBounceEnergy(turbo: boolean): void {
    for (const wall of this.walls) {
      wall.restitution = this.getWallRestitution(turbo);
    }

    for (const ball of this.balls) {
      ball.restitution = this.getBallRestitution(turbo);
      ball.frictionAir = this.getBallFrictionAir();
    }

    for (const pad of this.pads) {
      const padConfig = this.padConfigById.get(String(pad.plugin.padId));

      if (padConfig) {
        pad.restitution = this.getPadRestitution(padConfig, turbo);
      }
    }
  }

  private getPadRestitution(pad: PadPattern, turbo: boolean): number {
    const base = pad.kind === 'portal' ? 1.32 : pad.kind === 'drum' ? 1.24 : 1.16;
    const motionBoost = (this.motionProfile.ratio - 0.5) * 0.08;
    return Math.min(1.42, Math.max(1.08, base + motionBoost + (turbo ? 0.06 : 0)));
  }

  private getWallRestitution(turbo: boolean): number {
    const ratio = this.motionProfile.ratio;
    return turbo ? 1.06 + ratio * 0.04 : 0.99 + ratio * 0.1;
  }

  private getBallRestitution(turbo: boolean): number {
    const ratio = this.motionProfile.ratio;
    return turbo ? 1.01 + ratio * 0.04 : 0.97 + ratio * 0.06;
  }

  private getBallFrictionAir(): number {
    return 0.00115 - this.motionProfile.ratio * 0.00055;
  }

  private get currentMaxSurfaceSpeed(): number {
    const motionSpeedScale = 0.86 + this.motionProfile.ratio * 0.16;
    const baseMaxSpeed = this.activeEffect === 'turbo' ? turboMaxSurfaceSpeed : maxSurfaceSpeed;
    return baseMaxSpeed * motionSpeedScale;
  }

  private get motionProfile(): MotionPhysicsProfile {
    const ratio = (this.motionLevel + 1) / 2;

    return {
      ratio,
      launchSpeedScale: 0.74 + ratio * 0.54,
      rainSpeedScale: 0.72 + ratio * 0.5,
      driftScale: 0.72 + ratio * 0.55,
      fieldPulseScale: 0.82 + ratio * 0.36,
      minSurfaceSpeed: minSurfaceSpeed * (0.74 + ratio * 0.5),
      targetSurfaceSpeed: targetSurfaceSpeed * (0.78 + ratio * 0.26),
      stalledMs: stalledMs * (1.45 - ratio * 0.8),
      nudgeCooldownMs: 760 - ratio * 460,
      collisionCooldownMs: 138 - ratio * 60,
      bottomLift: 1.65 + ratio * 0.7,
      bottomBoost: 0.82 + ratio * 0.82
    };
  }
}
