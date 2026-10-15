// The game itself, with no drawing: a culture flask with a sheet of cells,
// your pal steering over them, her copies spreading, and the antibodies.
//
// Steer your pal onto a cell with your receptor and she gets in. A moment
// later the cell releases her along with a few free copies, and dies, leaving
// a clear hole (a plaque). The free copies drift about and get into cells
// nearby on their own, so the plaque spreads. But each cell that releases
// copies warns its neighbors (interferon), and free copies can't get into a
// warned cell. So the spreading stalls, and it's up to you to start it again
// somewhere fresh, or push through the warned cells yourself, which is
// slower. Meanwhile antibody clouds spread out. Touch one and the game is
// over.
//
// Each cell goes:
//
//   healthy ──(warned)──▶ healthy, warned
//      │                       │
//      └──────────infected─────┘──▶ released (a plaque)
//
// createGame() makes a level, move() steers your pal, and step() moves
// everything on by a frame and says what happened. Randomness comes from a
// `random` function, so tests can make it predictable.

import { buildGrid, hexAt, hexKey } from './hex.js';
import { ANTIBODIES, CELLS, FLASK } from './config.js';

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// Where to drop `count` antibody clouds: on the sheet of cells, not too near
// the edges or the neck, and far enough apart that there's room to get
// between them even once they're fully spread.
export function cloudSpots(count, random = Math.random) {
  const { left, top, right, bottom } = FLASK.cells;
  const margin = ANTIBODIES.start * 2;
  const spots = [];
  for (let tries = 0; spots.length < count && tries < 500; tries++) {
    const spot = {
      x: left + margin + random() * (right - left - margin * 2),
      y: top + margin + random() * (bottom - top - margin * 3),
    };
    if (spots.every((s) => Math.hypot(s.x - spot.x, s.y - spot.y) > ANTIBODIES.max * 1.1)) spots.push(spot);
  }
  return spots;
}

// A new game of `level` (from LEVELS) for `virus` (from VIRUSES).
export function createGame(level, virus, random = Math.random) {
  const { cells, origin } = buildGrid(FLASK.cells, FLASK.cellSize);
  const byKey = new Map();
  for (const cell of cells) {
    cell.receptor = random() < CELLS.receptors;
    cell.state = 'healthy'; // then 'infected', then 'released'
    cell.warned = false;
    cell.progress = 0; // 0 to 1 while infected
    byKey.set(hexKey(cell.q, cell.r), cell);
  }
  return {
    level,
    virus,
    random,
    cells,
    byKey,
    origin,
    pal: { ...FLASK.start, inside: null, facing: 1 }, // inside: the cell she's in
    copies: [], // free copies drifting about: { x, y, vx, vy, age }
    clouds: cloudSpots(level.antibodies, random).map((s) => ({ ...s, r: ANTIBODIES.start })),
    taken: 0,
    time: 0,
    over: null, // 'won' or 'lost' once it's over
  };
}

// The cell under (x, y), or undefined if it's off the sheet of cells.
export function cellAt(game, x, y) {
  const { q, r } = hexAt(x, y, FLASK.cellSize, game.origin);
  return game.byKey.get(hexKey(q, r));
}

export function neighbors(game, cell) {
  return NEIGHBORS.map(([dq, dr]) => game.byKey.get(hexKey(cell.q + dq, cell.r + dr))).filter(Boolean);
}

// Whether a virus can get into `cell`: it has the receptor and is healthy.
// Free copies can't get into a warned cell; your pal can.
export function canEnter(cell, isPal) {
  return Boolean(cell?.receptor && cell.state === 'healthy' && (isPal || !cell.warned));
}

function inCloud(game, x, y) {
  return game.clouds.some((c) => Math.hypot(x - c.x, y - c.y) < c.r);
}

// Keep a point inside the flask: the sheet of cells, or the neck below it.
function keepInside(p) {
  const pad = 6;
  const inNeck = p.y > FLASK.cells.bottom;
  const left = inNeck ? FLASK.start.x - 40 : pad;
  const right = inNeck ? FLASK.start.x + 40 : FLASK.width - pad;
  p.x = Math.min(right, Math.max(left, p.x));
  p.y = Math.min(FLASK.height - pad, Math.max(pad, p.y));
}

// Steer your pal by (dx, dy) flask units, unless she's inside a cell.
export function move(game, dx, dy) {
  const { pal } = game;
  if (pal.inside || game.over) return;
  pal.x += dx;
  pal.y += dy;
  if (dx !== 0) pal.facing = Math.sign(dx);
  keepInside(pal);
}

function infect(cell) {
  cell.state = 'infected';
  cell.progress = 0;
}

// The cell releases its copies (and your pal, if she's in it) and dies.
function release(game, cell, events) {
  const { virus, random } = game;
  cell.state = 'released';
  game.taken++;
  for (let i = 0; i < virus.copies; i++) {
    const angle = random() * Math.PI * 2;
    game.copies.push({
      x: cell.x, y: cell.y, vx: Math.cos(angle) * virus.drift, vy: Math.sin(angle) * virus.drift, age: 0,
    });
  }
  // Interferon: it warns some of the healthy cells around it.
  for (const next of neighbors(game, cell)) {
    if (next.state === 'healthy' && random() < CELLS.warnChance) next.warned = true;
  }
  if (game.pal.inside === cell) game.pal.inside = null;
  events.push({ type: 'released', cell });
}

// Move the game on by `dt` s. Returns a list of what happened:
// { type: 'entered' | 'released' | 'won' | 'lost', ... }.
export function step(game, dt) {
  const { virus, pal, random } = game;
  const events = [];
  if (game.over) return events;
  game.time += dt;

  // The antibody clouds keep spreading the whole time.
  const spread = Math.min(ANTIBODIES.max, ANTIBODIES.start + ANTIBODIES.growth * game.time);
  for (const cloud of game.clouds) cloud.r = spread;

  // Your pal gets into a cell she's over, if she can.
  if (!pal.inside) {
    const cell = cellAt(game, pal.x, pal.y);
    if (canEnter(cell, true)) {
      infect(cell);
      cell.byPal = true;
      pal.inside = cell;
      pal.x = cell.x;
      pal.y = cell.y;
      events.push({ type: 'entered', cell });
    }
  }

  // Infected cells make copies, then release them.
  for (const cell of game.cells) {
    if (cell.state !== 'infected') continue;
    // Your pal is quicker, but a warned cell slows her down.
    const time = cell.byPal ? virus.enterTime * (cell.warned ? 2 : 1) : virus.copyTime;
    cell.progress += dt / time;
    if (cell.progress >= 1) release(game, cell, events);
  }

  // Free copies drift about, wobbling, and get into cells they can.
  const kept = [];
  for (const c of game.copies) {
    c.age += dt;
    const turn = (random() - 0.5) * 6 * dt;
    [c.vx, c.vy] = [c.vx * Math.cos(turn) - c.vy * Math.sin(turn), c.vx * Math.sin(turn) + c.vy * Math.cos(turn)];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    keepInside(c);
    if (c.age >= virus.lifetime || inCloud(game, c.x, c.y)) continue;
    const cell = cellAt(game, c.x, c.y);
    if (c.age > 0.3 && canEnter(cell, false)) {
      infect(cell);
      cell.byPal = false;
      continue;
    }
    kept.push(c);
  }
  game.copies = kept;

  if (game.taken >= game.level.target) {
    game.over = 'won';
    events.push({ type: 'won' });
  } else if (!pal.inside && inCloud(game, pal.x, pal.y)) {
    game.over = 'lost';
    events.push({ type: 'lost' });
  }
  return events;
}
