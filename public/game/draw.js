// Drawing the flask on a canvas: the culture flask, its sheet of cells, the
// antibody clouds, the drifting copies and your pal. All in flask units;
// the page sets the canvas up so they fill it (see play.js).

import { FLASK } from './config.js';
import { hexCorners } from './hex.js';

export const COLORS = {
  medium: '#fecdd3', // culture medium: pink from its pH dye, phenol red
  wall: '#fda4af',
  cell: '#fff7ed', // a cell with your receptor
  other: '#e4dbe6', // a cell without it: it won't let you in
  nucleus: '#c4b5fd',
  receptor: '#14b8a6', // receptor bumps, teal like Flo's HA spikes
  warned: '#f59e0b', // the interferon warning
  antibody: '#60a5fa',
  ring: '#9f1239',
};

function hexPath(ctx, x, y, size) {
  const corners = hexCorners(x, y, size);
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  for (const [cx, cy] of corners.slice(1)) ctx.lineTo(cx, cy);
  ctx.closePath();
}

function drawFlaskShape(ctx) {
  ctx.beginPath();
  ctx.roundRect(4, 4, FLASK.width - 8, FLASK.cells.bottom + 4, 22);
  ctx.roundRect(FLASK.start.x - 48, FLASK.cells.bottom, 96, FLASK.height - FLASK.cells.bottom - 4, 14);
  ctx.fillStyle = COLORS.medium;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.wall;
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawCell(ctx, cell, color) {
  const size = FLASK.cellSize - 2;
  if (cell.state === 'released') {
    // A clear hole in the sheet: a plaque.
    hexPath(ctx, cell.x, cell.y, size);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = COLORS.wall;
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  hexPath(ctx, cell.x, cell.y, size);
  ctx.fillStyle = cell.receptor ? COLORS.cell : COLORS.other;
  ctx.fill();
  if (cell.warned) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.warned;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.beginPath();
  ctx.arc(cell.x, cell.y, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.nucleus;
  ctx.fill();
  if (cell.receptor) {
    // Three receptor bumps, so shape as well as color shows which cells
    // will let you in.
    ctx.fillStyle = COLORS.receptor;
    for (const [x, y] of hexCorners(cell.x, cell.y, size * 0.75).filter((_, i) => i % 2 === 0)) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (cell.state === 'infected') {
    // Glowing more and more in her color, with a ring that fills up until
    // it releases its copies.
    hexPath(ctx, cell.x, cell.y, size);
    ctx.globalAlpha = 0.3 + 0.5 * cell.progress;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, size * 0.62, -Math.PI / 2, -Math.PI / 2 + cell.progress * Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.ring;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawCloud(ctx, cloud) {
  if (cloud.r <= 0) return;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = COLORS.antibody;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.antibody;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Little Y-shaped antibodies inside.
  ctx.strokeStyle = '#1d4ed8';
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

// A free copy: small, with spikes and no face.
function drawCopy(ctx, copy, color) {
  ctx.beginPath();
  ctx.arc(copy.x, copy.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.receptor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(copy.x, copy.y, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Your pal, with her face: her drawing from pals.js once it's loaded, and a
// plain circle until then.
function drawPal(ctx, pal, image, color) {
  const size = 40;
  if (image?.complete && image.naturalWidth) {
    ctx.drawImage(image, pal.x - size / 2, pal.y - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(pal.x, pal.y, size / 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// Draw the whole flask for `game`. `palImage` is your pal's drawing.
export function drawFlask(ctx, game, palImage) {
  const { color } = game.virus;
  ctx.clearRect(0, 0, FLASK.width, FLASK.height);
  drawFlaskShape(ctx);
  for (const cell of game.cells) drawCell(ctx, cell, color);
  for (const cloud of game.clouds) drawCloud(ctx, cloud);
  for (const copy of game.copies) drawCopy(ctx, copy, color);
  // While she's inside a cell, the cell's glow and ring show where she is.
  if (!game.pal.inside) drawPal(ctx, game.pal, palImage, color);
}
