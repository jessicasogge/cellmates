// Plaque, with no drawing: a petri dish covered in a lawn of bacteria, and
// your phage spreading through it.
//
// Tess lands on one bacterium in the middle and infects it. An infected cell
// fills up with copies of her, and it's also getting ready to self-destruct.
// Tap it to burst it open: the copies infect the cells around it (more copies,
// more neighbors), and it leaves a clear hole in the lawn. Wait too long and
// it self-destructs instead, taking the copies with it, and nothing can get
// past it. Soon there are lots of cells going at once, so the game is in
// choosing which to burst first.
//
// Each cell goes:
//
//   healthy ──infected──▶ infected ──burst()──▶ plaque
//                            │
//                            └──too slow──▶ dead
//
// The dish is over when nothing is infected anymore. Win by clearing
// LAWN.target of the lawn.
//
// createDish() makes a dish, step() moves it on by a frame and says what
// happened, and burst() is your move. Randomness comes from a `random`
// function, so tests can make it predictable.

import { buildGrid, hexAt, hexKey } from './hex.js';
import { DISH } from './config.js';

// The six neighbors of a hex, in axial coordinates.
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// Whole copies made `time` s after getting in, for `virus`, up to full.
export function copiesAt(virus, time) {
  return Math.min(virus.full, Math.max(0, Math.floor((time - virus.eclipse) * virus.perSecond)));
}

// A new dish for `virus` (from VIRUSES) against `lawn` (LAWN).
export function createDish(virus, lawn, random = Math.random) {
  const middle = DISH.size / 2;
  const box = { left: 0, top: 0, right: DISH.size, bottom: DISH.size };
  const grid = buildGrid(box, DISH.cellSize);
  const cells = grid.cells.filter((c) => Math.hypot(c.x - middle, c.y - middle) <= DISH.radius - DISH.cellSize);
  const byKey = new Map();
  for (const cell of cells) {
    cell.state = 'healthy';
    byKey.set(hexKey(cell.q, cell.r), cell);
  }
  const dish = { virus, lawn, random, cells, byKey, origin: grid.origin, time: 0, landed: false };
  // She lands on the bacterium nearest the middle.
  dish.first = cells.reduce((best, c) =>
    Math.hypot(c.x - middle, c.y - middle) < Math.hypot(best.x - middle, best.y - middle) ? c : best);
  return dish;
}

// The cells next to `cell` on the lawn.
export function neighbors(dish, cell) {
  return NEIGHBORS.map(([dq, dr]) => dish.byKey.get(hexKey(cell.q + dq, cell.r + dr))).filter(Boolean);
}

// The cell under (x, y), or undefined if it's off the lawn.
export function cellAt(dish, x, y) {
  const { q, r } = hexAt(x, y, DISH.cellSize, dish.origin);
  return dish.byKey.get(hexKey(q, r));
}

function infect(dish, cell) {
  const [low, high] = dish.lawn.selfDestruct;
  cell.state = 'infected';
  cell.time = 0;
  cell.copies = 0;
  // How long it lasts after the eclipse before it self-destructs.
  cell.lasts = dish.virus.eclipse + low + dish.random() * (high - low);
}

// How close an infected cell is to self-destructing, from 0 to 1. The page
// shows it, so you can see which cells need you first.
export function danger(dish, cell) {
  if (cell.state !== 'infected' || cell.time < dish.virus.eclipse) return 0;
  return (cell.time - dish.virus.eclipse) / (cell.lasts - dish.virus.eclipse);
}

// Whether `cell` can be burst: it's infected and has copies in it.
export function canBurst(cell) {
  return cell?.state === 'infected' && cell.copies > 0;
}

// Burst `cell` open. Its copies infect up to one healthy neighbor per
// `perNeighbor` copies, picked at random. Returns the event, or null if it
// can't be burst.
export function burst(dish, cell) {
  if (!canBurst(cell)) return null;
  cell.state = 'plaque';
  const healthy = neighbors(dish, cell).filter((n) => n.state === 'healthy');
  const reach = Math.min(healthy.length, Math.ceil(cell.copies / dish.virus.perNeighbor));
  const infected = [];
  while (infected.length < reach) {
    const [next] = healthy.splice(Math.floor(dish.random() * healthy.length), 1);
    infect(dish, next);
    infected.push(next);
  }
  return { type: 'burst', cell, copies: cell.copies, infected };
}

// The infected cell closest to self-destructing that can be burst, for the
// keyboard (the space bar bursts it). Undefined if there's none.
export function mostUrgent(dish) {
  const ready = dish.cells.filter(canBurst);
  return ready.sort((a, b) => danger(dish, b) - danger(dish, a))[0];
}

// Move the dish on by `dt` s. Returns a list of what happened:
// { type: 'landed' | 'died', cell }.
export function step(dish, dt) {
  const events = [];
  dish.time += dt;
  if (!dish.landed) {
    if (dish.time >= dish.lawn.enterTime) {
      dish.landed = true;
      infect(dish, dish.first);
      events.push({ type: 'landed', cell: dish.first });
    }
    return events;
  }
  for (const cell of dish.cells) {
    if (cell.state !== 'infected') continue;
    cell.time += dt;
    cell.copies = copiesAt(dish.virus, cell.time);
    if (cell.time >= cell.lasts) {
      cell.state = 'dead';
      events.push({ type: 'died', cell });
    }
  }
  return events;
}

// The share of the lawn cleared, from 0 to 1.
export function cleared(dish) {
  return dish.cells.filter((c) => c.state === 'plaque').length / dish.cells.length;
}

// Whether the dish is over: she's landed and nothing is infected anymore.
export function isOver(dish) {
  return dish.landed && !dish.cells.some((c) => c.state === 'infected');
}

export function hasWon(dish) {
  return cleared(dish) >= dish.lawn.target;
}
