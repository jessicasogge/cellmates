// @vitest-environment jsdom
// mates.js: every mate's drawing, and the home page's row of mates.
// These run in jsdom, a simulated browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { HOME_MATES, homeMate, mateArt, mateById, MATES, PLAYABLE_MATES } from '../public/game/mates.js';

describe('the mates', () => {
  it('each have a different id and everything a page needs to draw them', () => {
    expect(new Set(MATES.map((mate) => mate.id)).size).toBe(MATES.length);
    for (const mate of MATES) {
      expect(mate.name).toBe(mate.id[0].toUpperCase() + mate.id.slice(1));
      expect(mate.looks.length).toBeGreaterThan(10);
      expect(mate.motion).toBe('bob');
      expect(mate.art).toContain('<g class="face">');
      expect(mate.species.length).toBeGreaterThan(3);
      expect(mate.host).toMatch(/cells|bacteria/);
    }
  });

  it('you can play as Flo, with fun facts about her', () => {
    expect(PLAYABLE_MATES.map((mate) => mate.id)).toEqual(['flo']);
    for (const mate of PLAYABLE_MATES) {
      expect(mate.facts.length).toBeGreaterThanOrEqual(5);
      expect(new Set(mate.facts).size).toBe(mate.facts.length);
      for (const fact of mate.facts) {
        expect(fact, fact).toContain(mate.name); // says whose fact it is
        expect(fact.length, fact).toBeLessThanOrEqual(90); // fits the pop-up
        expect(fact, fact).toMatch(/^[A-Z].*\.$/); // a full sentence
      }
    }
  });

  it('her plain drawing is hidden from screen readers', () => {
    const svg = mateArt(mateById('flo'));
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')).toBeNull();
  });

  it('can be looked up by id', () => {
    expect(mateById('tess').name).toBe('Tess');
    expect(mateById('nobody')).toBeUndefined();
  });
});

describe('her drawing on the home page', () => {
  const tess = mateById('tess');

  it('is real SVG, not just text', () => {
    const svg = homeMate(tess);
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelector('polygon').namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('animates and says who she is', () => {
    const svg = homeMate(tess);
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 200');
    expect(svg.getAttribute('class')).toBe('mate bob');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(`Tess, ${tess.looks}`);
  });

  it('has Tess\'s six tail fibers', () => {
    const fibers = homeMate(tess).querySelector('path').getAttribute('d');
    expect(fibers.match(/M/g)).toHaveLength(6);
  });
});

describe('Flo', () => {
  const flo = mateById('flo');

  it('is on the home page and says who she is', () => {
    const svg = homeMate(flo);
    expect(svg.getAttribute('class')).toBe('mate bob');
    expect(svg.getAttribute('aria-label')).toBe(`Flo, ${flo.looks}`);
  });

  it('has 16 spikes, teal and gold tips taking turns', () => {
    const rings = [...homeMate(flo).querySelectorAll('circle[stroke-dasharray]')];
    const around = (r) => 2 * Math.PI * r;
    const [stalks, teal, gold] = rings;
    // One dash (a spike) per gap, so the circle's length over the dash
    // pattern's length is how many spikes there are.
    const per = (ring) => ring.getAttribute('stroke-dasharray').split(' ').map(Number).reduce((a, b) => a + b);
    expect(around(66) / per(stalks)).toBeCloseTo(16, 1);
    expect(around(76) / per(teal)).toBeCloseTo(8, 1);
    expect(around(76) / per(gold)).toBeCloseTo(8, 1);
    // The gold tips sit halfway between the teal ones.
    expect(-Number(gold.getAttribute('stroke-dashoffset'))).toBeCloseTo(per(teal) / 2, 1);
    expect([teal.getAttribute('stroke'), gold.getAttribute('stroke')]).toEqual(['#14b8a6', '#f59e0b']);
  });
});

describe('Rota', () => {
  const rota = mateById('rota');
  const ring = (r) => homeMate(rota).querySelector(`circle[r="${r}"][stroke-dasharray]`);
  const count = (r) => {
    const pattern = ring(r).getAttribute('stroke-dasharray').split(' ').map(Number);
    return (2 * Math.PI * r) / (pattern[0] + pattern[1]);
  };

  it('is on the home page and says who she is', () => {
    const svg = homeMate(rota);
    expect(svg.getAttribute('class')).toBe('mate bob');
    expect(svg.getAttribute('aria-label')).toBe(`Rota, ${rota.looks}`);
  });

  it('is a wheel: three layers, with ten spokes and a bumpy rim', () => {
    const layers = [...homeMate(rota).querySelectorAll('circle[cx="100"][fill^="#"]')];
    expect(layers.map((c) => c.getAttribute('r'))).toEqual(['70', '46']); // the spokes ring is the third
    expect(count(58)).toBeCloseTo(10, 1);
    expect(count(72)).toBeCloseTo(34, 0);
  });
});

describe('Cora', () => {
  const cora = mateById('cora');

  it('is on the home page and says who she is', () => {
    const svg = homeMate(cora);
    expect(svg.getAttribute('class')).toBe('mate bob');
    expect(svg.getAttribute('aria-label')).toBe(`Cora, ${cora.looks}`);
  });

  it('has a crown of 14 spikes, each stalk with a club-shaped tip', () => {
    const [stalks, tips] = homeMate(cora).querySelectorAll('circle[stroke-dasharray]');
    const count = (ring) => {
      const [dash, gap] = ring.getAttribute('stroke-dasharray').split(' ').map(Number);
      return (2 * Math.PI * Number(ring.getAttribute('r'))) / (dash + gap);
    };
    expect(count(stalks)).toBeCloseTo(14, 1);
    expect(count(tips)).toBeCloseTo(14, 1);
    expect(tips.getAttribute('stroke-linecap')).toBe('round'); // round club ends
  });
});

describe('the home page', () => {
  // (jsdom changes import.meta.url to a web address, so find files from the project folder.)
  const page = readFileSync(resolve(process.cwd(), 'public/index.html'), 'utf8');

  it('shows Flo, Tess, Rota and Cora in its row of mates', async () => {
    document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
    vi.resetModules();
    await import('../public/script.js');
    const labels = [...document.querySelectorAll('.friends svg')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(HOME_MATES.map((mate) => `${mate.name}, ${mate.looks}`));
    expect(HOME_MATES.map((mate) => mate.id)).toEqual(['flo', 'tess', 'rota', 'cora']);
  });

  it('has a Press Start to Play button that opens the pick page', () => {
    expect(page).toContain('<a class="start-btn" href="./pick.html">Press Start to Play</a>');
  });

  it('loads the script that draws them', () => {
    expect(page).toContain('<script type="module" src="./script.js"></script>');
  });
});
