# BounceBox

BounceBox is a mobile-first physics groovebox. Bouncing balls collide with themed pads to trigger drums, bass, plucks, chords, and portal arpeggios, turning the canvas into a tactile loop-building instrument.

The app is a frontend-only Vite + TypeScript project. It uses Canvas for the playfield, Matter.js for physics, and a small Web Audio synth engine for sound. There is no backend, authentication, database, or OpenAI API integration.

## Themes

BounceBox has a typed theme system that drives both DOM styling and Canvas rendering. Theme configs live in `src/theme/` and include CSS custom properties for the app shell plus canvas tokens for playfield background, grid, pads, labels, glows, ripples, trails, balls, and FX styling.

Built-in skins:

- **808 Heritage** is the default, original vintage groovebox-inspired skin with warm cream and charcoal surfaces, tactile rectangular controls, muted shadows, rubber-style canvas pads, and restrained red/orange/yellow LED energy. It does not use third-party drum-machine branding.
- **Neon Lab** preserves the original bright BounceBox identity and keeps imported/pattern pad colors visible.

Use the **Theme** selector in the header to switch themes. The selected theme is stored in local storage and restored after refresh.

## Performance Mode

Pass 4 adds **Performance Mode**, a focused play surface for mobile performance. It hides the ChatGPT MIDI Lab, keeps the active pattern/tempo/key/ball/loop status visible, enlarges the main controls, and provides an **Exit** button to return to the full editing view.

Performance features:

- Drag pads with touch or mouse; pads stay inside the playfield and continue triggering collisions.
- **Marble Rain** drops a controlled stream of balls from the top.
- **Gravity Flip**, **Slow-Mo**, and **Orbit Chaos** are timed musical physics effects with visible countdowns.
- **Mutate Pattern** safely changes the active pattern by rotating notes, shifting octaves, changing a melodic role, varying accents, and pulsing changed pads.
- **Reset Pattern** restores the exact pattern and pad layout from before mutation.
- Controls are grouped into Launch, Groove, FX, and Pattern sections for one-handed mobile play.
- Stronger hit ripples, speed-reactive ball trails, pad glow states, beat pulse, and bigger feedback for kick/snare/portal hits.
- The active theme carries into Performance Mode, including the compact theme selector and themed playfield rendering.

## ChatGPT MIDI Lab

**ChatGPT MIDI Lab** is a paste-in workflow for turning ChatGPT-generated MIDI-style JSON into BounceBox pads and instruments.

How it works:

1. Ask ChatGPT for a BounceBox MIDI JSON pattern.
2. Paste the JSON into the **ChatGPT MIDI Lab** panel.
3. Click **Load JSON** to validate it.
4. Review the summary: pattern name, tempo, key, tracks, instruments, and event count.
5. Click **Apply**.
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

- **Audio** unlocks the Web Audio context.
- **Ball** adds one bouncing ball to the canvas.
- **Launch 3** adds three balls with a short stagger.
- **Rain** drops several balls from the top in a controlled spread.
- **Pattern** cycles through Neon Bounce, Skullstep, and Space Marbles.
- **Capture** freezes the last 4 bars of collision hits and replays them on the grid.
- **Stop** removes active balls while a frozen groove keeps playing.
- **Gravity** flips gravity for a few seconds.
- **Slow-Mo** slows physics while preserving loop playback.
- **Orbit** adds a centered swirl force for a few seconds.
- **Mutate** applies a constrained musical mutation.
- **Reset** restores the pattern before mutation.
- **Clear Loop** clears captured loop data.
- **Clear** removes active balls, loop data, trails, and hit effects.
- **Tempo -/+** adjusts the transport tempo.
- **Theme** switches between built-in visual themes and persists the choice locally.

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
  app/padInteraction.ts     Touch/mouse pad dragging
  app/performanceControls.ts Timed performance effect state
  app/visualEffects.ts      Shared visual effect models/helpers
  audio/audioEngine.ts      Web Audio synth voices and output limiting
  audio/transport.ts        Tempo, bars, beats, and quantized steps
  physics/physicsWorld.ts   Matter.js world, balls, pads, and collisions
  patterns/demoPatterns.ts  Built-in JSON-friendly patterns
  patterns/importPattern.ts Paste-in JSON parser, validator, and mapper
  patterns/loopRecorder.ts  4-bar capture and frozen loop playback
  patterns/mutations.ts     Constrained musical pattern mutations
  theme/applyTheme.ts       Applies CSS custom properties for the active skin
  theme/themeStore.ts       Local-storage persistence for selected theme
  theme/themeTypes.ts       Typed DOM and Canvas theme contracts
  theme/themes.ts           Built-in Neon Lab and 808 Heritage theme configs
  types.ts                  Shared app, pattern, import, and transport types
```

## Test Checklist

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run dev` and open the local URL in a desktop browser or mobile preview.
4. Tap **Audio** once, then verify sound after **Ball**.
5. Enter **Performance Mode**, then exit back to the Lab view.
6. Drag pads around the playfield and confirm moved pads still trigger.
7. Try **Ball**, **Launch 3**, **Rain**, **Stop**, and **Clear**.
8. Capture a loop, stop the balls, and confirm the frozen loop keeps playing.
9. Try **Gravity**, **Slow-Mo**, and **Orbit** and watch their countdowns reset.
10. Use **Mutate** and confirm pad labels or accents update with a toast, then **Reset** and confirm the previous pad layout returns.
11. In ChatGPT MIDI Lab, use the example JSON, load it, apply it, and verify Performance Mode still works after import.
12. Switch between **Neon Lab** and **808 Heritage** in Lab Mode and Performance Mode.
13. Refresh the page and confirm the selected skin persists.
14. Confirm the playfield canvas changes with the theme, including pads, grid, beat LEDs, balls, trails, and ripples.
15. Check a narrow mobile viewport and confirm button labels remain readable.
16. Check the browser console for runtime errors.

## Roadmap

- Add paste history and downloadable pattern JSON.
- Add editable quantized pattern lanes.
- Add optional sample slots for custom drums.
- Add scale selection, pad locking, and saved scenes.
- Add direct MIDI file export.
- Add optional OpenAI API integration later, while keeping paste-in mode.
