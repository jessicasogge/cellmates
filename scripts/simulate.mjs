// Plays Burst or Wait many times with simple computer players, to help tune
// the numbers in public/game/config.js. Run it with:
//
//   node scripts/simulate.mjs
//
// Each player bursts once the alarm reaches a set level (and uses the
// anti-defense protein once the alarm passes half that). A good tuning has a
// best level somewhere in the middle, not "always burst early" or "always
// wait", and a run that lasts about a minute.
import { burst, block, createRun, step } from '../public/game/cell.js';
import { HOST, VIRUSES } from '../public/game/config.js';

const RUNS = 2000;

function play(burstAt) {
  const run = createRun(VIRUSES.tess, HOST);
  let time = 0;
  while (!run.over && time < 3600) {
    if (run.cell.alarm >= burstAt / 2) block(run);
    if (run.cell.alarm >= burstAt) burst(run);
    step(run, 1 / 60);
    time += 1 / 60;
  }
  return { score: run.score, cells: run.number, time };
}

const percentile = (sorted, p) => sorted[Math.floor(p * (sorted.length - 1))];
console.log('burst at  score p25 / p50 / p75 / p90    cells (median)  minutes (median)');
for (const burstAt of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
  const runs = Array.from({ length: RUNS }, () => play(burstAt));
  const scores = runs.map((r) => r.score).sort((a, b) => a - b);
  const cells = runs.map((r) => r.cells).sort((a, b) => a - b);
  const times = runs.map((r) => r.time).sort((a, b) => a - b);
  console.log(
    `${burstAt.toFixed(1).padStart(8)}  ${[0.25, 0.5, 0.75, 0.9].map((p) => String(percentile(scores, p)).padStart(5)).join(' / ')}` +
      `    ${String(percentile(cells, 0.5)).padStart(6)}          ${(percentile(times, 0.5) / 60).toFixed(1)}`,
  );
}
