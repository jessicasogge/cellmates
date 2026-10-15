// config.js: the numbers the game is built on make sense together.
import { describe, expect, it } from 'vitest';
import { ANTIBODIES, CELLS, FLASK, LEVELS, VIRUSES } from '../public/game/config.js';
import { palById } from '../public/game/pals.js';
import { createGame } from '../public/game/flask.js';

describe('VIRUSES', () => {
  it('are all real pals, with a life cycle and at least four facts', () => {
    for (const [id, virus] of Object.entries(VIRUSES)) {
      expect(palById(id)).toBeTruthy();
      expect(virus.speed).toBeGreaterThan(0);
      expect(virus.copies).toBeGreaterThan(0);
      expect(virus.facts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('LEVELS', () => {
  it('each need more cells than the last, and fewer than the flask has with the receptor', () => {
    const { cells } = createGame(LEVELS[0], VIRUSES.flo);
    LEVELS.forEach((level, i) => {
      if (i > 0) expect(level.target).toBeGreaterThan(LEVELS[i - 1].target);
      expect(level.target).toBeLessThan(cells.length * CELLS.receptors);
    });
  });

  it('start her below the cells, and keep antibody clouds smaller than the flask', () => {
    expect(FLASK.start.y).toBeGreaterThan(FLASK.cells.bottom);
    expect(ANTIBODIES.radius * 2).toBeLessThan(FLASK.width / 2);
  });
});
