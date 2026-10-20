// @vitest-environment jsdom
// hosts.js grows the lawn of E. coli cells, infects them, bursts them and
// grows new ones. It puts cells and plaques on the page, so these tests run
// in jsdom, a simulated browser page.
import { beforeEach, describe, expect, it } from 'vitest';
import { GAME } from '../public/game/config.js';
import { growLawn } from '../public/game/hosts.js';

beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
});

const cells = () => document.querySelectorAll('.agar .host');
const plaques = () => document.querySelectorAll('.agar .plaque');

describe('growing the lawn', () => {
  it('puts the right number of cells on the agar', () => {
    growLawn();
    expect(cells()).toHaveLength(GAME.HOSTS);
    growLawn({ count: 3 });
    expect(cells()).toHaveLength(GAME.HOSTS + 3);
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

  it('never grows a cell in a zone, the antibiotic\'s included', () => {
    const avoid = [{ fx: 0.5, fy: 0, r: 0.085, fullZone: 0.075 }, { fx: -0.5, fy: 0, r: 0.085, zone: 0.07 }];
    for (let i = 0; i < 20; i++) {
      for (const { fx, fy } of growLawn({ avoid }).positions()) {
        for (const a of avoid) {
          expect(Math.hypot(fx - a.fx, fy - a.fy)).toBeGreaterThan(a.r + (a.fullZone ?? a.zone));
        }
      }
    }
  });

  it('crowds cells closer together rather than leaving any out', () => {
    expect(growLawn({ count: 60 }).positions()).toHaveLength(60);
  });

  it('leaves out a cell there is no room for at all', () => {
    // A disk whose zone covers the whole dish.
    const lawn = growLawn({ avoid: [{ fx: 0, fy: 0, r: 0.5, zone: 0.5 }] });
    expect(lawn.positions()).toHaveLength(0);
  });

  it('turns each cell a random way, and hides them from screen readers', () => {
    growLawn({ count: 1 });
    const [cell] = cells();
    expect(cell.style.getPropertyValue('--angle')).toMatch(/^\d+deg$/);
    expect(cell.getAttribute('aria-hidden')).toBe('true');
    expect(cell.style.width).toBe(`${GAME.HOST_SIZE * 100}%`);
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
    expect(lawn.tick(0.5)).toEqual([{ fx: cell.fx, fy: cell.fy }]);
    expect(lawn.positions()).toHaveLength(0);
    expect(cells()).toHaveLength(0);
  });

  it('leaves a plaque where it burst, under everything else', () => {
    const { lawn, cell } = infectedLawn();
    lawn.tick(1);
    expect(lawn.plaques()).toEqual([{ fx: cell.fx, fy: cell.fy }]);
    const [plaque] = plaques();
    expect(plaque).toBe(document.querySelector('.agar').firstElementChild);
    expect(plaque.style.width).toBe(`${GAME.PLAQUE_RADIUS * 100}%`);
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
    lawn.tick(0.1);
    const [grown] = lawn.positions();
    expect(Math.hypot(grown.fx - cell.fx, grown.fy - cell.fy)).toBeGreaterThan(GAME.PLAQUE_RADIUS);
  });

  it('keeps trying to grow a cell back while there is no room for it', () => {
    const avoid = [{ fx: 0.6, fy: 0, r: 0.05, zone: 0 }];
    const lawn = growLawn({ count: 1, avoid });
    const [cell] = lawn.positions();
    lawn.infectNear(cell.fx, cell.fy, 0.01, 0);
    lawn.tick(0);
    // Now the zone fills the dish: nowhere to grow.
    avoid[0] = { fx: 0, fy: 0, r: 0.5, zone: 0.5 };
    lawn.tick(GAME.HOST_RESPAWN_MS / 1000);
    expect(lawn.positions()).toHaveLength(0);
    // Room again: it grows on the next frame.
    avoid[0] = { fx: 0.6, fy: 0, r: 0.05, zone: 0 };
    lawn.tick(0.016);
    expect(lawn.positions()).toHaveLength(1);
  });

  it('stops growing new cells once the game is over, but infected ones still burst', () => {
    const { lawn } = infectedLawn();
    lawn.stop();
    expect(lawn.tick(1)).toHaveLength(1);
    lawn.tick(10);
    expect(lawn.positions()).toHaveLength(0);
  });
});
