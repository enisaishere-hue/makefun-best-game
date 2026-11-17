// Level-up choices: when Luma gathers enough Light Motes, play pauses and
// the player picks one of three upgrade cards. Each upgrade stacks a few
// times; a maxed one never appears again. `stats` is the mutable build the
// world keeps — every effect here is a plain number the world already reads.
export const UPGRADE_POOL = [
  {
    id: 'bright-bolts', name: 'Bright Bolts', glyph: '✦', max: 5,
    blurb: '+1 bolt damage.',
    apply(s) { s.damage += 1; },
  },
  {
    id: 'rapid-glow', name: 'Rapid Glow', glyph: '≫', max: 4,
    blurb: 'Fire 18% faster.',
    apply(s) { s.fireInterval *= 0.82; },
  },
  {
    id: 'twin-lantern', name: 'Twin Lantern', glyph: '❖', max: 2,
    blurb: '+1 bolt per shot.',
    apply(s) { s.multiShot += 1; },
  },
  {
    id: 'swift-current', name: 'Swift Current', glyph: '～', max: 4,
    blurb: '+12% swim speed.',
    apply(s) { s.moveSpeed *= 1.12; },
  },
  {
    id: 'wide-net', name: 'Wide Net', glyph: '◎', max: 3,
    blurb: '+45% mote magnet.',
    apply(s) { s.magnetRadius *= 1.45; },
  },
  {
    id: 'thick-shell', name: 'Thick Shell', glyph: '⬢', max: 3,
    blurb: '+1 max heart, heal 1.',
    apply(s) { s.maxHp += 1; s.hp = Math.min(s.maxHp, s.hp + 1); },
  },
  {
    id: 'quick-dash', name: 'Quick Dash', glyph: '➤', max: 3,
    blurb: 'Dash recharges faster.',
    apply(s) { s.dashCooldown *= 0.7; },
  },
  {
    id: 'piercing-light', name: 'Piercing Light', glyph: '↗', max: 3,
    blurb: 'Bolts pierce +1 shade.',
    apply(s) { s.pierce += 1; },
  },
  {
    id: 'nova-heart', name: 'Nova Heart', glyph: '☀', max: 3,
    blurb: 'Nova charges faster, hits harder.',
    apply(s) { s.novaGain *= 1.3; s.novaDamage *= 1.5; },
  },
  {
    id: 'mending-tide', name: 'Mending Tide', glyph: '✚', max: 3,
    blurb: 'Regrow 1 HP every 24s.',
    apply(s) { s.regen += 1; },
  },
];

/** The fresh build every run starts from. */
export function baseStats() {
  return {
    damage: 1, fireInterval: 0.42, boltSpeed: 620, moveSpeed: 300,
    magnetRadius: 90, maxHp: 5, hp: 5, dashCooldown: 2.2,
    multiShot: 1, pierce: 0, novaGain: 1, novaDamage: 6, regen: 0,
  };
}

/**
 * Roll `count` distinct upgrades the build can still take.
 * @param {object} random a seeded random source
 * @param {Record<string, number>} taken stacks already owned, by upgrade id
 */
export function rollUpgrades(random, taken, count = 3) {
  const available = UPGRADE_POOL.filter((u) => (taken[u.id] ?? 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(random.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  // A fully maxed build still gets a choice: heal instead of nothing.
  while (picks.length < count) {
    picks.push({
      id: 'warm-light', name: 'Warm Light', glyph: '♥', max: 99,
      blurb: 'Heal 2 hearts, +250 points.',
      apply(s) { s.hp = Math.min(s.maxHp, s.hp + 2); },
    });
  }
  return picks;
}
