# BounceBox

A hardware-inspired physics groovebox where bouncing balls trigger drums, bass, chords, and AI-generated MIDI patterns.

**Live demo:** https://bouncebox.pages.dev

BounceBox is an experimental browser instrument built around kinetic sequencing. Balls move through a Matter.js playfield, collide with musical pads, and turn physics events into drums, basslines, chords, leads, arps, and effects.

## Portfolio Summary

BounceBox is an experimental browser instrument that blends physics gameplay, audio systems, mobile interaction design, and AI-generated pattern input.

## Overview

The project is a frontend-only Vite + TypeScript app with Canvas rendering, Matter.js physics, and a custom Web Audio synth engine. It is designed to feel like a compact hardware groovebox translated into a browser: tactile controls, responsive mobile layouts, playable performance effects, and a paste-in pattern workflow for ChatGPT-generated MIDI-style JSON.

There is no backend, authentication, database, or OpenAI API integration. The AI workflow is intentionally local and transparent: generate JSON elsewhere, paste it into BounceBox, validate it, and play it.

## Key Features

- Physics-driven sequencing with balls, pads, collisions, trails, hit ripples, and beat-synced feedback.
- Web Audio synth voices for kick, snare, hats, bass, lead, pluck, pad, chord, arp, and FX parts.
- Built-in demo patterns including Neon Bounce, Skullstep, and Space Marbles.
- ChatGPT MIDI Lab for validating and applying AI-generated MIDI-style JSON patterns.
- Performance Mode for focused mobile play with larger controls and live effect triggers.
- Loop capture that freezes recent collision hits into a replayable 4-bar groove.
- Controlled pattern mutation with reset support.
- Touch and mouse pad dragging inside the physics canvas.
- Theme system with 808 Heritage and Neon Lab skins persisted in local storage.
- Frontend-only deployment target suitable for Cloudflare Pages.

## ChatGPT MIDI Lab

ChatGPT MIDI Lab is a paste-in workflow for using AI-generated pattern ideas without wiring the app to an API. Ask ChatGPT for a BounceBox MIDI JSON pattern, paste the result into the lab panel, validate it, review the summary, and apply it to the playfield.

The importer validates malformed JSON, missing fields, unsupported instruments, and unsafe values. Tempo, velocity, note length, timing, and octave values are clamped into playable ranges before they touch the audio or physics systems.

Supported instruments:

```text
kick, snare, hat, bass, lead, pluck, pad, chord, arp, fx
```

Starter prompt:

```text
Create a BounceBox MIDI JSON pattern in C minor with drums, bass, lead, and weird playful sound design.
```

## Performance Mode

Performance Mode turns BounceBox into a focused live-play surface for mobile and desktop use. It hides the full lab panel, keeps the active pattern, tempo, key, ball count, and loop state visible, and presents larger controls for launching balls, capturing grooves, triggering effects, and mutating patterns.

Performance controls include Marble Rain, Gravity Flip, Turbo, Orbit Chaos, Echo, Stutter, Filter Sweep, Mutate Pattern, and Reset Pattern. Timed effects display countdowns, moved pads remain playable, and the selected visual theme carries into the performance view.

## 808 Heritage Theme

808 Heritage is the default visual skin. It gives BounceBox a warm, hardware-inspired interface with cream and charcoal surfaces, rectangular controls, muted shadows, rubber-like canvas pads, and restrained red, orange, and yellow LED energy.

The theme is an homage to vintage drum-machine design language, not a use of third-party branding. BounceBox also includes Neon Lab, which preserves the brighter original visual identity and keeps imported pattern colors prominent.

## Tech Stack

- Vite
- TypeScript
- Matter.js
- HTML Canvas
- Web Audio API
- CSS custom properties
- Cloudflare Pages

## Local Development

Install dependencies:

```bash
npm install
```

Start the local Vite server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Build And Deploy

BounceBox is deployed as a static Vite app on Cloudflare Pages.

Cloudflare Pages settings:

```text
Build command: npm run build
Build output directory: dist
Root directory: /
```

The live production URL is:

```text
https://bouncebox.pages.dev
```

## Project Structure

```text
src/
  app/BounceBoxApp.ts        UI, canvas rendering, and app orchestration
  app/MidiLabPanel.ts        ChatGPT MIDI Lab panel and UI state
  app/padInteraction.ts      Touch/mouse pad dragging
  app/performanceControls.ts Timed performance effect state
  app/visualEffects.ts       Shared visual effect models/helpers
  audio/audioEngine.ts       Web Audio synth voices and output limiting
  audio/transport.ts         Tempo, bars, beats, and quantized steps
  physics/physicsWorld.ts    Matter.js world, balls, pads, and collisions
  patterns/demoPatterns.ts   Built-in JSON-friendly patterns
  patterns/importPattern.ts  Paste-in JSON parser, validator, and mapper
  patterns/loopRecorder.ts   4-bar capture and frozen loop playback
  patterns/mutations.ts      Constrained musical pattern mutations
  theme/applyTheme.ts        Applies CSS custom properties for the active skin
  theme/themeStore.ts        Local-storage persistence for selected theme
  theme/themeTypes.ts        Typed DOM and Canvas theme contracts
  theme/themes.ts            Built-in Neon Lab and 808 Heritage theme configs
  types.ts                   Shared app, pattern, import, and transport types
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
9. Try **Gravity**, **Turbo**, **Orbit**, **Echo**, **Stutter**, and **Filter** and watch their countdowns reset.
10. Use **Mutate** and confirm pad labels or accents update with a toast, then **Reset** and confirm the previous pad layout returns.
11. In ChatGPT MIDI Lab, use a valid JSON pattern, load it, apply it, and verify Performance Mode still works after import.
12. Switch between **Neon Lab** and **808 Heritage** in Lab Mode and Performance Mode.
13. Refresh the page and confirm the selected skin persists.
14. Confirm the playfield canvas changes with the theme, including pads, grid, beat LEDs, balls, trails, and ripples.
15. Check a narrow mobile viewport and confirm button labels remain readable.
16. Check the browser console for runtime errors.

## Roadmap / Future Ideas

- Pattern paste history and downloadable JSON exports.
- Editable quantized pattern lanes.
- Optional sample slots for custom drums.
- Scale selection, pad locking, and saved scenes.
- Direct MIDI file export.
- Optional OpenAI API integration while keeping the current paste-in workflow.
- Additional performance macros and hardware-style control mappings.
