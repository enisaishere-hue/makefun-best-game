// All sound is synthesised with WebAudio — no audio files, no network.
// Short oscillator blips for shots and pickups, a low horn for a new night,
// and a soft two-note pad that hums under play. Created lazily on the first
// user gesture, so browsers' autoplay rules never block it.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sfx = {
    shoot() { tone(880, 0.07, 'triangle', 0.10, 520); },
    hit() { tone(220, 0.08, 'square', 0.08, 110); },
    kill() { tone(520, 0.12, 'sine', 0.14, 1040); },
    mote() { tone(1320, 0.09, 'sine', 0.10, 1760); },
    hurt() { tone(160, 0.25, 'sawtooth', 0.16, 60); },
    dash() { tone(300, 0.14, 'sine', 0.12, 900); },
    nova() { tone(220, 0.5, 'sawtooth', 0.14, 880); tone(440, 0.5, 'sine', 0.10, 1760, 0.05); },
    level() { tone(523, 0.12, 'sine', 0.14); tone(659, 0.12, 'sine', 0.14, undefined, 0.09); tone(784, 0.2, 'sine', 0.14, undefined, 0.18); },
    horn() { tone(98, 0.7, 'sawtooth', 0.12, 98); tone(147, 0.7, 'sawtooth', 0.08, 147, 0.08); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.14, undefined, i * 0.13)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, undefined, i * 0.15)); },
  };

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    play(name) {
      if (!ensure()) return;
      const fn = sfx[name];
      if (fn) fn();
    },
    startPad() {
      if (!ensure() || padNodes) return;
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();
      oscA.type = 'sine';
      oscB.type = 'sine';
      oscA.frequency.value = 110;
      oscB.frequency.value = 164.8;
      gain.gain.value = 0.035;
      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(master);
      oscA.start();
      oscB.start();
      padNodes = { oscA, oscB, gain };
    },
    stopPad() {
      if (!padNodes) return;
      try { padNodes.oscA.stop(); padNodes.oscB.stop(); } catch { /* already stopped */ }
      padNodes = null;
    },
  };
}
