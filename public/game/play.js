// The flask page (flask.html): runs a level, draws it, steers your pal with
// the arrow keys or a finger, and shows the end-of-level pop-up.
//
// The level comes from the address: flask.html?level=2.

import { FLASK, LEVELS, VIRUSES } from './config.js';
import { createGame, move, step } from './flask.js';
import { drawFlask } from './draw.js';
import { arrowKeys } from './keyboard.js';
import { steer, touchSteering, watchInputMode } from './touch.js';
import { palById } from './pals.js';
import { hideFact, showFact } from './facts.js';
import { sporeBurst } from './spores.js';

const PAL = 'flo';

// Which level (0-based) the address asks for, from its ?level=, 1-based.
// The first level for anything missing or out of range.
export function levelFromSearch(search) {
  const n = Number(new URLSearchParams(search).get('level'));
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}

// The line under the flask.
export function countText(game, index) {
  return `Level ${index + 1} · ${game.taken} / ${game.target} cells`;
}

// The end-of-level pop-up's words: { title, message, button }.
export function resultText(game, index) {
  if (game.over === 'lost') {
    return {
      title: 'Caught by antibodies!',
      message: `Flo took ${game.taken} of ${game.target} cells. Antibodies stick to her spikes so she can’t get into cells.`,
      button: 'Try again',
    };
  }
  const streak = game.bestStreak >= 3 ? ` Best streak: ×${game.bestStreak}!` : '';
  if (index === LEVELS.length - 1) {
    return { title: 'You won them all!', message: `Flo took over the flask on every level.${streak}`, button: 'Play again' };
  }
  return { title: 'You won!', message: `Flo took ${game.taken} cells.${streak}`, button: 'Next level' };
}

// A pal's drawing from pals.js, as an image the canvas can draw.
export function palImage(pal) {
  const image = new Image();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${pal.art}</svg>`;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return image;
}

// Start the page. Returns a few handles for tests.
export function start() {
  const virus = VIRUSES[PAL];
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#flask');
  const ctx = canvas.getContext('2d');
  const banner = $('.win-banner');
  const image = palImage(palById(PAL));
  const keys = arrowKeys();
  const finger = touchSteering(canvas);
  watchInputMode();
  let index = levelFromSearch(location.search);
  let game;

  function begin(next) {
    index = next;
    game = createGame(LEVELS[index], virus);
    banner.hidden = true;
    hideFact();
    $('.cell-count').textContent = countText(game, index);
  }

  function finish() {
    const won = game.over === 'won';
    const { title, message, button } = resultText(game, index);
    $('.win-title').textContent = title;
    $('.win-message').textContent = message;
    $('.play-again').textContent = button;
    showFact(PAL, virus);
    banner.hidden = false;
    if (won) sporeBurst(canvas, { big: index === LEVELS.length - 1 });
  }

  $('.play-again').addEventListener('click', () => {
    if (game.over === 'lost') begin(index);
    else begin(index === LEVELS.length - 1 ? 0 : index + 1);
  });

  // Steering: the arrow keys, a dragging finger, or a held-down mouse, as
  // in PetriPals. Finger and mouse positions are in screen px, so scale
  // them to flask units.
  function steerPal(dt) {
    const scale = FLASK.width / (canvas.clientWidth || FLASK.width);
    const target = finger.target();
    const spot = target && [FLASK.width / 2 + target[0] * scale, FLASK.height / 2 + target[1] * scale];
    const [dx, dy] = finger.drag();
    const maxStep = virus.speed * dt;
    const where = { x: game.pal.x, y: game.pal.y };
    steer(where, keys.direction(), spot, maxStep, 2, [dx * scale, dy * scale], maxStep * 3);
    move(game, where.x - game.pal.x, where.y - game.pal.y);
  }

  // Keep the canvas sharp at any size: draw at the screen's real pixels.
  function fit() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio) || FLASK.width;
    canvas.height = Math.round((canvas.width * FLASK.height) / FLASK.width);
    const scale = canvas.width / FLASK.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  let last = null;
  function frame(now) {
    // At most 1/20 s at a time, so coming back to a hidden tab doesn't jump.
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!game.over) {
      steerPal(dt);
      const events = step(game, dt);
      $('.cell-count').textContent = countText(game, index);
      if (events.some((e) => e.type === 'won' || e.type === 'lost')) finish();
    }
    drawFlask(ctx, game, image);
    requestAnimationFrame(frame);
  }

  begin(index);
  requestAnimationFrame(frame);
  return { get game() { return game; }, begin };
}

// Start right away on the game page. Exported so tests can reach the game.
export const running = document.querySelector('#flask') ? start() : null;
