// Nights: what spawns, how fast, and when a night is done. Night 10 is a
// single boss — the Abyssal Maw — and clearing it wins the run. Every other
// night ends when its kill quota is met; the spawner then rests until the
// next night's horn.
import { NIGHT_PLAN, SHADES } from './config.js';

/** Spawn-point on a field edge, outside the player's view of the reef. */
export function edgeSpawn(random, width, height, margin = 40) {
  const side = random.int(0, 3);
  if (side === 0) return { x: random.range(0, width), y: -margin };
  if (side === 1) return { x: width + margin, y: random.range(0, height) };
  if (side === 2) return { x: random.range(0, width), y: height + margin };
  return { x: -margin, y: random.range(0, height) };
}

export function createWaves(random) {
  let night = 1;
  let timer = 0;
  let spawned = 0;
  let killed = 0;
  let bossSpawned = false;

  function plan() {
    return NIGHT_PLAN[Math.min(night, NIGHT_PLAN.length) - 1];
  }

  return {
    get night() { return night; },
    get quota() { return plan().quota; },
    get killed() { return killed; },
    /** True once this night's quota is met (boss dead on night 10). */
    get cleared() { return killed >= plan().quota; },
    get isBossNight() { return night >= NIGHT_PLAN.length; },

    startNight(n) {
      night = n;
      timer = 0;
      spawned = 0;
      killed = 0;
      bossSpawned = false;
    },
    noteKill() { killed += 1; },

    /**
     * Advance the spawner one step. Returns the shade kinds to spawn this
     * step (usually none or one; a pair from night 3 on, so the field
     * stays busy). `alive` is how many shades are already on the field.
     */
    step(dt, alive) {
      const p = plan();
      if (killed >= p.quota) return [];
      if (p.mix.maw) {
        if (!bossSpawned) {
          bossSpawned = true;
          spawned += 1;
          return ['maw'];
        }
        return [];
      }
      if (spawned >= p.quota + 8) return [];
      if (alive >= 30) return [];
      timer -= dt;
      if (timer > 0) return [];
      timer = p.interval * random.range(0.75, 1.25);
      const out = [random.weighted(p.mix)];
      spawned += 1;
      if (night >= 3 && alive < 18 && random.chance(0.55)) {
        out.push(random.weighted(p.mix));
        spawned += 1;
      }
      return out;
    },

    /** Night-1 base stats for a kind, scaled by the current night. */
    statsFor(kind) {
      const base = SHADES[kind];
      const scale = 1 + (night - 1) * 0.14;
      const hpScale = kind === 'maw' ? 1 + (night - 1) * 0.05 : scale;
      return {
        radius: base.radius,
        hp: Math.max(1, Math.round(base.hp * hpScale)),
        speed: base.speed * (1 + (night - 1) * 0.045),
        damage: base.damage,
        score: base.score,
        xp: base.xp,
        color: base.color,
        glow: base.glow,
      };
    },
  };
}
