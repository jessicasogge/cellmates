// The game page: draws the flask from flask.js, steers the mate with the
// arrow keys or a finger, and shows the pop-up when the level ends.
// Opened as flask.html?mate=flo&level=2.

import { showFact } from './facts.js';
import { CELL_SIZE, HEIGHT, LEVELS, newGame, step, WIDTH } from './flask.js';
import { hexPoints } from './hexgrid.js';
import { arrowKeys } from './keyboard.js';
import { mateArt, PLAYABLE_MATES } from './mates.js';
import { sporeBurst } from './spores.js';
import { steer, touchSteering, watchInputMode } from './touch.js';

const SVG = 'http://www.w3.org/2000/svg';
const SPEED = 140; // flask units per second
const PLAYER_SIZE = 38; // how big she's drawn, in flask units

const svgEl = (name, attributes = {}) => {
  const el = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
};

// Which mate and level the page was opened for. Anyone you can't play as
// yet, or a level that doesn't exist, falls back to the first.
export function readParams(search) {
  const params = new URLSearchParams(search);
  const mate = PLAYABLE_MATES.find((p) => p.id === params.get('mate')) ?? PLAYABLE_MATES[0];
  const level = Math.min(LEVELS, Math.max(1, Number.parseInt(params.get('level'), 10) || 1));
  return { mate, level };
}

const levelLink = (mate, level) => `./flask.html?mate=${mate.id}&level=${level}`;

// The little lock drawn on each cell, by its kind (flask.js): her teal dot,
// or one of the other viruses' locks.
const LOCKS = {
  match: (x, y) => svgEl('circle', { cx: x, cy: y, r: 3.5, class: 'badge match' }),
  square: (x, y) => svgEl('rect', { x: x - 3, y: y - 3, width: 6, height: 6, rx: 1, class: 'badge wrong square' }),
  ring: (x, y) => svgEl('circle', { cx: x, cy: y, r: 2.8, class: 'badge wrong ring' }),
  triangle: (x, y) => svgEl('polygon', { points: `${x},${y - 4} ${x + 4},${y + 3} ${x - 4},${y + 3}`, class: 'badge wrong triangle' }),
  diamond: (x, y) => svgEl('polygon', { points: `${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`, class: 'badge wrong diamond' }),
};

// Draw the flask: every cell with its lock, the antibody drops and the mate
// herself.
function drawFlask(game, mate, flask) {
  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'flask-svg' });
  const cells = game.cells.map((cell) => {
    const g = svgEl('g', { class: 'cell healthy' });
    g.append(
      svgEl('polygon', { points: hexPoints(cell.x, cell.y, CELL_SIZE - 1), class: 'cell-body' }),
      svgEl('circle', { cx: cell.x, cy: cell.y, r: 4, class: 'nucleus' }),
      LOCKS[cell.lock](cell.x, cell.y - 11),
    );
    svg.append(g);
    return g;
  });
  const clouds = game.antibodies.map((drop) => {
    const cloud = svgEl('circle', { cx: drop.x, cy: drop.y, r: 0, class: 'antibody-cloud' });
    const icon = svgEl('g', { class: 'antibody' });
    icon.append(
      svgEl('circle', { r: 9 }),
      svgEl('path', { d: 'M0 5.5 V0 L-4 -5 M0 0 L4 -5' }),
    );
    svg.append(cloud, icon);
    return { cloud, icon };
  });
  const player = svgEl('g', { class: 'player' });
  const art = mateArt(mate);
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
  const { mate, level } = readParams(search);
  const game = newGame({ level, random });
  const $ = (selector) => document.querySelector(selector);

  $('.dish-title .species').textContent = mate.species;
  const drawn = drawFlask(game, mate, $('.flask'));

  const render = () => {
    game.cells.forEach((cell, i) => drawn.cells[i].setAttribute('class', `cell ${cell.state}${cell.match ? '' : ' wall'}`));
    game.antibodies.forEach((drop, i) => {
      const { cloud, icon } = drawn.clouds[i];
      const [x, y] = [drop.x.toFixed(1), drop.y.toFixed(1)];
      cloud.setAttribute('cx', x);
      cloud.setAttribute('cy', y);
      cloud.setAttribute('r', drop.r.toFixed(1));
      icon.setAttribute('transform', `translate(${x} ${y})`);
    });
    const { player } = game;
    drawn.player.setAttribute('transform', `translate(${player.x.toFixed(1)} ${player.y.toFixed(1)})`);
    drawn.player.setAttribute('class', player.inside === null ? 'player' : 'player inside');
    $('.cell-count').textContent = `Level ${level} · ${game.bursts} / ${game.target} cells burst`;
  };

  const showEnd = () => {
    const banner = $('.win-banner');
    const next = $('.banner-next');
    if (game.over === 'cleared') {
      const last = level === LEVELS;
      $('.banner-title').textContent = last ? 'You cleared every level!' : `Level ${level} cleared!`;
      $('.banner-text').textContent = `${mate.name} burst ${game.bursts} cells.`;
      next.textContent = last ? 'Play again' : `Level ${level + 1}: one more antibody`;
      next.href = levelLink(mate, last ? 1 : level + 1);
      sporeBurst($('.flask'), { big: last });
    } else {
      $('.banner-title').textContent = `${mate.name} was neutralized!`;
      $('.banner-text').textContent =
        'Antibodies stuck to her, so she can’t get into cells anymore. That’s how your body fights off a virus.';
      next.textContent = `Try level ${level} again`;
      next.href = levelLink(mate, level);
    }
    showFact(mate.id, mate);
    banner.hidden = false;
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

  // Her name over the flask, and in the tips.
  for (const name of document.querySelectorAll('.mate-name')) name.textContent = mate.name;
  render();
  frame(tick);
  return { game, tick };
}

if (document.querySelector('.flask')) startGame();
