import Matter from 'matter-js';
import type { BallSnapshot, DemoPattern, PadPattern, PadSnapshot, PhysicsSnapshot } from '../types';
import { demoPatterns } from '../patterns/demoPatterns';

type PadHitHandler = (pad: PadPattern, speed: number) => void;

const wallThickness = 96;

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
  private readonly onPadHit: PadHitHandler;

  tempo = demoPatterns[0].tempo;
  key = demoPatterns[0].key;

  constructor(onPadHit: PadHitHandler) {
    this.onPadHit = onPadHit;
    this.engine.gravity.y = 0.72;
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

  launchBall(count = 1): void {
    for (let index = 0; index < count; index += 1) {
      window.setTimeout(() => this.addBall(), index * 110);
    }
  }

  stopBalls(): void {
    this.clearBalls();
  }

  private addBall(): void {
    const radius = Math.max(10, Math.min(16, this.width * 0.035));
    const ball = Matter.Bodies.circle(this.width * (0.35 + Math.random() * 0.3), radius + 20, radius, {
      label: 'ball',
      restitution: 0.96,
      friction: 0,
      frictionAir: 0.002,
      density: 0.0018,
      render: { visible: false }
    });

    ball.plugin = { bounceBoxId: this.nextBallId };
    Matter.Body.setVelocity(ball, {
      x: (Math.random() - 0.5) * 7,
      y: 3 + Math.random() * 2
    });

    this.nextBallId += 1;
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
  }

  clearBalls(): void {
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
    this.engine.gravity.y = -0.35 - Math.random() * 0.35;

    for (const ball of this.balls) {
      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x * 1.18 + (Math.random() - 0.5) * 5,
        y: ball.velocity.y * 1.18 - Math.random() * 5
      });
    }

    this.chaosTimer = window.setTimeout(() => {
      this.engine.gravity.x = 0;
      this.engine.gravity.y = 0.72;
      this.chaosTimer = null;
    }, 3200);
  }

  step(deltaMs: number): void {
    Matter.Engine.update(this.engine, Math.min(deltaMs, 1000 / 30));
    this.nudgeSlowBalls();
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

  private rebuildStaticBodies(): void {
    Matter.Composite.remove(this.engine.world, [...this.walls, ...this.pads]);
    this.walls = this.createWalls();
    this.pads = this.createPads();
    Matter.Composite.add(this.engine.world, [...this.walls, ...this.pads]);
  }

  private createWalls(): Matter.Body[] {
    const options: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 1,
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

  private nudgeSlowBalls(): void {
    for (const ball of this.balls) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const nearBottom = ball.position.y > this.height * 0.78;

      if (speed < 0.45 && nearBottom) {
        Matter.Body.setVelocity(ball, {
          x: (Math.random() - 0.5) * 3.2,
          y: -4.2 - Math.random() * 1.8
        });
      }
    }
  }
}
