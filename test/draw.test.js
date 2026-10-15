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
    const game = createGame({ target: 5, antibodies: 0 }, VIRUSES.flo);
    const ctx = drawn(game);
    expect(count(ctx, 'closePath')).toBe(game.cells.length);
    expect(count(ctx, 'drawImage')).toBe(1);
  });

  it('draws her as a plain circle until her picture has loaded', () => {
    const game = createGame({ target: 5, antibodies: 0 }, VIRUSES.flo);
    expect(count(drawn(game, { complete: false }), 'drawImage')).toBe(0);
    expect(count(drawn(game, null), 'drawImage')).toBe(0);
  });

  it('draws plaques, warned and infected cells, clouds and copies, and hides her inside a cell', () => {
    const game = createGame({ target: 5, antibodies: 2 }, VIRUSES.flo);
    const [a, b, c] = game.cells;
    a.state = 'released';
    b.warned = true;
    Object.assign(c, { state: 'infected', progress: 0.5 });
    game.pal.inside = c;
    game.clouds[0].r = 30; // the other is still too small to draw
    game.copies.push({ x: 50, y: 60, vx: 0, vy: 0, age: 0 });
    const ctx = drawn(game);
    expect(count(ctx, 'drawImage')).toBe(0);
    // One hex per cell, plus the infected cell's glow.
    expect(count(ctx, 'closePath')).toBe(game.cells.length + 1);
    expect(ctx.calls.some(([n, x, y]) => n === 'arc' && x === 50 && y === 60)).toBe(true);
    expect(ctx.calls.some(([n, x, y, r]) => n === 'arc' && x === game.clouds[0].x && r === 30)).toBe(true);
  });
});
