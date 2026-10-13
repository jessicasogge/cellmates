// The game itself, with no drawing: the flask's cells, the virions drifting
// over them, and the virus life cycle, attach → copy → burst.
//
// You flick your pal into the flask. When she slows down over a cell with
// your receptor, she gets in, the cell makes copies of her, and it bursts,
// sending new virions drifting off to the cells around it. Those land and
// burst too, so one good flick can set off a chain across the flask. Cells
// without your receptor won't let a virion in, so the chain stops at gaps.
//
// createGame() makes a level's state, flick() sends your pal in, and step()
// moves everything on by a frame and says what happened, for the page to
// draw and play sounds for. Randomness comes from a `random` function, so
// tests can make it predictable.

import { buildGrid, hexAt, hexKey } from './hex.js';
import { DRIFT, FLASK, MAX_VIRIONS } from './config.js';

// A small seeded random number generator (mulberry32), so each level's cells
// come out the same every time.
export function seeded(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A new game of `level` (from LEVELS) for `virus` (from VIRUSES).
export function createGame(level, virus, random = Math.random) {
  const layout = seeded(level.seed);
  const { cells, origin } = buildGrid(FLASK.cells, FLASK.cellSize);
  const byKey = new Map();
  for (const cell of cells) {
    cell.receptor = layout() < level.receptors;
    cell.state = 'healthy'; // then 'infected', then 'plaque' once it bursts
    cell.progress = 0; // 0 to 1 while infected: how far along the copies are
    byKey.set(hexKey(cell.q, cell.r), cell);
  }
  return {
    level,
    virus,
    random,
    cells,
    byKey,
    origin,
    antibodies: level.antibodies,
    virions: [],
    flicksLeft: level.flicks,
    taken: 0, // cells burst
    chain: 0, // bursts in the current chain
    bestChain: 0,
    time: 0,
  };
}

// The cell under (x, y), or undefined if it's off the sheet of cells.
export function cellAt(game, x, y) {
  const { q, r } = hexAt(x, y, FLASK.cellSize, game.origin);
  return game.byKey.get(hexKey(q, r));
}

// Whether you can flick your pal in now: you have flicks left, and your last
// one has landed (or been stopped).
export function canFlick(game) {
  return game.flicksLeft > 0 && !game.virions.some((v) => v.lead);
}

// Flick your pal in from the neck of the flask with velocity (vx, vy).
// Returns whether she went.
export function flick(game, vx, vy) {
  if (!canFlick(game)) return false;
  game.flicksLeft--;
  game.virions.push({ x: FLASK.launch.x, y: FLASK.launch.y, vx, vy, idle: 0, lead: true });
  return true;
}

// Inside the flask's walls, with a margin of `pad`.
function keepInside(v, pad = 4) {
  const minX = pad;
  const maxX = FLASK.width - pad;
  const minY = pad;
  const maxY = FLASK.height - pad;
  if (v.x < minX) { v.x = minX; v.vx = Math.abs(v.vx); }
  if (v.x > maxX) { v.x = maxX; v.vx = -Math.abs(v.vx); }
  if (v.y < minY) { v.y = minY; v.vy = Math.abs(v.vy); }
  if (v.y > maxY) { v.y = maxY; v.vy = -Math.abs(v.vy); }
}

function inAntibody(game, v) {
  return game.antibodies.some((a) => Math.hypot(v.x - a.x, v.y - a.y) < a.r);
}

// Move the game on by `dt` seconds. Returns a list of what happened, for the
// page: { type: 'attach' | 'burst' | 'neutralized' | 'fizzle', x, y, ... }.
export function step(game, dt) {
  const { virus, random } = game;
  const events = [];
  game.time += dt;

  // Infected cells make copies, then burst.
  for (const cell of game.cells) {
    if (cell.state !== 'infected') continue;
    cell.progress += dt / virus.copyTime;
    if (cell.progress < 1) continue;
    cell.state = 'plaque';
    cell.progress = 1;
    game.taken++;
    game.chain++;
    game.bestChain = Math.max(game.bestChain, game.chain);
    events.push({ type: 'burst', x: cell.x, y: cell.y, chain: game.chain });
    for (let i = 0; i < virus.burst && game.virions.length < MAX_VIRIONS; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 80 + random() * 60;
      game.virions.push({
        x: cell.x, y: cell.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        idle: 0, lead: false,
      });
    }
  }

  // Virions slow down, jiggle about, and land on the cells they can get into.
  const slow = Math.exp(-DRIFT.drag * dt);
  const kept = [];
  for (const v of game.virions) {
    v.vx = v.vx * slow + (random() - 0.5) * DRIFT.jiggle * dt;
    v.vy = v.vy * slow + (random() - 0.5) * DRIFT.jiggle * dt;
    v.x += v.vx * dt;
    v.y += v.vy * dt;
    keepInside(v);

    if (inAntibody(game, v)) {
      events.push({ type: 'neutralized', x: v.x, y: v.y, lead: v.lead });
      continue;
    }
    if (Math.hypot(v.vx, v.vy) < DRIFT.settle) {
      const cell = cellAt(game, v.x, v.y);
      if (cell && cell.receptor && cell.state === 'healthy') {
        cell.state = 'infected';
        cell.progress = 0;
        events.push({ type: 'attach', x: cell.x, y: cell.y, lead: v.lead });
        continue;
      }
      v.idle += dt;
      if (v.idle >= virus.lifetime) {
        events.push({ type: 'fizzle', x: v.x, y: v.y, lead: v.lead });
        continue;
      }
    }
    kept.push(v);
  }
  game.virions = kept;

  // A chain ends once nothing is left infected or drifting.
  if (game.virions.length === 0 && !game.cells.some((c) => c.state === 'infected')) {
    game.chain = 0;
  }
  return events;
}

// The share of the flask's cells taken over, from 0 to 1.
export function share(game) {
  return game.taken / game.cells.length;
}

// Stars earned so far, 0 to 3.
export function stars(game) {
  const taken = share(game);
  return game.level.stars.filter((needed) => taken >= needed).length;
}

// Whether the round is over: no flicks left and nothing still going on, or
// every cell you could get into is taken.
export function isOver(game) {
  const busy = game.virions.length > 0 || game.cells.some((c) => c.state === 'infected');
  if (busy) return false;
  return game.flicksLeft === 0 || !game.cells.some((c) => c.receptor && c.state === 'healthy');
}
