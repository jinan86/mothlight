// MOTHLIGHT — the screenshot scenes behind ?shot=title|play|win|over.
// Each one plays the real rules forward from a fresh world for a fixed number
// of steps, steered by an autopilot, so the frame is what a real game looks
// like and the same seed always gives the same frame.
//
// The pilot steers toward a goal (the nearest unlit lantern, else the
// nearest mote) while pushing away from anything that can hurt Pip, and
// dashes when a wisp gets too close. The win scene's pilot is patient and
// never channels a lantern while a wisp is near; the game-over scene's pilot
// is reckless, so the night catches it.
import { EVENT_OVER, EVENT_WIN, LANTERNS, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP, VIEW } from './config.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 24;
const LIMIT_SECONDS = 420;
const SAMPLE = 1 / 30;

/** Repulsion from a threat at (x, y), scaled by how close it is. */
function fleeFrom(state, x, y, radius, weight, out) {
  const dx = state.player.x - x;
  const dy = state.player.y - y;
  const d = Math.hypot(dx, dy);
  if (d < radius && d > 0.01) {
    const f = weight * (1 - d / radius);
    out.x += (dx / d) * f;
    out.y += (dy / d) * f;
    return f;
  }
  return 0;
}

function autopilot(state, cautious) {
  const p = state.player;
  const steer = { x: 0, y: 0 };
  let danger = 0;
  for (const w of state.wisps) {
    if (w.active) danger += fleeFrom(state, w.x, w.y, 170, 2.2, steer);
  }
  for (const b of state.bats) {
    if (b.active) danger += fleeFrom(state, b.x, b.y, 150, 2.0, steer);
  }
  for (const t of state.thorns) {
    if (t.active) danger += fleeFrom(state, t.x, t.y, 120, 1.6, steer);
  }

  // Goal: the nearest unlit lantern — unless danger is close and we are
  // cautious, in which case run first and light later.
  let target = null;
  let targetLantern = -1;
  if (!cautious || danger < 1.2) {
    let bestD2 = Infinity;
    for (let i = 0; i < state.lanterns.length; i += 1) {
      const l = state.lanterns[i];
      if (l.lit) continue;
      const d2 = (l.x - p.x) ** 2 + (l.y - p.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = l;
        targetLantern = i;
      }
    }
  }
  if (!target) {
    let bestD2 = Infinity;
    for (const m of state.motes) {
      if (!m.active) continue;
      const d2 = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = m;
      }
    }
  }
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    // Ease off as we arrive, so the moth settles to channel a lantern.
    const approach = targetLantern >= 0 ? Math.min(1, d / 60) : 1;
    steer.x += (dx / d) * approach;
    steer.y += (dy / d) * approach;
  }
  const len = Math.hypot(steer.x, steer.y);
  const move = len > 0.01 ? { x: steer.x / len, y: steer.y / len, dash: false } : { x: 0, y: 0, dash: false };
  // Dash away when something is nearly on top of Pip.
  if (danger > 2.4 && p.dashCooldown <= 0) {
    move.dash = true;
  }
  return move;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any unknown name stages the title.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'win' && name !== 'over') {
    for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0, dash: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(state, true), false);
      if (world.state.pendingBoons) world.applyBoon(world.state.pendingBoons[0].id);
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'win') {
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(state, true), false);
      if (world.state.pendingBoons) world.applyBoon(world.state.pendingBoons[0].id);
      if (events & EVENT_WIN) break;
      if (events & EVENT_OVER) break;
    }
    if (world.state.won) {
      // Let the dawn wash in for a beat.
      for (let i = 0; i < 90; i += 1) world.state.dawn = Math.min(1, world.state.dawn + 1 / 90);
      return { screen: SCREEN_WIN, best: 1250 };
    }
    return { screen: SCREEN_OVER, best: 1250 };
  }
  // over: a dozy pilot that chases motes and never flees, so the night catches it.
  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    const p = state.player;
    let target = null;
    let bestD2 = Infinity;
    for (const m of state.motes) {
      if (!m.active) continue;
      const d2 = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        target = m;
      }
    }
    let move = { x: 0, y: 0, dash: false };
    if (target) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      move = { x: dx / d, y: dy / d, dash: false };
    }
    const events = world.step(STEP, move, false);
    if (world.state.pendingBoons) world.applyBoon(world.state.pendingBoons[0].id);
    if (events & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: 1250 };
}
