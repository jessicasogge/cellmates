// The Plaque page (plaque.html): runs a dish, draws it, and handles your
// taps and the end-of-dish pop-up.

import { DISH, LAWN, VIRUSES } from './config.js';
import { burst, canBurst, cellAt, cleared, createDish, hasWon, isOver, mostUrgent, step } from './lawn.js';
import { drawDish, POP_TIME } from './draw.js';
import { palById } from './pals.js';
import { hideFact, showFact } from './facts.js';
import { sporeBurst } from './spores.js';

const PAL = 'tess';

// The line under the dish: how much of the lawn is cleared, and the goal.
export function clearedText(dish) {
  return `Cleared ${Math.round(cleared(dish) * 100)}% of the lawn · goal ${Math.round(dish.lawn.target * 100)}%`;
}

// The end-of-dish pop-up's words: { title, message }.
export function resultText(dish) {
  const percent = Math.round(cleared(dish) * 100);
  if (hasWon(dish)) return { title: 'You won!', message: `Tess’s plaque cleared ${percent}% of the lawn.` };
  const close = cleared(dish) >= dish.lawn.target * 0.8;
  return {
    title: close ? 'So close!' : 'The plaque stopped growing',
    message: `Tess cleared ${percent}% of the lawn. Try bursting cells when they’re fuller, but before they turn red.`,
  };
}

// The cell a tap at (x, y) means: the one under it if it can be burst, or
// else the nearest one that can, if it's close by. Fingers are big and
// cells are small.
export function tappedCell(dish, x, y) {
  const under = cellAt(dish, x, y);
  if (canBurst(under)) return under;
  let best;
  let nearest = DISH.cellSize * 1.4;
  for (const cell of dish.cells) {
    const distance = Math.hypot(cell.x - x, cell.y - y);
    if (canBurst(cell) && distance < nearest) {
      best = cell;
      nearest = distance;
    }
  }
  return best;
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
  const canvas = $('#dish');
  const ctx = canvas.getContext('2d');
  const banner = $('.win-banner');
  const view = { palImage: palImage(palById(PAL)), pops: [], clock: 0 };
  let dish;
  let done;

  function restart() {
    dish = createDish(virus, LAWN);
    done = false;
    view.pops = [];
    banner.hidden = true;
    hideFact();
    $('.cleared').textContent = clearedText(dish);
  }

  function finish() {
    done = true;
    const { title, message } = resultText(dish);
    $('.win-title').textContent = title;
    $('.win-message').textContent = message;
    showFact(PAL, virus);
    banner.hidden = false;
    if (hasWon(dish)) sporeBurst(canvas, { big: true });
  }

  function tryBurst(cell) {
    const event = burst(dish, cell);
    if (!event) return;
    view.pops.push({ cell: event.cell, infected: event.infected, age: 0 });
    $('.cleared').textContent = clearedText(dish);
  }

  // Tapping (or clicking) a cell bursts it.
  canvas.addEventListener('pointerdown', (e) => {
    if (done) return;
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * DISH.size;
    const y = ((e.clientY - box.top) / box.height) * DISH.size;
    tryBurst(tappedCell(dish, x, y));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' || e.target.closest?.('button, a')) return; // let buttons and links work
    e.preventDefault();
    if (done) restart();
    else tryBurst(mostUrgent(dish));
  });

  $('.play-again').addEventListener('click', restart);

  // Keep the canvas sharp at any size: draw at the screen's real pixels.
  function fit() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio) || DISH.size;
    canvas.height = canvas.width;
    const scale = canvas.width / DISH.size;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  let last = null;
  function frame(now) {
    // At most 1/20 s at a time, so coming back to a hidden tab doesn't jump.
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    view.clock += dt;
    if (!done) {
      step(dish, dt);
      if (isOver(dish)) finish();
    }
    for (const pop of view.pops) pop.age += dt;
    view.pops = view.pops.filter((pop) => pop.age < POP_TIME);
    drawDish(ctx, dish, view);
    requestAnimationFrame(frame);
  }

  restart();
  requestAnimationFrame(frame);
  return { get dish() { return dish; }, view, restart };
}

// Start right away on the game page. Exported so tests can reach the game.
export const running = document.querySelector('#dish') ? start() : null;
