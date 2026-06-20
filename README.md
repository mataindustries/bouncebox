# BounceBox

BounceBox is a mobile-first physics groovebox. Bouncing balls collide with neon pads to trigger drums, bass, plucks, chords, and portal arpeggios, turning the canvas into a tactile loop-building instrument.

The app is a frontend-only Vite + TypeScript project. It uses Canvas for the playfield, Matter.js for physics, and a small Web Audio synth engine for sound. There is no backend, authentication, database, or OpenAI API integration.

## ChatGPT MIDI Lab

Pass 3 adds **ChatGPT MIDI Lab**, a paste-in workflow for turning ChatGPT-generated MIDI-style JSON into BounceBox pads and instruments.

How it works:

1. Ask ChatGPT for a BounceBox MIDI JSON pattern.
2. Paste the JSON into the **ChatGPT MIDI Lab** panel.
3. Click **Load JSON** to validate it.
4. Review the summary: pattern name, tempo, key, tracks, instruments, and event count.
5. Click **Apply to Playfield**.
6. Launch balls and play the imported pattern as a physics instrument.

Mini prompt:

```text
Create a BounceBox MIDI JSON pattern in C minor with drums, bass, lead, and weird playful sound design.
```

The importer validates malformed JSON, missing fields, unsupported instruments, and unsafe values. Tempo, velocity, note length, timing, and octave values are clamped into safe playable ranges.

Supported instruments:

```text
kick, snare, hat, bass, lead, pluck, pad, chord, arp, fx
```

## Example JSON

```json
{
  "name": "Skullstep Playground",
  "tempo": 112,
  "key": "C minor",
  "swing": 0.12,
  "tracks": [
    {
      "name": "Kick Engine",
      "instrument": "kick",
      "notes": [
        { "time": 0, "note": "C1", "length": 0.25, "velocity": 0.95 },
        { "time": 1, "note": "C1", "length": 0.25, "velocity": 0.9 }
      ]
    },
    {
      "name": "Bass Marbles",
      "instrument": "bass",
      "notes": [
        { "time": 0, "note": "C2", "length": 0.5, "velocity": 0.8 },
        { "time": 1.5, "note": "Eb2", "length": 0.5, "velocity": 0.75 }
      ]
    },
    {
      "name": "Playground Lead",
      "instrument": "lead",
      "notes": [
        { "time": 0.75, "note": "C4", "length": 0.25, "velocity": 0.62 },
        { "time": 2.25, "note": "Eb4", "length": 0.25, "velocity": 0.58 },
        { "time": 3, "note": "G4", "length": 0.25, "velocity": 0.64 }
      ]
    }
  ]
}
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

## Project Structure

```text
src/
  app/BounceBoxApp.ts       UI, canvas rendering, and app orchestration
  app/MidiLabPanel.ts       ChatGPT MIDI Lab panel and UI state
  audio/audioEngine.ts      Web Audio synth voices and output limiting
  audio/transport.ts        Tempo, bars, beats, and quantized steps
  physics/physicsWorld.ts   Matter.js world, balls, pads, and collisions
  patterns/demoPatterns.ts  Built-in JSON-friendly patterns
  patterns/importPattern.ts Paste-in JSON parser, validator, and mapper
  patterns/loopRecorder.ts  4-bar capture and frozen loop playback
  types.ts                  Shared app, pattern, import, and transport types
```

## Roadmap

- Add paste history and downloadable pattern JSON.
- Add editable quantized pattern lanes.
- Add optional sample slots for custom drums.
- Add pad editing, scale selection, and saved scenes.
- Add direct MIDI file export.
- Add optional OpenAI API integration later, while keeping paste-in mode.
