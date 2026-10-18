// The game itself, with no drawing: a culture flask with a sheet of cells,
// your pal steering over them with a trail of her copies, and the antibodies.
//
// Steer your pal over a cell with your receptor and she infects it as she
// passes, without stopping. A moment later the cell bursts, leaving a clear
// hole (a plaque), and its copies fly to join the trail behind her, like the
// cells of a PetriPals colony following their leader. Her copies infect the
// cells they pass over too, each one going into a cell, which bursts with
// more copies. So the trail grows the more you take, and sweeps up more
// cells. Bursts in quick succession make a streak.
//
// Each cell that bursts warns its neighbors (interferon): her copies can't
// get into a warned cell, but she can, though it takes twice as long to
// burst. The antibody clouds spread out for the first few seconds and then
// stay put. If she touches one the game is over; copies that touch one are
// lost.
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
import { ANTIBODIES, CELLS, FLASK, STREAK_GAP, TRAIL } from './config.js';

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
// How far apart the points of her path are kept, in flask units.
const PATH_STEP = 2;
// How long a burst's pop lasts on screen, in s.
export const POP_TIME = 0.5;

// Where to drop `count` antibody clouds of `size`: on the sheet of cells,
// well clear of the neck where she comes in, and far enough apart that
// there's room to get between them once they've spread.
export function cloudSpots(count, size, random = Math.random) {
  const { left, top, right, bottom } = FLASK.cells;
  const margin = size;
  const spots = [];
  for (let tries = 0; spots.length < count && tries < 500; tries++) {
    const spot = {
      x: left + margin * 0.5 + random() * (right - left - margin),
      y: top + margin * 0.5 + random() * (bottom - top - margin * 2.5),
    };
    const clearOfStart = Math.hypot(spot.x - FLASK.start.x, spot.y - FLASK.cells.bottom) > size + 70;
    if (clearOfStart && spots.every((s) => Math.hypot(s.x - spot.x, s.y - spot.y) > size * 2.4)) spots.push(spot);
  }
  return spots;
}

// How far a cloud of full `size` has spread `time` s into the level:
// quickly at first, then slowly, then not at all once ANTIBODIES.growTime is
// up.
export function cloudRadius(time, size) {
  const t = Math.min(1, time / ANTIBODIES.growTime);
  return ANTIBODIES.start + (size - ANTIBODIES.start) * (1 - (1 - t) ** 2);
}

function underCloud(clouds, x, y, r) {
  return clouds.some((c) => Math.hypot(x - c.x, y - c.y) < r);
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
  const spots = cloudSpots(level.antibodies, level.size, random);
  // The cells she could take: the ones with her receptor that a fully spread
  // cloud won't cover. The level needs its share of them.
  const open = cells.filter((c) => c.receptor && !underCloud(spots, c.x, c.y, level.size)).length;
  return {
    level,
    virus,
    random,
    cells,
    byKey,
    origin,
    pal: { ...FLASK.start, facing: 1 },
    path: [{ ...FLASK.start }], // where she's been, newest first, PATH_STEP apart
    copies: [], // her copies, in trail order: { x, y, joined, seek }
    clouds: spots.map((s) => ({ ...s, r: ANTIBODIES.start })),
    pops: [], // bursts still showing on screen: { x, y, age, streak }
    target: Math.max(1, Math.round(open * level.share)),
    taken: 0,
    streak: 0, // bursts in a row, each within STREAK_GAP s of the last
    bestStreak: 0,
    lastBurst: -Infinity,
    lost: 0, // copies lost to the antibodies
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
// Her copies can't get into a warned cell; she can.
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

// Remember where she's been, a point every PATH_STEP flask units, so her
// copies can follow the same path. Keeps just enough for the longest trail.
function extendPath(game) {
  const { pal, path } = game;
  let last = path[0];
  let gap = Math.hypot(pal.x - last.x, pal.y - last.y);
  while (gap >= PATH_STEP) {
    const t = PATH_STEP / gap;
    last = { x: last.x + (pal.x - last.x) * t, y: last.y + (pal.y - last.y) * t };
    path.unshift(last);
    gap -= PATH_STEP;
  }
  const keep = Math.ceil(((game.virus.maxTrail + 1) * TRAIL.spacing) / PATH_STEP) + 1;
  if (path.length > keep) path.length = keep;
}

// Steer your pal by (dx, dy) flask units.
export function move(game, dx, dy) {
  const { pal } = game;
  if (game.over) return;
  pal.x += dx;
  pal.y += dy;
  if (dx !== 0) pal.facing = Math.sign(dx);
  keepInside(pal);
  extendPath(game);
}

// Where copy number `i` of the trail belongs: TRAIL.spacing apart along her
// path (or at the end of it if she hasn't been far enough yet), off to
// alternate sides, wider the longer the trail. So a bigger trail sweeps a
// wider path and gets into more cells, the way a bigger PetriPals colony
// eats more.
export function trailSpot(game, i) {
  const { path } = game;
  const n = Math.min(path.length - 1, Math.round(((i + 1) * TRAIL.spacing) / PATH_STEP));
  const here = path[n];
  const ahead = path[Math.max(0, n - 2)];
  const len = Math.hypot(ahead.x - here.x, ahead.y - here.y);
  if (!len) return here;
  const side = (i % 2 ? 1 : -1) * Math.min(TRAIL.spread, 4 + i * 1.5);
  return { x: here.x - ((ahead.y - here.y) / len) * side, y: here.y + ((ahead.x - here.x) / len) * side };
}

// The nearest cell within TRAIL.seek of `copy` that it could get into and
// no other copy is going for, or null.
function nearbyCell(game, copy, claimed) {
  let best = null;
  let bestD = TRAIL.seek;
  for (const cell of game.cells) {
    if (!canEnter(cell, false) || claimed.has(cell)) continue;
    const d = Math.hypot(cell.x - copy.x, cell.y - copy.y);
    if (d < bestD) [best, bestD] = [cell, d];
  }
  return best;
}

function infect(cell, byPal) {
  cell.state = 'infected';
  cell.progress = 0;
  cell.byPal = byPal;
}

// The cell bursts: its copies fly to join her trail, and it warns some of
// the healthy cells around it. A cell she got into herself releases
// virus.copies; one a copy got into releases just one, in place of the copy
// that went in. So the trail only grows where she leads it.
function burst(game, cell, events) {
  const { virus, random } = game;
  cell.state = 'released';
  game.taken++;
  const count = cell.byPal ? virus.copies : 1;
  for (let i = 0; i < count && game.copies.length < virus.maxTrail; i++) {
    game.copies.push({ x: cell.x + (random() - 0.5) * 8, y: cell.y + (random() - 0.5) * 8 });
  }
  for (const next of neighbors(game, cell)) {
    if (next.state === 'healthy' && random() < CELLS.warnChance) next.warned = true;
  }
  game.streak = game.time - game.lastBurst <= STREAK_GAP ? game.streak + 1 : 1;
  game.bestStreak = Math.max(game.bestStreak, game.streak);
  game.lastBurst = game.time;
  game.pops.push({ x: cell.x, y: cell.y, age: 0, streak: game.streak });
  events.push({ type: 'burst', cell, streak: game.streak });
}

// Move the game on by `dt` s. Returns a list of what happened:
// { type: 'infected' | 'burst' | 'copyLost' | 'won' | 'lost', ... }.
export function step(game, dt) {
  const { virus, pal } = game;
  const events = [];
  if (game.over) return events;
  game.time += dt;

  const r = cloudRadius(game.time, game.level.size);
  for (const cloud of game.clouds) cloud.r = r;

  for (const p of game.pops) p.age += dt;
  game.pops = game.pops.filter((p) => p.age < POP_TIME);

  // She infects a cell she's over as she passes, without stopping.
  const under = cellAt(game, pal.x, pal.y);
  if (canEnter(under, true)) {
    infect(under, true);
    events.push({ type: 'infected', cell: under, byPal: true });
  }

  // Her copies fly to their places in the trail. One in the trail that comes
  // near a cell it can get into peels off and goes for it, the way a
  // PetriPals colony's cells go for nutrients nearby. A copy infects any
  // cell it can get into that it passes over (going into it), and is lost
  // if it touches a cloud.
  const claimed = new Set(game.copies.map((c) => c.seek).filter(Boolean));
  const kept = [];
  let slot = 0; // trail places handed out so far, to copies not seeking
  for (const copy of game.copies) {
    if (copy.seek && !canEnter(copy.seek, false)) copy.seek = null;
    if (!copy.seek && copy.joined) {
      copy.seek = nearbyCell(game, copy, claimed);
      if (copy.seek) claimed.add(copy.seek);
    }
    const spot = copy.seek ?? trailSpot(game, slot++);
    const d = Math.hypot(spot.x - copy.x, spot.y - copy.y);
    // Go for a cell at seekSpeed, slower than she steers, so she gets to the
    // cells right in front of her first and her copies mop up the rest. Fly
    // in to the trail fast, and once in it, keep right up with it.
    const reach = copy.seek ? TRAIL.seekSpeed * dt : Math.max(TRAIL.flySpeed * dt, d * Math.min(1, 12 * dt));
    const t = d > 0 ? Math.min(1, reach / d) : 1;
    copy.x += (spot.x - copy.x) * t;
    copy.y += (spot.y - copy.y) * t;
    keepInside(copy);
    if (!copy.seek && d < 6) copy.joined = true;
    if (inCloud(game, copy.x, copy.y)) {
      game.lost++;
      events.push({ type: 'copyLost', copy });
      continue;
    }
    const cell = cellAt(game, copy.x, copy.y);
    if (canEnter(cell, false)) {
      infect(cell, false);
      events.push({ type: 'infected', cell, byPal: false });
      continue;
    }
    kept.push(copy);
  }
  game.copies = kept;

  // Infected cells burst after a moment; one she infected in spite of a
  // warning takes twice as long.
  for (const cell of game.cells) {
    if (cell.state !== 'infected') continue;
    cell.progress += dt / (virus.burstTime * (cell.byPal && cell.warned ? 2 : 1));
    if (cell.progress >= 1) burst(game, cell, events);
  }

  if (game.taken >= game.target) {
    game.over = 'won';
    events.push({ type: 'won' });
  } else if (inCloud(game, pal.x, pal.y)) {
    game.over = 'lost';
    events.push({ type: 'lost' });
  }
  return events;
}
