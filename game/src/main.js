// MOTHLIGHT — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between six
// screens: title, play, boon choice, paused, game over and dawn (win).
//
// ?seed=N fixes the garden. ?shot=title|play|win|over (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, EVENT_DASH, EVENT_HIT, EVENT_LANTERN, EVENT_OVER, EVENT_PICKUP, EVENT_WIN, SCREEN_BOON, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { muted: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // A read-only handle for automated play-tests (nothing in the game reads it).
  window.__mothlight = { world, screen: () => screen };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Light all eight lanterns.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.over();
    announce(won
      ? `Dawn breaks! Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_BOON) {
      const pick = input.takeBoonPick();
      if (pick >= 1 && pick <= 3 && world.state.pendingBoons && world.state.pendingBoons[pick - 1]) {
        const boon = world.state.pendingBoons[pick - 1];
        if (world.applyBoon(boon.id)) {
          audio.boon();
          screen = SCREEN_PLAY;
          announce(`${boon.name}. Keep flying.`);
        }
      }
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0, dash: false }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    const move = input.move(world.state.player.x, world.state.player.y, scaleX, scaleY);
    const events = world.step(STEP, move, false);
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_LANTERN) audio.lantern();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (world.state.pendingBoons) {
      screen = SCREEN_BOON;
      announce('A lantern wakes! Choose a blessing: 1, 2 or 3.');
    } else if (events & EVENT_HIT) {
      announce(world.state.player.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.player.hearts} hearts left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_WIN && world.state.dawn < 1) {
      world.state.dawn = Math.min(1, world.state.dawn + 1 / 90);
      accumulator = 0;
    } else {
      accumulator = 0;
    }
    // Boon-card clicks: the pointer's canvas position picks a card.
    if (screen === SCREEN_BOON && world.state.pendingBoons) {
      const ptr = input.pointer();
      if (ptr.down) {
        const boons = world.state.pendingBoons;
        const w = 280;
        const gap = 30;
        const totalW = boons.length * w + (boons.length - 1) * gap;
        const x0 = (canvas.width - totalW) / 2;
        const sx = canvas.width / canvas.clientWidth;
        const sy = canvas.height / canvas.clientHeight;
        const px = ptr.x * sx;
        const py = ptr.y * sy;
        for (let i = 0; i < boons.length; i += 1) {
          if (px >= x0 + i * (w + gap) && px <= x0 + i * (w + gap) + w && py >= 240 && py <= 460) {
            if (world.applyBoon(boons[i].id)) {
              audio.boon();
              screen = SCREEN_PLAY;
              announce(`${boons[i].name}. Keep flying.`);
            }
            break;
          }
        }
      }
    }
    renderer.draw(world.state, screen, best, { muted: audio.muted });
  }

  // Leaving the tab pauses a running game rather than letting the night hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Mothlight. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
