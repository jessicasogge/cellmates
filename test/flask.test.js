// flask.js: the rules of the game, with no drawing.
import { describe, expect, it } from 'vitest';
import {
  COPY_TIME, GROW_TIME, HEIGHT, LEVELS, newGame, placeAntibodies, PLAYER_RADIUS, step, targetFor, WIDTH,
} from '../public/game/flask.js';

// Random numbers that repeat a pattern, so every game is the same.
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// A game with no antibodies, where every cell has her receptor.
function openFlask(overrides = {}) {
  const game = newGame({ level: 1, burst: 6, random: seeded() });
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
  it('need more copies each time', () => {
    expect([1, 2, 3, 4, 5].map(targetFor)).toEqual([100, 150, 200, 250, 300]);
    expect(LEVELS).toBe(5);
  });

  it('start with every cell healthy and the pal in the middle', () => {
    const game = newGame({ level: 2, burst: 6, random: seeded() });
    expect(game.target).toBe(150);
    expect(game.cells.every((cell) => cell.state === 'healthy')).toBe(true);
    expect(game.player).toEqual({ x: WIDTH / 2, y: HEIGHT / 2, inside: null });
    expect(game.copies).toBe(0);
    expect(game.over).toBeNull();
  });

  it('give most cells her receptor, but not all', () => {
    const { cells } = newGame({ random: seeded(7) });
    const share = cells.filter((cell) => cell.match).length / cells.length;
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.95);
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
    expect(game.burst).toBe(6);
  });
});

describe('drifting', () => {
  it('moves her, but not past the edge of the flask', () => {
    const game = openFlask();
    step(game, 0.1, [-1000, 1000]);
    expect(game.player.x).toBe(PLAYER_RADIUS);
    expect(game.player.y).toBe(HEIGHT - PLAYER_RADIUS);
  });

  it("doesn't put her in the cell she starts on until she moves", () => {
    const game = openFlask();
    expect(step(game, 0.1)).toEqual([]);
    expect(game.player.inside).toBeNull();
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
  it('happens after the copy time, adding her burst size and letting her out', () => {
    const game = openFlask();
    driftOnto(game, 40);
    expect(step(game, COPY_TIME - 0.1)).toEqual([]);
    expect(step(game, 0.2)).toEqual(['burst']);
    expect(game.cells[40].state).toBe('burst');
    expect(game.copies).toBe(6);
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
    expect(game.copies).toBe(6 * (1 + copying.length));
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
  it('clears it once she has made enough copies', () => {
    const game = openFlask({ copies: 96 });
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

  it('stops everything once the level is over', () => {
    const game = openFlask({ over: 'cleared' });
    expect(step(game, 1, [10, 10])).toEqual([]);
    expect(game.time).toBe(0);
  });
});
