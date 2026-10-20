// @vitest-environment jsdom
// mates.js draws every mate for the home page, the picker and the dish.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { dishMate, HOME_MATES, homeMate, mateById, MATES, mateTile, polygon } from '../public/game/mates.js';

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
  it('draws every phage smaller than the E. coli cells she infects', () => {
    for (const [mate, { size }] of Object.entries(SPECIES)) {
      expect(size, mate).toBeLessThan(GAME.HOST_SIZE * 0.75);
      // Her copies, smaller still, are big enough to see.
      expect(size * GAME.COPY_SCALE, mate).toBeGreaterThanOrEqual(0.02);
    }
  });

  it('draws T4 bigger than the tiny tailless phages, as she really is', () => {
    expect(SPECIES.tia.size).toBeGreaterThan(SPECIES.phoebe.size);
    expect(SPECIES.tia.size).toBeGreaterThan(SPECIES.missy.size);
  });

  it("makes a plaque bigger than the cell that burst", () => {
    expect(GAME.PLAQUE_RADIUS * 2).toBeGreaterThan(GAME.HOST_SIZE * 2);
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
