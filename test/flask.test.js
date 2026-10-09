// flask.js: the rules of the game, with no drawing.
import { describe, expect, it } from 'vitest';
import { cellAt } from '../public/game/hexgrid.js';
import {
  ANTIBODY_EDGE, ANTIBODY_RADIUS, antibodiesFor, CELL_SIZE, COPY_TIME, DECOYS, HEIGHT, LEVELS, newGame, placeAntibodies, PLAYER_RADIUS, slide, step, targetFor, wander, WANDER_SPEED, WANDER_TURN, WIDTH,
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
    expect([1, 2, 3, 4, 5].map(targetFor)).toEqual([12, 18, 24, 30, 36]);
    expect(LEVELS).toBe(5);
  });

  it('start with every cell healthy, and the mate in a clear patch in the middle', () => {
    const game = newGame({ level: 2, random: seeded() });
    expect(game.target).toBe(18);
    const start = game.cells.filter((cell) => cell.state !== 'healthy');
    expect(start).toHaveLength(1);
    expect(start[0]).toMatchObject({ state: 'burst', match: true });
    expect(Math.hypot(start[0].x - WIDTH / 2, start[0].y - HEIGHT / 2)).toBeLessThan(21);
    expect(game.player).toEqual({ x: start[0].x, y: start[0].y, inside: null });
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

  it('add more antibodies each level: 3, 5, 7, 9, then 11', () => {
    expect([1, 2, 3, 4, 5].map(antibodiesFor)).toEqual([3, 5, 7, 9, 11]);
  });

  it('place every antibody, none on top of her or each other', () => {
    for (let level = 1; level <= LEVELS; level++) {
      const { antibodies, player } = newGame({ level, random: seeded(level) });
      expect(antibodies).toHaveLength(antibodiesFor(level));
      for (const drop of antibodies) {
        expect(Math.hypot(drop.x - player.x, drop.y - player.y)).toBeGreaterThan(90);
        for (const other of antibodies) {
          if (other !== drop) expect(Math.hypot(other.x - drop.x, other.y - drop.y)).toBeGreaterThan(4 * ANTIBODY_RADIUS);
        }
      }
    }
  });

  it('never start an antibody in a wall or at the very edge', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { antibodies, cells } = newGame({ level: 5, random: seeded(seed) });
      for (const drop of antibodies) {
        const cell = cellAt(cells, drop.x, drop.y, CELL_SIZE);
        if (cell) expect(cell.match).toBe(true);
        expect(drop.x).toBeGreaterThanOrEqual(ANTIBODY_EDGE);
        expect(drop.y).toBeLessThanOrEqual(HEIGHT - ANTIBODY_EDGE);
      }
    }
  });

  it('only put drops where they fit', () => {
    expect(placeAntibodies(3, { x: 0, y: 0 }, seeded(), () => false)).toEqual([]);
  });

  it('give up on a drop that can never find room', () => {
    const middle = () => 0.5; // every drop would land right on her
    expect(placeAntibodies(3, { x: WIDTH / 2, y: HEIGHT / 2 }, middle, () => true)).toEqual([]);
  });

  it('use Math.random and level 1 by default', () => {
    const game = newGame();
    expect(game.level).toBe(1);
    expect(game.target).toBe(12);
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
  // A flask of clear floor, with one wall next to her on the right.
  function walled() {
    const game = openFlask();
    for (const cell of game.cells) cell.state = 'burst';
    const home = { ...game.player };
    const wall = game.cells.find((cell) => cell.x > home.x + 20 && Math.abs(cell.y - home.y) < 20);
    wall.match = false;
    return { game, wall, home };
  }

  it("won't let her drift onto another virus's cell", () => {
    const { game, wall, home } = walled();
    for (let i = 0; i < 20; i++) {
      step(game, 0.05, [3, 0]);
      expect(cellAt(game.cells, game.player.x, game.player.y, CELL_SIZE)).not.toBe(wall);
    }
    expect(game.player.x).toBeLessThan(wall.x);
    expect(game.player.x).toBeGreaterThan(home.x); // she got as far as she could
    expect(game.player.y).toBe(home.y);
  });

  it('lets her keep moving along a wall when she heads into it at an angle', () => {
    const { game, wall } = walled();
    const start = game.player.y;
    for (let i = 0; i < 40; i++) {
      step(game, 0.05, [3, wall.y > start ? -2 : 2]);
      expect(cellAt(game.cells, game.player.x, game.player.y, CELL_SIZE)).not.toBe(wall); // never on it
    }
    expect(Math.abs(game.player.y - start)).toBeGreaterThan(20); // got past it
  });

  it('keeps her still when walls block every way she tries', () => {
    const { game, home } = walled();
    for (const cell of game.cells) if (cell.x !== home.x || cell.y !== home.y) cell.match = false;
    step(game, 0.05, [30, 30]);
    expect(game.player).toMatchObject(home);
  });
});

describe('wandering antibodies', () => {
  const drop = (props) => ({ x: 100, y: 100, heading: 0, ...props });

  it('keep going the same way when the dice say so', () => {
    const d = drop();
    wander(d, 1, () => 0.5);
    expect(d).toMatchObject({ x: 100 + WANDER_SPEED, y: 100, heading: 0 });
  });

  it('turn a little at random, never more than WANDER_TURN a second', () => {
    const left = drop();
    const right = drop();
    wander(left, 0.5, () => 0);
    wander(right, 0.5, () => 1);
    expect(left.heading).toBeCloseTo(-WANDER_TURN * 0.5);
    expect(right.heading).toBeCloseTo(WANDER_TURN * 0.5);
  });

  it('bounce off the left and right sides', () => {
    const d = drop({ x: WIDTH - ANTIBODY_EDGE - 1, heading: 0 });
    wander(d, 1, () => 0.5);
    expect(d.x).toBe(WIDTH - ANTIBODY_EDGE);
    expect(Math.cos(d.heading)).toBeCloseTo(-1); // now heading back left
    const e = drop({ x: ANTIBODY_EDGE + 1, heading: Math.PI });
    wander(e, 1, () => 0.5);
    expect(e.x).toBe(ANTIBODY_EDGE);
    expect(Math.cos(e.heading)).toBeCloseTo(1);
  });

  it('bounce off the top and bottom', () => {
    const d = drop({ y: HEIGHT - ANTIBODY_EDGE - 1, heading: Math.PI / 2 });
    wander(d, 1, () => 0.5);
    expect(d.y).toBe(HEIGHT - ANTIBODY_EDGE);
    expect(Math.sin(d.heading)).toBeCloseTo(-1); // now heading back up
    const e = drop({ y: ANTIBODY_EDGE + 1, heading: -Math.PI / 2 });
    wander(e, 1, () => 0.5);
    expect(e.y).toBe(ANTIBODY_EDGE);
    expect(Math.sin(e.heading)).toBeCloseTo(1);
  });
});

describe('antibodies in the maze', () => {
  it('turn back at a wall instead of going through it', () => {
    const d = { x: 100, y: 100, heading: 0 };
    wander(d, 1, () => 0.5, (x) => x > 104); // a wall just ahead
    expect([d.x, d.y]).toEqual([100, 100]); // stays put this time
    expect(Math.cos(d.heading)).toBeLessThan(0.01); // now facing away from it, or along it
  });

  it("never wander into another virus's cell", () => {
    const game = openFlask({ random: seeded(9) });
    for (const cell of game.cells) cell.state = 'burst';
    const wall = game.cells[60];
    wall.match = false;
    // Start just left of the wall, heading straight for it.
    game.antibodies = [{ x: wall.x - 30, y: wall.y, heading: 0 }];
    game.player.x = 10; // well away
    game.player.y = 10;
    for (let i = 0; i < 400; i++) {
      step(game, 0.05);
      const [drop] = game.antibodies;
      expect(cellAt(game.cells, drop.x, drop.y, CELL_SIZE)).not.toBe(wall);
    }
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
    const game = openFlask({ bursts: 11 });
    driftOnto(game, 40);
    expect(step(game, COPY_TIME)).toEqual(['burst', 'cleared']);
    expect(game.over).toBe('cleared');
  });

  it('neutralizes her if she touches an antibody, and not before', () => {
    const game = openFlask({ random: () => 0.5 });
    game.antibodies = [{ x: 100, y: 100, heading: Math.PI / 2 }]; // drifting down, away
    const touch = ANTIBODY_RADIUS + PLAYER_RADIUS * 0.6;
    game.player.x = 100 + touch + 3; // just out of reach
    game.player.y = 100;
    expect(step(game, 0.01)).toEqual([]);
    expect(step(game, 0.01, [-5, 0])).toEqual(['neutralized']);
    expect(game.over).toBe('neutralized');
  });

  it("keeps antibodies the same size from the start (they don't grow)", () => {
    const { antibodies } = newGame({ level: 3, random: seeded(2) });
    for (const drop of antibodies) expect(Object.keys(drop).sort()).toEqual(['heading', 'x', 'y']);
  });

  it('starts each antibody drifting its own way', () => {
    const { antibodies } = newGame({ level: 5, random: seeded(4) });
    const headings = antibodies.map((drop) => drop.heading);
    for (const heading of headings) {
      expect(heading).toBeGreaterThanOrEqual(0);
      expect(heading).toBeLessThan(2 * Math.PI);
    }
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("drifts the antibodies about, whether or not that's toward her", () => {
    const game = openFlask({ random: () => 0.5 }); // no turning
    const { x, y } = game.player;
    // Heading straight away from her.
    game.antibodies = [{ x: x - 100, y, heading: Math.PI }];
    step(game, 1);
    expect(game.antibodies[0].x).toBeCloseTo(x - 100 - WANDER_SPEED);
    expect(game.antibodies[0].y).toBeCloseTo(y);
    expect(WANDER_SPEED).toBeLessThan(10); // much slower than she drifts
  });
  it('stops everything once the level is over', () => {
    const game = openFlask({ over: 'cleared' });
    expect(step(game, 1, [10, 10])).toEqual([]);
    expect(game.time).toBe(0);
  });
});
