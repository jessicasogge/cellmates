// hex.js: the flask's grid of hexagonal cells.
import { describe, expect, it } from 'vitest';
import { buildGrid, hexAt, hexCenter, hexCorners, hexKey, hexRound, SQRT3 } from '../public/game/hex.js';

const origin = { x: 50, y: 40 };

describe('hexCenter and hexAt', () => {
  it('put cell (0, 0) at the origin', () => {
    expect(hexCenter(0, 0, 20, origin)).toEqual(origin);
  });

  it('find the cell back from its middle, and from near its edge', () => {
    for (const [q, r] of [[0, 0], [3, 1], [-2, 5], [4, -1]]) {
      const { x, y } = hexCenter(q, r, 20, origin);
      expect(hexAt(x, y, 20, origin)).toEqual({ q, r });
      expect(hexAt(x + 8, y - 8, 20, origin)).toEqual({ q, r });
    }
  });

  it('puts neighbors one cell-width apart', () => {
    const a = hexCenter(0, 0, 20, origin);
    const b = hexCenter(1, 0, 20, origin);
    const c = hexCenter(0, 1, 20, origin);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(20 * SQRT3);
    expect(Math.hypot(c.x - a.x, c.y - a.y)).toBeCloseTo(20 * SQRT3);
  });
});

describe('hexRound', () => {
  it('rounds to the nearest cell, fixing whichever coordinate was furthest off', () => {
    expect(hexRound(0.1, -0.1)).toEqual({ q: 0, r: 0 });
    expect(hexRound(0.6, 0.3)).toEqual({ q: 1, r: 0 }); // q furthest off
    expect(hexRound(0.3, 0.6)).toEqual({ q: 0, r: 1 }); // r furthest off
    expect(hexRound(0.45, 0.45)).toEqual({ q: 0, r: 1 }); // s furthest off
  });

  it('never gives -0', () => {
    const { q, r } = hexRound(-0.2, -0.1);
    expect(Object.is(q, 0) && Object.is(r, 0)).toBe(true);
  });
});

describe('buildGrid', () => {
  const area = { left: 10, top: 10, right: 210, bottom: 160 };
  const { cells, origin: o } = buildGrid(area, 20);

  it('fills the area with whole cells only', () => {
    expect(cells.length).toBeGreaterThan(10);
    const half = (20 * SQRT3) / 2;
    for (const cell of cells) {
      expect(cell.x - half).toBeGreaterThanOrEqual(area.left - 1e-9);
      expect(cell.x + half).toBeLessThanOrEqual(area.right + 1e-9);
      expect(cell.y - 20).toBeGreaterThanOrEqual(area.top - 1e-9);
      expect(cell.y + 20).toBeLessThanOrEqual(area.bottom + 1e-9);
    }
  });

  it('gives every cell its own axial coordinates, matching its middle', () => {
    expect(new Set(cells.map((c) => hexKey(c.q, c.r))).size).toBe(cells.length);
    for (const cell of cells) {
      const middle = hexCenter(cell.q, cell.r, 20, o);
      expect(middle.x).toBeCloseTo(cell.x);
      expect(middle.y).toBeCloseTo(cell.y);
    }
  });
});

describe('hexCorners', () => {
  it('gives six corners, all `size` from the middle', () => {
    const corners = hexCorners(5, 5, 10);
    expect(corners).toHaveLength(6);
    for (const [x, y] of corners) expect(Math.hypot(x - 5, y - 5)).toBeCloseTo(10);
  });
});
