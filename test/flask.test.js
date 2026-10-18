// flask.js: the game with no drawing. Randomness is swapped for fixed
// numbers so every game is the same.
import { describe, expect, it } from 'vitest';
import {
  canEnter, cellAt, cloudRadius, cloudSpots, createGame, move, neighbors, POP_TIME, step, trailSpot,
} from '../public/game/flask.js';
import { ANTIBODIES, CELLS, FLASK, LEVELS, STREAK_GAP, TRAIL, VIRUSES } from '../public/game/config.js';

const flo = VIRUSES.flo;
const level = { antibodies: 0, size: 40, share: 1 };
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

// A game where only `cells` (by index) have the receptor, and nothing warns.
// It needs lots of cells, so it doesn't end before the test is done.
function only(indexes) {
  const game = createGame(level, flo, high);
  for (const i of indexes) game.cells[i].receptor = true;
  game.target = 99;
  return game;
}

describe('cloudSpots', () => {
  it('spreads the clouds apart, over the cells', () => {
    const spots = cloudSpots(3, 40);
    expect(spots).toHaveLength(3);
    for (const a of spots) {
      expect(a.y).toBeLessThan(FLASK.cells.bottom);
      expect(Math.hypot(a.x - FLASK.start.x, a.y - FLASK.cells.bottom)).toBeGreaterThan(40 + 70);
      for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(80);
    }
  });

  it('gives up rather than looping forever if they can’t fit', () => {
    expect(cloudSpots(2, 40, () => 0.5)).toHaveLength(1);
  });
});

describe('cloudRadius', () => {
  it('spreads quickly at first, then slowly, then stops', () => {
    expect(cloudRadius(0, 40)).toBe(ANTIBODIES.start);
    const half = cloudRadius(ANTIBODIES.growTime / 2, 40);
    expect(half - ANTIBODIES.start).toBeGreaterThan((40 - ANTIBODIES.start) / 2);
    expect(cloudRadius(ANTIBODIES.growTime, 40)).toBe(40);
    expect(cloudRadius(ANTIBODIES.growTime * 10, 40)).toBe(40);
  });
});

describe('createGame', () => {
  it('fills the flask with healthy cells, and starts her in the neck', () => {
    const game = createGame(level, flo, low);
    expect(game.cells.length).toBeGreaterThan(100);
    expect(game.cells.every((c) => c.state === 'healthy' && c.receptor && !c.warned)).toBe(true);
    expect(game.pal).toMatchObject(FLASK.start);
    expect(cellAt(game, game.pal.x, game.pal.y)).toBeUndefined();
    expect(game.copies).toEqual([]);
  });

  it('gives about the right share of cells the receptor', () => {
    const game = createGame(level, flo);
    const share = game.cells.filter((c) => c.receptor).length / game.cells.length;
    expect(Math.abs(share - CELLS.receptors)).toBeLessThan(0.15);
  });

  it('drops the level’s antibody clouds, starting small', () => {
    const game = createGame(LEVELS[2], flo);
    expect(game.clouds).toHaveLength(LEVELS[2].antibodies);
    expect(game.clouds.every((c) => c.r === ANTIBODIES.start)).toBe(true);
  });

  it('needs its share of the cells she can take, not counting ones a cloud will cover', () => {
    const all = createGame(level, flo, low);
    expect(all.target).toBe(all.cells.length);
    expect(createGame({ ...level, share: 0.5 }, flo, low).target).toBe(Math.round(all.cells.length / 2));
    // With a cloud, the cells it covers don't count.
    const clouded = createGame({ antibodies: 1, size: 40, share: 1 }, flo, low);
    const [cloud] = clouded.clouds;
    const covered = clouded.cells.filter((c) => Math.hypot(c.x - cloud.x, c.y - cloud.y) < 40).length;
    expect(covered).toBeGreaterThan(0);
    expect(clouded.target).toBe(clouded.cells.length - covered);
    // And never less than one.
    expect(createGame(level, flo, high).target).toBe(1);
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

  it('keeps her copies out of a warned cell, but not her', () => {
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

  it('remembers where she’s been, just as far back as the longest trail needs', () => {
    const game = createGame(level, flo, high);
    move(game, 0, -20);
    expect(game.path.length).toBe(11); // the start, then a point every 2 units
    expect(game.path[0]).toMatchObject({ x: FLASK.start.x, y: FLASK.start.y - 20 });
    for (let i = 0; i < 100; i++) move(game, i % 2 ? 30 : -30, -1);
    expect(game.path.length).toBe(Math.ceil(((flo.maxTrail + 1) * TRAIL.spacing) / 2) + 1);
  });

  it('can’t steer her once the game is over', () => {
    const game = createGame(level, flo, low);
    game.over = 'lost';
    move(game, 10, 10);
    expect(game.pal).toMatchObject(FLASK.start);
  });
});

describe('trailSpot', () => {
  it('lines her copies up behind her, off to alternate sides, wider down the trail', () => {
    const game = createGame(level, flo, high);
    move(game, 0, -200); // straight up
    const spots = [0, 1, 2, 3, 20, 21].map((i) => trailSpot(game, i));
    // Behind her, further each time.
    expect(spots[0].y).toBeGreaterThan(game.pal.y);
    expect(spots[2].y).toBeGreaterThan(spots[0].y);
    // Off to alternate sides of her path.
    expect(Math.sign(spots[0].x - game.pal.x)).not.toBe(Math.sign(spots[1].x - game.pal.x));
    expect(Math.abs(spots[3].x - game.pal.x)).toBeGreaterThan(Math.abs(spots[1].x - game.pal.x));
    expect(Math.abs(spots[5].x - game.pal.x)).toBeCloseTo(TRAIL.spread);
  });

  it('bunches them up at the start until she’s been far enough', () => {
    const game = createGame(level, flo, high);
    expect(trailSpot(game, 5)).toMatchObject(FLASK.start);
    move(game, 0, -4);
    expect(trailSpot(game, 10).y).toBe(FLASK.start.y); // where she started, off to one side
  });
});

describe('step', () => {
  it('infects a cell she passes over, without stopping her', () => {
    const game = only([40]);
    onto(game, game.cells[40]);
    const events = step(game, 0.01);
    expect(events).toEqual([{ type: 'infected', cell: game.cells[40], byPal: true }]);
    expect(game.cells[40].state).toBe('infected');
    const { x } = game.pal;
    move(game, 10, 0);
    expect(game.pal.x).toBe(x + 10);
  });

  it('bursts the cell a moment later, sending its copies to join her trail', () => {
    const game = only([40]);
    onto(game, game.cells[40]);
    step(game, 0.01);
    expect(run(game, flo.burstTime * 0.9).some((e) => e.type === 'burst')).toBe(false);
    const events = run(game, flo.burstTime * 0.2);
    expect(events.find((e) => e.type === 'burst')).toMatchObject({ cell: game.cells[40], streak: 1 });
    expect(game.cells[40].state).toBe('released');
    expect(game.taken).toBe(1);
    expect(game.copies).toHaveLength(flo.copies);
    expect(game.pops).toHaveLength(1);
    // They fly to their places in the trail behind her.
    move(game, 0, -60);
    run(game, 1);
    game.copies.forEach((copy, i) => {
      const spot = trailSpot(game, i);
      expect(Math.hypot(copy.x - spot.x, copy.y - spot.y)).toBeLessThan(1);
      expect(copy.joined).toBe(true);
    });
  });

  it('warns the cells around one that bursts', () => {
    const game = createGame(level, flo, low);
    const cell = game.cells[40];
    onto(game, cell);
    step(game, 0.01);
    move(game, 0, 200); // out of the way, down in the neck
    run(game, flo.burstTime);
    expect(neighbors(game, cell).every((n) => n.warned || n.state !== 'healthy')).toBe(true);
  });

  it('takes twice as long to burst a warned cell she gets into', () => {
    const game = only([40]);
    game.cells[40].warned = true;
    onto(game, game.cells[40]);
    step(game, 0.01);
    run(game, flo.burstTime * 1.5);
    expect(game.cells[40].state).toBe('infected');
    run(game, flo.burstTime);
    expect(game.cells[40].state).toBe('released');
  });

  it('lets a copy in the trail peel off and get into a cell nearby, which releases one copy', () => {
    const game = only([40]);
    const cell = game.cells[40];
    game.copies = [{ x: cell.x + TRAIL.seek - 5, y: cell.y, joined: true }];
    const events = run(game, 2);
    expect(events).toContainEqual({ type: 'infected', cell, byPal: false });
    expect(cell.state).toBe('released');
    expect(game.copies).toHaveLength(1); // the one it released, in place of the one that went in
  });

  it('keeps her copies out of warned cells, and only one copy goes for each cell', () => {
    const game = only([40, 41]);
    game.cells[41].warned = true;
    const near = { x: game.cells[40].x + 20, y: game.cells[40].y, joined: true };
    game.copies = [{ ...near }, { ...near }];
    run(game, 0.05);
    expect(game.copies.filter((c) => c.seek === game.cells[40])).toHaveLength(1);
    expect(game.copies.some((c) => c.seek === game.cells[41])).toBe(false);
    // Once the cell is taken, the other stops going for it.
    run(game, 2);
    expect(game.copies.every((c) => !c.seek)).toBe(true);
  });

  it('only lets copies that have joined the trail go looking', () => {
    const game = only([40]);
    const cell = game.cells[40];
    game.copies = [{ x: cell.x + 20, y: cell.y }];
    step(game, 1 / 60);
    expect(game.copies[0].seek).toBeUndefined();
  });

  it('never lets the trail get longer than the virus’s maxTrail', () => {
    const game = only([40]);
    game.copies = Array.from({ length: flo.maxTrail - 1 }, () => ({ x: FLASK.start.x, y: FLASK.start.y }));
    onto(game, game.cells[40]);
    run(game, flo.burstTime + 0.1);
    expect(game.copies).toHaveLength(flo.maxTrail);
  });

  it('loses copies that touch an antibody cloud, but carries on', () => {
    const game = only([]);
    move(game, 0, -100);
    const spot = trailSpot(game, 0);
    game.clouds = [{ x: spot.x, y: spot.y, r: 0 }];
    game.copies = [{ ...spot, joined: true }];
    const events = step(game, 1 / 60);
    expect(events).toEqual([{ type: 'copyLost', copy: expect.anything() }]);
    expect(game.copies).toHaveLength(0);
    expect(game.lost).toBe(1);
    expect(game.over).toBeNull();
  });

  it('spreads the antibody clouds for the first few seconds, then stops', () => {
    const game = createGame(LEVELS[0], flo);
    run(game, 1);
    const r = game.clouds[0].r;
    expect(r).toBeGreaterThan(ANTIBODIES.start);
    run(game, ANTIBODIES.growTime);
    expect(game.clouds[0].r).toBe(LEVELS[0].size);
    run(game, 5);
    expect(game.clouds[0].r).toBe(LEVELS[0].size);
  });

  it('counts a streak of bursts close together, and starts over after a pause', () => {
    const game = only([40, 42, 44]);
    const burstAt = (i) => {
      onto(game, game.cells[i]);
      const found = run(game, flo.burstTime + 0.05).find((e) => e.type === 'burst');
      game.copies = []; // so they don't get to the next cell first
      return found;
    };
    expect(burstAt(40).streak).toBe(1);
    expect(burstAt(42).streak).toBe(2);
    run(game, STREAK_GAP + 0.1);
    expect(burstAt(44).streak).toBe(1);
    expect(game.bestStreak).toBe(2);
  });

  it('lets each burst’s pop fade away', () => {
    const game = only([40]);
    onto(game, game.cells[40]);
    run(game, flo.burstTime + 0.05);
    expect(game.pops).toHaveLength(1);
    run(game, POP_TIME + 0.05);
    expect(game.pops).toHaveLength(0);
  });

  it('ends the game if she touches an antibody cloud', () => {
    const game = createGame(level, flo, high);
    game.clouds = [{ x: game.pal.x, y: game.pal.y, r: 0 }];
    expect(step(game, 0.01)).toContainEqual({ type: 'lost' });
    expect(game.over).toBe('lost');
    expect(step(game, 0.01)).toEqual([]); // nothing more happens
  });

  it('wins once enough cells are taken', () => {
    const game = only([40]);
    game.target = 1;
    onto(game, game.cells[40]);
    const events = run(game, flo.burstTime + 0.05);
    expect(events.at(-1)).toEqual({ type: 'won' });
    expect(game.over).toBe('won');
  });
});
