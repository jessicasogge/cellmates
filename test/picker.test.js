// @vitest-environment jsdom
// picker.js fills in the picker page with a card for every mate. These tests
// load the real page into jsdom, a simulated browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MATES } from '../public/game/mates.js';

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/pick-a-mate.html'), 'utf8');

async function open() {
  document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
  vi.resetModules();
  await import('../public/game/picker.js');
  return [...document.querySelectorAll('.mate-card')];
}

describe('the picker', () => {
  it('has a card for every mate, linking to the dish with her picked', async () => {
    const cards = await open();
    expect(cards.map((card) => card.getAttribute('href')))
      .toEqual(MATES.map((mate) => `./petri-dish.html?mate=${mate.id}`));
  });

  it('shows her picture, name and virus on each card', async () => {
    const [card] = await open();
    expect(card.querySelector('.mate-icon.tia svg')).not.toBeNull();
    expect(card.querySelector('h2').textContent).toBe('Tia');
    expect(card.querySelector('.species').textContent).toBe('Bacteriophage T4');
    expect(card.getAttribute('aria-label')).toBe('Pick Tia');
  });

  it('takes the loading card away once it is filled in', async () => {
    await open();
    expect(document.querySelector('.loading-overlay').hidden).toBe(true);
  });
});
