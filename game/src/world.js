// MOTHLIGHT — the simulation. Pure logic, no DOM: the same step function drives
// live play, the title-screen garden, and the deterministic screenshot scenes.
// The world is one garden, 1280x720: Pip the moth, eight lanterns to light,
// glow-motes to chain into combos, and the night's creatures, growing bolder
// with every lantern lit.
import {
  BATS, BOONS, COMBO_STEP, EVENT_DASH, EVENT_HIT, EVENT_LANTERN, EVENT_OVER,
  EVENT_PICKUP, EVENT_WIN, LANTERN_CHANNEL_RADIUS, LANTERN_CHANNEL_TIME,
  LANTERN_SCORE, LANTERN_SCORE_STEP, LANTERNS, MOTES, PLAYER, SPITTER_SPOTS,
  SPITTERS, VIEW, WISPS,
} from './config.js';

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = {};
  let wispTimer = 0;
  let batTimer = 0;
  let moteTimer = 0;

  function freshPlayer() {
    return {
      x: VIEW.width / 2, y: VIEW.height / 2 + 120, vx: 0, vy: 0,
      hearts: PLAYER.startHearts, maxHearts: PLAYER.startHearts,
      speedMul: 1, dashCooldownMul: 1, magnetMul: 1, glowMul: 1, scoreMul: 1,
      dashTime: 0, dashCooldown: 0, dashX: 1, dashY: 0,
      invuln: 0, facing: 1, wing: 0, channel: 0, channelLantern: -1,
    };
  }

  function spawnMote() {
    return {
      x: random.range(40, VIEW.width - 40), y: random.range(60, VIEW.height - 50),
      vx: random.range(-14, 14), vy: random.range(-10, 10),
      phase: random.range(0, TAU), active: true,
    };
  }

  function spawnWisp() {
    const edge = random.int(0, 3);
    const m = 30;
    const x = edge === 0 ? -m : edge === 1 ? VIEW.width + m : random.range(0, VIEW.width);
    const y = edge === 2 ? -m : edge === 3 ? VIEW.height + m : random.range(0, VIEW.height);
    return { x, y, vx: 0, vy: 0, phase: random.range(0, TAU), active: true };
  }

  function spawnBat() {
    const dir = random.next() < 0.5 ? 1 : -1;
    return {
      x: dir === 1 ? -30 : VIEW.width + 30, y: random.range(90, VIEW.height - 140),
      dir, t: random.range(0, TAU), baseY: 0, active: true,
    };
  }

  function burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length > 320) return;
      const a = random.range(0, TAU);
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: random.range(life * 0.5, life), maxLife: life,
        size: random.range(1.5, 4), color, glow: true,
      });
    }
  }

  function hurtPlayer(fromX, fromY) {
    const p = state.player;
    p.hearts -= 1;
    p.invuln = PLAYER.invulnerableTime;
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    p.vx = (dx / d) * 420;
    p.vy = (dy / d) * 420;
    state.shake = 14;
    state.flash = 0.35;
    burst(p.x, p.y, '#ff5d73', 26, 260, 0.7);
    let events = EVENT_HIT;
    if (p.hearts <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function reset() {
    state.player = freshPlayer();
    state.lanterns = LANTERNS.map((l) => ({ x: l.x, y: l.y, lit: false, glow: 0 }));
    state.motes = [];
    for (let i = 0; i < MOTES.max; i += 1) state.motes.push(spawnMote());
    state.wisps = [spawnWisp(), spawnWisp()];
    state.bats = [];
    state.spitters = [];
    state.thorns = [];
    state.particles = [];
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.litCount = 0;
    state.motesEaten = 0;
    state.time = 0;
    state.over = false;
    state.won = false;
    state.pendingBoons = null;
    state.shake = 0;
    state.flash = 0;
    state.dawn = 0;
    wispTimer = 0;
    batTimer = 0;
    moteTimer = 0;
  }

  reset();

  function step(dt, move, demo) {
    if (state.over || state.won || state.pendingBoons) return 0;
    let events = 0;
    const p = state.player;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // --- movement ------------------------------------------------------------
    const speed = PLAYER.speed * p.speedMul;
    if (move.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
      const dx = move.x !== 0 || move.y !== 0 ? move.x : p.facing;
      const dy = move.x !== 0 || move.y !== 0 ? move.y : 0;
      const len = Math.hypot(dx, dy) || 1;
      p.dashX = dx / len;
      p.dashY = dy / len;
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown * p.dashCooldownMul;
      p.invuln = Math.max(p.invuln, 0.3);
      events |= EVENT_DASH;
      burst(p.x, p.y, '#ffe9a8', 10, 140, 0.4);
    }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashX * PLAYER.dashSpeed;
      p.vy = p.dashY * PLAYER.dashSpeed;
    } else {
      p.vx += move.x * PLAYER.accel * dt;
      p.vy += move.y * PLAYER.accel * dt;
      const f = Math.exp(-PLAYER.friction * dt);
      p.vx *= f;
      p.vy *= f;
      const v = Math.hypot(p.vx, p.vy);
      if (v > speed) {
        p.vx = (p.vx / v) * speed;
        p.vy = (p.vy / v) * speed;
      }
    }
    p.x = Math.min(VIEW.width - 24, Math.max(24, p.x + p.vx * dt));
    p.y = Math.min(VIEW.height - 24, Math.max(24, p.y + p.vy * dt));
    if (Math.abs(p.vx) > 20) p.facing = p.vx > 0 ? 1 : -1;
    p.wing += dt * (10 + Math.hypot(p.vx, p.vy) / 40);

    // --- motes ---------------------------------------------------------------
    const magnetR = PLAYER.magnetRadius * p.magnetMul;
    for (const mote of state.motes) {
      if (!mote.active) continue;
      mote.phase += dt * 2;
      mote.x += mote.vx * dt + Math.sin(mote.phase) * 6 * dt;
      mote.y += mote.vy * dt + Math.cos(mote.phase * 0.8) * 6 * dt;
      const d2 = dist2(mote.x, mote.y, p.x, p.y);
      if (d2 < magnetR * magnetR) {
        const d = Math.sqrt(d2) || 1;
        const pull = 900 * (1 - d / magnetR) + 120;
        mote.x += ((p.x - mote.x) / d) * pull * dt;
        mote.y += ((p.y - mote.y) / d) * pull * dt;
      }
      if (d2 < MOTES.collectRadius * MOTES.collectRadius) {
        mote.active = false;
        state.motesEaten += 1;
        state.combo = Math.min(state.combo + 1, MOTES.comboCap);
        state.comboTimer = MOTES.comboWindow;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const mult = 1 + COMBO_STEP * (state.combo - 1);
        state.score += Math.round(MOTES.baseScore * mult * p.scoreMul);
        burst(mote.x, mote.y, '#ffd76a', 8, 120, 0.5);
        events |= EVENT_PICKUP;
      }
    }
    moteTimer -= dt;
    if (moteTimer <= 0) {
      moteTimer = 0.8;
      const alive = state.motes.filter((m) => m.active).length;
      if (alive < MOTES.max) {
        const dead = state.motes.find((m) => !m.active);
        if (dead) Object.assign(dead, spawnMote());
        else state.motes.push(spawnMote());
      }
    }

    // --- lanterns: hover close to channel light into them ---------------------
    let nearest = -1;
    let nearestD2 = LANTERN_CHANNEL_RADIUS * LANTERN_CHANNEL_RADIUS;
    for (let i = 0; i < state.lanterns.length; i += 1) {
      const l = state.lanterns[i];
      if (l.lit) continue;
      const d2 = dist2(l.x, l.y, p.x, p.y);
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = i;
      }
    }
    if (nearest >= 0 && !demo) {
      p.channelLantern = nearest;
      p.channel += dt;
      if (random.next() < dt * 8) burst(state.lanterns[nearest].x, state.lanterns[nearest].y, '#ffb347', 1, 40, 0.5);
      if (p.channel >= LANTERN_CHANNEL_TIME) {
        const l = state.lanterns[nearest];
        l.lit = true;
        l.glow = 1;
        state.litCount += 1;
        p.channel = 0;
        p.channelLantern = -1;
        state.score += LANTERN_SCORE + LANTERN_SCORE_STEP * state.litCount;
        burst(l.x, l.y - 20, '#ffb347', 30, 200, 0.9);
        burst(l.x, l.y - 20, '#ffe9a8', 16, 120, 1.1);
        events |= EVENT_LANTERN;
        if (state.litCount >= LANTERNS.length) {
          state.won = true;
          state.dawn = 0;
          const timeBonus = Math.max(0, Math.round((300 - state.time) * 5));
          state.score += timeBonus;
          state.timeBonus = timeBonus;
          events |= EVENT_WIN;
        } else {
          state.pendingBoons = random.shuffled(BOONS).slice(0, 3);
        }
      }
    } else {
      p.channel = Math.max(0, p.channel - dt * 2);
      p.channelLantern = -1;
    }
    for (const l of state.lanterns) {
      if (l.lit && l.glow < 1) l.glow = Math.min(1, l.glow + dt * 2);
    }

    // --- wisps: the dark that chases the light --------------------------------
    const wispTarget = WISPS.baseCount + WISPS.perLantern * state.litCount;
    wispTimer -= dt;
    if (wispTimer <= 0 && state.wisps.filter((w) => w.active).length < wispTarget) {
      wispTimer = 1.1;
      state.wisps.push(spawnWisp());
    }
    const wispSpeed = WISPS.baseSpeed + WISPS.speedPerLantern * state.litCount;
    const lightR = PLAYER.lightRadius * p.glowMul;
    for (const w of state.wisps) {
      if (!w.active) continue;
      w.phase += dt;
      let tx;
      let ty;
      if (demo) {
        tx = VIEW.width / 2 + Math.sin(w.phase * 0.3) * 300;
        ty = VIEW.height / 2 + Math.cos(w.phase * 0.23) * 160;
      } else {
        tx = p.x;
        ty = p.y;
      }
      const dx = tx - w.x;
      const dy = ty - w.y;
      const d = Math.hypot(dx, dy) || 1;
      let sp = wispSpeed;
      if (!demo && dist2(w.x, w.y, p.x, p.y) < lightR * lightR) sp *= 0.55;
      const steer = Math.min(1, WISPS.turn * dt);
      w.vx += ((dx / d) * sp - w.vx) * steer;
      w.vy += ((dy / d) * sp - w.vy) * steer;
      w.x += w.vx * dt + Math.sin(w.phase * 1.7) * 14 * dt;
      w.y += w.vy * dt + Math.cos(w.phase * 1.3) * 14 * dt;
      if (!demo && p.invuln <= 0 && dist2(w.x, w.y, p.x, p.y) < (WISPS.radius + PLAYER.radius) ** 2) {
        events |= hurtPlayer(w.x, w.y);
        w.x += (w.x - p.x) * 0.4;
        w.y += (w.y - p.y) * 0.4;
        if (state.over) return events;
      }
    }

    // --- bats: fast, straight, sine-weaving ------------------------------------
    const batTarget = state.litCount >= BATS.fromLanterns ? Math.min(BATS.max, state.litCount - 1) : 0;
    batTimer -= dt;
    if (batTimer <= 0 && state.bats.filter((b) => b.active).length < batTarget) {
      batTimer = 2.4;
      const bat = spawnBat();
      bat.baseY = bat.y;
      state.bats.push(bat);
    }
    for (const b of state.bats) {
      if (!b.active) continue;
      b.t += dt;
      b.x += b.dir * BATS.speed * dt;
      b.y = b.baseY + Math.sin(b.t * BATS.flap * 0.6) * 46;
      if (b.x < -60 || b.x > VIEW.width + 60) b.active = false;
      if (!demo && p.invuln <= 0 && dist2(b.x, b.y, p.x, p.y) < (BATS.radius + PLAYER.radius) ** 2) {
        events |= hurtPlayer(b.x, b.y);
        b.active = false;
        if (state.over) return events;
      }
    }

    // --- spitters: rooted thorns that shoot at Pip ------------------------------
    if (state.litCount >= SPITTERS.fromLanterns && state.spitters.length === 0) {
      for (const s of SPITTER_SPOTS) state.spitters.push({ x: s.x, y: s.y, cool: random.range(1, 2) });
    }
    for (const s of state.spitters) {
      s.cool -= dt;
      if (s.cool <= 0 && !demo) {
        s.cool = SPITTERS.shotEvery;
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        state.thorns.push({ x: s.x, y: s.y - 10, vx: (dx / d) * SPITTERS.thornSpeed, vy: (dy / d) * SPITTERS.thornSpeed, active: true });
        burst(s.x, s.y - 10, '#c77dff', 6, 90, 0.4);
      }
    }
    for (const t of state.thorns) {
      if (!t.active) continue;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.x < -20 || t.x > VIEW.width + 20 || t.y < -20 || t.y > VIEW.height + 20) t.active = false;
      if (!demo && p.invuln <= 0 && dist2(t.x, t.y, p.x, p.y) < (SPITTERS.thornRadius + PLAYER.radius) ** 2) {
        t.active = false;
        events |= hurtPlayer(t.x, t.y);
        if (state.over) return events;
      }
    }

    // --- particles ---------------------------------------------------------------
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
    }
    return events;
  }

  function applyBoon(id) {
    const boon = BOONS.find((b) => b.id === id);
    if (!boon || !state.pendingBoons) return false;
    boon.apply(state.player);
    state.pendingBoons = null;
    burst(state.player.x, state.player.y, '#7ef0c1', 22, 180, 0.8);
    return true;
  }

  return { state, reset, step, applyBoon, burst };
}
