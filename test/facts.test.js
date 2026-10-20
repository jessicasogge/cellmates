// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';
import { hideFact, pickFact, showFact, writeFact } from '../public/game/facts.js';
import { plainText } from '../public/game/italics.js';

describe('every mate\'s facts', () => {
  it.each(Object.keys(SPECIES))('%s has at least 10 short, different facts', (mate) => {
    const { facts } = SPECIES[mate];
    expect(facts.length).toBeGreaterThanOrEqual(10);
    expect(new Set(facts).size).toBe(facts.length);
    const name = mate[0].toUpperCase() + mate.slice(1);
    for (const raw of facts) {
      // Italics markers come in pairs, around at least one word.
      expect(raw.split('*').length % 2, raw).toBe(1);
      expect(raw, raw).not.toMatch(/\*\s*\*/);
      const fact = plainText(raw); // as it reads on screen
      expect(fact.length, fact).toBeLessThanOrEqual(90); // fits the pop-up
      // Says whose fact it is.
      expect(fact, fact).toContain(name);
      expect(fact, fact).toMatch(/^["A-Z0-9].*[.!"]$/); // a full sentence
      // Commas and other punctuation instead of dashes (hyphenated words,
      // like whip-like, are fine).
      expect(fact, fact).not.toMatch(/[\u2013\u2014]|\s-\s|\d-\d/);
    }
  });
});

describe('scientific names of other species', () => {
  it('puts E. coli in italics wherever a fact names it', () => {
    for (const [mate, { facts }] of Object.entries(SPECIES)) {
      for (const fact of facts) {
        if (fact.includes('E. coli')) expect(fact, `${mate}: ${fact}`).toContain('*E. coli*');
      }
    }
  });
});

describe('writeFact', () => {
  it('writes the parts between asterisks in italics, and the rest as plain text', () => {
    const el = document.createElement('span');
    writeFact(el, 'Tia lands on *E. coli* on six long tail fibers.');
    expect(el.textContent).toBe('Tia lands on E. coli on six long tail fibers.');
    expect([...el.querySelectorAll('i')].map((i) => i.textContent)).toEqual(['E. coli']);
  });

  it('copes with italics at the start or end, and with none', () => {
    const el = document.createElement('span');
    writeFact(el, '*E. coli* lives in the gut.');
    expect(el.innerHTML).toBe('<i>E. coli</i> lives in the gut.');
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

  it('shows one of the mate\'s facts', () => {
    showFact('tia', SPECIES.tia);
    expect(line().hidden).toBe(false);
    expect(SPECIES.tia.facts.map(plainText)).toContain(line().querySelector('.fun-fact-text').textContent);
  });

  it('shows the names of other species in italics, without the asterisks', () => {
    const species = { facts: ['Tia infects *E. coli*.'] };
    showFact('tia', species);
    const text = line().querySelector('.fun-fact-text');
    expect(text.querySelector('i').textContent).toBe('E. coli');
    expect(text.textContent).not.toContain('*');
  });

  it('shows a different fact on the next win', () => {
    for (let i = 0; i < 20; i++) {
      showFact('missy', SPECIES.missy);
      const first = line().textContent;
      showFact('missy', SPECIES.missy);
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
      expect(() => showFact('tia', SPECIES.tia)).not.toThrow();
      expect(line().hidden).toBe(false);
      expect(SPECIES.tia.facts.map(plainText)).toContain(line().querySelector('.fun-fact-text').textContent);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('does nothing on a page without the fact line', () => {
    document.body.innerHTML = '';
    expect(() => showFact('tia', SPECIES.tia)).not.toThrow();
    expect(() => hideFact()).not.toThrow();
  });

  it('stays hidden for a mate with no facts, and hides when asked', () => {
    showFact('nobody', {});
    expect(line().hidden).toBe(true);
    showFact('tia', SPECIES.tia);
    hideFact();
    expect(line().hidden).toBe(true);
  });
});
