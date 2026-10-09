// The game page: draws the flask from flask.js, steers the pal with the
// arrow keys or a finger, and shows the pop-up when the level ends.
// Opened as flask.html?pal=flo&level=2.

import { showFact } from './facts.js';
import { CELL_SIZE, HEIGHT, LEVELS, newGame, step, WIDTH } from './flask.js';
import { hexPoints } from './hexgrid.js';
import { arrowKeys } from './keyboard.js';
import { palArt, PLAYABLE_PALS } from './pals.js';
import { sporeBurst } from './spores.js';
import { steer, touchSteering, watchInputMode } from './touch.js';

const SVG = 'http://www.w3.org/2000/svg';
const SPEED = 140; // flask units per second
const PLAYER_SIZE = 48; // how big she's drawn, in flask units

const svgEl = (name, attributes = {}) => {
  const el = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
};

// Which pal and level the page was opened for. Anyone you can't play as
// yet, or a level that doesn't exist, falls back to the first.
export function readParams(search) {
  const params = new URLSearchParams(search);
  const pal = PLAYABLE_PALS.find((p) => p.id === params.get('pal')) ?? PLAYABLE_PALS[0];
  const level = Math.min(LEVELS, Math.max(1, Number.parseInt(params.get('level'), 10) || 1));
  return { pal, level };
}

const levelLink = (pal, level) => `./flask.html?pal=${pal.id}&level=${level}`;

// Draw the flask: every cell (with a dot if it has her receptor, a square
// if not), the antibody drops and the pal herself.
function drawFlask(game, pal, flask) {
  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'flask-svg' });
  const cells = game.cells.map((cell) => {
    const g = svgEl('g', { class: 'cell healthy' });
    g.append(
      svgEl('polygon', { points: hexPoints(cell.x, cell.y, CELL_SIZE - 1), class: 'cell-body' }),
      svgEl('circle', { cx: cell.x, cy: cell.y, r: 6, class: 'nucleus' }),
      cell.match
        ? svgEl('circle', { cx: cell.x, cy: cell.y - 11, r: 3.5, class: 'badge match' })
        : svgEl('rect', { x: cell.x - 3, y: cell.y - 14, width: 6, height: 6, rx: 1, class: 'badge wrong' }),
    );
    svg.append(g);
    return g;
  });
  const clouds = game.antibodies.map((drop) => {
    const cloud = svgEl('circle', { cx: drop.x, cy: drop.y, r: 0, class: 'antibody-cloud' });
    const icon = svgEl('g', { class: 'antibody', transform: `translate(${drop.x} ${drop.y})` });
    icon.append(
      svgEl('circle', { r: 13 }),
      svgEl('path', { d: 'M0 8 V0 L-6 -7 M0 0 L6 -7' }),
    );
    svg.append(cloud, icon);
    return cloud;
  });
  const player = svgEl('g', { class: 'player' });
  const art = palArt(pal);
  for (const [key, value] of Object.entries({
    x: -PLAYER_SIZE / 2, y: -PLAYER_SIZE / 2, width: PLAYER_SIZE, height: PLAYER_SIZE,
  })) art.setAttribute(key, value);
  player.append(art);
  svg.append(player);
  flask.append(svg);
  return { svg, cells, clouds, player };
}

// Start the level the page was opened for. `frame` schedules the next
// frame (requestAnimationFrame, or a stand-in for tests).
export function startGame({
  search = window.location.search,
  random = Math.random,
  frame = (callback) => window.requestAnimationFrame(callback),
} = {}) {
  const { pal, level } = readParams(search);
  const game = newGame({ level, burst: pal.burst, random });
  const $ = (selector) => document.querySelector(selector);

  $('.hud-name').textContent = `${pal.name} · Level ${level}`;
  $('.hud-species').textContent = pal.species;
  $('.progress').setAttribute('aria-valuemax', game.target);
  const drawn = drawFlask(game, pal, $('.flask'));

  const render = () => {
    game.cells.forEach((cell, i) => drawn.cells[i].setAttribute('class', `cell ${cell.state}`));
    game.antibodies.forEach((drop, i) => drawn.clouds[i].setAttribute('r', drop.r.toFixed(1)));
    const { player } = game;
    drawn.player.setAttribute('transform', `translate(${player.x.toFixed(1)} ${player.y.toFixed(1)})`);
    drawn.player.setAttribute('class', player.inside === null ? 'player' : 'player inside');
    const made = Math.min(game.copies, game.target);
    $('.copies').textContent = `${game.copies} / ${game.target}`;
    $('.progress').setAttribute('aria-valuenow', made);
    $('.progress-fill').style.width = `${(100 * made) / game.target}%`;
  };

  const showEnd = () => {
    const popup = $('.popup');
    const next = $('.popup-next');
    $('.popup-pal').replaceChildren(palArt(pal));
    if (game.over === 'cleared') {
      const last = level === LEVELS;
      $('.popup-title').textContent = last ? 'You cleared every level!' : `Level ${level} cleared!`;
      $('.popup-text').textContent = `${pal.name} made ${game.copies} copies of herself.`;
      next.textContent = last ? 'Play again' : `Level ${level + 1}: one more antibody`;
      next.href = levelLink(pal, last ? 1 : level + 1);
      sporeBurst($('.popup-pal'), { big: last });
    } else {
      $('.popup-title').textContent = `${pal.name} was neutralized!`;
      $('.popup-text').textContent =
        'Antibodies stuck to her, so she can’t get into cells anymore. That’s how your body fights off a virus.';
      next.textContent = `Try level ${level} again`;
      next.href = levelLink(pal, level);
    }
    showFact(pal.id, pal);
    popup.hidden = false;
    next.focus();
  };

  watchInputMode();
  const keys = arrowKeys();
  const touch = touchSteering(drawn.svg, $('.flask'));
  let last = null;

  const tick = (now) => {
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    // How many screen px make one flask unit (1 if the page isn't laid out).
    const scale = drawn.svg.getBoundingClientRect().width / WIDTH || 1;
    const target = touch.target();
    const finger = target && [WIDTH / 2 + target[0] / scale, HEIGHT / 2 + target[1] / scale];
    const [dragX, dragY] = touch.drag();
    const mover = { x: game.player.x, y: game.player.y };
    steer(mover, keys.direction(), finger, SPEED * dt, 2, [dragX / scale, dragY / scale], SPEED * dt * 3);
    step(game, dt, [mover.x - game.player.x, mover.y - game.player.y]);
    render();
    if (game.over) {
      keys.stop();
      touch.stop();
      showEnd();
      return;
    }
    frame(tick);
  };

  render();
  frame(tick);
  return { game, tick };
}

if (document.querySelector('.flask')) startGame();
