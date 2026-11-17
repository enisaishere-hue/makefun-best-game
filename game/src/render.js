// Everything the eye sees: the reef, the light, the shades, the HUD and
// every menu. One canvas, one logical 1280x720 field, glow done with
// shadowBlur and layered gradients — no images, so the game never fetches.
import { FIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  // The reef is fixed decor: coral heads and kelp placed once, so the scene
  // never jumps between frames or seeds.
  const corals = [];
  for (let i = 0; i < 26; i += 1) {
    corals.push({
      x: 30 + i * 49 + ((i * 37) % 23),
      h: 40 + ((i * 53) % 90),
      w: 26 + ((i * 29) % 30),
      hue: i % 3 === 0 ? PALETTE.coralDeep : PALETTE.reefNear,
    });
  }
  const kelps = [];
  for (let i = 0; i < 18; i += 1) {
    kelps.push({ x: 60 + i * 68, h: 90 + ((i * 41) % 80), sway: (i * 0.7) % 3 });
  }

  function drawWater(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.waterTop);
    g.addColorStop(0.55, PALETTE.waterMid);
    g.addColorStop(1, PALETTE.deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // God rays from the surface.
    ctx.save();
    ctx.globalAlpha = 0.05 + 0.02 * Math.sin(time * 0.4);
    ctx.fillStyle = '#bfefff';
    for (let i = 0; i < 5; i += 1) {
      const x = 140 + i * 260 + Math.sin(time * 0.3 + i) * 24;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 70, 0);
      ctx.lineTo(x + 190, FIELD.height);
      ctx.lineTo(x + 60, FIELD.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Rising bubbles.
    ctx.fillStyle = 'rgba(190, 240, 255, 0.35)';
    for (let i = 0; i < 22; i += 1) {
      const bx = (i * 173) % FIELD.width;
      const by = FIELD.height - ((time * (18 + (i % 5) * 9) + i * 97) % (FIELD.height + 40));
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawReef(time) {
    ctx.fillStyle = PALETTE.reefFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.reefY + 40);
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.lineTo(x, FIELD.reefY + 10 + Math.sin(x * 0.01) * 26);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    // Kelp swaying on the reef.
    ctx.strokeStyle = PALETTE.kelp;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const k of kelps) {
      const sway = Math.sin(time * 0.9 + k.sway) * 14;
      ctx.beginPath();
      ctx.moveTo(k.x, FIELD.reefY + 30);
      ctx.quadraticCurveTo(k.x + sway * 0.4, FIELD.reefY - k.h * 0.5, k.x + sway, FIELD.reefY - k.h);
      ctx.stroke();
    }
    // Coral heads.
    for (const c of corals) {
      ctx.fillStyle = c.hue;
      ctx.beginPath();
      ctx.ellipse(c.x, FIELD.reefY + 34, c.w, c.h, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      ctx.arc(c.x - c.w * 0.3, FIELD.reefY + 34 - c.h * 0.55, 4, 0, Math.PI * 2);
      ctx.arc(c.x + c.w * 0.25, FIELD.reefY + 34 - c.h * 0.75, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMotes(state) {
    for (const m of state.motes) {
      if (m.heart) {
        text(ctx, '♥', m.x, m.y, 26, '#ff8fa3');
        continue;
      }
      ctx.save();
      ctx.shadowColor = '#ffe9a8';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawShade(shade, time) {
    ctx.save();
    ctx.translate(shade.x, shade.y);
    ctx.shadowColor = shade.glow;
    ctx.shadowBlur = 22;
    ctx.fillStyle = shade.color;
    if (shade.flash > 0) ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (shade.kind === 'bulwark') {
      // A spiked, armoured ball.
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + time * 0.4;
        ctx.moveTo(Math.cos(a) * shade.radius, Math.sin(a) * shade.radius);
        ctx.lineTo(Math.cos(a) * (shade.radius + 12), Math.sin(a) * (shade.radius + 12));
      }
      ctx.strokeStyle = shade.color;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.arc(0, 0, shade.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Eyes that track the player, and a maw for the boss.
    ctx.fillStyle = '#0a1420';
    const eyeY = -shade.radius * 0.25;
    const eyeGap = shade.radius * 0.38;
    ctx.beginPath();
    ctx.arc(-eyeGap, eyeY, Math.max(3, shade.radius * 0.16), 0, Math.PI * 2);
    ctx.arc(eyeGap, eyeY, Math.max(3, shade.radius * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eyeGap + 1, eyeY - 1, Math.max(1.5, shade.radius * 0.07), 0, Math.PI * 2);
    ctx.arc(eyeGap + 1, eyeY - 1, Math.max(1.5, shade.radius * 0.07), 0, Math.PI * 2);
    ctx.fill();
    if (shade.kind === 'maw') {
      ctx.fillStyle = '#2a0612';
      ctx.beginPath();
      ctx.ellipse(0, shade.radius * 0.42, shade.radius * 0.55, shade.radius * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 12 - 5, shade.radius * 0.28);
        ctx.lineTo(i * 12, shade.radius * 0.48);
        ctx.lineTo(i * 12 + 5, shade.radius * 0.28);
        ctx.fill();
      }
    }
    // Health arc for anything hurt.
    if (shade.hp < shade.maxHp && shade.kind !== 'maw') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, shade.radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * shade.hp) / shade.maxHp);
      ctx.stroke();
    }
  }

  function drawPlayer(state, time) {
    const p = state.player;
    const blink = p.invuln > 0 && Math.floor(time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.dashTime > 0) ctx.globalAlpha = 0.85;
    // Trail of light behind the swim.
    ctx.shadowColor = '#ffe9a8';
    ctx.shadowBlur = 34;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
    g.addColorStop(0, 'rgba(255, 246, 216, 0.9)');
    g.addColorStop(0.4, 'rgba(255, 233, 168, 0.45)');
    g.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb454';
      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, Math.PI * 2);
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a4a12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    // Dash cooldown ring.
    if (p.dashCd > 0) {
      const total = state.stats.dashCooldown || 2.2;
      ctx.strokeStyle = 'rgba(159, 232, 216, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - p.dashCd / total)));
      ctx.stroke();
    }
  }

  function drawHud(state, best, screen) {
    const s = state.stats;
    // Top bar.
    ctx.fillStyle = 'rgba(4, 20, 31, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, 64);
    // Hearts.
    for (let i = 0; i < s.maxHp; i += 1) {
      text(ctx, i < s.hp ? '♥' : '♡', 28 + i * 30, 32, 26, i < s.hp ? '#ff8fa3' : '#5a7a72');
    }
    // XP bar.
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 220, 22, 260, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    roundRect(ctx, 220, 22, 260 * Math.min(1, state.xp / state.xpNext), 14, 7);
    ctx.fill();
    text(ctx, `LV ${state.level}`, 500, 30, 16, PALETTE.text, 'left');
    text(ctx, `NIGHT ${state.night} / 10`, 640, 24, 20, PALETTE.text);
    text(ctx, `KILLS ${state.kills}  ·  QUOTA ${state.quota}`, 640, 46, 14, PALETTE.muted);
    text(ctx, `SCORE ${state.score}`, 1010, 24, 22, '#ffe9a8', 'left');
    text(ctx, `BEST ${Math.max(best, state.score)}`, 1010, 46, 14, PALETTE.muted, 'left');
    if (state.combo >= 3) {
      text(ctx, `COMBO x${state.combo}`, 1260, 52, 18, '#ffb454', 'right');
    }
    // Nova meter, bottom centre.
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 520, 688, 240, 12, 6);
    ctx.fill();
    ctx.fillStyle = state.nova >= 100 ? '#ffe066' : '#e8a33d';
    roundRect(ctx, 520, 688, 240 * (state.nova / 100), 12, 6);
    ctx.fill();
    text(ctx, state.nova >= 100 ? 'NOVA READY — press E / right-click' : 'NOVA', 640, 672, 13, PALETTE.muted);
    // Boss bar.
    if (state.boss) {
      ctx.fillStyle = 'rgba(4, 20, 31, 0.6)';
      roundRect(ctx, 340, 76, 600, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#c94b6e';
      roundRect(ctx, 340, 76, 600 * Math.max(0, state.boss.hp / state.boss.maxHp), 16, 8);
      ctx.fill();
      text(ctx, 'THE ABYSSAL MAW', 640, 68, 14, '#ff8fa3');
    }
    // Night banner — only while actually playing, never over a menu.
    if (state.banner.timer > 0 && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      const a = Math.min(1, state.banner.timer);
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, state.banner.text, 640, 150, 44, '#ffe9a8');
      text(ctx, state.banner.sub, 640, 192, 18, PALETTE.text, 'center', 400);
      ctx.restore();
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4, 20, 31, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'LUMEN TIDE', 640, 210, 84, '#ffe9a8');
    text(ctx, 'Keeper of the Last Light', 640, 272, 30, PALETTE.text, 'center', 400);
    text(ctx, 'The reef is going dark. Swim, shine, survive ten nights —', 640, 340, 19, PALETTE.muted, 'center', 400);
    text(ctx, 'and light the Beacon before the Abyssal Maw swallows it.', 640, 366, 19, PALETTE.muted, 'center', 400);
    panel(390, 410, 500, 150);
    text(ctx, 'WASD / ARROWS — swim', 640, 442, 18, PALETTE.text, 'center', 500);
    text(ctx, 'SPACE / CLICK — dash through danger', 640, 472, 18, PALETTE.text, 'center', 500);
    text(ctx, 'E / RIGHT-CLICK — Nova when the meter is full', 640, 502, 18, PALETTE.text, 'center', 500);
    text(ctx, 'Collect motes · Level up · Pick your light', 640, 532, 18, PALETTE.text, 'center', 500);
    text(ctx, '▶  PRESS SPACE OR CLICK TO BEGIN', 640, 610, 22, '#ffe066');
    if (best > 0) text(ctx, `Best score: ${best}`, 640, 648, 16, PALETTE.muted, 'center', 400);
  }

  function drawUpgrade(state) {
    ctx.fillStyle = 'rgba(4, 20, 31, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'LEVEL UP — CHOOSE YOUR LIGHT', 640, 130, 36, '#ffe9a8');
    text(ctx, 'Click a card, or press 1 / 2 / 3', 640, 172, 18, PALETTE.muted, 'center', 400);
    const cards = state.pendingUpgrades ?? [];
    cards.forEach((up, i) => {
      const x = 190 + i * 310;
      const y = 220;
      const level = (state.taken[up.id] ?? 0) + 1;
      panel(x, y, 280, 260);
      text(ctx, up.glyph, x + 140, y + 62, 52, '#ffe9a8');
      text(ctx, up.name, x + 140, y + 122, 24, PALETTE.text);
      text(ctx, `Level ${level}`, x + 140, y + 152, 15, PALETTE.muted, 'center', 400);
      // Wrap the blurb over two lines.
      const words = up.blurb.split(' ');
      let line = '';
      let ly = y + 196;
      for (const w of words) {
        if ((line + ' ' + w).trim().length > 26) {
          text(ctx, line.trim(), x + 140, ly, 16, PALETTE.text, 'center', 400);
          ly += 24;
          line = w;
        } else line += ' ' + w;
      }
      if (line.trim()) text(ctx, line.trim(), x + 140, ly, 16, PALETTE.text, 'center', 400);
      text(ctx, `[ ${i + 1} ]`, x + 140, y + 232, 16, '#9fe8d8');
    });
  }

  function drawEnd(state, best, won) {
    ctx.fillStyle = 'rgba(4, 20, 31, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (won) {
      text(ctx, '☀  THE LIGHT RETURNS  ☀', 640, 200, 52, '#ffe9a8');
      text(ctx, 'The Maw is gone. Dawn breaks over the reef you kept alive.', 640, 258, 20, PALETTE.text, 'center', 400);
    } else {
      text(ctx, 'THE LIGHT FADES', 640, 200, 52, '#ff8fa3');
      text(ctx, 'The shades close in… but the reef remembers your glow.', 640, 258, 20, PALETTE.text, 'center', 400);
    }
    panel(440, 300, 400, 210);
    text(ctx, `SCORE  ${state.score}`, 640, 340, 26, '#ffe9a8');
    text(ctx, `BEST  ${Math.max(best, state.score)}`, 640, 378, 18, PALETTE.text, 'center', 500);
    text(ctx, `NIGHT REACHED  ${state.night} / 10`, 640, 412, 18, PALETTE.text, 'center', 500);
    text(ctx, `SHADES BANISHED  ${state.kills}   ·   BEST COMBO x${state.bestCombo}`, 640, 446, 18, PALETTE.text, 'center', 500);
    text(ctx, `LEVEL  ${state.level}   ·   TIME  ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 640, 478, 18, PALETTE.text, 'center', 500);
    text(ctx, '▶  PRESS SPACE OR CLICK TO PLAY AGAIN  (R restarts)', 640, 580, 20, '#ffe066');
  }

  return {
    draw(state, screen, best) {
      const time = state.time;
      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      drawWater(time);
      drawReef(time);
      drawMotes(state);
      // Bolts under the shades, so hits read clearly.
      for (const b of state.bolts) {
        ctx.save();
        ctx.shadowColor = '#ffe066';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
      for (const sp of state.spits) {
        ctx.save();
        ctx.shadowColor = '#ffb454';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffb454';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const shade of state.shades) drawShade(shade, time);
      if (screen !== SCREEN_TITLE) drawPlayer(state, time);
      for (const pt of state.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const f of state.floats) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        text(ctx, f.text, f.x, f.y, 16, f.color);
        ctx.restore();
      }
      ctx.restore();
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 240, 180, ${state.flash * 0.5})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      if (screen === SCREEN_TITLE) {
        drawTitle(state, best);
        return;
      }
      drawHud(state, best, screen);
      if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(4, 20, 31, 0.6)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        text(ctx, 'PAUSED', 640, 330, 56, PALETTE.text);
        text(ctx, 'Press P or Esc to keep swimming', 640, 390, 20, PALETTE.muted, 'center', 400);
      } else if (screen === SCREEN_UPGRADE) {
        drawUpgrade(state);
      } else if (screen === SCREEN_OVER) {
        drawEnd(state, best, false);
      } else if (screen === SCREEN_WIN) {
        drawEnd(state, best, true);
      }
    },
    /** Card hit-boxes, in the same order the upgrade screen draws them. */
    upgradeCardAt(x, y) {
      for (let i = 0; i < 3; i += 1) {
        const cx = 190 + i * 310;
        if (x >= cx && x <= cx + 280 && y >= 220 && y <= 480) return i;
      }
      return -1;
    },
  };
}
