# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A fully offline, static-site web game for toddlers aged 12–18 months. Zero backend, zero external assets. Deploy directly to Netlify by uploading the three files.

## File Structure

```
index.html          ← Shell + all DOM (canvas, gear button, PIN modal, sleep screen)
css/style.css       ← Viewport lock, all UI styles, animations
js/app.js           ← Entire application (~1500 lines, no dependencies)
```

No build step required — open `index.html` directly in a browser or serve with `npx serve .`.

## State Machine (DFA)

```
LOCKED_PIN → GAME_PLAY → WIND_DOWN → SLEEP
                ↑             |
                └─────────────┘  (via PIN reset)
```

`GAME_PLAY` has three rotating sub-states (3–4 min each): `POPPING` → `PEEKABOO` → `PAINTING` (random order, smooth fade transition).

## Architecture in `js/app.js`

Sections in order:
1. **Polyfills** — `CanvasRenderingContext2D.prototype.roundRect`
2. **Constants** — `STATE`, `SUB`, `PENTATONIC`, `PIN_DIGITS`, `PASTEL`
3. **`SoundEngine`** — lazy `AudioContext`, pop/animal/lullaby/theremin synthesis
4. **`ParticlePool`** — pre-allocated 220-object pool, no GC during gameplay
5. **`drawCat/drawDuck/drawFrog`** — pure Canvas 2D animal drawing, no images
6. **`BubbleGame`** — sine-drift bubbles (3–5), touch-to-pop, 12-particle explosion
7. **`PeekabooGame`** — spring-damper blocker animation revealing smiling sun
8. **`PaintingGame`** — offscreen canvas + bezier trails + theremin (Y→pitch, X→pan)
9. **`WindDown`** — slows speed to 25%, desaturates canvas, sweeps lullaby lowpass
10. **`SleepState`** — shows breathing SVG bunny, disables all input
11. **`PINSystem`** — PIN = [8, 2, 5] displayed as written words ("Eight · Two · Five")
12. **`App`** — main orchestrator, rAF loop, DFA transitions, touch routing

## Key Implementation Notes

- `AudioContext` is initialized lazily on first user gesture (autoplay policy)
- All touch handlers use `{ passive: false }` + `e.preventDefault()` to block native zoom/scroll
- `canvas.style.filter = 'saturate(x)'` provides wind-down desaturation
- Mouse events are wired as fallback for desktop testing
- PIN validation: digit buttons -1 = backspace, -2 = clear all; success shows config panel
- Sub-game transition: 20-frame fade-out → swap + reinit → 20-frame fade-in
- `ParticlePool.releaseAll()` is called on each sub-game start to clear stale particles
- Painting game uses a persistent offscreen `<canvas>` so paint strokes survive rAF redraws

## Audio Synthesis Quick Reference

| Sound | Type | Key parameters |
|---|---|---|
| Pop | Sine sweep | 800 → 100 Hz, 50ms, exp decay |
| Duck | Triangle + bandpass | 400 → 150 Hz, bandpass @ 900 Hz |
| Cat | Sine | 600 → 850 → 700 Hz over 400ms |
| Frog | Sawtooth + LFO | 80 Hz carrier, 20 Hz LFO |
| Painting | Triangle + sine sub | Y → pentatonic freq, X → stereo pan |
| Lullaby | Sine sub-octave | Twinkle Twinkle, through lowpass BiquadFilter |
