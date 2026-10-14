// draw.js: drawing the dish. A stand-in canvas records what gets drawn.
import { describe, expect, it } from 'vitest';
import { drawDish, mix, POP_TIME } from '../public/game/draw.js';
import { createDish, step } from '../public/game/lawn.js';
import { LAWN, VIRUSES } from '../public/game/config.js';
import { fakeContext } from './fake-canvas.js';

const loaded = { complete: true, naturalWidth: 200 };
const count = (ctx, name) => ctx.calls.filter(([n]) => n === name).length;

function drawn(dish, view = {}) {
  const ctx = fakeContext();
  drawDish(ctx, dish, { palImage: loaded, pops: [], clock: 1, ...view });
  return ctx;
}

describe('mix', () => {
  it('blends two colors', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('drawDish', () => {
  it('draws every bacterium, and Tess landing', () => {
    const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
    const ctx = drawn(dish);
    expect(count(ctx, 'closePath')).toBe(dish.cells.length);
    expect(count(ctx, 'drawImage')).toBe(1);
  });

  it('draws her as a plain dot until her picture has loaded', () => {
    const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
    expect(count(drawn(dish, { palImage: { complete: false } }), 'drawImage')).toBe(0);
    expect(count(drawn(dish, { palImage: null }), 'drawImage')).toBe(0);
  });

  it('leaves plaques clear, and draws dead, filling, red and full cells', () => {
    const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
    step(dish, LAWN.enterTime + 0.01); // she's landed: no more drawing her
    const [a, b, c, d] = dish.cells;
    a.state = 'plaque';
    b.state = 'dead';
    Object.assign(c, { state: 'infected', time: VIRUSES.tess.eclipse + 0.1, lasts: 2, copies: 10 });
    Object.assign(d, { state: 'infected', time: 1.9, lasts: 2, copies: VIRUSES.tess.full });
    const ctx = drawn(dish);
    expect(count(ctx, 'drawImage')).toBe(0);
    // One hex each for every cell but the plaque, plus the full cell's ring.
    expect(count(ctx, 'closePath')).toBe(dish.cells.length - 1 + 1);
  });

  it('draws a burst’s ring and the copies flying out', () => {
    const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
    const [from, to] = dish.cells;
    const ctx = drawn(dish, { pops: [{ cell: from, infected: [to], age: POP_TIME / 2 }] });
    const flying = ctx.calls.filter(([n, x, , r]) => n === 'arc' && r === 3 && x === from.x + (to.x - from.x) / 2);
    expect(flying).toHaveLength(1);
  });
});
