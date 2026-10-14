// config.js: the numbers Burst or Wait is built on make sense.
import { describe, expect, it } from 'vitest';
import { HOST, VIRUSES } from '../public/game/config.js';
import { palById } from '../public/game/pals.js';

describe('VIRUSES', () => {
  it('are all real pals, with a life cycle and at least four facts', () => {
    for (const [id, virus] of Object.entries(VIRUSES)) {
      expect(palById(id)).toBeTruthy();
      expect(virus.eclipse).toBeGreaterThan(0);
      expect(virus.perSecond).toBeGreaterThan(0);
      expect(virus.block).toBeGreaterThan(0);
      expect(virus.block).toBeLessThan(1);
      expect(virus.facts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('HOST', () => {
  it('breaks somewhere on the meter, gets tougher, and gives you lives', () => {
    const [low, high] = HOST.breaking;
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeLessThan(high);
    expect(HOST.tougher).toBeGreaterThan(1);
    expect(HOST.lives).toBeGreaterThan(0);
  });
});
