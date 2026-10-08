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

describe('the home page', () => {
  // (jsdom changes import.meta.url to a web address, so find files from the project folder.)
  const page = readFileSync(resolve(process.cwd(), 'public/index.html'), 'utf8');

  it('shows Tess in its row of pals', async () => {
    document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
    vi.resetModules();
    await import('../public/script.js');
    const labels = [...document.querySelectorAll('.friends svg')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(HOME_PALS.map((pal) => `${pal.name}, ${pal.looks}`));
    expect(HOME_PALS.map((pal) => pal.id)).toEqual(['tess']);
  });

  it('loads the script that draws them', () => {
    expect(page).toContain('<script type="module" src="./script.js"></script>');
  });
});
