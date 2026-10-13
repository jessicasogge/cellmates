// draw.js: drawing the flask. A stand-in canvas records what gets drawn.
import { describe, expect, it } from 'vitest';
import { drawFlask, POP_TIME } from '../public/game/draw.js';
import { createGame, flick } from '../public/game/infect.js';
import { START_AIM } from '../public/game/aim.js';
import { VIRUSES } from '../public/game/config.js';
import { fakeContext } from './fake-canvas.js';

const level = { seed: 2, receptors: 0.5, flicks: 2, stars: [0.1, 0.2, 0.3], antibodies: [{ x: 100, y: 100, r: 30 }] };
const count = (ctx, name) => ctx.calls.filter(([n]) => n === name).length;

function drawn(game, view = {}) {
  const ctx = fakeContext();
  drawFlask(ctx, game, { aim: START_AIM, palImage: null, pops: [], ...view });
  return ctx;
}

describe('drawFlask', () => {
  it('draws every cell, and the aim while you can flick', () => {
    const game = createGame(level, VIRUSES.flo);
    const ctx = drawn(game);
    expect(count(ctx, 'closePath')).toBe(game.cells.length);
    expect(ctx.calls.some(([n, ...args]) => n === 'setLineDash' && args[0][0] === 2)).toBe(true);
  });

  it('draws infected cells with a ring, and burst cells as holes', () => {
    const game = createGame(level, VIRUSES.flo);
    game.cells[0].state = 'infected';
    game.cells[0].progress = 0.5;
    game.cells[1].state = 'plaque';
    const ctx = drawn(game);
    const ring = ctx.calls.find(([n, x, y, , start, end]) =>
      n === 'arc' && x === game.cells[0].x && y === game.cells[0].y && start === -Math.PI / 2 && end === Math.PI / 2);
    expect(ring).toBeTruthy();
  });

  it('draws drifting virions, your pal from her picture, and pops', () => {
    const game = createGame(level, VIRUSES.flo);
    flick(game, 0, -100);
    game.virions.push({ x: 50, y: 50, vx: 0, vy: 0, idle: 0, lead: false });
    const palImage = { complete: true, naturalWidth: 200 };
    const ctx = drawn(game, { palImage, pops: [{ x: 10, y: 10, age: POP_TIME / 2 }] });
    expect(ctx.calls.filter(([n, image]) => n === 'drawImage' && image === palImage)).toHaveLength(1);
    expect(ctx.calls.some(([n, x, y]) => n === 'arc' && x === 50 && y === 50)).toBe(true);
    // No aim while she's flying.
    expect(ctx.calls.some(([n, ...args]) => n === 'setLineDash' && args[0][0] === 2)).toBe(false);
  });

  it('draws your pal as a plain virion until her picture has loaded', () => {
    const game = createGame(level, VIRUSES.flo);
    const ctx = drawn(game, { palImage: { complete: false } });
    expect(count(ctx, 'drawImage')).toBe(0);
  });
});
