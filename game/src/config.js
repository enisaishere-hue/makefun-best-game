// LUMEN TIDE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, reefY: 618 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** How many nights (waves) a full run lasts; night 10 ends with the Maw. */
export const NIGHTS = 10;

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 5,
  /** Seconds of invulnerability after a hit. */
  hurtInvuln: 1.2,
  /** Light-bolt fire interval, seconds. */
  fireInterval: 0.42,
  boltSpeed: 620,
  boltDamage: 1,
  boltRadius: 6,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 2.2,
  /** Motes within this radius drift toward the player. */
  magnetRadius: 90,
  xpPerLevel: 8,
  xpGrowth: 1.35,
};

/** Shade kinds. hp/damage/speed are the night-1 base; waves scale them. */
export const SHADES = {
  drifter: { radius: 18, hp: 2, speed: 62, damage: 1, score: 10, xp: 1, color: '#8b7ff0', glow: '#6a5ae0' },
  dart: { radius: 13, hp: 1, speed: 168, damage: 1, score: 15, xp: 1, color: '#ff7ab8', glow: '#e84a9a' },
  bulwark: { radius: 30, hp: 8, speed: 38, damage: 2, score: 30, xp: 3, color: '#5ad1c8', glow: '#2ba89e' },
  spitter: { radius: 16, hp: 3, speed: 52, damage: 1, score: 25, xp: 2, color: '#ffb454', glow: '#e8892a' },
  maw: { radius: 64, hp: 220, speed: 46, damage: 2, score: 1000, xp: 20, color: '#c94b6e', glow: '#8f1d3d' },
};

/** Night plan: how many shades to kill, how fast they arrive, and the mix. */
export const NIGHT_PLAN = [
  { quota: 10, interval: 1.05, mix: { drifter: 1 } },
  { quota: 14, interval: 0.95, mix: { drifter: 0.7, dart: 0.3 } },
  { quota: 18, interval: 0.85, mix: { drifter: 0.55, dart: 0.3, spitter: 0.15 } },
  { quota: 22, interval: 0.78, mix: { drifter: 0.45, dart: 0.3, spitter: 0.15, bulwark: 0.1 } },
  { quota: 26, interval: 0.7, mix: { drifter: 0.4, dart: 0.3, spitter: 0.2, bulwark: 0.1 } },
  { quota: 30, interval: 0.64, mix: { drifter: 0.3, dart: 0.35, spitter: 0.2, bulwark: 0.15 } },
  { quota: 34, interval: 0.58, mix: { drifter: 0.25, dart: 0.35, spitter: 0.2, bulwark: 0.2 } },
  { quota: 38, interval: 0.52, mix: { drifter: 0.2, dart: 0.35, spitter: 0.25, bulwark: 0.2 } },
  { quota: 44, interval: 0.47, mix: { drifter: 0.15, dart: 0.4, spitter: 0.25, bulwark: 0.2 } },
  { quota: 1, interval: 99, mix: { maw: 1 } },
];

export const PALETTE = {
  deep: '#04141f',
  waterTop: '#0a2e3f',
  waterMid: '#07222f',
  reefFar: '#0d2f2a',
  reefNear: '#123a2e',
  coral: '#ff8fa3',
  coralDeep: '#c96a7e',
  kelp: '#2fae7d',
  sand: '#1d3a33',
  light: '#ffe9a8',
  lightCore: '#fff6d8',
  bolt: '#ffe066',
  text: '#eaf6f0',
  muted: '#9fc4bb',
  danger: '#ff6b6b',
  panel: 'rgba(4, 26, 34, 0.88)',
  panelEdge: '#2fae7d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-tide.best';

/** Combo window: a kill within this many seconds keeps the chain alive. */
export const COMBO_WINDOW = 3.5;
