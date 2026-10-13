// Drawing the flask on a canvas: the culture flask, its sheet of cells, the
// antibody clouds, the drifting virions, your pal, the aim, and the pops of
// bursting cells. All in flask units; the page sets the canvas up so they
// fill it (see play.js).

import { FLASK } from './config.js';
import { hexCorners } from './hex.js';
import { canFlick } from './infect.js';
import { landingSpot } from './aim.js';

export const COLORS = {
  medium: '#fecdd3', // culture medium: pink from its pH dye, phenol red
  wall: '#fda4af',
  cell: '#fff7ed', // a healthy cell with your receptor
  nucleus: '#c4b5fd',
  receptor: '#14b8a6', // the receptor bumps, teal like Flo's HA spikes
  other: '#e7d3dc', // a cell without your receptor: it won't let you in
  outline: '#f9a8d4',
  antibody: '#60a5fa',
  aim: '#9f1239',
};

// The flask's outline: a wide body with a narrower neck at the bottom,
// where your pal waits.
function flaskPath(ctx) {
  ctx.beginPath();
  ctx.roundRect(4, 4, FLASK.width - 8, FLASK.cells.bottom + 10, 22);
  ctx.roundRect(FLASK.launch.x - 46, FLASK.cells.bottom, 92, FLASK.height - FLASK.cells.bottom - 4, 14);
}

function hexPath(ctx, x, y, size) {
  const corners = hexCorners(x, y, size);
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  for (const [cx, cy] of corners.slice(1)) ctx.lineTo(cx, cy);
  ctx.closePath();
}

function drawCell(ctx, cell, color) {
  const size = FLASK.cellSize - 1.5; // a little gap between cells
  if (cell.state === 'plaque') {
    // A burst cell leaves a clear hole in the sheet: just the medium.
    hexPath(ctx, cell.x, cell.y, size * 0.9);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = COLORS.wall;
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  hexPath(ctx, cell.x, cell.y, size);
  ctx.fillStyle = cell.receptor ? COLORS.cell : COLORS.other;
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.stroke();
  if (cell.state === 'infected') {
    // Glowing in her color, more and more as the copies are made, with a
    // ring that fills up until it bursts.
    ctx.globalAlpha = 0.25 + 0.6 * cell.progress;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, size * 0.6, -Math.PI / 2, -Math.PI / 2 + cell.progress * Math.PI * 2);
    ctx.strokeStyle = COLORS.aim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  ctx.beginPath();
  ctx.arc(cell.x, cell.y, size * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.nucleus;
  ctx.fill();
  if (cell.receptor) {
    // Three receptor bumps on alternate corners. Shape as well as color
    // tells the two kinds of cell apart.
    ctx.fillStyle = COLORS.receptor;
    for (const [cx, cy] of hexCorners(cell.x, cell.y, size * 0.78).filter((_, i) => i % 2 === 0)) {
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawAntibody(ctx, cloud) {
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = COLORS.antibody;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = COLORS.antibody;
  ctx.stroke();
  ctx.setLineDash([]);
  // A few little Y-shaped antibodies inside.
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const x = cloud.x + Math.cos(angle) * cloud.r * 0.5;
    const y = cloud.y + Math.sin(angle) * cloud.r * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 4, y - 4);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y - 4);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

// A free virion: small, with spikes and no face, like PetriPals' offspring.
function drawVirion(ctx, v, virus) {
  ctx.beginPath();
  ctx.arc(v.x, v.y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = virus.spike;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = virus.color;
  ctx.fill();
}

// Your pal, with her face: her drawing from pals.js once it's loaded, and a
// plain virion until then.
function drawPal(ctx, x, y, image, virus) {
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, x - 16, y - 16, 32, 32);
  else drawVirion(ctx, { x, y }, virus);
}

// The aim: a dotted line to about where she'll land, and a ring there.
function drawAim(ctx, aim) {
  const spot = landingSpot(aim);
  ctx.setLineDash([2, 7]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.aim;
  ctx.beginPath();
  ctx.moveTo(FLASK.launch.x, FLASK.launch.y);
  ctx.lineTo(spot.x, spot.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

// Rings that spread out and fade where a cell burst: { x, y, age } in s.
export const POP_TIME = 0.45;
function drawPop(ctx, pop, color) {
  const t = pop.age / POP_TIME;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pop.x, pop.y, 8 + t * 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

// Draw the whole flask for `game`. `view` has what's only for the screen:
// { aim, palImage, pops }.
export function drawFlask(ctx, game, view) {
  ctx.clearRect(0, 0, FLASK.width, FLASK.height);
  flaskPath(ctx);
  ctx.fillStyle = COLORS.medium;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.wall;
  ctx.stroke();
  ctx.lineWidth = 1;

  for (const cell of game.cells) drawCell(ctx, cell, game.virus.color);
  for (const cloud of game.antibodies) drawAntibody(ctx, cloud);
  for (const pop of view.pops) drawPop(ctx, pop, game.virus.color);
  for (const v of game.virions) {
    if (v.lead) drawPal(ctx, v.x, v.y, view.palImage, game.virus);
    else drawVirion(ctx, v, game.virus);
  }
  if (canFlick(game)) {
    drawAim(ctx, view.aim);
    drawPal(ctx, FLASK.launch.x, FLASK.launch.y, view.palImage, game.virus);
  }
}
