// Plays Plaque many times with simple computer players, to help tune the
// numbers in public/game/config.js. Run it with:
//
//   node scripts/simulate.mjs
//
// Each player can tap a few times a second (like a person), and bursts the
// ready cell closest to self-destructing, once its danger passes a set level
// or it's full. A good tuning lets a quick, careful player win about half
// the time, and doesn't let any player win by just tapping as fast as possible.
import { burst, cleared, createDish, danger, isOver, mostUrgent, step } from '../public/game/lawn.js';
import { LAWN, VIRUSES } from '../public/game/config.js';

const DISHES = 400;

function play(tapsPerSecond, waitUntil) {
  const dish = createDish(VIRUSES.tess, LAWN);
  let sinceTap = 0;
  while (!isOver(dish) && dish.time < 600) {
    sinceTap += 1 / 60;
    if (sinceTap >= 1 / tapsPerSecond) {
      const cell = mostUrgent(dish);
      if (cell && (danger(dish, cell) >= waitUntil || cell.copies >= dish.virus.full)) {
        burst(dish, cell);
        sinceTap = 0;
      }
    }
    step(dish, 1 / 60);
  }
  return { cleared: cleared(dish), time: dish.time };
}

const percentile = (sorted, p) => sorted[Math.floor(p * (sorted.length - 1))];
console.log(`cells: ${createDish(VIRUSES.tess, LAWN).cells.length}, target ${LAWN.target}`);
console.log('taps/s  waits to  cleared p25 / p50 / p75   wins   seconds (median)');
for (const taps of [2, 3, 4]) {
  for (const waitUntil of [0, 0.4, 0.7, 0.9]) {
    const dishes = Array.from({ length: DISHES }, () => play(taps, waitUntil));
    const shares = dishes.map((d) => d.cleared).sort((a, b) => a - b);
    const times = dishes.map((d) => d.time).sort((a, b) => a - b);
    const wins = dishes.filter((d) => d.cleared >= LAWN.target).length / DISHES;
    console.log(
      `${String(taps).padStart(6)}  ${waitUntil.toFixed(1).padStart(8)}  ${[0.25, 0.5, 0.75].map((p) => percentile(shares, p).toFixed(2)).join(' / ')}` +
        `   ${(wins * 100).toFixed(0).padStart(3)}%   ${percentile(times, 0.5).toFixed(0)}`,
    );
  }
}
