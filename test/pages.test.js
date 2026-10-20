// Checks the things every page shares: the CellMates tab icon, the
// stylesheet link the deploy stamps, visit counting and Jess's signature.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const file = (name) => new URL(`../public/${name}`, import.meta.url);
const PAGES = ['index.html', 'pick-a-mate.html', 'petri-dish.html'];

describe('tab icon', () => {
  it.each(PAGES)('%s links the icon', (page) => {
    expect(readFileSync(file(page), 'utf8')).toContain('<link rel="icon" href="./favicon.svg" type="image/svg+xml" />');
  });

  it('has the icon file', () => {
    expect(existsSync(file('favicon.svg'))).toBe(true);
  });
});

describe('stylesheet', () => {
  // The deploy (.github/workflows/pages.yml) stamps this exact link with a
  // fingerprint of styles.css, so browsers fetch new styles when they change.
  it.each(PAGES)('%s links styles.css the way the deploy expects', (page) => {
    expect(readFileSync(file(page), 'utf8')).toContain('<link rel="stylesheet" href="./styles.css" />');
  });

  it('every page in public/ is listed here, so none misses the stamp', () => {
    const pages = readdirSync(new URL('../public/', import.meta.url)).filter((name) => name.endsWith('.html'));
    expect(pages.sort()).toEqual([...PAGES].sort());
  });
});

describe('visit counting', () => {
  // GoatCounter counts page visits (no cookies, nothing personal), on the
  // same dashboard as PetriPals and FunGals.
  it.each(PAGES)('%s loads the GoatCounter script', (page) => {
    expect(readFileSync(file(page), 'utf8')).toContain('<script data-goatcounter="https://petripals.goatcounter.com/count"\n            async src="https://gc.zgo.at/count.js"></script>');
  });
});

describe('signature', () => {
  it.each(PAGES)('%s is signed at the foot', (page) => {
    expect(readFileSync(file(page), 'utf8')).toContain('<footer class="signature">jsogge 2026</footer>');
  });
});

describe('the home page', () => {
  const html = readFileSync(file('index.html'), 'utf8');
  const css = readFileSync(file('styles.css'), 'utf8');

  it('says what the game is under its name', () => {
    expect(html).toContain('<title>CellMates: A Virology Game</title>');
    expect(html).toContain('<h1 class="logo">CellMates</h1>');
  });

  it('has every font file the stylesheet uses, each with its license', () => {
    const fonts = [...css.matchAll(/url\(\.\/(fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(existsSync(file(font)), font).toBe(true);
    expect(existsSync(file('fonts/Fredoka-OFL.txt'))).toBe(true);
    expect(existsSync(file('fonts/Nunito-OFL.txt'))).toBe(true);
  });
});

describe('search engines', () => {
  const SITE = 'https://jessicasogge.github.io/cellmates/';

  it.each(PAGES)('%s has a description short enough for a search result', (page) => {
    const description = readFileSync(file(page), 'utf8').match(/<meta name="description" content="([^"]*)"/)?.[1];
    expect(description).toBeTruthy();
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it.each(PAGES)('%s says where it lives', (page) => {
    const address = page === 'index.html' ? SITE : SITE + page;
    expect(readFileSync(file(page), 'utf8')).toContain(`<link rel="canonical" href="${address}" />`);
  });
});
