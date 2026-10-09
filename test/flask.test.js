// flask.js: the rules of the game, with no drawing.
import { describe, expect, it } from 'vitest';
import { cellAt } from '../public/game/hexgrid.js';
import {
  CHASE_SPEED, COPY_TIME, DECOYS, GROW_TIME, slide, HEIGHT, LEVELS, newGame, placeAntibodies, PLAYER_RADIUS, step, targetFor, WIDTH,
} from '../public/game/flask.js';

// Random numbers that repeat a pattern, so every game is the same.
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// A game with no antibodies, where every cell has her receptor.
function openFlask(overrides = {}) {
  const game = newGame({ level: 1, random: seeded() });
  game.antibodies = [];
  for (const cell of game.cells) cell.match = true;
  return Object.assign(game, overrides);
}

// Nudge her onto the cell with this id.
function driftOnto(game, id) {
  const cell = game.cells[id];
  game.player.x = cell.x + 1;
  game.player.y = cell.y;
  return step(game, 0, [-1, 0]);
}

describe('the levels', () => {
  it('need more cells burst each time', () => {
    expect([1, 2, 3, 4, 5].map(targetFor)).toEqual([10, 15, 20, 25, 30]);
    expect(LEVELS).toBe(5);
  });

  it('start with every cell healthy, and the mate in a clear patch in the middle', () => {
    const game = newGame({ level: 2, random: seeded() });
    expect(game.target).toBe(15);
    const start = game.cells.filter((cell) => cell.state !== 'healthy');
    expect(start).toHaveLength(1);
    expect(start[0]).toMatchObject({ state: 'burst', match: true, x: WIDTH / 2 });
    expect(Math.abs(start[0].y - HEIGHT / 2)).toBeLessThan(18);
    expect(game.player).toEqual({ x: WIDTH / 2, y: HEIGHT / 2, inside: null });
    expect(game.bursts).toBe(0);
    expect(game.over).toBeNull();
  });

  it('give most cells her receptor, but not all', () => {
    const { cells } = newGame({ random: seeded(7) });
    const share = cells.filter((cell) => cell.match).length / cells.length;
    expect(share).toBeGreaterThan(0.55);
    expect(share).toBeLessThan(0.85);
  });

  it("put other viruses' locks on the rest, of every kind", () => {
    const { cells } = newGame({ random: seeded(7) });
    for (const cell of cells) {
      if (cell.match) expect(cell.lock).toBe('match');
      else expect(DECOYS).toContain(cell.lock);
    }
    const kinds = new Set(cells.filter((cell) => !cell.match).map((cell) => cell.lock));
    expect([...kinds].sort()).toEqual([...DECOYS].sort());
  });

  it('add one antibody drop per level, none on top of her or each other', () => {
    for (let level = 1; level <= LEVELS; level++) {
      const { antibodies, player } = newGame({ level, random: seeded(level) });
      expect(antibodies).toHaveLength(level);
      for (const drop of antibodies) {
        expect(Math.hypot(drop.x - player.x, drop.y - player.y)).toBeGreaterThan(drop.max + 60);
        for (const other of antibodies) {
          if (other !== drop) expect(Math.hypot(other.x - drop.x, other.y - drop.y)).toBeGreaterThan(drop.max + other.max);
        }
      }
    }
  });

  it('give up on a drop that can never find room', () => {
    const middle = () => 0.5; // every drop would land right on her
    expect(placeAntibodies(3, { x: WIDTH / 2, y: HEIGHT / 2 }, middle)).toEqual([]);
  });

  it('use Math.random and level 1 by default', () => {
    const game = newGame();
    expect(game.level).toBe(1);
    expect(game.target).toBe(10);
  });
});

describe('drifting', () => {
  it('moves her, but not past the edge of the flask', () => {
    const game = openFlask();
    step(game, 0.1, [-1000, 1000]);
    expect(game.player.x).toBe(PLAYER_RADIUS);
    expect(game.player.y).toBe(HEIGHT - PLAYER_RADIUS);
  });

  it('never starts her inside a wall', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = newGame({ random: seeded(seed) });
      const start = game.cells.find((cell) => cell.state === 'burst');
      expect(start.match).toBe(true);
    }
  });

  it("doesn't put her in a cell until she moves", () => {
    const game = openFlask();
    expect(step(game, 0.1)).toEqual([]);
    expect(game.player.inside).toBeNull();
  });
});

describe('the maze', () => {
  // A flask of clear floor, with one wall to the right of where she starts.
  function walled() {
    const game = openFlask();
    for (const cell of game.cells) cell.state = 'burst';
    const wall = game.cells.find((cell) => cell.x > WIDTH / 2 + 20 && Math.abs(cell.y - HEIGHT / 2) < 18);
    wall.match = false;
    return { game, wall };
  }

  it("won't let her drift onto another virus's cell", () => {
    const { game, wall } = walled();
    for (let i = 0; i < 20; i++) step(game, 0.05, [3, 0]);
    expect(game.player.x).toBeLessThan(wall.x - 17);
    expect(game.player.y).toBe(HEIGHT / 2);
  });

  it('lets her keep moving along a wall when she heads into it at an angle', () => {
    const { game, wall } = walled();
    const start = game.player.y;
    for (let i = 0; i < 40; i++) {
      step(game, 0.05, [3, wall.y > start ? -2 : 2]);
      expect(cellAt(game.cells, game.player.x, game.player.y, 20)).not.toBe(wall); // never on it
    }
    expect(Math.abs(game.player.y - start)).toBeGreaterThan(20); // got past it
  });

  it('keeps her still when walls block every way she tries', () => {
    const { game } = walled();
    for (const cell of game.cells) if (cell.state === 'burst' && Math.hypot(cell.x - WIDTH / 2, cell.y - HEIGHT / 2) > 5) cell.match = false;
    step(game, 0.05, [30, 30]);
    expect([game.player.x, game.player.y]).toEqual([WIDTH / 2, HEIGHT / 2]);
  });
});

describe('sliding along a wall', () => {
  const from = { x: 0, y: 0 };

  it('moves all the way when nothing is in the way', () => {
    expect(slide(from, [3, 4], () => false)).toEqual([3, 4]);
  });

  it('slides sideways along a wall above her', () => {
    expect(slide(from, [3, -4], (x, y) => y < 0)).toEqual([3, 0]);
  });

  it('slides up or down along a wall beside her', () => {
    expect(slide(from, [3, -4], (x) => x > 0)).toEqual([0, -4]);
  });

  it('stays put in a corner', () => {
    expect(slide(from, [3, -4], (x, y) => x > 0 || y < 0)).toEqual([0, 0]);
  });
});

describe('getting into a cell', () => {
  it('works on a healthy cell with her receptor', () => {
    const game = openFlask();
    expect(driftOnto(game, 40)).toEqual(['attach']);
    expect(game.player.inside).toBe(40);
    expect([game.player.x, game.player.y]).toEqual([game.cells[40].x, game.cells[40].y]);
    expect(game.cells[40].state).toBe('copying');
  });

  it("doesn't work on a cell without her receptor", () => {
    const game = openFlask();
    game.cells[40].match = false;
    expect(driftOnto(game, 40)).toEqual([]);
    expect(game.player.inside).toBeNull();
  });

  it("doesn't work on a cell that's already copying or burst", () => {
    const game = openFlask();
    game.cells[40].state = 'burst';
    game.cells[41].state = 'copying';
    game.cells[41].timer = 5;
    expect(driftOnto(game, 40)).toEqual([]);
    expect(driftOnto(game, 41)).toEqual([]);
  });

  it('keeps her still while the cell copies her', () => {
    const game = openFlask();
    driftOnto(game, 40);
    step(game, 0.1, [50, 50]);
    expect([game.player.x, game.player.y]).toEqual([game.cells[40].x, game.cells[40].y]);
  });
});

describe('bursting', () => {
  it('happens after the copy time, counting the cell and letting her out', () => {
    const game = openFlask();
    driftOnto(game, 40);
    expect(step(game, COPY_TIME - 0.1)).toEqual([]);
    expect(step(game, 0.2)).toEqual(['burst']);
    expect(game.cells[40].state).toBe('burst');
    expect(game.bursts).toBe(1);
    expect(game.player.inside).toBeNull();
  });

  it('sends her copies into the matching cells next door, and no further', () => {
    const game = openFlask();
    const cell = game.cells[40];
    game.cells[cell.neighbors[0]].match = false;
    driftOnto(game, 40);
    step(game, COPY_TIME);
    const copying = game.cells.filter((c) => c.state === 'copying').map((c) => c.id);
    expect(copying.sort()).toEqual(cell.neighbors.slice(1).sort());
    // They burst too, but don't spread on.
    const events = step(game, COPY_TIME);
    expect(events.filter((e) => e === 'burst')).toHaveLength(copying.length);
    expect(game.cells.filter((c) => c.state === 'copying')).toHaveLength(0);
    expect(game.bursts).toBe(1 + copying.length);
  });

  it("doesn't pop her out when some other cell bursts", () => {
    const game = openFlask();
    game.cells[100].state = 'copying';
    game.cells[100].timer = 0.05;
    driftOnto(game, 40);
    expect(step(game, 0.1)).toEqual(['burst']);
    expect(game.player.inside).toBe(40);
  });
});

describe('the end of a level', () => {
  it('clears it once she has burst enough cells', () => {
    const game = openFlask({ bursts: 9 });
    driftOnto(game, 40);
    expect(step(game, COPY_TIME)).toEqual(['burst', 'cleared']);
    expect(game.over).toBe('cleared');
  });

  it('neutralizes her if she touches an antibody cloud', () => {
    const game = openFlask();
    game.antibodies = [{ x: 100, y: 100, max: 60, r: 0 }];
    step(game, GROW_TIME); // the cloud spreads out fully
    expect(game.antibodies[0].r).toBe(60);
    game.player.x = 100 + 60 + 10; // just outside, then drifts in
    game.player.y = 100;
    expect(step(game, 0.01, [-5, 0])).toEqual(['neutralized']);
    expect(game.over).toBe('neutralized');
  });

  it('spreads the clouds fast at first, then slowly', () => {
    const game = openFlask();
    game.antibodies = [{ x: 20, y: 20, max: 60, r: 0 }];
    step(game, GROW_TIME / 2);
    expect(game.antibodies[0].r).toBeCloseTo(45); // 3/4 of the way at half time
  });

  it('creeps the antibodies slowly toward her', () => {
    const game = openFlask();
    game.antibodies = [{ x: WIDTH / 2 - 100, y: HEIGHT / 2, max: 50, r: 0 }];
    step(game, 1);
    expect(game.antibodies[0].x).toBeCloseTo(WIDTH / 2 - 100 + CHASE_SPEED);
    expect(game.antibodies[0].y).toBe(HEIGHT / 2);
    expect(CHASE_SPEED).toBeLessThan(10); // much slower than she drifts
  });

  it("chases her even while she's inside a cell", () => {
    const game = openFlask();
    game.antibodies = [{ x: 20, y: 20, max: 50, r: 0 }];
    driftOnto(game, 40);
    const before = Math.hypot(game.player.x - 20, game.player.y - 20);
    step(game, 1);
    const [drop] = game.antibodies;
    expect(Math.hypot(game.player.x - drop.x, game.player.y - drop.y)).toBeCloseTo(before - CHASE_SPEED);
  });

  it("stops on top of her instead of overshooting", () => {
    const game = openFlask();
    game.antibodies = [{ x: WIDTH / 2 + 1, y: HEIGHT / 2, max: 50, r: 0 }];
    step(game, 10);
    expect(game.antibodies[0]).toMatchObject({ x: WIDTH / 2, y: HEIGHT / 2 });
    step(game, 1); // already there: stays put
    expect(game.antibodies[0]).toMatchObject({ x: WIDTH / 2, y: HEIGHT / 2 });
  });

  it('stops everything once the level is over', () => {
    const game = openFlask({ over: 'cleared' });
    expect(step(game, 1, [10, 10])).toEqual([]);
    expect(game.time).toBe(0);
  });
});
