// config.js: the levels and viruses make sense together.
import { describe, expect, it } from 'vitest';
import { FLASK, LEVELS, VIRUSES } from '../public/game/config.js';
import { palById } from '../public/game/pals.js';
import { createGame } from '../public/game/infect.js';

describe('VIRUSES', () => {
  it('are all real pals, with a life cycle and at least four facts', () => {
    for (const [id, virus] of Object.entries(VIRUSES)) {
      expect(palById(id)).toBeTruthy();
      expect(virus.burst).toBeGreaterThan(1);
      expect(virus.copyTime).toBeGreaterThan(0);
      expect(virus.lifetime).toBeGreaterThan(0);
      expect(virus.facts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('LEVELS', () => {
  it('each need more cells for each star, never more than you could get into', () => {
    for (const level of LEVELS) {
      const { cells } = createGame(level, VIRUSES.flo);
      const matching = cells.filter((c) => c.receptor).length / cells.length;
      const [one, two, three] = level.stars;
      expect(one).toBeGreaterThan(0);
      expect(two).toBeGreaterThan(one);
      expect(three).toBeGreaterThan(two);
      expect(three).toBeLessThanOrEqual(matching);
      expect(level.flicks).toBeGreaterThan(0);
    }
  });

  it('keep antibodies inside the flask and away from the neck', () => {
    for (const level of LEVELS) {
      for (const a of level.antibodies) {
        expect(a.x - a.r).toBeGreaterThan(0);
        expect(a.x + a.r).toBeLessThan(FLASK.width);
        expect(a.y + a.r).toBeLessThan(FLASK.cells.bottom);
      }
    }
  });
});
