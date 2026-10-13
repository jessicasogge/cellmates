// The flask page (flask.html): runs a level, draws it, and handles your
// flicks, the score, and the end-of-level pop-up.
//
// The level comes from the address: flask.html?level=2. Every round of a
// level lays its cells out the same way, so "Try again" is a fair rematch,
// and your aim stays where it was, so you can tweak your last flick.

import { FLASK, LEVELS, VIRUSES } from './config.js';
import { createGame, flick, isOver, share, stars, step } from './infect.js';
import { aimFromPull, flickVelocity, nudgeAim, START_AIM } from './aim.js';
import { drawFlask, POP_TIME } from './draw.js';
import { pop } from './sound.js';
import { palById } from './pals.js';
import { hideFact, showFact } from './facts.js';
import { sporeBurst } from './spores.js';

const PAL = 'flo';

// What to call out at points in a chain of bursts.
export const CHAIN_CALLS = new Map([
  [5, 'Nice! ×5'],
  [10, 'Burst-tastic! ×10'],
  [20, 'Plaque attack! ×20'],
  [30, 'Flask takeover! ×30'],
  [45, 'Unstoppable! ×45'],
]);

// Which level (0-based) the address asks for, from its ?level=, 1-based.
// The first level for anything missing or out of range.
export function levelFromSearch(search) {
  const n = Number(new URLSearchParams(search).get('level'));
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}

// How many cells you need for each star, for `game`.
export function cellsForStars(game) {
  return game.level.stars.map((needed) => Math.ceil(needed * game.cells.length));
}

// The end-of-level pop-up's words for `game`: { title, detail }.
export function resultText(game, isLast) {
  const got = stars(game);
  const [one, , three] = cellsForStars(game);
  const taken = `You took over ${game.taken} of ${game.cells.length} cells`;
  const chain = game.bestChain > 1 ? `, with a chain of ${game.bestChain}` : '';
  if (got === 0) {
    const close = game.taken >= one * 0.75;
    return {
      title: close ? 'So close!' : 'Not quite!',
      detail: `${taken}${chain}. One star needs ${one}.`,
    };
  }
  const title = got === 3 && isLast ? 'You beat every flask!' : got === 3 ? 'Perfect flask!' : 'Level beaten!';
  const more = got < 3 ? ` Three stars needs ${three}.` : '';
  return { title, detail: `${taken}${chain}.${more}` };
}

// Read and write little saved settings, where the browser allows it.
function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing, etc.: it just won't be remembered.
  }
}

// Flo's drawing from pals.js, as an image the canvas can draw.
export function palImage(pal) {
  const image = new Image();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${pal.art}</svg>`;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return image;
}

// Start the page. Returns a few handles for tests.
export function start() {
  const index = levelFromSearch(location.search);
  const level = LEVELS[index];
  const isLast = index === LEVELS.length - 1;
  const virus = VIRUSES[PAL];
  const canvas = document.querySelector('#flask');
  const ctx = canvas.getContext('2d');
  const $ = (selector) => document.querySelector(selector);
  const result = $('.result');
  const chainCall = $('.chain-call');
  const meter = $('.meter');
  const muteButton = $('.mute');

  const view = { aim: START_AIM, palImage: palImage(palById(PAL)), pops: [] };
  let game;
  let shown; // whether the end-of-level pop-up is up
  let muted = load('cellmates-muted') === '1';

  $('.level-name').textContent = `Level ${index + 1} of ${LEVELS.length}`;

  // The star marks along the meter. The meter is full at three stars.
  const top = level.stars[2];
  for (const needed of level.stars) {
    const mark = document.createElement('span');
    mark.className = 'star-mark';
    mark.textContent = '★';
    // Kept a little in from the end so the last star stays on screen.
    mark.style.left = `${(needed / top) * 94}%`;
    meter.append(mark);
  }
  const marks = [...meter.querySelectorAll('.star-mark')];

  function showMute() {
    muteButton.textContent = muted ? '🔇' : '🔊';
    muteButton.setAttribute('aria-pressed', String(muted));
  }
  muteButton.addEventListener('click', () => {
    muted = !muted;
    save('cellmates-muted', muted ? '1' : '0');
    showMute();
  });
  showMute();

  function call(words) {
    chainCall.textContent = words;
    // Restart the pop-in animation, even if the words are the same.
    chainCall.classList.remove('show');
    void chainCall.offsetWidth;
    chainCall.classList.add('show');
  }

  function showScore() {
    $('.taken').textContent = game.taken === 1 ? '1 cell' : `${game.taken} cells`;
    $('.flicks').textContent = '●'.repeat(game.flicksLeft) + '○'.repeat(level.flicks - game.flicksLeft);
    const filled = Math.min(1, share(game) / top);
    $('.meter-fill').style.width = `${filled * 94}%`;
    meter.setAttribute('aria-valuenow', String(Math.round(filled * 100)));
    const got = stars(game);
    marks.forEach((mark, i) => mark.classList.toggle('earned', i < got));
  }

  function restart() {
    game = createGame(level, virus);
    shown = false;
    view.pops = [];
    result.hidden = true;
    chainCall.textContent = '';
    hideFact();
    showScore();
  }

  function finish() {
    shown = true;
    showScore();
    const got = stars(game);
    const best = Math.max(got, Number(load(`cellmates-best-${index + 1}`)) || 0);
    save(`cellmates-best-${index + 1}`, String(best));
    const { title, detail } = resultText(game, isLast);
    $('.result-title').textContent = title;
    $('.result-stars').replaceChildren(...[0, 1, 2].map((i) => {
      const star = document.createElement('span');
      star.textContent = '★';
      star.classList.toggle('earned', i < got);
      return star;
    }));
    $('.result-detail').textContent = `${detail} Best: ${best} ★`;
    const next = $('.next');
    next.hidden = got === 0 || isLast;
    next.href = `./flask.html?level=${index + 2}`;
    showFact(PAL, virus);
    result.hidden = false;
    if (got > 0) sporeBurst(canvas, { big: isLast && got === 3 });
  }

  function handle(event) {
    if (event.type === 'burst') {
      view.pops.push({ x: event.x, y: event.y, age: 0 });
      if (!muted) pop(event.chain);
      if (CHAIN_CALLS.has(event.chain)) call(CHAIN_CALLS.get(event.chain));
    } else if (event.lead && event.type === 'neutralized') {
      call('Stopped by antibodies!');
    } else if (event.lead && event.type === 'fizzle') {
      call('No receptor there!');
    }
  }

  function tryFlick() {
    if (shown || !flick(game, ...flickVelocity(view.aim))) return;
    showScore();
  }

  // Aiming with a finger or mouse: press, pull back, let go.
  let pull = null;
  canvas.addEventListener('pointerdown', (e) => {
    pull = { x: e.clientX, y: e.clientY, aimed: false };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pull) return;
    const aim = aimFromPull(e.clientX - pull.x, e.clientY - pull.y, canvas.clientWidth * 0.45);
    if (aim) {
      view.aim = aim;
      pull.aimed = true;
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (pull?.aimed) tryFlick();
    pull = null;
  });
  canvas.addEventListener('pointercancel', () => {
    pull = null;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      restart();
      return;
    }
    if (e.target.closest?.('button, a')) return; // let buttons and links work
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      tryFlick();
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      view.aim = nudgeAim(view.aim, e.key);
    }
  });

  $('.again').addEventListener('click', restart);

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
    if (!shown) {
      const before = game.taken;
      const flicksBefore = game.flicksLeft;
      step(game, dt).forEach(handle);
      if (game.taken !== before || game.flicksLeft !== flicksBefore) showScore();
      if (isOver(game)) finish();
    }
    for (const p of view.pops) p.age += dt;
    view.pops = view.pops.filter((p) => p.age < POP_TIME);
    drawFlask(ctx, game, view);
    requestAnimationFrame(frame);
  }

  restart();
  requestAnimationFrame(frame);
  return { get game() { return game; }, view, restart };
}

// Start right away on the flask page. Exported so tests can reach the game.
export const running = document.querySelector('#flask') ? start() : null;
