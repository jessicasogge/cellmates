// @vitest-environment jsdom
// play.js: the flask page. Loads the real flask.html into jsdom, with a
// stand-in canvas, and runs the game frame by frame by hand.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeContext } from './fake-canvas.js';

vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));
vi.mock('../public/game/sound.js', () => ({ pop: vi.fn() }));

const html = readFileSync(resolve(import.meta.dirname, '../public/flask.html'), 'utf8');
document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
history.replaceState(null, '', '/flask.html?level=3');

const ctx = fakeContext();
HTMLCanvasElement.prototype.getContext = () => ctx;
const frames = [];
vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));

const { sporeBurst } = await import('../public/game/spores.js');
const { pop } = await import('../public/game/sound.js');
const { LEVELS } = await import('../public/game/config.js');
const play = await import('../public/game/play.js');
const { running, levelFromSearch, cellsForStars, resultText, CHAIN_CALLS } = play;

const $ = (selector) => document.querySelector(selector);
const canvas = $('#flask');
let clock = 0;

// Run `n` frames of `ms` each.
function frame(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    frames.shift()(clock);
  }
}

function key(name, target = document.body) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function pointer(type, x, y) {
  canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
}

describe('levelFromSearch', () => {
  it('reads a 1-based level from the address', () => {
    expect(levelFromSearch('?level=2')).toBe(1);
  });

  it('starts at the first level for anything else', () => {
    for (const search of ['', '?level=0', '?level=99', '?level=two', '?level=1.5']) {
      expect(levelFromSearch(search)).toBe(0);
    }
  });
});

describe('resultText', () => {
  const game = (taken, bestChain = 0) => ({ level: LEVELS[0], cells: { length: 100 }, taken, bestChain });

  it('says how many cells each star needs', () => {
    expect(cellsForStars(game(0))).toEqual([30, 45, 54]);
  });

  it('cheers on a near miss more than a far one', () => {
    expect(resultText(game(25, 9), false)).toEqual({
      title: 'So close!',
      detail: 'You took over 25 of 100 cells, with a chain of 9. One star needs 30.',
    });
    expect(resultText(game(2), false).title).toBe('Not quite!');
  });

  it('beats the level with one star or more, and says what three needs', () => {
    expect(resultText(game(31, 20), false)).toEqual({
      title: 'Level beaten!',
      detail: 'You took over 31 of 100 cells, with a chain of 20. Three stars needs 54.',
    });
    expect(resultText(game(60), false).title).toBe('Perfect flask!');
    expect(resultText(game(60), true).title).toBe('You beat every flask!');
  });
});

describe('the flask page', () => {
  beforeAll(() => frame()); // the first frame

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));
  });

  it('starts the level from the address, with a star mark for each star', () => {
    expect(running.game.level).toBe(LEVELS[2]);
    expect($('.level-name').textContent).toBe('Level 3 of 3');
    expect(document.querySelectorAll('.star-mark')).toHaveLength(3);
    expect($('.flicks').textContent).toBe('●●●');
    expect($('.taken').textContent).toBe('0 cells');
    expect(ctx.calls.length).toBeGreaterThan(0); // the flask got drawn
  });

  it('turns the aim with the arrow keys and flicks with the space bar', () => {
    const before = running.view.aim;
    expect(key('ArrowLeft').defaultPrevented).toBe(true);
    expect(running.view.aim.angle).toBeLessThan(before.angle);
    key('x'); // nothing
    key(' ');
    expect(running.game.flicksLeft).toBe(2);
    expect($('.flicks').textContent).toBe('●●○');
    key('Enter'); // she's still flying, so no second flick yet
    expect(running.game.flicksLeft).toBe(2);
  });

  it('leaves keys alone on buttons and links', () => {
    running.restart();
    const event = key(' ', $('.mute'));
    expect(event.defaultPrevented).toBe(false);
    expect(running.game.flicksLeft).toBe(3);
  });

  it('aims by pulling back on the flask and flicks on letting go', () => {
    running.restart();
    pointer('pointerup', 0, 0); // a stray let-go does nothing
    pointer('pointermove', 0, 0); // and so does moving without pressing
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 102, 101); // too small to aim
    pointer('pointerup', 102, 101);
    expect(running.game.flicksLeft).toBe(3);

    pointer('pointerdown', 100, 100);
    pointer('pointermove', 100, 180); // pull down: aim up
    expect(running.view.aim.angle).toBeCloseTo(-Math.PI / 2);
    pointer('pointerup', 100, 180);
    expect(running.game.flicksLeft).toBe(2);

    pointer('pointerdown', 100, 100);
    pointer('pointercancel', 100, 100);
    pointer('pointerup', 100, 180);
    expect(running.game.flicksLeft).toBe(2);
  });

  it('pops, calls out chains, and counts cells as they burst', () => {
    running.restart();
    const game = running.game;
    const cell = game.cells.find((c) => c.receptor);
    cell.state = 'infected';
    cell.progress = 0.999;
    game.chain = 4; // the next burst is the fifth in a row
    frame();
    expect(pop).toHaveBeenCalledWith(5);
    expect($('.chain-call').textContent).toBe(CHAIN_CALLS.get(5));
    expect($('.taken').textContent).toBe('1 cell');
    expect(running.view.pops).toHaveLength(1);
    frame(40); // the pop fades away
    expect(running.view.pops).toHaveLength(0);
  });

  it('says when your pal is stopped by antibodies or finds no receptor', () => {
    running.restart();
    const game = running.game;
    const [cloud] = game.antibodies;
    game.virions.push({ x: cloud.x, y: cloud.y, vx: 0, vy: 0, idle: 0, lead: true });
    frame();
    expect($('.chain-call').textContent).toBe('Stopped by antibodies!');

    const other = game.cells.find((c) => !c.receptor && Math.hypot(c.x - cloud.x, c.y - cloud.y) > 80);
    game.virions.push({ x: other.x, y: other.y, vx: 0, vy: 0, idle: 5, lead: true });
    frame();
    expect($('.chain-call').textContent).toBe('No receptor there!');
  });

  it('keeps quiet when muted, and remembers it', () => {
    running.restart();
    $('.mute').click();
    expect($('.mute').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('cellmates-muted')).toBe('1');
    const cell = running.game.cells.find((c) => c.receptor);
    cell.state = 'infected';
    cell.progress = 0.999;
    frame();
    expect(pop).not.toHaveBeenCalled();
    $('.mute').click();
    expect($('.mute').textContent).toBe('🔊');
  });

  it('shows the result when the round is over, with no stars', () => {
    running.restart();
    running.game.flicksLeft = 0;
    frame();
    expect($('.result').hidden).toBe(false);
    expect($('.result-title').textContent).toBe('Not quite!');
    expect(document.querySelectorAll('.result-stars .earned')).toHaveLength(0);
    expect($('.next').hidden).toBe(true);
    expect($('.fun-fact').hidden).toBe(false);
    expect(sporeBurst).not.toHaveBeenCalled();
    key(' '); // no flicking behind the pop-up
    expect(running.game.flicksLeft).toBe(0);
  });

  it('celebrates stars, remembers your best, and tries again', () => {
    running.restart();
    running.game.flicksLeft = 0;
    running.game.taken = running.game.cells.length;
    frame();
    expect(document.querySelectorAll('.result-stars .earned')).toHaveLength(3);
    expect($('.result-title').textContent).toBe('You beat every flask!');
    expect($('.next').hidden).toBe(true); // it's the last level
    expect(localStorage.getItem('cellmates-best-3')).toBe('3');
    expect(sporeBurst).toHaveBeenCalledWith(canvas, { big: true });
    expect(document.querySelectorAll('.star-mark.earned')).toHaveLength(3);

    $('.again').click();
    expect($('.result').hidden).toBe(true);
    expect(running.game.flicksLeft).toBe(3);
  });

  it('starts over with R', () => {
    key(' ');
    key('r');
    expect(running.game.flicksLeft).toBe(3);
  });

  it('copes with a browser that won’t save anything', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    running.restart();
    running.game.flicksLeft = 0;
    running.game.taken = Math.ceil(running.game.cells.length * LEVELS[2].stars[0]);
    expect(() => frame()).not.toThrow();
    expect($('.result-detail').textContent).toContain('Best: 1 ★');
    expect(() => $('.mute').click()).not.toThrow();
  });

  it('redraws at the new size when the window changes', () => {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 300 });
    window.devicePixelRatio = 2;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(1000);
  });
});
