# BounceBox

BounceBox is a mobile-first physics groovebox prototype. Bouncing balls collide with neon note pads to trigger synth notes, giving the app a playful foundation for MIDI-style generative music patterns.

This first pass focuses on a clean browser-app foundation: Vite, TypeScript, Canvas rendering, Matter.js physics, and a small Web Audio engine that unlocks reliably on the first user tap.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Controls

- **Start Audio** unlocks the Web Audio context.
- **Launch Ball** adds one bouncing ball to the canvas.
- **Generate Pattern** cycles through demo pattern data and assigns notes to pads.
- **Chaos** briefly changes gravity and nudges active balls.
- **Clear** removes active balls and resets the readout.

## Project Structure

```text
src/
  app/BounceBoxApp.ts       UI, canvas rendering, and app orchestration
  audio/audioEngine.ts      Small Web Audio synth engine
  physics/physicsWorld.ts   Matter.js world, balls, pads, and collisions
  patterns/demoPatterns.ts  JSON-friendly demo pattern data
  types.ts                  Shared app and pattern types
```

## Roadmap

- Add import/export for MIDI-style JSON patterns.
- Add quantized pattern lanes and optional tempo sync.
- Expand drum voices with kick, snare, hats, and sample slots.
- Add pad editing, scale selection, and saved scenes.
- Improve generative launch modes and ball sequencing rules.
