// Drawing Plaque on a canvas: the petri dish, its lawn of bacteria (E. coli
// rods, like PetriPals' Colette), Tess landing, infected cells filling up and
// turning red as they get close to self-destructing, and the bursts. All in
// dish units; the page sets the canvas up so they fill it (see play.js).

import { DISH } from './config.js';
import { hexCorners } from './hex.js';
import { danger } from './lawn.js';

export const COLORS = {
  agar: '#fef3c7', // what a clear plaque shows: the agar underneath
  rim: '#fcd34d',
  lawn: '#ecfccb', // the cloudy lawn of bacteria
  rod: '#84cc16', // each bacterium, green-apple like Colette
  alarm: '#f87171', // an infected cell turns this color as it gets close
  dead: '#d6d3d1',
  outline: '#d9f99d',
};

// Mix two #rrggbb colors: `t` of the way from `a` to `b`.
export function mix(a, b, t) {
  const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const parts = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hexPath(ctx, x, y, size) {
  const corners = hexCorners(x, y, size);
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  for (const [cx, cy] of corners.slice(1)) ctx.lineTo(cx, cy);
  ctx.closePath();
}

// One bacterium: a little rod, tilted a different way in each cell.
function drawRod(ctx, cell, color) {
  const tilt = ((cell.q * 7 + cell.r * 13) % 6) * 0.5;
  ctx.save();
  ctx.translate(cell.x, cell.y);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-8, -3.5, 16, 7, 3.5);
  ctx.fill();
  ctx.restore();
}

function drawCell(ctx, dish, cell, clock) {
  const size = DISH.cellSize - 1;
  if (cell.state === 'plaque') return; // a clear hole: just the agar
  if (cell.state === 'dead') {
    hexPath(ctx, cell.x, cell.y, size);
    ctx.fillStyle = COLORS.dead;
    ctx.fill();
    drawRod(ctx, cell, '#a8a29e');
    return;
  }
  if (cell.state === 'healthy') {
    hexPath(ctx, cell.x, cell.y, size);
    ctx.fillStyle = COLORS.lawn;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.stroke();
    drawRod(ctx, cell, COLORS.rod);
    return;
  }
  // Infected: redder and shakier the closer it is to self-destructing, and
  // filling up with purple copies of Tess.
  const close = danger(dish, cell);
  const shake = close > 0.5 ? (close - 0.5) * 3 * Math.sin(clock * 50 + cell.q) : 0;
  const x = cell.x + shake;
  hexPath(ctx, x, cell.y, size);
  ctx.fillStyle = mix(COLORS.lawn, COLORS.alarm, close);
  ctx.fill();
  drawRod(ctx, { ...cell, x }, mix(COLORS.rod, '#b91c1c', close));
  const full = cell.copies / dish.virus.full;
  if (full > 0) {
    ctx.fillStyle = dish.virus.color;
    ctx.beginPath();
    ctx.arc(x, cell.y, 2 + 7 * full, 0, Math.PI * 2);
    ctx.fill();
  }
  if (full >= 1) {
    // Full: a white ring says there's nothing to gain by waiting.
    hexPath(ctx, x, cell.y, size - 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// Your pal, with her face: her drawing from pals.js once it's loaded, and a
// plain dot until then.
function drawPal(ctx, image, x, y, size) {
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  else {
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(x, y, size / 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A burst: a ring spreading out from the cell, and copies flying to each
// neighbor they infect. { cell, infected, age } with age in s.
export const POP_TIME = 0.4;
function drawPop(ctx, pop, color) {
  const t = pop.age / POP_TIME;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pop.cell.x, pop.cell.y, 6 + t * 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  for (const to of pop.infected) {
    ctx.beginPath();
    ctx.arc(pop.cell.x + (to.x - pop.cell.x) * t, pop.cell.y + (to.y - pop.cell.y) * t, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the whole dish. `view` has what's only for the screen:
// { palImage, pops, clock } (clock in s, for shaking).
export function drawDish(ctx, dish, view) {
  const middle = DISH.size / 2;
  ctx.clearRect(0, 0, DISH.size, DISH.size);
  ctx.beginPath();
  ctx.arc(middle, middle, DISH.radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.agar;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLORS.rim;
  ctx.stroke();
  ctx.lineWidth = 1;

  for (const cell of dish.cells) drawCell(ctx, dish, cell, view.clock);
  for (const pop of view.pops) drawPop(ctx, pop, dish.virus.color);

  if (!dish.landed) {
    // She drifts down onto the first bacterium.
    const t = Math.min(1, dish.time / dish.lawn.enterTime);
    drawPal(ctx, view.palImage, dish.first.x, dish.first.y - 90 * (1 - t) - 22, 54);
  }
}
