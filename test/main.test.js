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
function open(search = '?mate=flo&level=2') {
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

describe('which mate and level', () => {
  it('come from the address', () => {
    expect(readParams('?mate=flo&level=3')).toMatchObject({ level: 3 });
    expect(readParams('?mate=flo&level=3').mate.id).toBe('flo');
  });

  it("fall back to Flo and level 1 for anyone or anything that isn't playable", () => {
    expect(readParams('?mate=tess').mate.id).toBe('flo');
    expect(readParams('').level).toBe(1);
    expect(readParams('?level=abc').level).toBe(1);
    expect(readParams('?level=0').level).toBe(1);
    expect(readParams('?level=9').level).toBe(5);
  });
});

describe('the flask', () => {
  it('shows who you are, the level and the cells to burst', () => {
    open();
    expect($('.dish-title h1').textContent).toBe('Flo');
    expect($('.dish-title .species').textContent).toBe('Influenza A virus');
    expect($('.cell-count').textContent).toBe('Level 2 · 0 / 18 cells burst');
  });

  it('draws every cell, with a dot or a square for her receptor, plus the antibodies and her', () => {
    const { game } = open();
    expect(document.querySelectorAll('.cell')).toHaveLength(game.cells.length);
    const drawn = (selector) => document.querySelectorAll(`.flask-svg ${selector}`).length;
    expect(drawn('.badge.match')).toBe(game.cells.filter((c) => c.match).length);
    expect(drawn('.badge.wrong')).toBe(game.cells.filter((c) => !c.match).length);
    for (const kind of ['square', 'ring', 'triangle', 'diamond']) {
      expect(drawn(`.badge.${kind}`), kind).toBe(game.cells.filter((c) => c.lock === kind).length);
    }
    expect(drawn('.cell.wall')).toBe(game.cells.filter((c) => !c.match).length);
    expect(document.querySelectorAll('.antibody-cloud')).toHaveLength(2);
    expect($('.player svg').getAttribute('width')).toBe('48');
  });

  it('spreads the antibody clouds as time goes on, and moves them as they chase her', () => {
    const { game } = open();
    const startX = $('.antibody-cloud').getAttribute('cx');
    run(0);
    run(1000);
    expect(Number($('.antibody-cloud').getAttribute('r'))).toBeGreaterThan(0);
    const [drop] = game.antibodies;
    expect($('.antibody-cloud').getAttribute('cx')).not.toBe(startX);
    expect($('.antibody-cloud').getAttribute('cx')).toBe(drop.x.toFixed(1));
    expect($('.antibody').getAttribute('transform')).toBe(`translate(${drop.x.toFixed(1)} ${drop.y.toFixed(1)})`);
  });
});

describe('how to play', () => {
  it('sits under the flask, with her name, her dot, the other locks and the antibodies', () => {
    open('?mate=flo&level=1');
    const tips = $('.tips');
    expect(tips).not.toBeNull();
    expect(tips.querySelector('.mate-name').textContent).toBe('Flo');
    for (const kind of ['match', 'square', 'ring', 'triangle', 'diamond']) {
      expect(tips.querySelector(`.badge.${kind}`), kind).not.toBeNull();
    }
    expect(tips.querySelector('.antibody')).not.toBeNull();
    expect(tips.textContent).toContain('Arrow keys to drift!');
    expect(tips.textContent).toContain('Slide your finger on the flask to drift!');
  });

  it("doesn't hold up the game, on any level", () => {
    open('?mate=flo&level=1');
    expect(frames).toHaveLength(1);
    expect($('.win-banner').hidden).toBe(true);
  });
});

describe('steering', () => {
  // Every cell has already burst, so she drifts freely over clear floor.
  const drifting = (search) => {
    const opened = open(search);
    for (const cell of opened.game.cells) Object.assign(cell, { match: true, state: 'burst' });
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
    for (const cell of game.cells) if (cell.state === 'healthy') cell.match = true; // no walls
    key('keydown', 'ArrowRight');
    run(0);
    for (let t = 50; game.player.inside === null && t < 1000; t += 50) run(t);
    expect(game.player.inside).not.toBeNull();
    expect($('.player').getAttribute('class')).toBe('player inside');
    expect(document.querySelectorAll('.cell.copying')).toHaveLength(1);
  });
});

describe('the end of a level', () => {
  it('clears it, offering the next level and a fun fact', () => {
    const { game } = open();
    game.bursts = 19;
    run(0);
    expect(frames).toHaveLength(0); // the game stops
    expect($('.win-banner').hidden).toBe(false);
    expect($('.banner-title').textContent).toBe('Level 2 cleared!');
    expect($('.banner-text').textContent).toBe('Flo burst 19 cells.');
    expect($('.banner-next').textContent).toBe('Level 3: one more antibody');
    expect($('.banner-next').getAttribute('href')).toBe('./flask.html?mate=flo&level=3');
    expect($('.fun-fact').hidden).toBe(false);
    expect($('.cell-count').textContent).toBe('Level 2 · 19 / 18 cells burst');
    expect(sporeBurst).toHaveBeenLastCalledWith($('.flask'), { big: false });
  });

  it('starts over from level 1 after the last level', () => {
    const { game } = open('?mate=flo&level=5');
    game.bursts = 36;
    run(0);
    expect($('.banner-title').textContent).toBe('You cleared every level!');
    expect($('.banner-next').textContent).toBe('Play again');
    expect($('.banner-next').getAttribute('href')).toBe('./flask.html?mate=flo&level=1');
    expect(sporeBurst).toHaveBeenLastCalledWith($('.flask'), { big: true });
  });

  it('ends when an antibody gets her, offering the same level again', () => {
    const { game } = open();
    game.antibodies[0] = { x: game.player.x, y: game.player.y, max: 60, r: 0 };
    game.time = GROW_TIME;
    run(0);
    expect(game.over).toBe('neutralized');
    expect($('.banner-title').textContent).toBe('Flo was neutralized!');
    expect($('.banner-text').textContent).toContain('Antibodies stuck to her');
    expect($('.banner-next').textContent).toBe('Try level 2 again');
    expect($('.banner-next').getAttribute('href')).toBe('./flask.html?mate=flo&level=2');
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
