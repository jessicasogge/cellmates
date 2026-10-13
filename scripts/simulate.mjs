// Plays each level many times with a simple computer player, to help tune
// the numbers in public/game/config.js. Run it with:
//
//   node scripts/simulate.mjs
//
// The player aims for a random cell with the receptor whose straight path
// misses the antibodies, and waits for each chain to end before flicking
// again, so it's roughly a careful beginner. It prints the share of cells
// taken (10th, 25th, 50th, 75th and 90th percentiles) and how many rounds
// got 0, 1, 2 and 3 stars.
import { canFlick, createGame, flick, isOver, share, stars, step } from '../public/game/infect.js';
import { DRIFT, FLASK, LEVELS, VIRUSES } from '../public/game/config.js';

const ROUNDS = 100;
const { launch } = FLASK;

// Whether a straight flick from the neck to `cell` misses every antibody cloud.
function clearPath(game, cell) {
  const dx = cell.x - launch.x;
  const dy = cell.y - launch.y;
  const length2 = dx * dx + dy * dy;
  return game.antibodies.every((a) => {
    const t = Math.max(0, Math.min(1, ((a.x - launch.x) * dx + (a.y - launch.y) * dy) / length2));
    return Math.hypot(launch.x + dx * t - a.x, launch.y + dy * t - a.y) > a.r + 6;
  });
}

function playRound(level) {
  const game = createGame(level, VIRUSES.flo);
  let time = 0;
  while (!isOver(game) && time < 200) {
    const quiet = game.virions.length === 0 && !game.cells.some((c) => c.state === 'infected');
    if (canFlick(game) && quiet) {
      const open = game.cells.filter((c) => c.receptor && c.state === 'healthy');
      const safe = open.filter((c) => clearPath(game, c));
      const choices = safe.length ? safe : open;
      const cell = choices[Math.floor(Math.random() * choices.length)];
      const dx = cell.x - launch.x;
      const dy = cell.y - launch.y;
      const distance = Math.hypot(dx, dy);
      const speed = distance * DRIFT.drag + DRIFT.settle; // so she slows to a stop there
      flick(game, (dx / distance) * speed, (dy / distance) * speed);
    }
    step(game, 1 / 60);
    time += 1 / 60;
  }
  return { share: share(game), stars: stars(game) };
}

const percentile = (sorted, p) => sorted[Math.floor(p * (sorted.length - 1))].toFixed(2);
for (const [i, level] of LEVELS.entries()) {
  const rounds = Array.from({ length: ROUNDS }, () => playRound(level));
  const shares = rounds.map((r) => r.share).sort((a, b) => a - b);
  const starCounts = [0, 1, 2, 3].map((n) => rounds.filter((r) => r.stars === n).length);
  console.log(
    `Level ${i + 1}: taken ${[0.1, 0.25, 0.5, 0.75, 0.9].map((p) => percentile(shares, p)).join(' / ')}` +
      `  stars (0, 1, 2, 3): ${starCounts.join(', ')}  needs ${level.stars.join(' / ')}`,
  );
}
