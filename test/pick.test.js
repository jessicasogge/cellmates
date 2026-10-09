// @vitest-environment jsdom
// pick.js: the pick page, with a card for every pal you can play as.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'public/pick.html'), 'utf8');

async function open(html) {
  document.body.innerHTML = html;
  vi.resetModules();
  await import('../public/game/pick.js');
}

describe('the pick page', () => {
  it('has just Flo for now, linking to her game', async () => {
    await open(page.slice(page.indexOf('<body'), page.indexOf('</body>')));
    const cards = [...document.querySelectorAll('.pal-card')];
    expect(cards).toHaveLength(1);
    const [flo] = cards;
    expect(flo.getAttribute('href')).toBe('./flask.html?pal=flo');
    expect(flo.querySelector('h2').textContent).toBe('Flo');
    expect(flo.querySelector('.species').textContent).toBe('Influenza A virus');
    expect(flo.querySelector('.host').textContent).toBe('Gets into airway cells');
    expect(flo.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('explains how to play', () => {
    expect(page).toContain('How to play');
    expect(page.match(/<li>/g)).toHaveLength(3);
  });

  it("doesn't break on a page without cards", async () => {
    await expect(open('')).resolves.toBeUndefined();
  });
});
