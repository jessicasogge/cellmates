// @vitest-environment jsdom
// script.js runs the home page: the row of mates and the "Press Start to
// Play" button. These tests load the real home page into jsdom, a simulated
// browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MATES } from '../public/game/mates.js';

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const html = (name) => {
  const page = readFileSync(resolve(process.cwd(), 'public', name), 'utf8');
  return page.slice(page.indexOf('<body'), page.indexOf('</body>'));
};

let location;

// Open `page` and run script.js on it.
async function open(page = 'index.html') {
  location = { href: `http://localhost/${page}` };
  vi.stubGlobal('location', location);
  document.body.outerHTML = html(page);
  vi.resetModules();
  await import('../public/script.js');
  return document.querySelector('.start-btn');
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the row of mates', () => {
  it('draws every mate, each named for screen readers', async () => {
    await open();
    const drawn = [...document.querySelectorAll('.friends svg')];
    expect(drawn).toHaveLength(MATES.length);
    for (const svg of drawn) expect(svg.getAttribute('aria-label')).toMatch(/^[A-Z][a-z]+, /);
  });
});

describe('the start button', () => {
  it('says "Press Start to Play" when the page opens', async () => {
    const button = await open();
    expect(button.textContent).toBe('Press Start to Play');
    expect(button.disabled).toBe(false);
  });

  it("shows it heard the click right away, and can't be pressed twice", async () => {
    vi.useFakeTimers();
    const button = await open();
    button.click();
    expect(button.textContent).toBe('Opening picker...');
    expect(button.disabled).toBe(true);
  });

  it('opens the picker a moment after the click', async () => {
    vi.useFakeTimers();
    const button = await open();
    button.click();
    vi.advanceTimersByTime(249);
    expect(location.href).toBe('http://localhost/index.html'); // not yet
    vi.advanceTimersByTime(1);
    expect(location.href).toBe('./pick-a-mate.html');
  });

  it('puts the button back the way it started when you come back with Back', async () => {
    vi.useFakeTimers();
    const button = await open();
    button.click();
    vi.advanceTimersByTime(250);
    window.dispatchEvent(new Event('pageshow'));
    expect(button.textContent).toBe('Press Start to Play');
    expect(button.disabled).toBe(false);
  });
});

describe('pages without a start button or a row of mates', () => {
  it("doesn't break the picker if it's loaded there", async () => {
    await expect(open('pick-a-mate.html')).resolves.toBeNull();
  });
});
