// MOTHLIGHT — everything the eye sees, drawn on one 2D canvas. All art is
// procedural: gradients, glows and shapes, so the game needs no image files.
// The garden is painted in layers: night sky, moon and stars, far hills,
// flowers and grass, lanterns, creatures, Pip, particles, then the HUD and
// the screen panels. A lit lantern warms the dark around it; the dawn, when
// it comes, washes the whole garden gold.
import { createRandom } from './random.js';
import {
  BATS, LANTERN_CHANNEL_RADIUS, MOTES, PLAYER, SCREEN_BOON, SCREEN_OVER,
  SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, SPITTERS, VIEW, WISPS,
} from './config.js';

const TAU = Math.PI * 2;
const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const UI_FONT = '"Trebuchet MS", Verdana, sans-serif';

// Fixed scenery, seeded once so every run paints the same garden.
const sceneryRandom = createRandom(20261117);
const STARS = [];
for (let i = 0; i < 90; i += 1) {
  STARS.push({
    x: sceneryRandom.range(0, VIEW.width), y: sceneryRandom.range(0, 300),
    r: sceneryRandom.range(0.6, 2.1), tw: sceneryRandom.range(0, TAU),
  });
}
const FLOWERS = [];
for (let i = 0; i < 46; i += 1) {
  FLOWERS.push({
    x: sceneryRandom.range(20, VIEW.width - 20), y: sceneryRandom.range(430, VIEW.height - 16),
    hue: sceneryRandom.pick(['#7d6bd6', '#c77dff', '#ff8fb3', '#7ef0c1', '#ffd76a']),
    s: sceneryRandom.range(0.7, 1.4),
  });
}
const FIREFLIES = [];
for (let i = 0; i < 16; i += 1) {
  FIREFLIES.push({
    x: sceneryRandom.range(0, VIEW.width), y: sceneryRandom.range(80, 620),
    a: sceneryRandom.range(0, TAU), sp: sceneryRandom.range(0.2, 0.6),
    r: sceneryRandom.range(26, 80),
  });
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function glowDot(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function heart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-7, -3, -4, -9, 0, -4);
  ctx.bezierCurveTo(4, -9, 7, -3, 0, 4);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,93,115,0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawSky(state, screen) {
    const dawn = screen === SCREEN_WIN ? Math.min(1, state.dawn) : 0;
    const top = dawn > 0.5 ? '#3a2b5c' : '#0b1030';
    const mid = dawn > 0.5 ? '#7a4a6e' : '#1b1740';
    const bot = dawn > 0.5 ? '#e8a35c' : '#241d4d';
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, top);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Stars, twinkling with the garden's clock.
    for (const s of STARS) {
      const a = 0.35 + 0.35 * Math.sin(state.time * 1.3 + s.tw);
      ctx.globalAlpha = Math.max(0.05, a) * (1 - dawn);
      ctx.fillStyle = '#dfe6ff';
      circle(ctx, s.x, s.y, s.r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The moon.
    const mx = 1120;
    const my = 92;
    glowDot(ctx, mx, my, 90, 'rgba(230,235,255,0.35)', 0.8 * (1 - dawn * 0.7));
    ctx.fillStyle = '#eef1ff';
    circle(ctx, mx, my, 34);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,190,230,0.8)';
    circle(ctx, mx - 10, my - 6, 7);
    ctx.fill();
    circle(ctx, mx + 8, my + 10, 5);
    ctx.fill();

    // Far hills, two dark ridges.
    ctx.fillStyle = '#141a38';
    ctx.beginPath();
    ctx.moveTo(0, 560);
    for (let x = 0; x <= VIEW.width; x += 80) ctx.lineTo(x, 540 + Math.sin(x * 0.008 + 1.2) * 26);
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.lineTo(0, VIEW.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0e1330';
    ctx.beginPath();
    ctx.moveTo(0, 620);
    for (let x = 0; x <= VIEW.width; x += 80) ctx.lineTo(x, 600 + Math.sin(x * 0.011 + 4.0) * 22);
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.lineTo(0, VIEW.height);
    ctx.closePath();
    ctx.fill();

    // Ground glow where the garden floor catches the night.
    const gg = ctx.createRadialGradient(640, 700, 40, 640, 700, 700);
    gg.addColorStop(0, 'rgba(70,90,60,0.35)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 420, VIEW.width, 300);
  }

  function drawFlowers() {
    for (const f of FLOWERS) {
      ctx.strokeStyle = 'rgba(90,140,90,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y + 8);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();
      ctx.fillStyle = f.hue;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * TAU;
        circle(ctx, f.x + Math.cos(a) * 4 * f.s, f.y + Math.sin(a) * 4 * f.s, 2.6 * f.s);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd76a';
      circle(ctx, f.x, f.y, 2 * f.s);
      ctx.fill();
    }
  }

  function drawFireflies(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of FIREFLIES) {
      const x = f.x + Math.sin(state.time * f.sp + f.a) * f.r;
      const y = f.y + Math.cos(state.time * f.sp * 0.7 + f.a) * 18;
      const a = 0.25 + 0.3 * Math.sin(state.time * 2 + f.a * 3);
      glowDot(ctx, x, y, 7, '#ffe9a8', Math.max(0.05, a));
    }
    ctx.restore();
  }

  function drawLantern(state) {
    for (const l of state.lanterns) {
      // Post.
      ctx.strokeStyle = '#2c2140';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y + 34);
      ctx.lineTo(l.x, l.y - 8);
      ctx.stroke();
      // Warm halo when lit.
      if (l.lit) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.75 + 0.15 * Math.sin(state.time * 2 + l.x);
        glowDot(ctx, l.x, l.y - 18, 130, 'rgba(255,178,71,0.5)', pulse * l.glow);
        glowDot(ctx, l.x, l.y - 18, 46, '#ffcf7d', 0.9 * l.glow);
        ctx.restore();
      } else {
        glowDot(ctx, l.x, l.y - 18, 40, 'rgba(140,160,255,0.25)', 0.5);
      }
      // Glass housing.
      ctx.fillStyle = l.lit ? '#ffd76a' : '#3a3f66';
      ctx.strokeStyle = '#1c1430';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x - 13, l.y - 6);
      ctx.lineTo(l.x - 9, l.y - 32);
      ctx.lineTo(l.x + 9, l.y - 32);
      ctx.lineTo(l.x + 13, l.y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Roof cap.
      ctx.fillStyle = '#241a3d';
      ctx.beginPath();
      ctx.moveTo(l.x - 15, l.y - 30);
      ctx.lineTo(l.x, l.y - 44);
      ctx.lineTo(l.x + 15, l.y - 30);
      ctx.closePath();
      ctx.fill();
      if (l.lit) {
        // Flame.
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.ellipse(l.x, l.y - 19, 4, 7 + Math.sin(state.time * 6 + l.x) * 1.5, 0, 0, TAU);
        ctx.fill();
      }
    }
    // Channel ring on the lantern being lit.
    const p = state.player;
    if (p.channelLantern >= 0 && p.channel > 0) {
      const l = state.lanterns[p.channelLantern];
      const frac = p.channel / 1.15;
      ctx.strokeStyle = 'rgba(255,211,106,0.35)';
      ctx.lineWidth = 5;
      circle(ctx, l.x, l.y - 18, LANTERN_CHANNEL_RADIUS);
      ctx.stroke();
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(l.x, l.y - 18, LANTERN_CHANNEL_RADIUS, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
      ctx.stroke();
    }
  }

  function drawMotes(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of state.motes) {
      if (!m.active) continue;
      const pulse = 0.7 + 0.3 * Math.sin(m.phase * 2);
      glowDot(ctx, m.x, m.y, 22, 'rgba(255,215,106,0.55)', pulse);
      ctx.fillStyle = '#ffe9a8';
      circle(ctx, m.x, m.y, MOTES.radius * 0.55);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWisps(state) {
    for (const w of state.wisps) {
      if (!w.active) continue;
      const wob = Math.sin(w.phase * 2.2) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, w.x, w.y, 46, 'rgba(150,90,255,0.35)', 0.8);
      ctx.restore();
      ctx.fillStyle = '#241a3d';
      circle(ctx, w.x, w.y + wob, WISPS.radius);
      ctx.fill();
      ctx.fillStyle = '#2e2150';
      circle(ctx, w.x - 8, w.y + 6 + wob, 9);
      ctx.fill();
      circle(ctx, w.x + 8, w.y + 6 + wob, 9);
      ctx.fill();
      // Eyes.
      ctx.fillStyle = '#c77dff';
      circle(ctx, w.x - 5, w.y - 2 + wob, 2.6);
      ctx.fill();
      circle(ctx, w.x + 5, w.y - 2 + wob, 2.6);
      ctx.fill();
    }
  }

  function drawBats(state) {
    for (const b of state.bats) {
      if (!b.active) continue;
      const flap = Math.sin(b.t * BATS.flap);
      ctx.fillStyle = '#1a1030';
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.dir, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, -16 - flap * 10, -26, -2 - flap * 14);
      ctx.quadraticCurveTo(-12, 2, 0, 4);
      ctx.quadraticCurveTo(12, 2, 26, -2 - flap * 14);
      ctx.quadraticCurveTo(14, -16 - flap * 10, 0, 0);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ff5d73';
      circle(ctx, b.x - 3, b.y - 2, 1.8);
      ctx.fill();
      circle(ctx, b.x + 3, b.y - 2, 1.8);
      ctx.fill();
    }
  }

  function drawSpitters(state) {
    for (const s of state.spitters) {
      ctx.strokeStyle = '#3f7a44';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + 26);
      ctx.quadraticCurveTo(s.x + 6, s.y, s.x, s.y - 8);
      ctx.stroke();
      ctx.fillStyle = '#c77dff';
      for (let p = 0; p < 6; p += 1) {
        const a = (p / 6) * TAU + state.time * 0.4;
        circle(ctx, s.x + Math.cos(a) * 9, s.y - 12 + Math.sin(a) * 9, 4.5);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd76a';
      circle(ctx, s.x, s.y - 12, 4);
      ctx.fill();
    }
    for (const t of state.thorns) {
      if (!t.active) continue;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(Math.atan2(t.vy, t.vx));
      ctx.fillStyle = '#d9a0ff';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, -5);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0 && !state.over) return; // blink
    ctx.save();
    ctx.translate(p.x, p.y);
    // Lantern glow around Pip.
    ctx.globalCompositeOperation = 'lighter';
    const glowR = PLAYER.lightRadius * p.glowMul;
    glowDot(ctx, 0, 0, glowR, 'rgba(255,200,110,0.28)', 0.9);
    glowDot(ctx, 0, 0, 46, 'rgba(255,220,140,0.5)', 0.9);
    ctx.globalCompositeOperation = 'source-over';
    // Wings, flapping.
    const flap = Math.sin(p.wing) * 0.55;
    ctx.fillStyle = 'rgba(255,214,150,0.92)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * p.facing, 1);
      ctx.rotate(-0.5 - flap * 0.5);
      ctx.beginPath();
      ctx.ellipse(8, -8, 13, 7, 0.5, 0, TAU);
      ctx.fill();
      ctx.rotate(0.9 + flap * 0.7);
      ctx.beginPath();
      ctx.ellipse(7, 6, 10, 5.5, -0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Body.
    ctx.fillStyle = '#5b4636';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a5c44';
    ctx.beginPath();
    ctx.ellipse(0, -9, 4.5, 5, 0, 0, TAU);
    ctx.fill();
    // Antennae with glowing tips.
    ctx.strokeStyle = '#3a2c20';
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 2, -12);
      ctx.quadraticCurveTo(side * 7, -20, side * 10, -24);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      circle(ctx, side * 10, -24, 2);
      ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#1a120c';
    circle(ctx, -2, -10, 1.6);
    ctx.fill();
    circle(ctx, 2, -10, 1.6);
    ctx.fill();
    ctx.restore();
    // Channel beam to the lantern being lit.
    if (p.channelLantern >= 0 && p.channel > 0) {
      const l = state.lanterns[p.channelLantern];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,211,106,${0.25 + 0.35 * (p.channel / 1.15)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 6);
      ctx.lineTo(l.x, l.y - 18);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of state.particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      glowDot(ctx, pt.x, pt.y, pt.size * 3, pt.color, a * 0.8);
    }
    ctx.restore();
  }

  function drawHud(state, best, muted) {
    // Top bar.
    ctx.fillStyle = 'rgba(8,10,28,0.55)';
    ctx.fillRect(0, 0, VIEW.width, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 56, VIEW.width, 1);
    // Hearts.
    for (let i = 0; i < state.player.maxHearts; i += 1) {
      heart(ctx, 34 + i * 30, 28, 1.15, i < state.player.hearts);
    }
    // Score.
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 26px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${state.score.toLocaleString('en-US')}`, 150, 29);
    // Combo.
    if (state.combo > 1) {
      ctx.fillStyle = '#ffb347';
      ctx.font = `700 20px ${UI_FONT}`;
      ctx.fillText(`combo ×${(1 + 0.25 * (state.combo - 1)).toFixed(2)}  (${state.combo})`, 300, 29);
      ctx.fillStyle = 'rgba(255,179,71,0.35)';
      ctx.fillRect(300, 44, 110, 4);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(300, 44, 110 * Math.max(0, state.comboTimer / 3), 4);
    }
    // Lantern dots, centre.
    const total = state.lanterns.length;
    const startX = VIEW.width / 2 - ((total - 1) * 26) / 2;
    ctx.font = `600 15px ${UI_FONT}`;
    ctx.fillStyle = '#cfc8ee';
    ctx.textAlign = 'center';
    ctx.fillText('LANTERNS', VIEW.width / 2, 14);
    for (let i = 0; i < total; i += 1) {
      const x = startX + i * 26;
      const lit = state.lanterns[i].lit;
      if (lit) {
        glowDot(ctx, x, 34, 14, 'rgba(255,178,71,0.6)', 0.9);
        ctx.fillStyle = '#ffd76a';
      } else {
        ctx.fillStyle = 'rgba(160,170,220,0.35)';
      }
      circle(ctx, x, 34, 7);
      ctx.fill();
    }
    // Dash cooldown, right.
    const p = state.player;
    const dashFrac = p.dashCooldown <= 0 ? 1 : 1 - p.dashCooldown / (2.5 * p.dashCooldownMul);
    ctx.textAlign = 'right';
    ctx.fillStyle = dashFrac >= 1 ? '#7ef0c1' : '#9d94c9';
    ctx.font = `700 15px ${UI_FONT}`;
    ctx.fillText(dashFrac >= 1 ? 'DASH READY  [Space]' : 'DASH…', VIEW.width - 24, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(VIEW.width - 174, 32, 150, 6);
    ctx.fillStyle = dashFrac >= 1 ? '#7ef0c1' : '#8f86c2';
    ctx.fillRect(VIEW.width - 174, 32, 150 * dashFrac, 6);
    // Best + mute.
    ctx.fillStyle = '#9d94c9';
    ctx.font = `400 13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, 24, VIEW.height - 16);
    ctx.textAlign = 'right';
    ctx.fillText(muted ? 'M — sound off' : 'M — mute · P — pause', VIEW.width - 24, VIEW.height - 16);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,12,34,0.82)';
    ctx.strokeStyle = 'rgba(255,211,106,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8,10,28,0.35)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(290, 118, 700, 470);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `700 74px ${TITLE_FONT}`;
    ctx.fillText('MOTHLIGHT', 640, 218);
    ctx.fillStyle = '#e8ddff';
    ctx.font = `italic 24px ${TITLE_FONT}`;
    ctx.fillText('Keeper of the Night Garden', 640, 262);
    ctx.fillStyle = '#cfc8ee';
    ctx.font = `400 19px ${UI_FONT}`;
    ctx.fillText('The lanterns have gone dark. Fly, gather glow-motes,', 640, 318);
    ctx.fillText('and light all eight lanterns before the night takes you.', 640, 346);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 21px ${UI_FONT}`;
    ctx.fillText('▶  Press SPACE or click to begin', 640, 408);
    ctx.fillStyle = '#9d94c9';
    ctx.font = `400 17px ${UI_FONT}`;
    ctx.fillText('Move — WASD / arrows / hold mouse      Dash — Space / Shift', 640, 452);
    ctx.fillText('Hover by a dark lantern to light it · Chain motes for combos', 640, 480);
    ctx.fillText('Beware wisps, bats and thorn-spitters · P pauses · M mutes', 640, 508);
    if (best > 0) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = `700 19px ${UI_FONT}`;
      ctx.fillText(`Best score  ★ ${best.toLocaleString('en-US')}`, 640, 552);
    }
  }

  function drawBoon(state) {
    ctx.fillStyle = 'rgba(8,10,28,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `700 40px ${TITLE_FONT}`;
    ctx.fillText('A lantern wakes!', 640, 150);
    ctx.fillStyle = '#e8ddff';
    ctx.font = `400 20px ${UI_FONT}`;
    ctx.fillText(`Lantern ${state.litCount} of 8 lit — choose a blessing (press 1, 2 or 3, or click):`, 640, 192);
    const boons = state.pendingBoons || [];
    const w = 280;
    const gap = 30;
    const totalW = boons.length * w + (boons.length - 1) * gap;
    let x = (VIEW.width - totalW) / 2;
    for (let i = 0; i < boons.length; i += 1) {
      const b = boons[i];
      panel(x, 240, w, 220);
      ctx.fillStyle = '#7ef0c1';
      ctx.font = `700 15px ${UI_FONT}`;
      ctx.fillText(`[ ${i + 1} ]`, x + w / 2, 272);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = `700 24px ${TITLE_FONT}`;
      ctx.fillText(b.name, x + w / 2, 318);
      ctx.fillStyle = '#cfc8ee';
      ctx.font = `400 18px ${UI_FONT}`;
      ctx.fillText(b.text, x + w / 2, 356);
      ctx.fillStyle = '#9d94c9';
      ctx.font = `400 15px ${UI_FONT}`;
      ctx.fillText('a gift from the garden', x + w / 2, 420);
      x += w + gap;
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8,10,28,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(440, 250, 400, 200);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `700 44px ${TITLE_FONT}`;
    ctx.fillText('Paused', 640, 330);
    ctx.fillStyle = '#cfc8ee';
    ctx.font = `400 19px ${UI_FONT}`;
    ctx.fillText('Press P or Space to keep flying', 640, 380);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(8,10,28,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(330, 130, 620, 450);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8fa3';
    ctx.font = `700 56px ${TITLE_FONT}`;
    ctx.fillText('The night wins…', 640, 220);
    ctx.fillStyle = '#e8ddff';
    ctx.font = `400 21px ${UI_FONT}`;
    ctx.fillText('Pip’s light fades — but the garden remembers.', 640, 268);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 30px ${UI_FONT}`;
    ctx.fillText(`Score  ★ ${state.score.toLocaleString('en-US')}`, 640, 330);
    ctx.fillStyle = '#cfc8ee';
    ctx.font = `400 19px ${UI_FONT}`;
    ctx.fillText(`Lanterns lit: ${state.litCount} of 8   ·   Motes gathered: ${state.motesEaten}`, 640, 372);
    ctx.fillText(`Best combo ×${state.bestCombo}   ·   Survived ${Math.floor(state.time)}s`, 640, 402);
    if (state.score >= best && state.score > 0) {
      ctx.fillStyle = '#7ef0c1';
      ctx.font = `700 20px ${UI_FONT}`;
      ctx.fillText('★ New best score! ★', 640, 446);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 21px ${UI_FONT}`;
    ctx.fillText('▶  Press SPACE or click to fly again', 640, 520);
  }

  function drawWin(state, best) {
    const dawn = Math.min(1, state.dawn);
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, `rgba(255,190,90,${0.10 * dawn})`);
    g.addColorStop(1, `rgba(255,220,140,${0.30 * dawn})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = 'rgba(8,10,28,0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(300, 110, 680, 490);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `700 58px ${TITLE_FONT}`;
    ctx.fillText('Dawn breaks!', 640, 200);
    ctx.fillStyle = '#e8ddff';
    ctx.font = `italic 23px ${TITLE_FONT}`;
    ctx.fillText('All eight lanterns burn — the garden wakes in gold.', 640, 246);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 30px ${UI_FONT}`;
    ctx.fillText(`Score  ★ ${state.score.toLocaleString('en-US')}`, 640, 312);
    ctx.fillStyle = '#cfc8ee';
    ctx.font = `400 19px ${UI_FONT}`;
    ctx.fillText(`Motes gathered: ${state.motesEaten}   ·   Best combo ×${state.bestCombo}`, 640, 356);
    ctx.fillText(`Finished in ${Math.floor(state.time / 60)}m ${Math.floor(state.time % 60)}s   ·   Time bonus +${state.timeBonus || 0}`, 640, 386);
    if (state.score >= best && state.score > 0) {
      ctx.fillStyle = '#7ef0c1';
      ctx.font = `700 20px ${UI_FONT}`;
      ctx.fillText('★ New best score! ★', 640, 430);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 21px ${UI_FONT}`;
    ctx.fillText('▶  Press SPACE or click to play again', 640, 540);
  }

  function draw(state, screen, best, extra) {
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSky(state, screen);
    drawFireflies(state);
    drawFlowers();
    drawLantern(state);
    drawMotes(state);
    drawSpitters(state);
    drawWisps(state);
    drawBats(state);
    drawPlayer(state);
    drawParticles(state);
    ctx.restore();
    // Hit flash.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,60,80,${state.flash * 0.5})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_BOON || screen === SCREEN_PAUSED) {
      drawHud(state, best, extra.muted);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_BOON) drawBoon(state);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_WIN) drawWin(state, best);
  }

  return { draw };
}
