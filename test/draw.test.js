// draw.js: drawing the flask. A stand-in canvas records what gets drawn.
import { describe, expect, it } from 'vitest';
import { drawFlask } from '../public/game/draw.js';
import { createGame } from '../public/game/flask.js';
import { VIRUSES } from '../public/game/config.js';
import { fakeContext } from './fake-canvas.js';

const loaded = { complete: true, naturalWidth: 200 };
const count = (ctx, name) => ctx.calls.filter(([n]) => n === name).length;

function drawn(game, image = loaded) {
  const ctx = fakeContext();
  drawFlask(ctx, game, image);
  return ctx;
}

describe('drawFlask', () => {
  it('draws every cell, and her from her picture', () => {
    const game = createGame({ antibodies: 0, size: 40, share: 1 }, VIRUSES.flo);
    const ctx = drawn(game);
    expect(count(ctx, 'closePath')).toBe(game.cells.length);
    expect(count(ctx, 'drawImage')).toBe(1);
  });

  it('draws her as a plain circle until her picture has loaded', () => {
    const game = createGame({ antibodies: 0, size: 40, share: 1 }, VIRUSES.flo);
    expect(count(drawn(game, { complete: false }), 'drawImage')).toBe(0);
    expect(count(drawn(game, null), 'drawImage')).toBe(0);
  });

  it('draws plaques, warned and infected cells, clouds, her copies and her', () => {
    const game = createGame({ antibodies: 2, size: 40, share: 1 }, VIRUSES.flo);
    const [a, b, c] = game.cells;
    a.state = 'released';
    b.warned = true;
    Object.assign(c, { state: 'infected', progress: 0.5 });
    game.clouds[0].r = 30;
    game.clouds[1].r = 0; // too small to draw yet
    game.copies.push({ x: 50, y: 60 });
    const ctx = drawn(game);
    expect(count(ctx, 'drawImage')).toBe(1);
    // One hex per cell, plus the infected cell's glow.
    expect(count(ctx, 'closePath')).toBe(game.cells.length + 1);
    expect(ctx.calls.some(([n, x, y]) => n === 'arc' && x === 50 && y === 60)).toBe(true);
    expect(ctx.calls.some(([n, x, y, r]) => n === 'arc' && x === game.clouds[0].x && r === 30)).toBe(true);
    expect(ctx.calls.some(([n, x, y, r]) => n === 'arc' && x === game.clouds[1].x && r === 0)).toBe(false);
  });

  it('pops a burst, and shows the streak from the third in a row', () => {
    const game = createGame({ antibodies: 0, size: 40, share: 1 }, VIRUSES.flo);
    game.pops = [{ x: 100, y: 120, age: 0.1, streak: 2 }];
    let ctx = drawn(game);
    expect(ctx.calls.some(([n, x, y]) => n === 'arc' && x === 100 && y === 120)).toBe(true);
    expect(count(ctx, 'fillText')).toBe(0);
    game.pops = [{ x: 100, y: 120, age: 0.1, streak: 5 }];
    ctx = drawn(game);
    expect(ctx.calls.find(([n]) => n === 'fillText')[1]).toBe('×5!');
  });
});
