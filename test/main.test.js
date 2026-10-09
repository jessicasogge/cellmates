// @vitest-environment jsdom
// main.js: the game page. These load the real flask.html into jsdom, a
// simulated browser page, and run the game a frame at a time.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GROW_TIME } from '../public/game/flask.js';
import { sporeBurst } from '../public/game/spores.js';

// No real confetti: jsdom can't draw on a canvas, so the confetti library's
// animation would crash on a later frame, after the test had finished.
vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));

// (jsdom changes import.meta.url to a web address, so find files from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/flask.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>') + '</body>'.length);

const seeded = (seed = 3) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

let frames;
let startGame;
let readParams;

// Open the game page for `search` and start it, with frames run by hand.
function open(search = '?pal=flo&level=2') {
  document.body.outerHTML = body;
  frames = [];
  return startGame({ search, random: seeded(), frame: (callback) => frames.push(callback) });
}

// Run the next frame at `now` ms.
const run = (now) => frames.shift()(now);
const $ = (selector) => document.querySelector(selector);
const key = (type, k) => window.dispatchEvent(Object.assign(new Event(type), { key: k }));
const pointer = (type, { kind = 'touch', x = 0, y = 0 } = {}) =>
  $('.flask').dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
    isPrimary: true, pointerId: 1, pointerType: kind, clientX: x, clientY: y,
  }));

beforeEach(async () => {
  sporeBurst.mockClear();
  document.body.innerHTML = ''; // no flask, so importing doesn't start a game
  vi.resetModules();
  ({ startGame, readParams } = await import('../public/game/main.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  key('keyup', 'ArrowRight');
});

describe('which pal and level', () => {
  it('come from the address', () => {
    expect(readParams('?pal=flo&level=3')).toMatchObject({ level: 3 });
    expect(readParams('?pal=flo&level=3').pal.id).toBe('flo');
  });

  it("fall back to Flo and level 1 for anyone or anything that isn't playable", () => {
    expect(readParams('?pal=tess').pal.id).toBe('flo');
    expect(readParams('').level).toBe(1);
    expect(readParams('?level=abc').level).toBe(1);
    expect(readParams('?level=0').level).toBe(1);
    expect(readParams('?level=9').level).toBe(5);
  });
});

describe('the flask', () => {
  it('shows who you are, the level and the copies to make', () => {
    open();
    expect($('.hud-name').textContent).toBe('Flo · Level 2');
    expect($('.hud-species').textContent).toBe('Influenza A virus');
    expect($('.copies').textContent).toBe('0 / 150');
    expect($('.progress').getAttribute('aria-valuemax')).toBe('150');
  });

  it('draws every cell, with a dot or a square for her receptor, plus the antibodies and her', () => {
    const { game } = open();
    expect(document.querySelectorAll('.cell')).toHaveLength(game.cells.length);
    expect(document.querySelectorAll('.badge.match')).toHaveLength(game.cells.filter((c) => c.match).length);
    expect(document.querySelectorAll('.badge.wrong')).toHaveLength(game.cells.filter((c) => !c.match).length);
    expect(document.querySelectorAll('.antibody-cloud')).toHaveLength(2);
    expect($('.player svg').getAttribute('width')).toBe('48');
  });

  it('spreads the antibody clouds as time goes on', () => {
    open();
    run(0);
    run(1000);
    expect(Number($('.antibody-cloud').getAttribute('r'))).toBeGreaterThan(0);
  });
});

describe('steering', () => {
  // No cell fits her, so she drifts freely instead of slipping into one.
  const drifting = (search) => {
    const opened = open(search);
    for (const cell of opened.game.cells) cell.match = false;
    return opened;
  };

  it('drifts her with the arrow keys', () => {
    const { game } = drifting();
    const start = game.player.x;
    key('keydown', 'ArrowRight');
    run(0);
    run(50);
    expect(game.player.x).toBeGreaterThan(start);
    expect($('.player').getAttribute('transform')).toContain(`translate(${game.player.x.toFixed(1)}`);
  });

  it('drifts her toward a held-down mouse', () => {
    const { game } = drifting();
    const start = game.player.x;
    pointer('pointerdown', { kind: 'mouse', x: 100, y: 0 }); // to her right
    run(0);
    run(50);
    expect(game.player.x).toBeGreaterThan(start);
  });

  it('drags her with a finger, scaled from screen px to the flask', () => {
    const { game, tick } = drifting();
    $('.flask-svg').getBoundingClientRect = () => ({ width: 680, left: 0, top: 0, height: 1000 });
    tick(0);
    const start = game.player.y;
    pointer('pointerdown');
    pointer('pointermove', { y: -10 }); // 10 px up the screen is 5 flask units
    tick(50);
    expect(game.player.y).toBeCloseTo(start - 5);
  });

  it('shows her faintly inside a cell while it copies her', () => {
    const { game } = open();
    key('keydown', 'ArrowRight');
    run(0);
    run(50);
    expect(game.player.inside).not.toBeNull();
    expect($('.player').getAttribute('class')).toBe('player inside');
    expect(document.querySelectorAll('.cell.copying')).toHaveLength(1);
  });
});

describe('the end of a level', () => {
  it('clears it, offering the next level and a fun fact', () => {
    const { game } = open();
    game.copies = 160;
    run(0);
    expect(frames).toHaveLength(0); // the game stops
    expect($('.popup').hidden).toBe(false);
    expect($('.popup-title').textContent).toBe('Level 2 cleared!');
    expect($('.popup-text').textContent).toBe('Flo made 160 copies of herself.');
    expect($('.popup-next').textContent).toBe('Level 3: one more antibody');
    expect($('.popup-next').getAttribute('href')).toBe('./flask.html?pal=flo&level=3');
    expect($('.fun-fact').hidden).toBe(false);
    expect($('.popup-pal svg')).not.toBeNull();
    expect($('.copies').textContent).toBe('160 / 150');
    expect($('.progress-fill').style.width).toBe('100%');
    expect(sporeBurst).toHaveBeenLastCalledWith($('.popup-pal'), { big: false });
  });

  it('starts over from level 1 after the last level', () => {
    const { game } = open('?pal=flo&level=5');
    game.copies = 300;
    run(0);
    expect($('.popup-title').textContent).toBe('You cleared every level!');
    expect($('.popup-next').textContent).toBe('Play again');
    expect($('.popup-next').getAttribute('href')).toBe('./flask.html?pal=flo&level=1');
    expect(sporeBurst).toHaveBeenLastCalledWith($('.popup-pal'), { big: true });
  });

  it('ends when an antibody gets her, offering the same level again', () => {
    const { game } = open();
    game.antibodies[0] = { x: game.player.x, y: game.player.y, max: 60, r: 0 };
    game.time = GROW_TIME;
    run(0);
    expect(game.over).toBe('neutralized');
    expect($('.popup-title').textContent).toBe('Flo was neutralized!');
    expect($('.popup-text').textContent).toContain('Antibodies stuck to her');
    expect($('.popup-next').textContent).toBe('Try level 2 again');
    expect($('.popup-next').getAttribute('href')).toBe('./flask.html?pal=flo&level=2');
    expect(sporeBurst).not.toHaveBeenCalled(); // no confetti for losing
  });
});

describe('the page', () => {
  it('starts the game by itself when it has a flask', async () => {
    const callbacks = [];
    vi.stubGlobal('requestAnimationFrame', (callback) => callbacks.push(callback));
    document.body.outerHTML = body;
    vi.resetModules();
    await import('../public/game/main.js');
    expect(document.querySelectorAll('.flask-svg')).toHaveLength(1);
    expect(callbacks).toHaveLength(1);
  });
});
