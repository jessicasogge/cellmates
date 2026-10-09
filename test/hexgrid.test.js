// hexgrid.js: the flask's sheet of hexagonal cells.
import { describe, expect, it } from 'vitest';
import { cellAt, hexGrid, hexPoints } from '../public/game/hexgrid.js';

const SIZE = 20;
const TALL = Math.sqrt(3) * SIZE;

describe('hexGrid', () => {
  const cells = hexGrid(340, 500, SIZE);

  it('fills the box with whole cells, in columns', () => {
    expect(cells).toHaveLength(149); // 11 columns of 14 and 13
    for (const cell of cells) {
      expect(cell.x - SIZE).toBeGreaterThanOrEqual(0);
      expect(cell.x + SIZE).toBeLessThanOrEqual(340);
      expect(cell.y - TALL / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(cell.y + TALL / 2).toBeLessThanOrEqual(500);
    }
    expect(cells.map((c) => c.id)).toEqual(cells.map((_, i) => i));
  });

  it('gives a cell in the middle six neighbors, each one cell away', () => {
    const middle = cellAt(cells, 170, 250, SIZE);
    expect(middle.neighbors).toHaveLength(6);
    for (const id of middle.neighbors) {
      const other = cells[id];
      expect(Math.hypot(other.x - middle.x, other.y - middle.y)).toBeCloseTo(TALL);
    }
  });

  it('gives a corner cell fewer neighbors, and neighbors go both ways', () => {
    expect(cells[0].neighbors.length).toBeLessThan(6);
    for (const cell of cells) {
      for (const id of cell.neighbors) expect(cells[id].neighbors).toContain(cell.id);
    }
  });
});

describe('hexPoints', () => {
  it('lists six corners, flat side up', () => {
    const points = hexPoints(100, 50, 10).split(' ');
    expect(points).toHaveLength(6);
    expect(points[0]).toBe('110.00,50.00'); // the right-hand corner
    expect(points[3]).toBe('90.00,50.00');
  });
});

describe('cellAt', () => {
  const cells = hexGrid(340, 500, SIZE);

  it('finds the cell under a point', () => {
    const cell = cells[20];
    expect(cellAt(cells, cell.x + 3, cell.y - 4, SIZE)).toBe(cell);
  });

  it('finds nothing off the edge of the sheet', () => {
    expect(cellAt(cells, -50, -50, SIZE)).toBeNull();
    expect(cellAt([], 0, 0, SIZE)).toBeNull();
  });
});
