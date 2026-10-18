// @vitest-environment jsdom
// play.js: the flask page. Loads the real flask.html into jsdom, with a
// stand-in canvas, and runs the game frame by frame by hand.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeContext } from './fake-canvas.js';

vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));

const html = readFileSync(resolve(import.meta.dirname, '../public/flask.html'), 'utf8');
document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
history.replaceState(null, '', '/flask.html?level=2');

const ctx = fakeContext();
HTMLCanvasElement.prototype.getContext = () => ctx;
const frames = [];
vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));

const { sporeBurst } = await import('../public/game/spores.js');
const { FLASK, LEVELS } = await import('../public/game/config.js');
const { running, countText, levelFromSearch, resultText } = await import('../public/game/play.js');

const $ = (selector) => document.querySelector(selector);
const canvas = $('#flask');
// The canvas is FLASK.width px wide at the top left, so screen px are flask
// units.
Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: FLASK.width });
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: FLASK.width, height: FLASK.height });
let clock = 0;

function frame(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    frames.shift()(clock);
  }
}

function pointer(type, x, y, pointerType = 'mouse') {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, isPrimary: true, pointerType });
  canvas.dispatchEvent(event);
}

describe('levelFromSearch', () => {
  it('reads a 1-based level from the address, or starts at the first', () => {
    expect(levelFromSearch('?level=3')).toBe(2);
    for (const search of ['', '?level=0', '?level=9', '?level=x']) expect(levelFromSearch(search)).toBe(0);
  });
});

describe('resultText', () => {
  const game = (over, taken = 7, bestStreak = 2) => ({ over, taken, target: 20, bestStreak });

  it('says what happened, and what the button does', () => {
    expect(resultText(game('lost'), 0)).toMatchObject({ title: 'Caught by antibodies!', button: 'Try again' });
    expect(resultText(game('lost'), 0).message).toContain('Flo took 7 of 20 cells');
    expect(resultText(game('won', 20), 0)).toEqual({ title: 'You won!', message: 'Flo took 20 cells.', button: 'Next level' });
    expect(resultText(game('won'), LEVELS.length - 1)).toMatchObject({ title: 'You won them all!', button: 'Play again' });
  });

  it('brags about a streak of three or more', () => {
    expect(resultText(game('won', 20, 12), 0).message).toBe('Flo took 20 cells. Best streak: ×12!');
    expect(resultText(game('won', 20, 12), LEVELS.length - 1).message).toContain('Best streak: ×12!');
  });
});

describe('the page', () => {
  beforeAll(() => frame());

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts the level from the address', () => {
    expect(running.game.level).toBe(LEVELS[1]);
    expect($('.cell-count').textContent).toBe(countText(running.game, 1));
    expect(countText(running.game, 1)).toBe(`Level 2 · 0 / ${running.game.target} cells`);
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  it('steers her with the arrow keys', () => {
    const before = running.game.pal.y;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    frame(5);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
    expect(running.game.pal.y).toBeLessThan(before);
  });

  it('steers her toward a held-down mouse, and with a dragging finger', () => {
    running.begin(1);
    frame();
    const { pal } = running.game;
    const before = { ...pal };
    // The flask's middle is at (180, 230) on the screen; press to the left of her.
    pointer('pointerdown', pal.x - 60, pal.y);
    frame(3);
    pointer('pointerup', pal.x - 60, pal.y);
    expect(pal.x).toBeLessThan(before.x);

    const x = pal.x;
    pointer('pointerdown', 100, 300, 'touch');
    pointer('pointermove', 110, 300, 'touch');
    frame();
    pointer('pointerup', 110, 300, 'touch');
    expect(pal.x).toBeGreaterThan(x);
  });

  it('counts cells as she takes them', () => {
    running.begin(1);
    const { game } = running;
    const cell = game.cells.find((c) => c.receptor);
    game.pal.x = cell.x;
    game.pal.y = cell.y;
    frame(80);
    expect(game.taken).toBeGreaterThan(0);
    expect($('.cell-count').textContent).toBe(countText(game, 1));
  });

  it('shows the pop-up and tries again when she’s caught', () => {
    running.begin(1);
    running.game.clouds = [{ x: running.game.pal.x, y: running.game.pal.y, r: 0 }];
    frame(20);
    expect(running.game.over).toBe('lost');
    expect($('.win-banner').hidden).toBe(false);
    expect($('.win-title').textContent).toBe('Caught by antibodies!');
    expect($('.fun-fact').hidden).toBe(false);
    expect(sporeBurst).not.toHaveBeenCalled();
    frame(); // nothing moves once it's over
    $('.play-again').click();
    expect($('.win-banner').hidden).toBe(true);
    expect(running.game.level).toBe(LEVELS[1]);
  });

  it('celebrates a win and goes on to the next level, and back to the first after the last', () => {
    running.begin(1);
    running.game.taken = running.game.target;
    frame();
    expect($('.win-title').textContent).toBe('You won!');
    expect(sporeBurst).toHaveBeenCalledWith(canvas, { big: false });
    $('.play-again').click();
    expect(running.game.level).toBe(LEVELS[2]);

    running.begin(LEVELS.length - 1);
    running.game.taken = running.game.target;
    frame();
    expect($('.win-title').textContent).toBe('You won them all!');
    expect(sporeBurst).toHaveBeenLastCalledWith(canvas, { big: true });
    $('.play-again').click();
    expect(running.game.level).toBe(LEVELS[0]);
  });

  it('redraws at the new size when the window changes', () => {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 0 });
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(FLASK.width); // a fallback size while it has none
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 180 });
    window.devicePixelRatio = 2;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(360);
    expect(canvas.height).toBe(460);
    frame(); // steering copes with any size too
  });
});
