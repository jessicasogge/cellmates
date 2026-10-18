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
      expect(virus.copies).toBeGreaterThan(1); // so her trail grows
      expect(virus.burstTime).toBeGreaterThan(0);
      expect(virus.maxTrail).toBeGreaterThan(virus.copies);
      expect(virus.facts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('LEVELS', () => {
  it('each add antibody clouds, bigger ones, and need a bigger share of the flask', () => {
    LEVELS.forEach((level, i) => {
      expect(level.share).toBeGreaterThan(0);
      expect(level.share).toBeLessThanOrEqual(1);
      if (i === 0) return;
      expect(level.antibodies).toBeGreaterThan(LEVELS[i - 1].antibodies);
      expect(level.size).toBeGreaterThan(LEVELS[i - 1].size);
      expect(level.share).toBeGreaterThan(LEVELS[i - 1].share);
    });
  });

  it('always give her cells to take, even on the hardest level', () => {
    for (let i = 0; i < 20; i++) expect(createGame(LEVELS.at(-1), VIRUSES.flo).target).toBeGreaterThan(10);
  });

  it('start her below the cells, and keep antibody clouds smaller than the flask', () => {
    expect(FLASK.start.y).toBeGreaterThan(FLASK.cells.bottom);
    for (const level of LEVELS) {
      expect(ANTIBODIES.start).toBeLessThan(level.size);
      expect(level.size * 2).toBeLessThan(FLASK.width);
    }
  });
});

describe('CELLS', () => {
  it('give a minority of cells her receptor, so they’re worth steering for', () => {
    expect(CELLS.receptors).toBeGreaterThan(0.2);
    expect(CELLS.receptors).toBeLessThan(0.5);
  });
});
