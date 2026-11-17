// Keyboard + mouse input, read once a frame. Movement is WASD or arrows;
// Space / click dashes (and confirms on menus), E or right-click fires a
// Nova when the meter is full, P / Esc pauses, M mutes, 1-3 pick upgrades.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_NOVA = 8;
export const ACTION_RESTART = 16;

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: 640, y: 360, inside: false };
  let click = null;
  let upgradePick = -1;

  function logicalMouse(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM | ACTION_DASH;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyE') actions |= ACTION_NOVA;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'Digit1') upgradePick = 0;
    if (event.code === 'Digit2') upgradePick = 1;
    if (event.code === 'Digit3') upgradePick = 2;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    mouse = { ...logicalMouse(event), inside: true };
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse = { ...logicalMouse(event), inside: true };
    if (event.button === 2) {
      actions |= ACTION_NOVA;
      return;
    }
    click = logicalMouse(event);
    actions |= ACTION_CONFIRM | ACTION_DASH;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised movement vector from the keys held down. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Actions since the last call; reading clears them. */
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    /** Whether M was pressed — the mute toggle is read by main, not the world. */
    takeMute() {
      if (!keys.has('KeyM')) return false;
      keys.delete('KeyM');
      return true;
    },
    mouse() {
      return mouse;
    },
    /** The last click point since the last call, or null. */
    takeClick() {
      const out = click;
      click = null;
      return out;
    },
    /** Upgrade card index (0-2) picked by number key since the last call. */
    takeUpgradePick() {
      const out = upgradePick;
      upgradePick = -1;
      return out;
    },
    /** True while the pointer is over the canvas. */
    hasMouse() {
      return mouse.inside;
    },
  };
}
