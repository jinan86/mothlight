# mothlight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/jinan86/mothlight/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/jinan86/mothlight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

MOTHLIGHT — Keeper of the Night Garden: fly Pip the moth through a dark garden, chain glow-motes into combos, dodge wisps, bats and thorn-spitters, and light all eight lanterns to bring the dawn. A complete, original, offline browser game with boon choices, synthesized sound, and a best score that persists.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: the game is static files under `game/`, played with keyboard (WASD/arrows, Space to dash, P to pause, M to mute) or mouse (hold to steer).

## How it plays

- **Goal:** light all 8 lanterns by hovering close to each one. Light them all and dawn breaks — you win.
- **Score:** glow-motes chain into a combo multiplier (up to ×8); each lantern pays a bonus, and winning fast pays a time bonus.
- **Danger:** shadow wisps chase you, bats sweep across the garden, and thorn-spitters open fire once enough lanterns burn. Three hearts; a dash gives a brief moment of safety.
- **Boons:** every lantern lit offers a choice of three blessings — faster wings, a quicker dash, a stronger magnet, a brighter glow, a sturdier heart, or a mote charm.
- **Screens:** title, play with HUD, boon choice, pause, game over and dawn victory, each with stats and restart. Best score is kept in `localStorage`.

## Layout

- `game/` — the playable game as static files (`index.html` + `src/*.js`, plain ES modules, no libraries, no network requests)
- `game/src/config.js` — all tuning numbers in one place
- `game/src/world.js` — the simulation (pure logic, no DOM)
- `game/src/render.js` — all procedural art on one 2D canvas
- `game/src/audio.js` — WebAudio-synthesized sound, no audio files
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|play|win|over&seed=N`)
- `game/src/main.js` — boot and the fixed-step loop
- `screenshots/` — 4 real renders of the game's own code (title, play, win, game over)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play

---

Entered on [make.fun](https://make.fun/?ref={referral_code}&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
