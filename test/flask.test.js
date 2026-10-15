// flask.js: the game with no drawing. Randomness is swapped for fixed
// numbers so every game is the same.
import { describe, expect, it } from 'vitest';
import { canEnter, cellAt, cloudSpots, createGame, move, neighbors, step } from '../public/game/flask.js';
import { ANTIBODIES, CELLS, FLASK, LEVELS, VIRUSES } from '../public/game/config.js';

const flo = VIRUSES.flo;
const level = { target: 5, antibodies: 0 };
// 0.1 is under CELLS.receptors and CELLS.warnChance: every cell has the
// receptor, and every neighbor gets warned.
const low = () => 0.1;
const high = () => 0.99; // no receptors, no warnings

// Run on for `seconds`, collecting what happened.
function run(game, seconds, dt = 1 / 60) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...step(game, dt));
  return events;
}

// Put her right over `cell`.
function onto(game, cell) {
  move(game, cell.x - game.pal.x, cell.y - game.pal.y);
}

describe('cloudSpots', () => {
  it('spreads the clouds apart, over the cells', () => {
    const spots = cloudSpots(3);
    expect(spots).toHaveLength(3);
    for (const a of spots) {
      expect(a.y).toBeLessThan(FLASK.cells.bottom);
      for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(ANTIBODIES.radius * 2);
    }
  });

  it('gives up rather than looping forever if they can’t fit', () => {
    expect(cloudSpots(2, () => 0.5)).toHaveLength(1);
  });
});

describe('createGame', () => {
  it('fills the flask with healthy cells, and starts her in the neck', () => {
    const game = createGame(level, flo, low);
    expect(game.cells.length).toBeGreaterThan(40);
    expect(game.cells.every((c) => c.state === 'healthy' && c.receptor && !c.warned)).toBe(true);
    expect(game.pal).toMatchObject(FLASK.start);
    expect(cellAt(game, game.pal.x, game.pal.y)).toBeUndefined();
  });

  it('gives about the right share of cells the receptor', () => {
    const game = createGame(level, flo);
    const share = game.cells.filter((c) => c.receptor).length / game.cells.length;
    expect(Math.abs(share - CELLS.receptors)).toBeLessThan(0.25);
  });

  it('drops the level’s antibody clouds, starting small', () => {
    const game = createGame(LEVELS[2], flo);
    expect(game.clouds).toHaveLength(LEVELS[2].antibodies);
    expect(game.clouds.every((c) => c.r === 0)).toBe(true);
  });
});

describe('canEnter', () => {
  const cell = { receptor: true, state: 'healthy', warned: false };

  it('lets a virus into a healthy cell with the receptor', () => {
    expect(canEnter(cell, false)).toBe(true);
    expect(canEnter({ ...cell, receptor: false }, true)).toBe(false);
    expect(canEnter({ ...cell, state: 'released' }, true)).toBe(false);
    expect(canEnter(undefined, true)).toBe(false);
  });

  it('keeps free copies out of a warned cell, but not her', () => {
    expect(canEnter({ ...cell, warned: true }, false)).toBe(false);
    expect(canEnter({ ...cell, warned: true }, true)).toBe(true);
  });
});

describe('move', () => {
  it('steers her, and keeps her inside the flask', () => {
    const game = createGame(level, flo, high);
    move(game, -5, -10);
    expect(game.pal).toMatchObject({ x: FLASK.start.x - 5, y: FLASK.start.y - 10, facing: -1 });
    move(game, 0, 1000);
    expect(game.pal.y).toBeLessThan(FLASK.height);
    move(game, -1000, 0); // the neck is narrow
    expect(game.pal.x).toBeGreaterThan(FLASK.start.x - 50);
    move(game, 0, -1000);
    move(game, 1000, 0);
    expect(game.pal.x).toBeLessThan(FLASK.width);
    expect(game.pal.y).toBeGreaterThan(0);
  });

  it('can’t steer her while she’s inside a cell, or once the game is over', () => {
    const game = createGame(level, flo, low);
    game.pal.inside = game.cells[0];
    move(game, 10, 10);
    expect(game.pal).toMatchObject(FLASK.start);
    game.pal.inside = null;
    game.over = 'lost';
    move(game, 10, 10);
    expect(game.pal).toMatchObject(FLASK.start);
  });
});

describe('step', () => {
  it('gets her into a cell she’s over, then releases her with copies', () => {
    const game = createGame(level, flo, low);
    const cell = game.cells[20];
    onto(game, cell);
    expect(step(game, 1 / 60)).toEqual([{ type: 'entered', cell }]);
    expect(game.pal.inside).toBe(cell);
    expect(cell.state).toBe('infected');
    const events = run(game, flo.enterTime);
    expect(events).toContainEqual({ type: 'released', cell });
    expect(cell.state).toBe('released');
    expect(game.pal.inside).toBeNull();
    expect(game.taken).toBe(1);
    expect(game.copies.length).toBeLessThanOrEqual(flo.copies);
  });

  it('warns the cells around one that releases', () => {
    const game = createGame(level, flo, low);
    const cell = game.cells[20];
    onto(game, cell);
    run(game, flo.enterTime + 0.05);
    for (const next of neighbors(game, cell)) {
      if (next.state === 'healthy') expect(next.warned).toBe(true);
    }
  });

  it('takes her twice as long to get through a warned cell', () => {
    const game = createGame(level, flo, low);
    const cell = game.cells[20];
    cell.warned = true;
    onto(game, cell);
    run(game, flo.enterTime + 0.05);
    expect(cell.state).toBe('infected');
    run(game, flo.enterTime);
    expect(cell.state).toBe('released');
  });

  it('won’t let her into a cell without the receptor', () => {
    const game = createGame(level, flo, high);
    onto(game, game.cells[20]);
    expect(step(game, 1 / 60)).toEqual([]);
    expect(game.pal.inside).toBeNull();
  });

  it('lets free copies spread to cells nearby on their own', () => {
    const game = createGame({ target: 99, antibodies: 0 }, flo, () => 0.4);
    game.cells.forEach((c) => { c.receptor = true; });
    const cell = game.cells[25];
    onto(game, cell);
    run(game, flo.enterTime + 0.05);
    move(game, 0, 1000); // out of the way, into the neck
    run(game, flo.lifetime + flo.copyTime + 0.5);
    expect(game.taken).toBeGreaterThan(1);
  });

  it('lets free copies fade away after a while', () => {
    const game = createGame(level, flo, high);
    game.copies.push({ x: 100, y: 100, vx: 10, vy: 0, age: 0 });
    run(game, flo.lifetime + 0.05);
    expect(game.copies).toEqual([]);
  });

  it('spreads the antibody clouds out, and stops copies that drift in', () => {
    const game = createGame({ target: 5, antibodies: 1 }, flo, high);
    const [cloud] = game.clouds;
    run(game, ANTIBODIES.spreadTime / 4);
    expect(cloud.r).toBeCloseTo(ANTIBODIES.radius / 2);
    run(game, ANTIBODIES.spreadTime);
    expect(cloud.r).toBe(ANTIBODIES.radius);
    game.copies.push({ x: cloud.x, y: cloud.y, vx: 0, vy: 0, age: 0 });
    step(game, 1 / 60);
    expect(game.copies).toEqual([]);
  });

  it('ends the game if she touches an antibody cloud', () => {
    const game = createGame({ target: 5, antibodies: 1 }, flo, high);
    run(game, ANTIBODIES.spreadTime);
    const [cloud] = game.clouds;
    move(game, cloud.x - game.pal.x, cloud.y - game.pal.y);
    expect(step(game, 1 / 60)).toEqual([{ type: 'lost' }]);
    expect(game.over).toBe('lost');
    expect(step(game, 1)).toEqual([]);
  });

  it('wins once enough cells are taken', () => {
    const game = createGame({ target: 1, antibodies: 0 }, flo, low);
    onto(game, game.cells[20]);
    const events = run(game, flo.enterTime + 0.05);
    expect(events.at(-1)).toEqual({ type: 'won' });
    expect(game.over).toBe('won');
  });
});
