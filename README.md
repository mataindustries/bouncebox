# BounceBox

BounceBox is a mobile-first physics groovebox prototype. Bouncing balls collide with neon pads to trigger drums, bass, plucks, chords, and portal arpeggios, turning the playfield into a tactile loop-building instrument.

The current Pass 2 build keeps the clean Vite + TypeScript foundation and adds a simple musical transport, 4-bar loop capture, role-based pads, richer Web Audio synthesis, and safer mobile controls.

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
- **Launch 3** adds three balls with a short stagger.
- **Generate Pattern** cycles through Neon Bounce, Skullstep, and Space Marbles.
- **Chaos** briefly changes gravity and nudges active balls.
- **Capture Loop** freezes the last 4 bars of collision hits and replays them on the grid.
- **Stop Balls** removes active balls while a frozen groove keeps playing.
- **Clear Loop** clears captured loop data.
- **Clear** removes active balls, loop data, trails, and hit effects.
- **Tempo -/+** adjusts the transport tempo.

## Pass 2 Features

- 4-bar transport with visible bar/beat and 16-step indicator.
- Light collision quantization for musical timing while keeping hits responsive.
- Loop recorder that captures recent pad hits as `GrooveEvent` data.
- Distinct instrument roles: kick, snare, hi-hat, bass, pluck, pad/chord, and portal.
- Pattern data shaped for future ChatGPT-generated MIDI JSON import.
- Role-aware bumpers, portal arpeggios, hit ripples, ball trails, and subtle screen shake.
- Mobile-first sticky control panel with safe-area padding.

## Project Structure

```text
src/
  app/BounceBoxApp.ts       UI, canvas rendering, and app orchestration
  audio/audioEngine.ts      Small Web Audio synth engine
  audio/transport.ts        Tempo, bars, beats, and quantized steps
  physics/physicsWorld.ts   Matter.js world, balls, pads, and collisions
  patterns/loopRecorder.ts  4-bar capture and frozen loop playback
  patterns/demoPatterns.ts  JSON-friendly demo pattern data
  types.ts                  Shared app and pattern types
```

## Test Checklist

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run dev` and open the local URL on desktop or a phone.
4. Tap **Start Audio** before expecting sound.
5. Try **Launch Ball**, **Launch 3**, **Generate Pattern**, **Chaos**, **Capture Loop**, **Stop Balls**, **Clear Loop**, and **Clear**.
6. Confirm the bottom controls remain reachable on a mobile browser and are not hidden behind the browser navigation area.
7. Confirm the beat indicator advances, captured loops replay, and no console errors appear.

## Roadmap

- Add paste/import for MIDI-style JSON patterns.
- Add editable quantized pattern lanes.
- Add optional sample slots for custom drums.
- Add pad editing, scale selection, and saved scenes.
- Improve generative launch modes and ball sequencing rules.
