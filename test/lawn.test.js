// lawn.js: Plaque with no drawing. Randomness is swapped for fixed numbers
// so every dish is the same.
import { describe, expect, it } from 'vitest';
import {
  burst, canBurst, cellAt, cleared, copiesAt, createDish, danger, hasWon, isOver, mostUrgent, neighbors, step,
} from '../public/game/lawn.js';
import { DISH, LAWN, VIRUSES } from '../public/game/config.js';

const tess = VIRUSES.tess;
const half = () => 0.5;

// Run on for `seconds`, collecting what happened.
function run(dish, seconds, dt = 1 / 60) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...step(dish, dt));
  return events;
}

// A dish where she's landed, with its first cell infected.
function landed(random = half) {
  const dish = createDish(tess, LAWN, random);
  run(dish, LAWN.enterTime + 0.02);
  return dish;
}

describe('copiesAt', () => {
  it('is nothing during the eclipse, then a steady number each second, up to full', () => {
    expect(copiesAt(tess, 0)).toBe(0);
    expect(copiesAt(tess, tess.eclipse)).toBe(0);
    expect(copiesAt(tess, tess.eclipse + 1)).toBe(tess.perSecond);
    expect(copiesAt(tess, 100)).toBe(tess.full);
  });
});

describe('createDish', () => {
  const dish = createDish(tess, LAWN, half);

  it('covers the dish in a lawn of healthy bacteria, all inside the rim', () => {
    expect(dish.cells.length).toBeGreaterThan(80);
    const middle = DISH.size / 2;
    for (const cell of dish.cells) {
      expect(cell.state).toBe('healthy');
      expect(Math.hypot(cell.x - middle, cell.y - middle)).toBeLessThan(DISH.radius);
    }
  });

  it('lands her on the cell nearest the middle', () => {
    const middle = DISH.size / 2;
    const distance = (c) => Math.hypot(c.x - middle, c.y - middle);
    for (const cell of dish.cells) expect(distance(dish.first)).toBeLessThanOrEqual(distance(cell));
  });

  it('finds the cell under a point, and nothing off the lawn', () => {
    expect(cellAt(dish, dish.first.x + 2, dish.first.y - 2)).toBe(dish.first);
    expect(cellAt(dish, 1, 1)).toBeUndefined();
  });

  it('gives a middle cell six neighbors', () => {
    expect(neighbors(dish, dish.first)).toHaveLength(6);
  });
});

describe('step', () => {
  it('waits for her to land, then infects the first cell', () => {
    const dish = createDish(tess, LAWN, half);
    expect(run(dish, LAWN.enterTime - 0.1)).toEqual([]);
    expect(isOver(dish)).toBe(false); // not over before she's even landed
    const events = run(dish, 0.12);
    expect(events).toEqual([{ type: 'landed', cell: dish.first }]);
    expect(dish.first.state).toBe('infected');
  });

  it('fills an infected cell with copies', () => {
    const dish = landed();
    run(dish, tess.eclipse + 0.5);
    expect(dish.first.copies).toBe(copiesAt(tess, dish.first.time));
    expect(dish.first.copies).toBeGreaterThan(0);
  });

  it('self-destructs a cell left too long, and then the dish is over', () => {
    const dish = landed();
    const events = run(dish, dish.first.lasts + 0.1);
    expect(events).toEqual([{ type: 'died', cell: dish.first }]);
    expect(dish.first.state).toBe('dead');
    expect(isOver(dish)).toBe(true);
    expect(hasWon(dish)).toBe(false);
  });

  it('makes each cell last a different time, inside the range', () => {
    const [low, high] = LAWN.selfDestruct;
    for (const r of [0, 0.5, 0.999]) {
      const { first } = landed(() => r);
      expect(first.lasts - tess.eclipse).toBeGreaterThanOrEqual(low);
      expect(first.lasts - tess.eclipse).toBeLessThanOrEqual(high);
    }
  });
});

describe('danger', () => {
  it('is 0 until the eclipse ends, then rises to 1 when it self-destructs', () => {
    const dish = landed();
    expect(danger(dish, dish.first)).toBe(0);
    run(dish, tess.eclipse + 0.01);
    expect(danger(dish, dish.first)).toBeGreaterThan(0);
    dish.first.time = dish.first.lasts;
    expect(danger(dish, dish.first)).toBeCloseTo(1);
  });

  it('is 0 for a cell that isn’t infected', () => {
    const dish = landed();
    expect(danger(dish, dish.cells.find((c) => c.state === 'healthy'))).toBe(0);
  });
});

describe('burst', () => {
  it('can’t burst a cell with no copies, or one that isn’t infected', () => {
    const dish = landed();
    expect(canBurst(dish.first)).toBe(false);
    expect(burst(dish, dish.first)).toBeNull();
    expect(burst(dish, dish.cells.find((c) => c.state === 'healthy'))).toBeNull();
    expect(canBurst(undefined)).toBe(false);
  });

  it('clears the cell and infects a neighbor for each few copies', () => {
    const dish = landed();
    dish.first.copies = tess.perNeighbor * 2;
    const event = burst(dish, dish.first);
    expect(event.cell).toBe(dish.first);
    expect(event.infected).toHaveLength(2);
    expect(dish.first.state).toBe('plaque');
    for (const cell of event.infected) {
      expect(cell.state).toBe('infected');
      expect(neighbors(dish, dish.first)).toContain(cell);
    }
    expect(cleared(dish)).toBeCloseTo(1 / dish.cells.length);
  });

  it('infects every neighbor from a full cell, but only healthy ones', () => {
    const dish = landed();
    const [taken] = neighbors(dish, dish.first);
    taken.state = 'dead';
    dish.first.copies = tess.full;
    expect(burst(dish, dish.first).infected).toHaveLength(5);
    expect(taken.state).toBe('dead');
  });
});

describe('mostUrgent', () => {
  it('picks the ready cell closest to self-destructing', () => {
    const dish = landed();
    expect(mostUrgent(dish)).toBeUndefined();
    dish.first.copies = tess.full;
    const [a, b] = burst(dish, dish.first).infected;
    run(dish, tess.eclipse + 0.2);
    a.time += 0.5; // a is further along
    expect(mostUrgent(dish)).toBe(a);
    expect(b.state).toBe('infected');
  });
});

describe('winning', () => {
  it('wins once enough of the lawn is cleared', () => {
    const dish = landed();
    const needed = Math.ceil(dish.cells.length * LAWN.target);
    dish.cells.slice(0, needed).forEach((c) => { c.state = 'plaque'; });
    expect(hasWon(dish)).toBe(true);
    expect(isOver(dish)).toBe(true);
  });
});
