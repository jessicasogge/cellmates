// The Plaque Assay game loop: steer with the arrow keys or by touch, get
// into cells to make copies of her, and the level-complete or win pop-up.
// There's nothing to dodge, so there's no way to lose.
import { levelBanner } from './banner.js';
import { GAME, LEVELS } from './config.js';
import { showFact } from './facts.js';
import { arrowKeys } from './keyboard.js';
import { sporeBurst } from './spores.js';
import { makeSwarm } from './swarm.js';
import { steer, touchSteering } from './touch.js';
import { track } from './track.js';

// `mateEl` is her drawing in the dish and `hosts` the lawn (hosts.js).
// `level` is which level this is (1 to 7) and `target` how many copies of
// her it takes to beat it.
export function playGame(mateEl, species, hosts, { level = 1, target = LEVELS[0].target } = {}) {
  const agar = document.querySelector('.agar');
  const counter = document.querySelector('.cell-count');
  const dishRadius = () => agar.clientWidth / 2;

  const playerMover = document.querySelector('.mate-mover');
  playerMover.classList.add('player');
  // Drawn at her own size: always smaller than a cell.
  playerMover.style.width = `${species.size * 100}%`;
  const player = { x: 0, y: 0, facing: 1, mover: playerMover };
  const swarm = makeSwarm({ player, svg: mateEl, hosts, species, onChange: () => updateCounter() });

  let finished = false;
  let lastTime = null;
  const keys = arrowKeys();
  // Drag with a finger anywhere on the dish, rim included (or hold a mouse
  // button where to go).
  const touch = touchSteering(agar, agar.closest('.petri-dish') ?? agar);

  // The level-complete or win pop-up and its button.
  const banner = levelBanner(level);

  function updateCounter() {
    const shown = Math.min(swarm.made(), target);
    counter.textContent = `Level ${level} · ${shown} / ${target} copies made`;
  }

  function step(time) {
    const seconds = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    const radius = dishRadius();

    // Inside a cell, she can't move until it bursts.
    if (!finished && !swarm.inside()) {
      steer(player, keys.direction(), touch.target(), GAME.SPEED * radius * seconds, GAME.ARRIVE * radius,
        touch.drag(), GAME.DRAG_SPEED * radius * seconds);
      keepInDish(player, radius, swarm.reach);
    }

    swarm.step(seconds, radius, { infect: !finished });

    if (!finished && swarm.made() >= target) {
      // Celebrate the moment she's made enough copies, and stop play.
      finished = true;
      keys.stop();
      touch.stop();
      hosts.stop();
      sporeBurst(playerMover, { big: level === LEVELS.length });
      setTimeout(showWin, 400);
    }

    requestAnimationFrame(step);
  }

  function showWin() {
    const name = mateEl.dataset.name;
    const mate = mateEl.dataset.mate;
    track(`level-complete/${mate}/level-${level}`, `${name} finished level ${level}`);
    if (level === LEVELS.length) track(`won-all-levels/${mate}`, `${name} beat every level`);
    showFact(mate, species);
    if (level < LEVELS.length) {
      banner.show(`Level ${level} complete!`, `${name} made ${target} copies of herself!`,
        `Play level ${level + 1}`, { next: level + 1 });
    } else {
      banner.show('You won!', `You beat all ${LEVELS.length} levels: ${name} made ${target} copies of herself!`,
        'Play again', { next: 1 });
    }
  }

  // Keep the how-to-play target in step with the real one.
  for (const el of document.querySelectorAll('.target-copies')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
}

// Keep her inside the dish, sliding along the rim. `reach` is how far she
// reaches from her center, in dish radii.
export function keepInDish(player, radius, reach) {
  const limit = Math.max(0, radius - reach * radius);
  const fromCenter = Math.hypot(player.x, player.y);
  if (fromCenter <= limit) return;
  player.x *= limit / fromCenter;
  player.y *= limit / fromCenter;
}
