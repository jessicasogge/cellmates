// @vitest-environment jsdom
// play.js: the Plaque page. Loads the real plaque.html into jsdom, with a
// stand-in canvas, and runs the game frame by frame by hand.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeContext } from './fake-canvas.js';

vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));

const html = readFileSync(resolve(import.meta.dirname, '../public/plaque.html'), 'utf8');
document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];

const ctx = fakeContext();
HTMLCanvasElement.prototype.getContext = () => ctx;
const frames = [];
vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));

const { sporeBurst } = await import('../public/game/spores.js');
const { DISH, LAWN, VIRUSES } = await import('../public/game/config.js');
const { running, clearedText, resultText, tappedCell } = await import('../public/game/play.js');
const { createDish } = await import('../public/game/lawn.js');

const $ = (selector) => document.querySelector(selector);
const canvas = $('#dish');
// The canvas is DISH.size px square at the top left, so a tap's px are
// dish units.
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: DISH.size, height: DISH.size });
let clock = 0;

// Run `n` frames of `ms` each.
function frame(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    frames.shift()(clock);
  }
}

function until(check, limit = 1000) {
  for (let i = 0; i < limit && !check(); i++) frame();
}

function tap(x, y) {
  canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
}

function key(name, target = document.body) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

// Restart, and run until the first cell has copies to burst.
function ready() {
  running.restart();
  until(() => running.dish.landed);
  running.dish.first.lasts = 99; // so it can't self-destruct while we wait
  until(() => running.dish.first.copies >= VIRUSES.tess.full);
  return running.dish.first;
}

// End the dish with `share` of the lawn cleared.
function endWith(share) {
  const { dish } = running;
  until(() => dish.landed);
  dish.cells.forEach((c, i) => { c.state = i < Math.round(share * dish.cells.length) ? 'plaque' : 'healthy'; });
  frame();
}

describe('clearedText and resultText', () => {
  const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
  const clear = (share) => dish.cells.forEach((c, i) => { c.state = i < Math.round(share * dish.cells.length) ? 'plaque' : 'healthy'; });

  it('says how much is cleared, and the goal', () => {
    clear(0);
    expect(clearedText(dish)).toBe(`Cleared 0% of the lawn · goal ${LAWN.target * 100}%`);
  });

  it('cheers a win, a near miss and a miss', () => {
    clear(1);
    expect(resultText(dish)).toEqual({ title: 'You won!', message: 'Tess’s plaque cleared 100% of the lawn.' });
    clear(LAWN.target * 0.9);
    expect(resultText(dish).title).toBe('So close!');
    clear(0.05);
    expect(resultText(dish).title).toBe('The plaque stopped growing');
    expect(resultText(dish).message).toContain('before they turn red');
  });
});

describe('tappedCell', () => {
  const dish = createDish(VIRUSES.tess, LAWN, () => 0.5);
  const cell = dish.first;
  Object.assign(cell, { state: 'infected', copies: 50 });

  it('picks the cell under the tap, or a ready one just next to it', () => {
    expect(tappedCell(dish, cell.x, cell.y)).toBe(cell);
    expect(tappedCell(dish, cell.x + DISH.cellSize * 1.2, cell.y)).toBe(cell);
  });

  it('picks nothing for a tap far from any ready cell', () => {
    expect(tappedCell(dish, 20, 20)).toBeUndefined();
  });
});

describe('the page', () => {
  beforeAll(() => frame()); // the first frame

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts a dish, and draws it', () => {
    expect($('.cleared').textContent).toBe(clearedText(running.dish));
    expect($('.win-banner').hidden).toBe(true);
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  it('bursts a cell you tap, and shows it spreading', () => {
    const cell = ready();
    tap(cell.x, cell.y);
    expect(cell.state).toBe('plaque');
    expect(running.view.pops).toHaveLength(1);
    expect($('.cleared').textContent).toBe(clearedText(running.dish));
    frame(40); // the burst fades away
    expect(running.view.pops).toHaveLength(0);
    tap(5, 5); // a tap on nothing does nothing
  });

  it('bursts the most urgent cell with the space bar', () => {
    const cell = ready();
    expect(key(' ').defaultPrevented).toBe(true);
    expect(cell.state).toBe('plaque');
    key('x'); // other keys do nothing
  });

  it('leaves the space bar alone on buttons and links', () => {
    const cell = ready();
    expect(key(' ', $('.play-again')).defaultPrevented).toBe(false);
    expect(cell.state).toBe('infected');
  });

  it('celebrates a win', () => {
    running.restart();
    endWith(1);
    expect($('.win-banner').hidden).toBe(false);
    expect($('.win-title').textContent).toBe('You won!');
    expect($('.fun-fact').hidden).toBe(false);
    expect(sporeBurst).toHaveBeenCalledWith(canvas, { big: true });
    tap(DISH.size / 2, DISH.size / 2); // no bursting behind the pop-up
    $('.play-again').click();
    expect($('.win-banner').hidden).toBe(true);
  });

  it('says so when the plaque stops short, and plays again with the space bar', () => {
    running.restart();
    endWith(0.05);
    expect($('.win-title').textContent).toBe('The plaque stopped growing');
    expect(sporeBurst).not.toHaveBeenCalled();
    key(' ');
    expect($('.win-banner').hidden).toBe(true);
    expect(running.dish.landed).toBe(false);
  });

  it('redraws at the new size when the window changes', () => {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 300 });
    window.devicePixelRatio = 2;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(600);
  });
});
