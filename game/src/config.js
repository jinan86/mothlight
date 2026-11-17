// MOTHLIGHT — tuning numbers for the whole game. One place, so balancing the
// garden means editing here and nowhere else.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'mothlight.best.score.v1';

// The player: Pip, a small moth carrying a lantern glow.
export const PLAYER = {
  radius: 14,
  speed: 265,
  accel: 2600,
  friction: 5.2,
  dashSpeed: 760,
  dashTime: 0.18,
  dashCooldown: 2.5,
  invulnerableTime: 1.4,
  magnetRadius: 95,
  lightRadius: 130,
  startHearts: 3,
};

// The goal: eight lanterns, each lit by hovering close and holding still.
export const LANTERNS = [
  { x: 150, y: 150 },
  { x: 640, y: 110 },
  { x: 1130, y: 150 },
  { x: 110, y: 430 },
  { x: 1170, y: 430 },
  { x: 300, y: 600 },
  { x: 980, y: 600 },
  { x: 640, y: 380 },
];
export const LANTERN_CHANNEL_RADIUS = 78;
export const LANTERN_CHANNEL_TIME = 1.15;
export const LANTERN_SCORE = 150;
export const LANTERN_SCORE_STEP = 50;

// Glow-motes: the garden's loose light. Chained pickups build the combo.
export const MOTES = { max: 14, radius: 9, collectRadius: 24, baseScore: 10, comboWindow: 3.0, comboCap: 8 };
export const COMBO_STEP = 0.25;

// The night's creatures. Their numbers grow as lanterns are lit.
export const WISPS = { baseCount: 2, perLantern: 1, radius: 16, baseSpeed: 72, speedPerLantern: 9, turn: 2.6 };
export const BATS = { fromLanterns: 3, max: 4, radius: 15, speed: 165, flap: 9 };
export const SPITTERS = { fromLanterns: 5, radius: 17, shotEvery: 2.3, thornSpeed: 235, thornRadius: 7 };
export const SPITTER_SPOTS = [
  { x: 210, y: 250 },
  { x: 1070, y: 250 },
  { x: 640, y: 620 },
];

// Boons offered after each lantern is lit: pick one of three.
export const BOONS = [
  { id: 'swift', name: 'Swift Wings', text: '+12% flight speed', apply: (p) => { p.speedMul *= 1.12; } },
  { id: 'dash', name: 'Long Dash', text: 'Dash recharges 30% faster', apply: (p) => { p.dashCooldownMul *= 0.7; } },
  { id: 'magnet', name: 'Mote Magnet', text: '+60% mote pull radius', apply: (p) => { p.magnetMul *= 1.6; } },
  { id: 'glow', name: 'Bright Glow', text: 'Wisps slow near your light', apply: (p) => { p.glowMul *= 1.35; } },
  { id: 'heart', name: 'Sturdy Heart', text: '+1 max heart, heal 1', apply: (p) => { p.maxHearts += 1; p.hearts = Math.min(p.maxHearts, p.hearts + 1); } },
  { id: 'charm', name: 'Mote Charm', text: '+25% mote score', apply: (p) => { p.scoreMul *= 1.25; } },
];

// Screens the game moves between.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BOON = 'boon';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// Events a world step can report (bitmask).
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_LANTERN = 8;
export const EVENT_PICKUP = 16;
export const EVENT_DASH = 32;
