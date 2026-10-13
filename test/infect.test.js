// infect.js: the virus life cycle in the flask, attach → copy → burst, and
// the chains it sets off. Randomness is seeded so every run is the same.
import { describe, expect, it } from 'vitest';
import {
  canFlick, cellAt, createGame, flick, isOver, seeded, share, stars, step,
} from '../public/game/infect.js';
import { DRIFT, FLASK, LEVELS, MAX_VIRIONS, VIRUSES } from '../public/game/config.js';

const flo = VIRUSES.flo;
const level = (more = {}) => ({ seed: 1, receptors: 1, flicks: 2, stars: [0.1, 0.5, 0.9], antibodies: [], ...more });

// Run the game on for `seconds`, collecting what happened.
function run(game, seconds) {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...step(game, 1 / 60));
  return events;
}

// A virion sitting still over `cell`.
function restingOn(cell, lead = false) {
  return { x: cell.x, y: cell.y, vx: 0, vy: 0, idle: 0, lead };
}

const noJiggle = () => 0.5; // random() of 0.5 jiggles by nothing

describe('seeded', () => {
  it('gives the same numbers for the same seed, between 0 and 1', () => {
    const a = seeded(7);
    const b = seeded(7);
    const numbers = Array.from({ length: 50 }, a);
    expect(numbers).toEqual(Array.from({ length: 50 }, b));
    for (const n of numbers) expect(n >= 0 && n < 1).toBe(true);
    expect(seeded(8)()).not.toBe(numbers[0]);
  });
});

describe('createGame', () => {
  it('lays a level out the same way every time', () => {
    const one = createGame(LEVELS[1], flo).cells.map((c) => c.receptor);
    const two = createGame(LEVELS[1], flo).cells.map((c) => c.receptor);
    expect(one).toEqual(two);
  });

  it('gives about the level’s share of cells your receptor', () => {
    const game = createGame(level({ receptors: 0.5 }), flo);
    const matching = game.cells.filter((c) => c.receptor).length / game.cells.length;
    expect(matching).toBeGreaterThan(0.35);
    expect(matching).toBeLessThan(0.65);
  });

  it('starts with every cell healthy and nothing drifting', () => {
    const game = createGame(level(), flo);
    expect(game.cells.every((c) => c.state === 'healthy')).toBe(true);
    expect(game.virions).toEqual([]);
    expect(game.flicksLeft).toBe(2);
  });
});

describe('cellAt', () => {
  it('finds the cell under a point, and nothing off the sheet', () => {
    const game = createGame(level(), flo);
    const cell = game.cells[20];
    expect(cellAt(game, cell.x + 3, cell.y - 3)).toBe(cell);
    expect(cellAt(game, FLASK.launch.x, FLASK.launch.y)).toBeUndefined();
  });
});

describe('flick', () => {
  it('sends your pal in from the neck, once per flick, one at a time', () => {
    const game = createGame(level(), flo);
    expect(canFlick(game)).toBe(true);
    expect(flick(game, 0, -500)).toBe(true);
    expect(game.virions).toEqual([{ ...FLASK.launch, vx: 0, vy: -500, idle: 0, lead: true }]);
    expect(canFlick(game)).toBe(false); // she's still flying
    expect(flick(game, 0, -500)).toBe(false);
    expect(game.flicksLeft).toBe(1);
  });

  it('runs out of flicks', () => {
    const game = createGame(level({ flicks: 1 }), flo);
    flick(game, 0, -500);
    game.virions = [];
    expect(canFlick(game)).toBe(false);
  });
});

describe('step', () => {
  it('lands a slow virion on a healthy cell with your receptor', () => {
    const game = createGame(level(), flo, noJiggle);
    const cell = game.cells[30];
    game.virions.push(restingOn(cell, true));
    const events = step(game, 1 / 60);
    expect(events).toEqual([{ type: 'attach', x: cell.x, y: cell.y, lead: true }]);
    expect(cell.state).toBe('infected');
    expect(game.virions).toEqual([]);
  });

  it('flies a fast virion right over the cells', () => {
    const game = createGame(level(), flo, noJiggle);
    game.virions.push({ ...restingOn(game.cells[30]), vx: 400 });
    expect(step(game, 1 / 60)).toEqual([]);
    expect(game.virions).toHaveLength(1);
  });

  it('bursts an infected cell after the copy time, into new virions', () => {
    const game = createGame(level(), flo, seeded(3));
    const cell = game.cells[30];
    cell.state = 'infected';
    const events = run(game, flo.copyTime + 0.02);
    const burst = events.find((e) => e.type === 'burst');
    expect(burst).toEqual({ type: 'burst', x: cell.x, y: cell.y, chain: 1 });
    expect(cell.state).toBe('plaque');
    expect(game.taken).toBe(1);
  });

  it('spreads from one cell to its neighbors, in a chain', () => {
    const game = createGame(level(), flo, seeded(5));
    game.cells[60].state = 'infected';
    const events = run(game, 4);
    const bursts = events.filter((e) => e.type === 'burst');
    expect(bursts.length).toBeGreaterThan(3);
    expect(bursts.map((b) => b.chain)).toEqual(bursts.map((_, i) => i + 1));
    expect(game.bestChain).toBe(bursts.length);
  });

  it('never lets virions into cells without your receptor, so they fizzle out', () => {
    const game = createGame(level({ receptors: 0 }), flo, noJiggle);
    game.virions.push(restingOn(game.cells[30], true));
    const events = run(game, flo.lifetime + 0.1);
    expect(events).toEqual([expect.objectContaining({ type: 'fizzle', lead: true })]);
    expect(game.virions).toEqual([]);
    expect(game.cells[30].state).toBe('healthy');
  });

  it('never lets a virion into a cell that is already taken', () => {
    const game = createGame(level(), flo, noJiggle);
    game.cells[30].state = 'plaque';
    game.virions.push(restingOn(game.cells[30]));
    expect(step(game, 1 / 60)).toEqual([]);
  });

  it('stops virions that drift into an antibody cloud', () => {
    const cell = createGame(level(), flo).cells[30];
    const game = createGame(level({ antibodies: [{ x: cell.x, y: cell.y, r: 30 }] }), flo, noJiggle);
    game.virions.push(restingOn(cell, true));
    expect(step(game, 1 / 60)).toEqual([expect.objectContaining({ type: 'neutralized', lead: true })]);
    expect(game.virions).toEqual([]);
  });

  it('bounces virions off the flask walls', () => {
    const game = createGame(level(), flo, noJiggle);
    game.virions.push(
      { x: 1, y: 300, vx: -500, vy: 0, idle: 0, lead: false },
      { x: FLASK.width - 1, y: 300, vx: 500, vy: 0, idle: 0, lead: false },
      { x: 100, y: 1, vx: 0, vy: -500, idle: 0, lead: false },
      { x: 100, y: FLASK.height - 1, vx: 0, vy: 500, idle: 0, lead: false },
    );
    step(game, 1 / 60);
    const [left, right, top, bottom] = game.virions;
    expect(left.vx).toBeGreaterThan(0);
    expect(right.vx).toBeLessThan(0);
    expect(top.vy).toBeGreaterThan(0);
    expect(bottom.vy).toBeLessThan(0);
    for (const v of game.virions) {
      expect(v.x >= 0 && v.x <= FLASK.width && v.y >= 0 && v.y <= FLASK.height).toBe(true);
    }
  });

  it('keeps the number of drifting virions under the cap', () => {
    const game = createGame(level(), flo, noJiggle);
    for (let i = 0; i < MAX_VIRIONS - 2; i++) game.virions.push({ x: 180, y: 590, vx: 100, vy: 0, idle: 0, lead: false });
    game.cells[30].state = 'infected';
    game.cells[30].progress = 1;
    step(game, 1 / 60);
    expect(game.virions.length).toBeLessThanOrEqual(MAX_VIRIONS);
  });

  it('slows a flicked pal down until she lands', () => {
    const game = createGame(level(), flo, noJiggle);
    flick(game, 0, -DRIFT.maxFlick * 0.5);
    const events = run(game, 4);
    expect(events[0]).toEqual(expect.objectContaining({ type: 'attach', lead: true }));
  });

  it('ends the chain once nothing is infected or drifting', () => {
    const game = createGame(level(), flo, noJiggle);
    game.chain = 4;
    step(game, 1 / 60);
    expect(game.chain).toBe(0);
  });
});

describe('scoring', () => {
  it('counts the share of cells taken, and stars for it', () => {
    const game = createGame(level(), flo);
    expect(stars(game)).toBe(0);
    game.taken = Math.ceil(game.cells.length * 0.5);
    expect(share(game)).toBeCloseTo(game.taken / game.cells.length);
    expect(stars(game)).toBe(2);
    game.taken = game.cells.length;
    expect(stars(game)).toBe(3);
  });
});

describe('isOver', () => {
  it('waits for flicks, drifting virions and infected cells', () => {
    const game = createGame(level({ flicks: 1 }), flo);
    expect(isOver(game)).toBe(false);
    flick(game, 0, -100);
    expect(isOver(game)).toBe(false);
    game.virions = [];
    game.cells[3].state = 'infected';
    expect(isOver(game)).toBe(false);
    game.cells[3].state = 'plaque';
    expect(isOver(game)).toBe(true);
  });

  it('ends early once every cell you could get into is taken', () => {
    const game = createGame(level({ receptors: 0 }), flo);
    expect(isOver(game)).toBe(true);
  });
});
