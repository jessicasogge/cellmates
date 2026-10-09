// The rules of the flask, with no drawing: where everything is, and what
// happens each frame. main.js draws it and feeds in the player's moves.
//
// The player's mate drifts over a sheet of cells, like a maze: cells with
// other viruses' locks are walls, so she can only move over cells with her
// receptor (her "lock") and patches where cells have burst. Touch a cell
// with her lock and she slips inside; the cell copies her for a
// moment, then bursts. Her copies take over the matching cells next door,
// which burst in turn, but those don't spread any further, so she has to
// keep finding fresh cells. Small antibody clouds spread out from a few drops
// and wander slowly through the maze too; touch one and she's neutralized. Burst enough cells to clear the level.

import { cellAt, hexGrid } from './hexgrid.js';

// The flask, in its own units (main.js scales it to fit the screen).
export const WIDTH = 340;
export const HEIGHT = 500;
export const CELL_SIZE = 21; // center to corner
export const PLAYER_RADIUS = 11; // small enough to glide along her paths

export const LEVELS = 5;
export const COPY_TIME = 1.5; // seconds a cell takes to copy her and burst
export const GROW_TIME = 3; // seconds the antibody clouds take to spread out
export const WANDER_SPEED = 8; // how fast they drift about, per second
export const WANDER_TURN = 2; // how sharply they can turn, per second
export const ANTIBODY_REACH = 8; // how close to a wall a drop's middle can get
export const ANTIBODY_EDGE = 16; // how close to the flask's sides it can get
export const MATCH_SHARE = 0.7; // how many cells have her receptor

// The locks on the other cells: receptors for other viruses, which her key
// doesn't fit. main.js draws each one in its own shape and color; only hers
// is teal.
export const DECOYS = ['square', 'ring', 'triangle', 'diamond'];

// Cells to burst to clear a level: 12, 18, 24, 30, then 36. One cell and the
// ones next door make about 5, so level 1 takes two or three tries.
export const targetFor = (level) => 6 + 6 * level;

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
  // She starts in a clear patch in the middle, so she's never stuck inside a
  // wall: the cell nearest the middle, already burst.
  const start = cellAt(cells, WIDTH / 2, HEIGHT / 2, CELL_SIZE);
  Object.assign(start, { match: true, lock: 'match', state: 'burst' });
  const player = { x: start.x, y: start.y, inside: null };
  return {
    level,
    target: targetFor(level),
    cells,
    player,
    antibodies: placeAntibodies(level, player, random, (x, y) => !blocked(cells, x, y, ANTIBODY_REACH)),
    random, // for the antibodies' wandering
    bursts: 0, // cells burst so far
    time: 0,
    over: null, // 'cleared' or 'neutralized' once the level ends
  };
}

// Up to `count` antibody drops, each somewhere `isOpen(x, y)` (not in a
// wall), well clear of the mate's starting spot and of each other. Gives up
// on a drop that can't find room.
export function placeAntibodies(count, player, random, isOpen) {
  const drops = [];
  for (let tries = 0; drops.length < count && tries < 500; tries++) {
    const max = 20 + random() * 8; // how far its cloud spreads: about a cell
    const x = ANTIBODY_EDGE + random() * (WIDTH - 2 * ANTIBODY_EDGE);
    const y = ANTIBODY_EDGE + random() * (HEIGHT - 2 * ANTIBODY_EDGE);
    const clearOfPlayer = Math.hypot(x - player.x, y - player.y) > max + 60;
    const clearOfOthers = drops.every((drop) => Math.hypot(drop.x - x, drop.y - y) > drop.max + max);
    // Each drifts off in its own direction (`heading`, in radians).
    if (clearOfPlayer && clearOfOthers && isOpen(x, y)) {
      drops.push({ x, y, max, r: 0, heading: random() * 2 * Math.PI });
    }
  }
  return drops;
}

// Whether something with its middle at (x, y) would overlap a wall (a cell
// with another virus's lock). Checks its middle and four points `reach`
// away, so it can't squeeze halfway into one. The mate and the antibodies
// both move through the maze this way.
function blocked(cells, x, y, reach) {
  return [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach]].some(([ox, oy]) => {
    const cell = cellAt(cells, x + ox, y + oy, CELL_SIZE);
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

// Drift an antibody drop along for `dt` seconds, turning a little at random,
// like something carried about in the liquid. It bounces off the sides of
// the flask, and like the mate it can't go through walls (`isBlocked(x, y)`):
// when it meets one it turns to try another way.
export function wander(drop, dt, random, isBlocked = () => false) {
  drop.heading += (random() - 0.5) * 2 * WANDER_TURN * dt;
  let x = drop.x + Math.cos(drop.heading) * WANDER_SPEED * dt;
  let y = drop.y + Math.sin(drop.heading) * WANDER_SPEED * dt;
  if (x < ANTIBODY_EDGE || x > WIDTH - ANTIBODY_EDGE) {
    x = clamp(x, ANTIBODY_EDGE, WIDTH - ANTIBODY_EDGE);
    drop.heading = Math.PI - drop.heading; // bounce back sideways
  }
  if (y < ANTIBODY_EDGE || y > HEIGHT - ANTIBODY_EDGE) {
    y = clamp(y, ANTIBODY_EDGE, HEIGHT - ANTIBODY_EDGE);
    drop.heading = -drop.heading; // bounce back up or down
  }
  if (isBlocked(x, y)) {
    drop.heading += Math.PI / 2 + random() * Math.PI; // somewhere back the way it came
    return;
  }
  [drop.x, drop.y] = [x, y];
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
  for (const drop of game.antibodies) {
    drop.r = drop.max * spread;
    wander(drop, dt, game.random, (x, y) => blocked(game.cells, x, y, ANTIBODY_REACH));
  }

  const { player } = game;

  if (player.inside === null) {
    // Move if she can; if a wall's in the way, slide along it.
    const x = clamp(player.x + dx, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
    const y = clamp(player.y + dy, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS);
    [player.x, player.y] = slide(player, [x - player.x, y - player.y], (px, py) => blocked(game.cells, px, py, PLAYER_RADIUS * 0.6));
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
