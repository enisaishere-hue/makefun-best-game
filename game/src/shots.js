// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (flee the nearest shade, chase the
// nearest mote, dash when cornered), so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_LEVEL, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const UPGRADE_SECONDS = 22;
const END_LIMIT_SECONDS = 240;
const SAMPLE = 1 / 30;

/** Steer Luma: away from the closest shade, toward the closest mote. */
function autopilot(world) {
  const s = world.state;
  const p = s.player;
  let mx = 0;
  let my = 0;
  let nearestShade = null;
  let nearestD = Infinity;
  for (const shade of s.shades) {
    const d = Math.hypot(shade.x - p.x, shade.y - p.y);
    if (d < nearestD) { nearestD = d; nearestShade = shade; }
  }
  if (nearestShade && nearestD < 190) {
    mx += ((p.x - nearestShade.x) / nearestD) * 1.6;
    my += ((p.y - nearestShade.y) / nearestD) * 1.6;
  }
  let nearestMote = null;
  let moteD = Infinity;
  for (const m of s.motes) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < moteD) { moteD = d; nearestMote = m; }
  }
  if (nearestMote && (!nearestShade || nearestD > 130)) {
    mx += (nearestMote.x - p.x) / moteD * 0.8;
    my += (nearestMote.y - p.y) / moteD * 0.8;
  }
  // Never hug a wall: drift back toward the middle of the reef.
  if (p.x < 160) mx += (160 - p.x) / 160;
  if (p.x > FIELD.width - 160) mx -= (p.x - (FIELD.width - 160)) / 160;
  if (p.y < 140) my += (140 - p.y) / 140;
  if (p.y > FIELD.height - 140) my -= (p.y - (FIELD.height - 140)) / 140;
  if (mx === 0 && my === 0) { mx = 0; my = -1; }
  const len = Math.hypot(mx, my);
  const dash = nearestShade !== null && nearestD < 70 && p.dashCd <= 0;
  const nova = s.nova >= 100 && nearestD < 200;
  return { move: { x: mx / len, y: my / len }, dash, nova };
}

function runSteps(world, seconds, stopOnLevel = false) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    // A level-up pauses the world until a card is picked; the staging
    // pilot picks the first card and keeps playing, unless this shot is
    // the upgrade screen itself.
    if (world.state.phase === 'levelup') {
      if (stopOnLevel) break;
      world.applyUpgrade(0);
      continue;
    }
    const pilot = autopilot(world);
    events = world.step(STEP, pilot.move, pilot.dash, pilot.nova);
    if (events & EVENT_OVER) break;
    if (stopOnLevel && events & EVENT_LEVEL) break;
    if (events & EVENT_WIN) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a live reef. play: mid-night action with a HUD
 * full of kills and combo. upgrade: the level-up cards. end: game over
 * after a long run. win: the victory screen, reached with a hero build.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'win') {
    world.heroBuild();
    for (let n = 1; n <= 10; n += 1) {
      const events = runSteps(world, 70);
      if (events & EVENT_WIN) break;
      if (world.state.phase === 'levelup') world.applyUpgrade(0);
      if (world.state.phase === 'over') break;
      // Clear any leftover intermission by stepping with no input.
      for (let i = 0; i < 5 / STEP && world.state.intermission > 0; i += 1) {
        world.step(STEP, { x: 0, y: 0 }, false, false);
      }
    }
    return { screen: world.state.phase === 'win' ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
  }
  if (name === 'upgrade') {
    runSteps(world, UPGRADE_SECONDS, true);
    if (world.state.phase !== 'levelup') {
      // Feed motes until the level-up fires, so the shot always shows cards.
      world.state.xp = world.state.xpNext - 1;
      const mote = { x: world.state.player.x + 10, y: world.state.player.y, vx: 0, vy: 0, value: 2, life: 5, heart: false };
      world.state.motes.push(mote);
      runSteps(world, 3, true);
    }
    return { screen: SCREEN_UPGRADE, best: world.state.score };
  }
  if (name === 'end') {
    runSteps(world, END_LIMIT_SECONDS);
    // If the pilot somehow survived the whole limit, the frame is still
    // an honest end-of-run screen: force the loss through the real rules
    // by letting the shades close in without moving.
    if (world.state.phase !== 'over') {
      for (let i = 0; i < 60 / STEP && world.state.phase !== 'over'; i += 1) {
        world.step(STEP, { x: 0, y: 0 }, false, false);
      }
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Play until the field is busy — at least 5 shades actually on screen,
  // so the frame shows the fight, not empty water — or 75s. The busiest
  // genuine frame seen is kept, so the shot shows the game at its best.
  let bestSnap = null;
  let bestCount = -1;
  for (let i = 0; i < 75 / STEP; i += 1) {
    if (world.state.phase === 'levelup') { world.applyUpgrade(0); continue; }
    const pilot = autopilot(world);
    const events = world.step(STEP, pilot.move, pilot.dash, pilot.nova);
    if (events & EVENT_OVER || events & EVENT_WIN) break;
    const onScreen = world.state.shades.filter(
      (sh) => sh.x > 40 && sh.x < FIELD.width - 40 && sh.y > 40 && sh.y < FIELD.height - 40,
    ).length;
    if (onScreen > bestCount) {
      bestCount = onScreen;
      bestSnap = JSON.parse(JSON.stringify(world.state));
    }
    if (world.state.time > 14 && onScreen >= 5) break;
  }
  const nowOnScreen = world.state.shades.filter(
    (sh) => sh.x > 40 && sh.x < FIELD.width - 40 && sh.y > 40 && sh.y < FIELD.height - 40,
  ).length;
  if (bestSnap && nowOnScreen < 5) world.loadState(bestSnap);
  return { screen: SCREEN_PLAY, best: world.state.score };
}

export { FIELD };
