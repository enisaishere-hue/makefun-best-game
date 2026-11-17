// A small seeded random source (mulberry32) so a seed always replays the
// same nights: screenshots, tests and the autopilot all share it.
/** @param {number} seed any 32-bit integer */
export function createRandom(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** Integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p (0..1). */
    chance(p) {
      return next() < p;
    },
    /** One element of a non-empty array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** Weighted pick from {key: weight} — keys with weight 0 never win. */
    weighted(weights) {
      let total = 0;
      for (const key of Object.keys(weights)) total += weights[key];
      let roll = next() * total;
      for (const key of Object.keys(weights)) {
        roll -= weights[key];
        if (roll <= 0) return key;
      }
      return Object.keys(weights)[0];
    },
  };
}
