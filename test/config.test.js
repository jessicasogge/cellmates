// config.js: the numbers Plaque is built on make sense.
import { describe, expect, it } from 'vitest';
import { DISH, LAWN, VIRUSES } from '../public/game/config.js';
import { palById } from '../public/game/pals.js';

describe('VIRUSES', () => {
  it('are all real pals, with a life cycle and at least four facts', () => {
    for (const [id, virus] of Object.entries(VIRUSES)) {
      expect(palById(id)).toBeTruthy();
      expect(virus.eclipse).toBeGreaterThan(0);
      expect(virus.perSecond).toBeGreaterThan(0);
      // A full cell can infect all six neighbors.
      expect(virus.full / virus.perNeighbor).toBeGreaterThanOrEqual(6);
      expect(virus.facts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('LAWN', () => {
  it('self-destructs some time after the eclipse, with a reachable goal', () => {
    const [low, high] = LAWN.selfDestruct;
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(LAWN.target).toBeGreaterThan(0);
    expect(LAWN.target).toBeLessThan(1);
  });
});

describe('DISH', () => {
  it('fits the lawn inside the dish', () => {
    expect(DISH.radius).toBeLessThan(DISH.size / 2);
  });
});
