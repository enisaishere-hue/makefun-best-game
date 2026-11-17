// The simulation: Luma, the shades, bolts, motes and nights. Pure rules —
// no drawing, no sound, no DOM — so the autopilot, the tests and the real
// game all step the same world. Screens live in main.js; the world only
// reports what happened through its event bits and its public state.
import { COMBO_WINDOW, FIELD, NIGHTS, PLAYER, SHADES, STEP } from './config.js';
import { baseStats, rollUpgrades } from './upgrades.js';
import { createWaves, edgeSpawn } from './waves.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_LEVEL = 8;
export const EVENT_KILL = 16;
export const EVENT_NIGHT = 32;
export const EVENT_NOVA = 64;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const waves = createWaves(random);
  let state = null;

  function freshState() {
    return {
      phase: 'playing',
      time: 0,
      score: 0,
      kills: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      level: 1,
      xp: 0,
      xpNext: PLAYER.xpPerLevel,
      player: {
        x: FIELD.width / 2, y: FIELD.height / 2,
        dirX: 0, dirY: -1, invuln: 0,
        dashTime: 0, dashCd: 0, dashX: 0, dashY: 1,
        fireTimer: 0, regenTimer: 0,
      },
      stats: baseStats(),
      taken: {},
      pendingUpgrades: null,
      shades: [],
      bolts: [],
      spits: [],
      motes: [],
      particles: [],
      floats: [],
      banner: { text: 'NIGHT 1', sub: 'The shades are coming — keep the light alive', timer: 2.6 },
      intermission: 0,
      shake: 0,
      flash: 0,
      nova: 0,
      boss: null,
      night: 1,
      quota: 10,
    };
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: random.range(0.3, 0.7), max: 0.7, color, size: random.range(2, 5),
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 0.9, max: 0.9 });
  }

  function spawnShade(kind) {
    const stats = waves.statsFor(kind);
    const at = kind === 'maw'
      ? { x: FIELD.width / 2, y: -80 }
      : edgeSpawn(random, FIELD.width, FIELD.height);
    const shade = {
      kind, ...stats, maxHp: stats.hp, x: at.x, y: at.y,
      vx: 0, vy: 0, wobble: random.range(0, Math.PI * 2),
      shootTimer: random.range(1.5, 2.5), spawnTimer: 0, flash: 0,
    };
    state.shades.push(shade);
    if (kind === 'maw') state.boss = shade;
    return shade;
  }

  function dropMote(x, y, kind) {
    const value = kind === 'maw' ? 20 : SHADES[kind]?.xp ?? 1;
    for (let i = 0; i < value; i += 1) {
      state.motes.push({
        x: x + random.range(-14, 14), y: y + random.range(-14, 14),
        vx: random.range(-30, 30), vy: random.range(-30, 30),
        value: 1, life: 12, heart: false,
      });
    }
    if (random.chance(0.06)) {
      state.motes.push({ x, y, vx: 0, vy: 0, value: 0, life: 12, heart: true });
    }
  }

  function killShade(shade, index) {
    state.shades.splice(index, 1);
    state.kills += 1;
    waves.noteKill();
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const mult = 1 + Math.min(state.combo, 20) * 0.1;
    const gained = Math.round(shade.score * mult);
    state.score += gained;
    burst(shade.x, shade.y, shade.color, shade.kind === 'maw' ? 60 : 14, 220);
    floatText(shade.x, shade.y - shade.radius, `+${gained}`, '#ffe9a8');
    dropMote(shade.x, shade.y, shade.kind);
    if (shade.kind === 'maw') state.boss = null;
    return EVENT_KILL;
  }

  function gainXp(amount) {
    state.xp += amount;
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.level += 1;
      state.xpNext = Math.round(PLAYER.xpPerLevel * Math.pow(PLAYER.xpGrowth, state.level - 1));
      state.pendingUpgrades = rollUpgrades(random, state.taken);
      state.phase = 'levelup';
      return true;
    }
    return false;
  }

  function fireBolts() {
    const p = state.player;
    const s = state.stats;
    let target = null;
    let best = 560 * 560;
    for (const shade of state.shades) {
      const d = dist2(p, shade);
      if (d < best) { best = d; target = shade; }
    }
    if (!target) return;
    const base = Math.atan2(target.y - p.y, target.x - p.x);
    const n = s.multiShot;
    for (let i = 0; i < n; i += 1) {
      const spread = (i - (n - 1) / 2) * 0.16;
      const a = base + spread;
      state.bolts.push({
        x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * s.boltSpeed, vy: Math.sin(a) * s.boltSpeed,
        damage: s.damage, pierce: s.pierce, radius: PLAYER.boltRadius, life: 1.4,
      });
    }
    p.fireTimer = s.fireInterval;
  }

  function novaBlast() {
    const p = state.player;
    const s = state.stats;
    burst(p.x, p.y, '#ffe066', 46, 420);
    state.flash = 0.35;
    state.shake = 10;
    let events = EVENT_NOVA;
    for (let i = state.shades.length - 1; i >= 0; i -= 1) {
      const shade = state.shades[i];
      const d = Math.hypot(shade.x - p.x, shade.y - p.y);
      if (d < 260 + shade.radius) {
        shade.hp -= s.novaDamage;
        shade.flash = 0.2;
        if (shade.hp <= 0) events |= killShade(shade, i);
      }
    }
    return events;
  }

  function hurtPlayer(damage, fromX, fromY) {
    const p = state.player;
    if (p.invuln > 0 || p.dashTime > 0 || state.phase !== 'playing') return 0;
    state.stats.hp -= damage;
    p.invuln = PLAYER.hurtInvuln;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 12;
    state.flash = 0.25;
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    p.x = Math.max(24, Math.min(FIELD.width - 24, p.x + (dx / len) * 42));
    p.y = Math.max(24, Math.min(FIELD.height - 24, p.y + (dy / len) * 42));
    burst(p.x, p.y, '#ff6b6b', 16, 260);
    if (state.stats.hp <= 0) {
      state.stats.hp = 0;
      state.phase = 'over';
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function stepPlaying(dt, move, dash, nova) {
    let events = 0;
    const p = state.player;
    const s = state.stats;
    state.time += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    // Night banner / intermission.
    if (state.banner.timer > 0) state.banner.timer -= dt;
    if (state.intermission > 0) {
      state.intermission -= dt;
      if (state.intermission <= 0) {
        state.night += 1;
        waves.startNight(state.night);
        state.quota = waves.quota;
        state.banner = {
          text: `NIGHT ${state.night}`,
          sub: state.night === NIGHTS ? 'Something huge stirs below…' : 'The dark grows bolder',
          timer: 2.6,
        };
        events |= EVENT_NIGHT;
      }
    }

    // Dash: a short invulnerable burst in the move direction.
    if (dash && p.dashCd <= 0 && p.dashTime <= 0) {
      const dx = move.x !== 0 || move.y !== 0 ? move.x : p.dirX;
      const dy = move.x !== 0 || move.y !== 0 ? move.y : p.dirY;
      p.dashX = dx;
      p.dashY = dy;
      p.dashTime = PLAYER.dashTime;
      p.dashCd = s.dashCooldown;
      burst(p.x, p.y, '#9fe8d8', 10, 180);
    }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * PLAYER.dashSpeed * dt;
      p.y += p.dashY * PLAYER.dashSpeed * dt;
    } else {
      p.x += move.x * s.moveSpeed * dt;
      p.y += move.y * s.moveSpeed * dt;
    }
    p.x = Math.max(20, Math.min(FIELD.width - 20, p.x));
    p.y = Math.max(20, Math.min(FIELD.height - 20, p.y));
    if (move.x !== 0 || move.y !== 0) { p.dirX = move.x; p.dirY = move.y; }

    // Nova: full meter clears the dark around Luma.
    if (nova && state.nova >= 100) {
      state.nova = 0;
      events |= novaBlast();
    }

    // Slow regrowth from Mending Tide.
    if (s.regen > 0 && s.hp < s.maxHp) {
      p.regenTimer += dt;
      if (p.regenTimer >= 24 / s.regen) {
        p.regenTimer = 0;
        s.hp = Math.min(s.maxHp, s.hp + 1);
      }
    }

    // Auto-fire at the nearest shade.
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) fireBolts();

    // Spawner.
    for (const kind of waves.step(dt, state.shades.length)) spawnShade(kind);

    // Shades chase, spit, or — for the Maw — summon drifters.
    for (const shade of state.shades) {
      shade.flash = Math.max(0, shade.flash - dt);
      shade.wobble += dt * 2;
      const dx = p.x - shade.x;
      const dy = p.y - shade.y;
      const d = Math.hypot(dx, dy) || 1;
      let speed = shade.speed;
      if (shade.kind === 'spitter' && d < 220) speed = -shade.speed * 0.5;
      if (shade.kind === 'dart') speed *= 1 + 0.25 * Math.sin(shade.wobble);
      shade.x += (dx / d) * speed * dt + Math.cos(shade.wobble) * 8 * dt;
      shade.y += (dy / d) * speed * dt + Math.sin(shade.wobble) * 8 * dt;
      if (shade.kind === 'spitter') {
        shade.shootTimer -= dt;
        if (shade.shootTimer <= 0 && d < 460) {
          shade.shootTimer = 2.6;
          state.spits.push({
            x: shade.x, y: shade.y,
            vx: (dx / d) * 240, vy: (dy / d) * 240,
            radius: 7, life: 3,
          });
        }
      }
      if (shade.kind === 'maw') {
        shade.spawnTimer -= dt;
        if (shade.spawnTimer <= 0 && state.shades.length < 20) {
          shade.spawnTimer = 6;
          spawnShade('drifter');
          spawnShade('dart');
        }
      }
    }

    // Bolts fly and pierce.
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const b = state.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
      if (!dead) {
        for (let j = state.shades.length - 1; j >= 0; j -= 1) {
          const shade = state.shades[j];
          const rr = shade.radius + b.radius;
          if (dist2(b, shade) < rr * rr) {
            shade.hp -= b.damage;
            shade.flash = 0.15;
            floatText(shade.x, shade.y - shade.radius - 6, String(b.damage), '#ffe066');
            burst(b.x, b.y, '#ffe066', 4, 120);
            if (shade.hp <= 0) events |= killShade(shade, j);
            if (b.pierce > 0) { b.pierce -= 1; }
            else { dead = true; }
            break;
          }
        }
      }
      if (dead) state.bolts.splice(i, 1);
    }

    // Spitter shots.
    for (let i = state.spits.length - 1; i >= 0; i -= 1) {
      const sp = state.spits[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      const rr = PLAYER.radius + sp.radius;
      if (dist2(sp, p) < rr * rr) {
        events |= hurtPlayer(1, sp.x - sp.vx, sp.y - sp.vy);
        state.spits.splice(i, 1);
        continue;
      }
      if (sp.life <= 0 || sp.x < -20 || sp.x > FIELD.width + 20 || sp.y < -20 || sp.y > FIELD.height + 20) {
        state.spits.splice(i, 1);
      }
    }

    // Touch damage.
    for (const shade of state.shades) {
      const rr = shade.radius + PLAYER.radius - 4;
      if (dist2(shade, p) < rr * rr) {
        events |= hurtPlayer(shade.damage, shade.x, shade.y);
        if (state.phase !== 'playing') break;
      }
    }
    if (state.phase !== 'playing') return events;

    // Motes drift in, then feed XP, score and the Nova meter.
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const m = state.motes[i];
      m.life -= dt;
      const d = Math.hypot(p.x - m.x, p.y - m.y) || 1;
      if (d < s.magnetRadius) {
        m.x += ((p.x - m.x) / d) * 340 * dt;
        m.y += ((p.y - m.y) / d) * 340 * dt;
      } else {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.vx *= 0.98;
        m.vy *= 0.98;
      }
      if (d < PLAYER.radius + 12) {
        if (m.heart) {
          s.hp = Math.min(s.maxHp, s.hp + 1);
          floatText(p.x, p.y - 28, '+1 ♥', '#ff8fa3');
        } else {
          state.score += 5;
          state.nova = Math.min(100, state.nova + 2 * s.novaGain);
          if (gainXp(m.value)) events |= EVENT_LEVEL;
        }
        state.motes.splice(i, 1);
        continue;
      }
      if (m.life <= 0) state.motes.splice(i, 1);
    }

    // Particles and floating numbers fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }

    // Night cleared: a breather, then the next night — or victory.
    if (waves.cleared && state.intermission <= 0 && state.phase === 'playing') {
      if (state.night >= NIGHTS) {
        state.phase = 'win';
        state.score += 2000;
        return events | EVENT_WIN;
      }
      state.intermission = 4;
      state.banner = { text: `NIGHT ${state.night} CLEARED`, sub: 'Catch your breath — the reef glows again', timer: 3.2 };
      state.score += 150 * state.night;
      events |= EVENT_NIGHT;
    }
    return events;
  }

  return {
    get state() { return state; },
    get waves() { return waves; },

    reset() {
      state = freshState();
      waves.startNight(1);
      state.quota = waves.quota;
    },

    /** Replace the live state with a plain snapshot (shot staging only). */
    loadState(snap) {
      state = snap;
    },

    /**
     * Advance the world one fixed step. `move` is a normalised vector.
     * Returns event bits; while the world is in level-up / over / win the
     * simulation is frozen and step is a no-op.
     */
    step(dt, move, dash, nova) {
      if (!state) this.reset();
      if (state.phase !== 'playing') return 0;
      return stepPlaying(dt, move, dash, nova);
    },

    /** Apply a level-up card, then resume play. */
    applyUpgrade(choice) {
      if (!state.pendingUpgrades) return;
      const up = state.pendingUpgrades[choice];
      if (!up) return;
      up.apply(state.stats);
      state.taken[up.id] = (state.taken[up.id] ?? 0) + 1;
      if (up.id === 'warm-light') state.score += 250;
      state.pendingUpgrades = null;
      state.phase = 'playing';
    },

    /** Shot staging only: a hero build so the win scene can be reached fast. */
    heroBuild() {
      state.stats.damage = 4;
      state.stats.multiShot = 3;
      state.stats.pierce = 2;
      state.stats.fireInterval = 0.22;
      state.stats.moveSpeed = 360;
      state.stats.maxHp = 8;
      state.stats.hp = 8;
    },
  };
}
