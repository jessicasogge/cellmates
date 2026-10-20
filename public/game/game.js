// The Plaque Assay game loop: steer with the arrow keys or by touch, infect
// cells to make copies of her, keep clear of the disks, and the
// level-complete, win or game-over pop-up.
import { spreadZones, touchedDisk, touchMessage } from './antiviral.js';
import { levelBanner } from './banner.js';
import { GAME, LEVELS } from './config.js';
import { showFact } from './facts.js';
import { arrowKeys } from './keyboard.js';
import { sporeBurst } from './spores.js';
import { makeSwarm } from './swarm.js';
import { steer, touchSteering } from './touch.js';
import { track } from './track.js';

// `mateEl` is her drawing in the dish, `hosts` the lawn (hosts.js) and
// `disks` the disks (antiviral.js). `level` is which level this is (1 to 7)
// and `target` how many copies of her it takes to beat it.
export function playGame(mateEl, species, hosts, disks, { level = 1, target = LEVELS[0].target } = {}) {
  const agar = document.querySelector('.agar');
  const counter = document.querySelector('.cell-count');
  const dishRadius = () => agar.clientWidth / 2;

  const playerMover = document.querySelector('.mate-mover');
  playerMover.classList.add('player');
  // Drawn at her own size: always smaller than a cell.
  playerMover.style.width = `${species.size * 100}%`;
  const player = { x: 0, y: 0, facing: 1, mover: playerMover };
  const swarm = makeSwarm({
    player, svg: mateEl, hosts, disks, species, target, onChange: () => updateCounter(),
  });

  let finished = false;
  let lastTime = null;
  // How long the level has been running, for how far the zones have spread.
  // Built from the same capped frame times as everything else, so the zones
  // don't jump ahead after the tab was hidden for a while.
  let elapsed = 0;
  const keys = arrowKeys();
  // Drag with a finger anywhere on the dish, rim included (or hold a mouse
  // button where to go).
  const touch = touchSteering(agar, agar.closest('.petri-dish') ?? agar);

  // The level-complete, win or game-over pop-up and its buttons.
  const banner = levelBanner(level);

  function updateCounter() {
    const shown = Math.min(swarm.count(), target);
    counter.textContent = `Level ${level} · ${shown} / ${target} copies`;
  }

  function stop() {
    finished = true;
    keys.stop();
    touch.stop();
    hosts.stop();
  }

  function step(time) {
    const seconds = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    const radius = dishRadius();

    if (!finished) {
      // The zones keep spreading until the level ends.
      elapsed += seconds;
      spreadZones(disks, elapsed);
      steer(player, keys.direction(), touch.target(), GAME.SPEED * radius * seconds, GAME.ARRIVE * radius,
        touch.drag(), GAME.DRAG_SPEED * radius * seconds);
      keepInDish(player, radius, swarm.reach);
    }

    swarm.step(seconds, radius, { infect: !finished });

    // Touching a disk, or the zone around it, is game over (except the
    // antibiotic's: antibiotics can't hurt viruses).
    const hit = finished ? null : touchedDisk(disks, swarm.body(radius), radius);
    if (hit) {
      stop();
      playerMover.classList.add('killed');
      setTimeout(() => showGameOver(hit), 500);
    } else if (!finished && swarm.count() >= target) {
      // Celebrate the moment there are enough copies, and stop play so a
      // disk can't be touched after winning.
      stop();
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
      banner.show(`Level ${level} complete!`, `You made ${target} copies of ${name}!`,
        `Play level ${level + 1}`, { next: level + 1 });
    } else {
      banner.show('You won!', `You beat all ${LEVELS.length} levels with ${target} copies of ${name}!`,
        'Play again', { next: 1 });
    }
  }

  function showGameOver(disk) {
    showFact(mateEl.dataset.mate, species);
    const { code, name } = disk.drug;
    track(`game-over/${mateEl.dataset.mate}/level-${level}/${code}`,
      `${mateEl.dataset.name} hit ${name} on level ${level}`);
    banner.show(
      'Game over',
      touchMessage(mateEl.dataset.name, disk),
      `Try level ${level} again`,
      { startOver: level > 1 }, // on level 1 they'd do the same thing
    );
  }

  // The zones start small and spread from there (drawn before the first frame).
  spreadZones(disks, 0);

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
