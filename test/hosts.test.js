// @vitest-environment jsdom
// hosts.js grows the lawn of host cells, infects them, bursts them and
// grows new ones. It puts cells and plaques on the page, so these tests run
// in jsdom, a simulated browser page.
import { beforeEach, describe, expect, it } from 'vitest';
import { GAME, HOSTS } from '../public/game/config.js';
import { growLawn } from '../public/game/hosts.js';

beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
});

const cells = () => document.querySelectorAll('.agar .host');
const plaques = () => document.querySelectorAll('.agar .plaque');

describe('growing the lawn', () => {
  it('puts the right number of cells on the agar', () => {
    growLawn();
    expect(cells()).toHaveLength(HOSTS.ecoli.count);
    growLawn({ count: 3 });
    expect(cells()).toHaveLength(HOSTS.ecoli.count + 3);
  });

  it('keeps the first cells off the middle, where she starts, and off the rim', () => {
    for (let i = 0; i < 20; i++) {
      for (const { fx, fy } of growLawn().positions()) {
        const distance = Math.hypot(fx, fy);
        expect(distance).toBeGreaterThan(0.3 - 1e-9);
        expect(distance).toBeLessThanOrEqual(0.82);
      }
    }
  });

  it('crowds cells closer together rather than leaving any out', () => {
    expect(growLawn({ count: 60 }).positions()).toHaveLength(60);
  });

  it('turns each cell a random way, and hides them from screen readers', () => {
    growLawn({ count: 1 });
    const [cell] = cells();
    expect(cell.style.getPropertyValue('--angle')).toMatch(/^\d+deg$/);
    expect(cell.getAttribute('aria-hidden')).toBe('true');
    expect(cell.style.width).toBe(`${HOSTS.ecoli.size * 100}%`);
  });

  it("draws each cell like Colette's offspring in PetriPals: a green rod with waving flagella and no face", () => {
    growLawn({ count: 1 });
    const svg = cells()[0].querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('4 4 192 192');
    expect(svg.querySelector('rect').getAttribute('fill')).toBe('#abee64');
    expect(svg.querySelectorAll('path animate')).toHaveLength(8);
    expect(svg.querySelector('.face')).toBeNull();
  });

  it('keeps the flagella still for anyone who asked for less motion', () => {
    window.matchMedia = (query) => ({ matches: query === '(prefers-reduced-motion: reduce)' });
    try {
      growLawn({ count: 1 });
      expect(cells()[0].querySelectorAll('animate')).toHaveLength(0);
    } finally {
      delete window.matchMedia;
    }
  });
});

describe('infecting', () => {
  it('infects every healthy cell she touches, and only those', () => {
    const lawn = growLawn({ count: 4 });
    const [first] = lawn.positions();
    expect(lawn.infectNear(first.fx, first.fy, 0.01, 1000)).toBeGreaterThanOrEqual(1);
    const infected = lawn.positions().filter((cell) => cell.infected);
    expect(infected.length).toBeGreaterThanOrEqual(1);
    expect(infected).toContainEqual({ ...first, infected: true });
    // Far from every cell: nothing.
    expect(lawn.infectNear(5, 5, 0.01, 1000)).toBe(0);
  });

  it("doesn't infect a cell twice", () => {
    const lawn = growLawn({ count: 1 });
    const [cell] = lawn.positions();
    expect(lawn.infectNear(cell.fx, cell.fy, 0.01, 1000)).toBe(1);
    expect(lawn.infectNear(cell.fx, cell.fy, 0.01, 1000)).toBe(0);
  });

  it('marks it infected on the page, swelling for as long as it takes to burst', () => {
    const lawn = growLawn({ count: 1 });
    const [cell] = lawn.positions();
    lawn.infectNear(cell.fx, cell.fy, 0.01, 1200);
    const [el] = cells();
    expect(el.classList).toContain('infected');
    expect(el.style.getPropertyValue('--latent')).toBe('1200ms');
  });
});

describe('HeLa cells, for Polly', () => {
  const hela = () => growLawn({ kind: HOSTS.hela });

  it('grows HeLa cells instead: their own number, size and drawing', () => {
    hela();
    expect(cells()).toHaveLength(HOSTS.hela.count);
    const [cell] = cells();
    expect(cell.classList).toContain('hela');
    expect(cell.style.width).toBe(`${HOSTS.hela.size * 100}%`);
    // A flat cell with a nucleus, and no flagella to wave.
    expect(cell.querySelectorAll('circle').length).toBeGreaterThan(2);
    expect(cell.querySelector('animate')).toBeNull();
  });

  it("stay put, since they're stuck to the dish", () => {
    const lawn = hela();
    const before = lawn.positions();
    const angle = cells()[0].style.getPropertyValue('--angle');
    lawn.tick(5);
    expect(lawn.positions()).toEqual(before);
    expect(cells()[0].style.getPropertyValue('--angle')).toBe(angle);
  });

  it('leave a bigger plaque, since the cells are bigger', () => {
    const lawn = hela();
    const [cell] = lawn.positions();
    lawn.infectNear(cell.fx, cell.fy, 0.01, 0);
    lawn.tick(0);
    expect(plaques()[0].style.width).toBe(`${HOSTS.hela.plaque * 100}%`);
  });

  it('count as touched from farther away, since they\'re wider', () => {
    const lawn = hela();
    const [cell] = lawn.positions();
    const near = HOSTS.hela.radius - 0.01;
    expect(lawn.infectOne(cell.fx + near, cell.fy, 0, 1000)).not.toBeNull();
  });
});

describe('gliding', () => {
  it('moves healthy cells very slowly, pointing the way they go', () => {
    const lawn = growLawn({ count: 1 });
    const [before] = lawn.positions();
    lawn.tick(1);
    const [after] = lawn.positions();
    const moved = Math.hypot(after.fx - before.fx, after.fy - before.fy);
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual(HOSTS.ecoli.speed + 1e-9);
    expect(cells()[0].style.left).toBe(`${50 + after.fx * 50}%`);
  });

  it("stops a cell once it's infected, so she stays inside it", () => {
    const lawn = growLawn({ count: 1 });
    const [cell] = lawn.positions();
    lawn.infectNear(cell.fx, cell.fy, 0.01, 5000);
    lawn.tick(1);
    expect(lawn.positions()[0]).toMatchObject({ fx: cell.fx, fy: cell.fy });
  });

  it('keeps cells inside the dish, turning them back at the edge', () => {
    const lawn = growLawn({ count: 3 });
    for (let i = 0; i < 2000; i++) lawn.tick(0.05);
    for (const { fx, fy } of lawn.positions()) expect(Math.hypot(fx, fy)).toBeLessThanOrEqual(GAME.HOST_EDGE + 1e-9);
  });
});

describe('going into one cell', () => {
  it('infects just the nearest healthy cell she touches, and says which', () => {
    const lawn = growLawn({ count: 2 });
    const [a, b] = lawn.positions();
    // Touching both, a little nearer to the first.
    const reach = Math.hypot(a.fx - b.fx, a.fy - b.fy);
    const x = a.fx + (b.fx - a.fx) * 0.4;
    const y = a.fy + (b.fy - a.fy) * 0.4;
    const cell = lawn.infectOne(x, y, reach, 1000);
    expect(cell).toEqual({ id: expect.any(Number), fx: a.fx, fy: a.fy });
    expect(lawn.positions().map((p) => p.infected)).toEqual([true, false]);
  });

  it('gives back null when she touches no healthy cell', () => {
    const lawn = growLawn({ count: 1 });
    expect(lawn.infectOne(5, 5, 0.01, 1000)).toBeNull();
    const [cell] = lawn.positions();
    lawn.infectOne(cell.fx, cell.fy, 0.01, 1000);
    expect(lawn.infectOne(cell.fx, cell.fy, 0.01, 1000)).toBeNull();
  });

  it('bursts that same cell when its time is up', () => {
    const lawn = growLawn({ count: 3 });
    const [cell] = lawn.positions();
    const { id } = lawn.infectOne(cell.fx, cell.fy, 0.01, 500);
    expect(lawn.tick(0.5).map((b) => b.id)).toEqual([id]);
  });
});

describe('bursting', () => {
  function infectedLawn(latentMs = 1000) {
    const lawn = growLawn({ count: 1 });
    const [cell] = lawn.positions();
    lawn.infectNear(cell.fx, cell.fy, 0.01, latentMs);
    return { lawn, cell };
  }

  it('bursts once her latent period is up, not before', () => {
    const { lawn, cell } = infectedLawn(1000);
    expect(lawn.tick(0.5)).toEqual([]);
    expect(lawn.tick(0.5)).toEqual([{ id: expect.any(Number), fx: cell.fx, fy: cell.fy }]);
    expect(lawn.positions()).toHaveLength(0);
    expect(cells()).toHaveLength(0);
  });

  it('leaves a plaque where it burst, under everything else', () => {
    const { lawn, cell } = infectedLawn();
    lawn.tick(1);
    expect(lawn.plaques()).toEqual([{ fx: cell.fx, fy: cell.fy }]);
    const [plaque] = plaques();
    expect(plaque).toBe(document.querySelector('.agar').firstElementChild);
    expect(plaque.style.width).toBe(`${HOSTS.ecoli.plaque * 100}%`);
    // Round-ish, with a slightly uneven edge of its own.
    const corners = plaque.style.borderRadius.match(/\d+%/g).map(parseFloat);
    expect(corners).toHaveLength(8);
    for (const corner of corners) {
      expect(corner).toBeGreaterThanOrEqual(44);
      expect(corner).toBeLessThan(56);
    }
  });

  it("doesn't burst healthy cells", () => {
    const lawn = growLawn({ count: 3 });
    expect(lawn.tick(60)).toEqual([]);
    expect(lawn.positions()).toHaveLength(3);
  });

  it('grows a new cell a moment later, away from the plaque', () => {
    const { lawn, cell } = infectedLawn();
    lawn.tick(1);
    lawn.tick(GAME.HOST_RESPAWN_MS / 1000 - 0.1);
    expect(lawn.positions()).toHaveLength(0);
    lawn.tick(0.11);
    const [grown] = lawn.positions();
    expect(Math.hypot(grown.fx - cell.fx, grown.fy - cell.fy)).toBeGreaterThan(HOSTS.ecoli.plaque);
  });

  it('stops growing new cells once the game is over, but infected ones still burst', () => {
    const { lawn } = infectedLawn();
    lawn.stop();
    expect(lawn.tick(1)).toHaveLength(1);
    lawn.tick(10);
    expect(lawn.positions()).toHaveLength(0);
  });
});
