// The rules of the flask, with no drawing: where everything is, and what
// happens each frame. main.js draws it and feeds in the player's moves.
//
// The player's mate drifts over a sheet of cells, like a maze: cells with
// other viruses' locks are walls, so she can only move over cells with her
// receptor (her "lock") and patches where cells have burst. Touch a cell
// with her lock and she slips inside; the cell copies her for a
// moment, then bursts. Her copies take over the matching cells next door,
// which burst in turn, but those don't spread any further, so she has to
// keep finding fresh cells. Antibody clouds spread out from a few drops and
// creep slowly after her; touch one and she's neutralized. Burst enough cells to clear the level.

import { cellAt, hexGrid } from './hexgrid.js';

// The flask, in its own units (main.js scales it to fit the screen).
export const WIDTH = 340;
export const HEIGHT = 500;
export const CELL_SIZE = 20; // center to corner
export const PLAYER_RADIUS = 14;

export const LEVELS = 5;
export const COPY_TIME = 1.5; // seconds a cell takes to copy her and burst
export const GROW_TIME = 3; // seconds the antibody clouds take to spread out
export const CHASE_SPEED = 6; // how fast they creep after her, per second
export const MATCH_SHARE = 0.7; // how many cells have her receptor

// The locks on the other cells: receptors for other viruses, which her key
// doesn't fit. main.js draws each one in its own shape and color; only hers
// is teal.
export const DECOYS = ['square', 'ring', 'triangle', 'diamond'];

// Cells to burst to clear a level: 10, 15, 20, 25, then 30. One cell and the
// ones next door make about 5, so level 1 takes a couple of tries.
export const targetFor = (level) => 5 + 5 * level;

const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

// A fresh level: every cell healthy, the mate in the middle, and one antibody
// drop per level.
export function newGame({ level = 1, random = Math.random } = {}) {
  const cells = hexGrid(WIDTH, HEIGHT, CELL_SIZE).map((cell) => {
    const match = random() < MATCH_SHARE;
    return {
      ...cell,
      match,
      lock: match ? 'match' : DECOYS[Math.floor(random() * DECOYS.length)],
      state: 'healthy', // then 'copying', then 'burst'
      timer: 0,
      spreads: false, // whether her copies take over the cells next door
    };
  });
  const player = { x: WIDTH / 2, y: HEIGHT / 2, inside: null };
  // She starts in a clear patch, so she's never stuck inside a wall.
  Object.assign(cellAt(cells, player.x, player.y, CELL_SIZE), { match: true, lock: 'match', state: 'burst' });
  return {
    level,
    target: targetFor(level),
    cells,
    player,
    antibodies: placeAntibodies(level, player, random),
    bursts: 0, // cells burst so far
    time: 0,
    over: null, // 'cleared' or 'neutralized' once the level ends
  };
}

// Up to `count` antibody drops, each well clear of the mate's starting spot
// and of each other. Gives up on a drop that can't find room.
export function placeAntibodies(count, player, random) {
  const drops = [];
  for (let tries = 0; drops.length < count && tries < 500; tries++) {
    const max = 50 + random() * 20; // how far its cloud spreads
    const x = random() * WIDTH;
    const y = random() * HEIGHT;
    const clearOfPlayer = Math.hypot(x - player.x, y - player.y) > max + 60;
    const clearOfOthers = drops.every((drop) => Math.hypot(drop.x - x, drop.y - y) > drop.max + max);
    if (clearOfPlayer && clearOfOthers) drops.push({ x, y, max, r: 0 });
  }
  return drops;
}

// Whether she'd overlap a wall (a cell with another virus's lock) with her
// middle at (x, y). Checks her middle and four points around it, so she
// can't squeeze halfway into one.
function blocked(game, x, y) {
  const reach = PLAYER_RADIUS * 0.6;
  return [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach]].some(([ox, oy]) => {
    const cell = cellAt(game.cells, x + ox, y + oy, CELL_SIZE);
    return cell !== null && !cell.match;
  });
}

// Where she ends up moving by [dx, dy] from `from` ({ x, y }), when
// `isBlocked(x, y)` says where she can't be: all the way if she can, or
// sliding along a wall in whichever direction is still free.
export function slide(from, [dx, dy], isBlocked) {
  const [x, y] = [from.x + dx, from.y + dy];
  if (!isBlocked(x, y)) return [x, y];
  if (!isBlocked(x, from.y)) return [x, from.y];
  if (!isBlocked(from.x, y)) return [from.x, y];
  return [from.x, from.y];
}

function infect(cell, spreads) {
  cell.state = 'copying';
  cell.timer = COPY_TIME;
  cell.spreads = spreads;
}

// Move the game on by `dt` seconds, with the mate trying to move by
// [dx, dy]. Returns what happened: 'attach', 'burst', 'cleared' or
// 'neutralized', in order.
export function step(game, dt, [dx, dy] = [0, 0]) {
  const events = [];
  if (game.over) return events;
  game.time += dt;

  // Antibodies diffuse out quickly at first, then slow down.
  const spread = 1 - (1 - Math.min(1, game.time / GROW_TIME)) ** 2;
  const { player } = game;
  for (const drop of game.antibodies) {
    drop.r = drop.max * spread;
    // Creep toward her, very slowly, like antibodies finding a virus.
    const distance = Math.hypot(player.x - drop.x, player.y - drop.y);
    const move = Math.min(distance, CHASE_SPEED * dt);
    if (distance > 0) {
      drop.x += ((player.x - drop.x) / distance) * move;
      drop.y += ((player.y - drop.y) / distance) * move;
    }
  }

  if (player.inside === null) {
    // Move if she can; if a wall's in the way, slide along it.
    const x = clamp(player.x + dx, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
    const y = clamp(player.y + dy, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS);
    [player.x, player.y] = slide(player, [x - player.x, y - player.y], (px, py) => blocked(game, px, py));
    const touching = game.antibodies.some(
      (drop) => Math.hypot(drop.x - player.x, drop.y - player.y) < drop.r + PLAYER_RADIUS * 0.6,
    );
    if (touching) {
      game.over = 'neutralized';
      events.push('neutralized');
      return events;
    }
    // She lands on cells she drifts onto, not the one she starts on.
    const moving = dx !== 0 || dy !== 0;
    const cell = moving && cellAt(game.cells, player.x, player.y, CELL_SIZE);
    if (cell?.match && cell.state === 'healthy') {
      infect(cell, true);
      player.inside = cell.id;
      [player.x, player.y] = [cell.x, cell.y];
      events.push('attach');
    }
  }

  // Count down every copying cell first, so a cell infected by a burst this
  // frame starts its own countdown next frame.
  const bursting = game.cells.filter((cell) => cell.state === 'copying' && (cell.timer -= dt) <= 0);
  for (const cell of bursting) {
    cell.state = 'burst';
    game.bursts += 1;
    events.push('burst');
    if (cell.spreads) {
      for (const id of cell.neighbors) {
        const next = game.cells[id];
        if (next.match && next.state === 'healthy') infect(next, false);
      }
    }
    if (player.inside === cell.id) player.inside = null; // out she pops
  }

  if (game.bursts >= game.target) {
    game.over = 'cleared';
    events.push('cleared');
  }
  return events;
}
