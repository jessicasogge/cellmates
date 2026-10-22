// @vitest-environment jsdom
// mates.js draws every mate for the home page, the picker and the dish.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME, HOSTS, SPECIES } from '../public/game/config.js';
import { dishMate, HOME_MATES, homeMate, mateById, MATES, mateTile, polygon, star } from '../public/game/mates.js';

describe('every mate', () => {
  it('matches a species in config.js, and the other way round', () => {
    expect(MATES.map((mate) => mate.id).sort()).toEqual(Object.keys(SPECIES).sort());
  });

  it.each(MATES.map((mate) => [mate.id, mate]))('%s has a name, a description, a face and a frame for every page', (_, mate) => {
    expect(mate.name).toMatch(/^[A-Z][a-z]+$/);
    expect(mate.looks.length).toBeGreaterThan(10);
    expect(mate.art).toContain('<g class="face">');
    for (const page of ['home', 'picker', 'dish']) expect(mate.frames[page]).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
  });

  it.each(MATES.map((mate) => mate.id))('%s has a tile color and an idle animation in styles.css', (id) => {
    const css = readFileSync(resolve(process.cwd(), 'public/styles.css'), 'utf8');
    expect(css).toMatch(new RegExp(`\\n\\.${id} \\{\\n  background:`));
    expect(css).toContain(`.${mateById(id).motion} {`);
  });

  it('shows up once on the home page', () => {
    expect(HOME_MATES.map((mate) => mate.id).sort()).toEqual(MATES.map((mate) => mate.id).sort());
  });
});

describe('sizes', () => {
  it('draws every mate smaller than the cells she infects', () => {
    for (const [mate, { size, host }] of Object.entries(SPECIES)) {
      const cell = HOSTS[host];
      expect(cell, mate).toBeDefined();
      expect(size, mate).toBeLessThan(cell.size * cell.body * 0.75);
      // Her copies, smaller still, are big enough to see.
      expect(size * GAME.COPY_SCALE, mate).toBeGreaterThanOrEqual(0.02);
    }
  });

  it('draws T4 bigger than the tiny tailless phages, as she really is', () => {
    expect(SPECIES.tia.size).toBeGreaterThan(SPECIES.phoebe.size);
    expect(SPECIES.tia.size).toBeGreaterThan(SPECIES.missy.size);
  });

  it.each(Object.values(HOSTS).map((kind) => [kind.id, kind]))('makes a plaque bigger than the %s cell that burst', (_, kind) => {
    // Both in dish radii: a plaque's width, and a cell's length.
    expect(kind.plaque * 2).toBeGreaterThan(kind.size * kind.body * 2);
  });
});

describe('the drawings', () => {
  const tia = mateById('tia');

  it('frames the home drawing for the home page, named for screen readers', () => {
    const svg = homeMate(tia);
    expect(svg.getAttribute('viewBox')).toBe(tia.frames.home);
    expect(svg.getAttribute('class')).toBe('mate bob');
    expect(svg.getAttribute('aria-label')).toBe(`Tia, ${tia.looks}`);
  });

  it('puts the picker drawing on a tile in her color, hidden from screen readers', () => {
    const tile = mateTile(tia);
    expect(tile.className).toBe('mate-icon tia');
    expect(tile.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the dish drawing hidden until the game picks her', () => {
    const svg = dishMate(tia);
    expect(svg.hasAttribute('hidden')).toBe(true);
    expect(svg.dataset.mate).toBe('tia');
    expect(svg.dataset.name).toBe('Tia');
  });

  it('finds no one for an unknown id', () => {
    expect(mateById('nobody')).toBeUndefined();
  });
});

describe('polygon', () => {
  it('puts the corners evenly around the center', () => {
    expect(polygon(0, 0, 10, 4)).toBe('10.0,0.0 0.0,10.0 -10.0,0.0 -0.0,-10.0');
    expect(polygon(0, 0, 10, 4, 90).split(' ')[0]).toBe('0.0,10.0');
  });
});

describe('star', () => {
  it('makes ten corners, alternating points and inner corners, with the top point straight up', () => {
    const corners = star(0, 0, 10).split(' ').map((p) => p.split(',').map(Number));
    expect(corners).toHaveLength(10);
    expect(corners[0]).toEqual([0, -10]);
    // Corners are written to one decimal place, so allow a little rounding.
    expect(Math.abs(Math.hypot(...corners[1]) - 4.5)).toBeLessThan(0.1);
  });
});
