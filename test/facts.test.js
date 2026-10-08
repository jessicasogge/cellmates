// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hideFact, pickFact, showFact, writeFact } from '../public/game/facts.js';

// Stand-in pals until the real ones (and their facts) are added.
const SPECIES = {
  flo: { facts: ['Flo changes her spikes a little every year.', 'Flo has two kinds of spikes, called HA and NA.', 'Flo can only get into cells with sialic acid.'] },
  tess: { facts: ['Tess has six tail fibers.', 'Tess injects her DNA like a syringe.'] },
};

describe('writeFact', () => {
  it('writes the parts between asterisks in italics, and the rest as plain text', () => {
    const el = document.createElement('span');
    writeFact(el, "Ceres's cousin *Bacillus thuringiensis* is used by farmers.");
    expect(el.textContent).toBe("Ceres's cousin Bacillus thuringiensis is used by farmers.");
    expect([...el.querySelectorAll('i')].map((i) => i.textContent)).toEqual(['Bacillus thuringiensis']);
  });

  it('copes with italics at the start or end, and with none', () => {
    const el = document.createElement('span');
    writeFact(el, '*Bacillus* means little rod.');
    expect(el.innerHTML).toBe('<i>Bacillus</i> means little rod.');
    writeFact(el, 'Plain words.');
    expect(el.innerHTML).toBe('Plain words.');
  });

  it('never reads a fact as HTML', () => {
    const el = document.createElement('span');
    writeFact(el, 'A <b>bold</b> *<img src=x>* fact.');
    expect(el.querySelector('b, img')).toBeNull();
    expect(el.textContent).toBe('A <b>bold</b> <img src=x> fact.');
  });
});

describe('pickFact', () => {
  const facts = ['A.', 'B.', 'C.'];

  it('picks one of the facts', () => {
    expect(facts).toContain(pickFact(facts));
  });

  it('never repeats the last one when there are others', () => {
    for (let i = 0; i < 50; i++) expect(pickFact(facts, 'B.')).not.toBe('B.');
  });

  it('can pick any fact', () => {
    expect(pickFact(facts, null, () => 0)).toBe('A.');
    expect(pickFact(facts, null, () => 0.99)).toBe('C.');
  });

  it('copes with just one fact, or none', () => {
    expect(pickFact(['Only.'], 'Only.')).toBe('Only.');
    expect(pickFact([], null)).toBeNull();
    expect(pickFact(undefined, null)).toBeNull();
  });
});

describe('the pop-up line', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML =
      '<p class="fun-fact" hidden><strong>Did you know?</strong> <span class="fun-fact-text"></span></p>';
  });
  const line = () => document.querySelector('.fun-fact');

  it('shows one of the pal\'s facts', () => {
    showFact('flo', SPECIES.flo);
    expect(line().hidden).toBe(false);
    expect(SPECIES.flo.facts).toContain(line().querySelector('.fun-fact-text').textContent);
  });

  it('shows the names of other bacteria in italics, without the asterisks', () => {
    const species = { facts: ["Ceres is a close cousin of *Bacillus anthracis*, the bacterium that causes anthrax."] };
    showFact('ceres', species);
    const text = line().querySelector('.fun-fact-text');
    expect(text.querySelector('i').textContent).toBe('Bacillus anthracis');
    expect(text.textContent).not.toContain('*');
  });

  it('shows a different fact on the next win', () => {
    for (let i = 0; i < 20; i++) {
      showFact('tess', SPECIES.tess);
      const first = line().textContent;
      showFact('tess', SPECIES.tess);
      expect(line().textContent).not.toBe(first);
    }
  });

  it('still shows a fact when the browser blocks storage (like some private windows)', () => {
    const blocked = () => {
      throw new Error('storage is blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    try {
      expect(() => showFact('flo', SPECIES.flo)).not.toThrow();
      expect(line().hidden).toBe(false);
      expect(SPECIES.flo.facts).toContain(line().querySelector('.fun-fact-text').textContent);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('does nothing on a page without the fact line', () => {
    document.body.innerHTML = '';
    expect(() => showFact('flo', SPECIES.flo)).not.toThrow();
    expect(() => hideFact()).not.toThrow();
  });

  it('stays hidden for a pal with no facts, and hides on a game over', () => {
    showFact('nobody', {});
    expect(line().hidden).toBe(true);
    showFact('flo', SPECIES.flo);
    hideFact();
    expect(line().hidden).toBe(true);
  });
});
