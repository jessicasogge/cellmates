// Drawing Burst or Wait on a canvas: the host bacterium (an E. coli rod, like
// PetriPals' Colette), your pal landing on it, the copies filling it up, and
// it bursting open or self-destructing. All in stage units: the stage is
// STAGE.width x STAGE.height, and the page sets the canvas up to fit it.

export const STAGE = { width: 360, height: 300 };

// The bacterium: a rounded rod across the middle of the stage.
export const ROD = { x: 40, y: 95, width: 280, height: 140 };
const MIDDLE = { x: ROD.x + ROD.width / 2, y: ROD.y + ROD.height / 2 };

export const COLORS = {
  wall: '#65a30d', // the cell wall, green-apple like Colette
  inside: '#d9f99d',
  alarmed: '#fca5a5', // the inside turns this color as the alarm rises
  dna: '#4d7c0f',
  dead: '#d6d3d1',
};

// Mix two #rrggbb colors: `t` of the way from `a` to `b`.
export function mix(a, b, t) {
  const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const parts = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

// Where each new copy sits inside the rod, in rows, filling it up from the
// middle outward. Past MAX_SHOWN, the counter says how many.
export const SPOTS = (() => {
  const spots = [];
  for (let y = ROD.y + 16; y <= ROD.y + ROD.height - 16; y += 11) {
    for (let x = ROD.x + 22; x <= ROD.x + ROD.width - 22; x += 11) {
      // Inside the rod's rounded ends too.
      const end = Math.min(x - ROD.x, ROD.x + ROD.width - x);
      const dy = Math.abs(y - MIDDLE.y);
      if (end < ROD.height / 2 && Math.hypot(ROD.height / 2 - end, dy) > ROD.height / 2 - 14) continue;
      spots.push({ x, y });
    }
  }
  return spots.sort((a, b) => Math.hypot(a.x - MIDDLE.x, a.y - MIDDLE.y) - Math.hypot(b.x - MIDDLE.x, b.y - MIDDLE.y));
})();
export const MAX_SHOWN = SPOTS.length;

function rodPath(ctx, grow = 1) {
  const width = ROD.width * grow;
  const height = ROD.height * grow;
  ctx.beginPath();
  ctx.roundRect(MIDDLE.x - width / 2, MIDDLE.y - height / 2, width, height, height / 2);
}

// A tiny new phage: a head with a tail, no face.
function drawCopy(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 1.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 0.75, y, 1.5, 4);
}

// Her loop of DNA, loose inside the cell. Bacteria have no nucleus.
function drawDna(ctx, wobble) {
  ctx.strokeStyle = COLORS.dna;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 1 + 0.18 * Math.sin(a * 5 + wobble);
    const x = MIDDLE.x + Math.cos(a) * 70 * r;
    const y = MIDDLE.y + Math.sin(a) * 30 * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

// Your pal, with her face: her drawing from pals.js once it's loaded, and a
// plain dot until then.
function drawPal(ctx, image, x, y, size) {
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  else {
    ctx.fillStyle = COLORS.wall;
    ctx.beginPath();
    ctx.arc(x, y, size / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the run's current cell. `view` has what's only for the screen:
// { palImage, clock } (clock in s, for wobbling).
export function drawCell(ctx, run, view) {
  const { cell, virus } = run;
  const shown = Math.min(cell.copies, MAX_SHOWN);
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);

  if (cell.phase === 'burst') {
    // Burst open: the empty wall fades, and the copies fly out every way.
    const t = Math.min(1, cell.phaseTime / run.host.afterTime);
    ctx.globalAlpha = 1 - t;
    rodPath(ctx, 1 + t * 0.15);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    const spread = 1 + t * 3;
    for (const spot of SPOTS.slice(0, shown)) {
      drawCopy(ctx, MIDDLE.x + (spot.x - MIDDLE.x) * spread, MIDDLE.y + (spot.y - MIDDLE.y) * spread, virus.color);
    }
    return;
  }

  if (cell.phase === 'died') {
    // Self-destructed: it shrinks, goes grey and breaks into little
    // bubbles, taking the copies with it.
    const t = Math.min(1, cell.phaseTime / run.host.afterTime);
    rodPath(ctx, 1 - t * 0.25);
    ctx.fillStyle = COLORS.dead;
    ctx.fill();
    ctx.fillStyle = '#e7e5e4';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(MIDDLE.x + Math.cos(a) * (120 + t * 30), MIDDLE.y + Math.sin(a) * (55 + t * 25), 6 + t * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    const shrink = 1 - t * 0.25;
    for (const spot of SPOTS.slice(0, shown)) {
      drawCopy(ctx, MIDDLE.x + (spot.x - MIDDLE.x) * shrink, MIDDLE.y + (spot.y - MIDDLE.y) * shrink, '#a8a29e');
    }
    return;
  }

  // Alive: the more alarmed it gets, the redder and more jittery it is.
  const shake = cell.alarm * 2.5 * Math.sin(view.clock * 40);
  ctx.save();
  ctx.translate(shake, 0);
  rodPath(ctx);
  ctx.fillStyle = mix(COLORS.inside, COLORS.alarmed, Math.min(1, cell.alarm));
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLORS.wall;
  ctx.stroke();
  ctx.lineWidth = 1;
  drawDna(ctx, view.clock * 2);
  for (const spot of SPOTS.slice(0, shown)) drawCopy(ctx, spot.x, spot.y, virus.color);
  ctx.restore();

  if (cell.phase === 'entering') {
    // She drifts down and lands on the cell's wall.
    const t = Math.min(1, cell.phaseTime / run.host.enterTime);
    drawPal(ctx, view.palImage, MIDDLE.x, 10 + (ROD.y - 30) * t, 70);
  } else {
    // A phage like Tess never goes inside: she injects her DNA and her
    // empty shell stays stuck to the outside.
    ctx.globalAlpha = 0.6;
    drawPal(ctx, view.palImage, MIDDLE.x + shake, ROD.y - 20, 70);
    ctx.globalAlpha = 1;
  }
}
