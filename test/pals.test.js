// @vitest-environment jsdom
// pals.js: every pal's drawing, and the home page's row of pals.
// These run in jsdom, a simulated browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { HOME_PALS, homePal, palById, PALS } from '../public/game/pals.js';

describe('the pals', () => {
  it('each have a different id and everything a page needs to draw them', () => {
    expect(new Set(PALS.map((pal) => pal.id)).size).toBe(PALS.length);
    for (const pal of PALS) {
      expect(pal.name).toBe(pal.id[0].toUpperCase() + pal.id.slice(1));
      expect(pal.looks.length).toBeGreaterThan(10);
      expect(pal.motion).toBe('bob');
      expect(pal.art).toContain('<g class="face">');
    }
  });

  it('can be looked up by id', () => {
    expect(palById('tess').name).toBe('Tess');
    expect(palById('nobody')).toBeUndefined();
  });
});

describe('her drawing on the home page', () => {
  const tess = palById('tess');

  it('is real SVG, not just text', () => {
    const svg = homePal(tess);
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelector('polygon').namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('animates and says who she is', () => {
    const svg = homePal(tess);
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 200');
    expect(svg.getAttribute('class')).toBe('pal bob');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(`Tess, ${tess.looks}`);
  });

  it('has Tess\'s six tail fibers', () => {
    const fibers = homePal(tess).querySelector('path').getAttribute('d');
    expect(fibers.match(/M/g)).toHaveLength(6);
  });
});

describe('Flo', () => {
  const flo = palById('flo');

  it('is on the home page and says who she is', () => {
    const svg = homePal(flo);
    expect(svg.getAttribute('class')).toBe('pal bob');
    expect(svg.getAttribute('aria-label')).toBe(`Flo, ${flo.looks}`);
  });

  it('has 16 spikes, teal and gold tips taking turns', () => {
    const rings = [...homePal(flo).querySelectorAll('circle[stroke-dasharray]')];
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
  const rota = palById('rota');
  const ring = (r) => homePal(rota).querySelector(`circle[r="${r}"][stroke-dasharray]`);
  const count = (r) => {
    const pattern = ring(r).getAttribute('stroke-dasharray').split(' ').map(Number);
    return (2 * Math.PI * r) / (pattern[0] + pattern[1]);
  };

  it('is on the home page and says who she is', () => {
    const svg = homePal(rota);
    expect(svg.getAttribute('class')).toBe('pal bob');
    expect(svg.getAttribute('aria-label')).toBe(`Rota, ${rota.looks}`);
  });

  it('is a wheel: three layers, with ten spokes and a bumpy rim', () => {
    const layers = [...homePal(rota).querySelectorAll('circle[cx="100"][fill^="#"]')];
    expect(layers.map((c) => c.getAttribute('r'))).toEqual(['70', '46']); // the spokes ring is the third
    expect(count(58)).toBeCloseTo(10, 1);
    expect(count(72)).toBeCloseTo(34, 0);
  });
});

describe('the home page', () => {
  // (jsdom changes import.meta.url to a web address, so find files from the project folder.)
  const page = readFileSync(resolve(process.cwd(), 'public/index.html'), 'utf8');

  it('shows Tess, Flo and Rota in its row of pals', async () => {
    document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
    vi.resetModules();
    await import('../public/script.js');
    const labels = [...document.querySelectorAll('.friends svg')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(HOME_PALS.map((pal) => `${pal.name}, ${pal.looks}`));
    expect(HOME_PALS.map((pal) => pal.id)).toEqual(['tess', 'flo', 'rota']);
  });

  it('loads the script that draws them', () => {
    expect(page).toContain('<script type="module" src="./script.js"></script>');
  });
});
