// @vitest-environment jsdom
// play.js: the Burst or Wait page. Loads the real cell.html into jsdom, with
// a stand-in canvas, and runs the game frame by frame by hand.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeContext } from './fake-canvas.js';

vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));
vi.mock('../public/game/sound.js', () => ({ pop: vi.fn() }));

const html = readFileSync(resolve(import.meta.dirname, '../public/cell.html'), 'utf8');
document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];

const ctx = fakeContext();
HTMLCanvasElement.prototype.getContext = () => ctx;
const frames = [];
vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));

const { sporeBurst } = await import('../public/game/spores.js');
const { pop } = await import('../public/game/sound.js');
const { HOST, VIRUSES } = await import('../public/game/config.js');
const { running, burstCall, copyNote, resultText } = await import('../public/game/play.js');

const $ = (selector) => document.querySelector(selector);
const canvas = $('#cell');
let clock = 0;

// Run `n` frames of `ms` each.
function frame(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    frames.shift()(clock);
  }
}

// Run until something about the run is true, or give up after a while.
function until(check, limit = 2000) {
  for (let i = 0; i < limit && !check(); i++) frame();
}

function key(name, target = document.body) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

// Restart and run on until there are copies to burst.
function readyToBurst() {
  running.restart();
  running.run.cell.breaking = 99; // so it can't self-destruct on its own
  until(() => running.run.cell.copies >= 20);
}

describe('burstCall', () => {
  it('cheers louder for bigger bursts', () => {
    expect(burstCall(12)).toBe('+12');
    expect(burstCall(90)).toBe('Big burst! +90');
    expect(burstCall(150)).toBe('Huge burst! +150');
  });
});

describe('copyNote', () => {
  it('goes up a note about every dozen copies', () => {
    expect(copyNote(0)).toBe(1);
    expect(copyNote(12)).toBe(2);
    expect(copyNote(60)).toBe(6);
  });
});

describe('resultText', () => {
  const run = (score, bursts, bestBurst) => ({ score, bursts, bestBurst });

  it('sums up the run', () => {
    expect(resultText(run(300, 3, 140), 500, false)).toEqual({
      score: '300 copies',
      detail: 'You burst 3 cells, the biggest with 140 copies. Best run: 500.',
    });
    expect(resultText(run(90, 1, 90), 90, true).score).toBe('90 copies: a new best!');
    expect(resultText(run(90, 1, 90), 90, true).detail).toContain('You burst 1 cell,');
  });

  it('suggests bursting sooner if nothing got out', () => {
    expect(resultText(run(0, 0, 0), 0, false).detail).toContain('Try bursting a little sooner!');
  });
});

describe('the page', () => {
  beforeAll(() => frame()); // the first frame

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));
  });

  it('starts on the first cell with every life, and draws it', () => {
    expect($('.cell-number').textContent).toBe('Cell 1');
    expect($('.lives').textContent).toBe('●'.repeat(HOST.lives));
    expect($('.burst-button').disabled).toBe(true);
    expect($('.danger').style.left).toBe(`${HOST.breaking[0] * 100}%`);
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  it('copies, with pops that don’t pile up', () => {
    readyToBurst();
    expect($('.call').textContent).toBe('Copying her DNA…');
    expect($('.copies-count').textContent).toBe(String(running.run.cell.copies));
    expect($('.burst-button').disabled).toBe(false);
    expect(pop).toHaveBeenCalled();
    expect(pop.mock.calls.length).toBeLessThan(running.run.cell.copies);
  });

  it('says "copy" for one copy', () => {
    running.restart();
    running.run.cell.breaking = 99;
    until(() => running.run.cell.copies >= 1);
    running.run.cell.copies = 1;
    running.run.cell.time = VIRUSES.tess.eclipse; // no more yet
    frame();
    expect($('.copies-word').textContent).toBe('copy');
  });

  it('bursts with the button, banking the copies and showing the breaking point', () => {
    readyToBurst();
    running.run.cell.breaking = 0.8;
    const copies = running.run.cell.copies;
    $('.burst-button').click();
    expect(running.run.score).toBe(copies);
    expect($('.call').textContent).toBe(burstCall(copies));
    expect($('.breaking-mark').hidden).toBe(false);
    expect($('.alarm-label').textContent).toBe('It would have held out to 80%.');
    expect(sporeBurst).toHaveBeenCalledWith(canvas);
    expect(pop).toHaveBeenCalledWith(15);
    frame();
    expect($('.score').textContent).toBe(String(copies));

    until(() => running.run.number === 2);
    expect($('.breaking-mark').hidden).toBe(true);
    expect($('.alarm-label').textContent).toContain('Somewhere in the red');
  });

  it('bursts with the space bar or a tap on the cell, but not before there are copies', () => {
    running.restart();
    key(' ');
    canvas.dispatchEvent(new Event('pointerdown'));
    expect(running.run.score).toBe(0);
    readyToBurst();
    expect(key(' ').defaultPrevented).toBe(true);
    expect(running.run.score).toBeGreaterThan(0);
    readyToBurst();
    canvas.dispatchEvent(new Event('pointerdown'));
    expect(running.run.cell.phase).toBe('burst');
  });

  it('quiets the alarm once per cell, with the button or Q', () => {
    readyToBurst();
    running.run.cell.alarm = 0.6;
    $('.block-button').click();
    expect(running.run.cell.alarm).toBeCloseTo(0.6 - VIRUSES.tess.block);
    expect($('.block-button').disabled).toBe(true);
    readyToBurst();
    running.run.cell.alarm = 0.6;
    key('q');
    expect(running.run.cell.blocked).toBe(true);
    key('Q'); // already used
    key('x'); // nothing
  });

  it('leaves keys alone on buttons and links', () => {
    readyToBurst();
    expect(key(' ', $('.mute')).defaultPrevented).toBe(false);
    expect(running.run.score).toBe(0);
  });

  it('self-destructs, losing a life, and says where it broke', () => {
    readyToBurst();
    running.run.cell.breaking = 0.42;
    running.run.cell.alarm = 0.42;
    frame();
    expect($('.call').textContent).toMatch(/^Self-destruct! Lost \d+$/);
    expect($('.alarm-label').textContent).toBe('It broke at 42%.');
    expect($('.lives').textContent).toBe('●'.repeat(HOST.lives - 1) + '○');
    expect(pop).toHaveBeenCalledWith(1);
  });

  it('says so plainly if a cell self-destructs with nothing in it', () => {
    running.restart();
    until(() => running.run.cell.phase === 'copying');
    running.run.cell.breaking = 0;
    running.run.cell.time = VIRUSES.tess.eclipse;
    frame();
    expect($('.call').textContent).toBe('Self-destruct!');
  });

  it('ends the run, celebrates a new best, and plays again', () => {
    localStorage.clear();
    readyToBurst();
    $('.burst-button').click();
    running.run.lives = 1;
    until(() => running.run.number === 2);
    until(() => running.run.cell.phase === 'copying');
    running.run.cell.breaking = 0;
    running.run.cell.time = VIRUSES.tess.eclipse;
    until(() => running.run.over);
    expect($('.result').hidden).toBe(false);
    expect($('.result-score').textContent).toContain('a new best!');
    expect(sporeBurst).toHaveBeenLastCalledWith(canvas, { big: true });
    expect(localStorage.getItem('cellmates-best')).toBe(String(running.run.score));
    expect($('.fun-fact').hidden).toBe(false);

    key(' '); // the space bar plays again too
    expect($('.result').hidden).toBe(true);
    expect(running.run.number).toBe(1);
  });

  it('doesn’t celebrate a run below your best', () => {
    localStorage.setItem('cellmates-best', '100000');
    running.restart();
    running.run.lives = 1;
    until(() => running.run.cell.phase === 'copying');
    running.run.cell.breaking = 0;
    running.run.cell.time = VIRUSES.tess.eclipse;
    until(() => running.run.over);
    expect($('.result-score').textContent).toBe('0 copies');
    expect(sporeBurst).not.toHaveBeenCalled();
    $('.again').click();
    expect($('.result').hidden).toBe(true);
  });

  it('keeps quiet when muted, and remembers it', () => {
    $('.mute').click();
    expect($('.mute').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('cellmates-muted')).toBe('1');
    readyToBurst();
    expect(pop).not.toHaveBeenCalled();
    $('.mute').click();
    expect($('.mute').textContent).toBe('🔊');
  });

  it('copes with a browser that won’t save anything', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    running.restart();
    running.run.lives = 1;
    until(() => running.run.cell.phase === 'copying');
    running.run.cell.breaking = 0;
    running.run.cell.time = VIRUSES.tess.eclipse;
    expect(() => until(() => running.run.over)).not.toThrow();
    expect(() => $('.mute').click()).not.toThrow();
  });

  it('redraws at the new size when the window changes', () => {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 300 });
    window.devicePixelRatio = 2;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(500);
  });
});
