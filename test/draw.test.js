// draw.js: drawing the bacterium. A stand-in canvas records what gets drawn.
import { describe, expect, it } from 'vitest';
import { drawCell, MAX_SHOWN, mix, ROD, SPOTS } from '../public/game/draw.js';
import { createRun } from '../public/game/cell.js';
import { HOST, VIRUSES } from '../public/game/config.js';
import { fakeContext } from './fake-canvas.js';

const loaded = { complete: true, naturalWidth: 200 };

function drawn(change = {}, palImage = loaded) {
  const run = createRun(VIRUSES.tess, HOST, () => 0.5);
  Object.assign(run.cell, change);
  const ctx = fakeContext();
  drawCell(ctx, run, { palImage, clock: 1 });
  return ctx;
}
const count = (ctx, name) => ctx.calls.filter(([n]) => n === name).length;

describe('mix', () => {
  it('blends two colors', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('SPOTS', () => {
  it('has room for every copy shown, all inside the rod, from the middle out', () => {
    expect(SPOTS.length).toBe(MAX_SHOWN);
    expect(MAX_SHOWN).toBeGreaterThan(150); // room for a typical big burst
    for (const { x, y } of SPOTS) {
      expect(x > ROD.x && x < ROD.x + ROD.width && y > ROD.y && y < ROD.y + ROD.height).toBe(true);
    }
    const middle = { x: ROD.x + ROD.width / 2, y: ROD.y + ROD.height / 2 };
    const distance = (s) => Math.hypot(s.x - middle.x, s.y - middle.y);
    expect(distance(SPOTS[0])).toBeLessThan(distance(SPOTS.at(-1)));
  });
});

describe('drawCell', () => {
  it('draws her landing, from her picture', () => {
    const ctx = drawn();
    expect(count(ctx, 'drawImage')).toBe(1);
    expect(count(ctx, 'roundRect')).toBe(1);
  });

  it('draws a plain dot for her until her picture has loaded', () => {
    expect(count(drawn({}, { complete: false }), 'drawImage')).toBe(0);
    expect(count(drawn({}, null), 'drawImage')).toBe(0);
  });

  it('fills the cell with copies, up to the most it can show', () => {
    const few = drawn({ phase: 'copying', copies: 10, alarm: 0.5 });
    const lots = drawn({ phase: 'copying', copies: 5000, alarm: 0.9 });
    expect(count(lots, 'fillRect') - count(few, 'fillRect')).toBe(MAX_SHOWN - 10);
  });

  it('draws a burst and a self-destruct, with every copy', () => {
    for (const phase of ['burst', 'died']) {
      const ctx = drawn({ phase, phaseTime: 0.5, copies: 30 });
      expect(count(ctx, 'fillRect')).toBe(30);
      expect(count(ctx, 'drawImage')).toBe(0); // she's gone from the wall
    }
  });
});
