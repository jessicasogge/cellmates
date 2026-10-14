// cell.js: Burst or Wait with no drawing. Randomness is swapped for fixed
// numbers so every run is the same.
import { describe, expect, it } from 'vitest';
import { block, burst, canBlock, canBurst, copiesAt, createRun, step } from '../public/game/cell.js';
import { HOST, VIRUSES } from '../public/game/config.js';

const tess = VIRUSES.tess;

// A host with no surprises: the alarm rises at exactly `alarmRate` (random
// 0.5 gives a factor of 1), never jumps, and breaks at the top of `breaking`.
const steady = { ...HOST, jumpRate: 0, breaking: [0.5, 0.5] };
const half = () => 0.5;

// Run on for `seconds`, collecting what happened.
function run(game, seconds, dt = 1 / 60) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...step(game, dt));
  return events;
}

// A run that's past the landing and copying.
function copying(host = steady, random = half) {
  const game = createRun(tess, host, random);
  run(game, host.enterTime + 0.02);
  return game;
}

describe('copiesAt', () => {
  it('is nothing during the eclipse, then a steady number each second', () => {
    expect(copiesAt(tess, 0)).toBe(0);
    expect(copiesAt(tess, tess.eclipse)).toBe(0);
    expect(copiesAt(tess, tess.eclipse + 1)).toBe(tess.perSecond);
    expect(copiesAt(tess, tess.eclipse + 2.5)).toBe(tess.perSecond * 2.5);
  });
});

describe('createRun', () => {
  it('starts on the first cell, landing, with every life', () => {
    const game = createRun(tess, HOST, half);
    expect(game.number).toBe(1);
    expect(game.lives).toBe(HOST.lives);
    expect(game.cell.phase).toBe('entering');
    expect(game.score).toBe(0);
  });

  it('hides the breaking point somewhere in the danger zone, high more often than low', () => {
    const at = (r) => createRun(tess, HOST, () => r).cell.breaking;
    const [low, high] = HOST.breaking;
    expect(at(0)).toBe(low);
    expect(at(0.999999)).toBeCloseTo(high);
    expect(at(0.25)).toBeCloseTo(low + 0.5 * (high - low)); // the square root of 0.25
  });
});

describe('step', () => {
  it('lands her, then copies, with nothing to burst during the eclipse', () => {
    const game = createRun(tess, steady, half);
    expect(canBurst(game)).toBe(false);
    const events = run(game, steady.enterTime + 0.02);
    expect(events).toEqual([{ type: 'entered' }]);
    expect(game.cell.phase).toBe('copying');
    run(game, tess.eclipse - 0.1);
    expect(game.cell.copies).toBe(0);
    expect(game.cell.alarm).toBe(0); // the cell hasn't noticed yet
    expect(canBurst(game)).toBe(false);
  });

  it('counts each new copy', () => {
    const game = copying();
    const events = run(game, tess.eclipse + 0.5);
    const copies = events.filter((e) => e.type === 'copy').map((e) => e.copies);
    expect(copies.length).toBeGreaterThan(5);
    expect(copies).toEqual([...copies].sort((a, b) => a - b));
    expect(game.cell.copies).toBe(copies.at(-1));
    expect(canBurst(game)).toBe(true);
  });

  it('raises the alarm after the eclipse, with the odd sudden jump', () => {
    const jumpy = { ...steady, jumpRate: 1e6, breaking: [5, 5] };
    const game = copying(jumpy);
    run(game, tess.eclipse);
    const before = game.cell.alarm;
    const events = step(game, 1 / 60);
    expect(events.some((e) => e.type === 'jolt')).toBe(true);
    expect(game.cell.alarm - before).toBeGreaterThan(jumpy.jumpSize * 0.9);
  });

  it('self-destructs at the breaking point, losing the copies and a life', () => {
    const game = copying();
    const events = run(game, tess.eclipse + 0.5 / steady.alarmRate + 0.1);
    const died = events.find((e) => e.type === 'died');
    expect(died).toEqual({ type: 'died', lost: expect.any(Number), breaking: 0.5 });
    expect(died.lost).toBeGreaterThan(0);
    expect(game.cell.phase).toBe('died');
    expect(game.lives).toBe(HOST.lives - 1);
    expect(game.score).toBe(0);
    expect(canBurst(game)).toBe(false);
  });

  it('moves on to the next cell after a moment', () => {
    const game = copying();
    run(game, tess.eclipse + 0.5);
    burst(game);
    const events = run(game, steady.afterTime + 0.05);
    expect(events).toEqual([{ type: 'next', number: 2 }]);
    expect(game.cell.phase).toBe('entering');
  });

  it('makes each cell after a burst a little tougher', () => {
    const game = copying();
    const first = game.cell.rate;
    run(game, tess.eclipse + 0.5);
    burst(game);
    run(game, steady.afterTime + 0.05);
    expect(game.cell.rate).toBeCloseTo(first * steady.tougher);
  });

  it('ends the run when the last life is lost, and then stops', () => {
    const game = copying({ ...steady, lives: 1 });
    const events = run(game, tess.eclipse + 0.5 / steady.alarmRate + steady.afterTime + 0.3);
    expect(events.at(-1)).toEqual({ type: 'over', score: 0 });
    expect(game.over).toBe(true);
    expect(step(game, 1)).toEqual([]);
  });
});

describe('burst', () => {
  it('banks every copy so far', () => {
    const game = copying();
    run(game, tess.eclipse + 0.5);
    const copies = game.cell.copies;
    expect(burst(game)).toEqual({ type: 'burst', copies });
    expect(game.score).toBe(copies);
    expect(game.bursts).toBe(1);
    expect(game.bestBurst).toBe(copies);
    expect(game.cell.phase).toBe('burst');
    expect(burst(game)).toBeNull(); // only once
  });

  it('does nothing before there are any copies', () => {
    const game = createRun(tess, steady, half);
    expect(burst(game)).toBeNull();
    expect(game.score).toBe(0);
  });
});

describe('block', () => {
  it('knocks the alarm back, once per cell', () => {
    const game = copying();
    run(game, tess.eclipse + 1);
    const alarm = game.cell.alarm;
    expect(canBlock(game)).toBe(true);
    expect(block(game)).toBe(true);
    expect(game.cell.alarm).toBeCloseTo(Math.max(0, alarm - tess.block));
    expect(canBlock(game)).toBe(false);
    expect(block(game)).toBe(false);
  });

  it('never takes the alarm below nothing, and can’t be used while landing', () => {
    const landing = createRun(tess, steady, half);
    expect(block(landing)).toBe(false);
    const game = copying();
    block(game);
    expect(game.cell.alarm).toBe(0);
  });
});
