// Plays each level many times with a simple computer player, to help tune
// the numbers in public/game/config.js. Run it with:
//
//   node scripts/simulate.mjs
//
// The player steers straight for the nearest cell it can get into whose path
// doesn't touch an antibody cloud (as big as it will get). It's a careful but
// not clever player. The script prints how often it wins, how long that
// takes, and how many cells the free copies took on their own.
import { canEnter, createGame, move, step } from '../public/game/flask.js';
import { ANTIBODIES, LEVELS, VIRUSES } from '../public/game/config.js';

const GAMES = 300;
const flo = VIRUSES.flo;

function safePath(game, from, to) {
  return game.clouds.every((c) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const t = Math.max(0, Math.min(1, ((c.x - from.x) * dx + (c.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(from.x + dx * t - c.x, from.y + dy * t - c.y) > ANTIBODIES.radius + 8;
  });
}

function play(level) {
  const game = createGame(level, flo);
  let byPal = 0;
  while (!game.over && game.time < 180) {
    const { pal } = game;
    if (!pal.inside) {
      const options = game.cells.filter((c) => canEnter(c, true) && safePath(game, pal, c));
      if (options.length) {
        const target = options.reduce((a, b) =>
          Math.hypot(a.x - pal.x, a.y - pal.y) < Math.hypot(b.x - pal.x, b.y - pal.y) ? a : b);
        const d = Math.hypot(target.x - pal.x, target.y - pal.y);
        const stepSize = Math.min(d, flo.speed / 60);
        move(game, ((target.x - pal.x) / d) * stepSize, ((target.y - pal.y) / d) * stepSize);
      }
    }
    for (const e of step(game, 1 / 60)) if (e.type === 'entered') byPal++;
  }
  return { won: game.over === 'won', time: game.time, byPal, taken: game.taken };
}

const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
for (const [i, level] of LEVELS.entries()) {
  const games = Array.from({ length: GAMES }, () => play(level));
  const wins = games.filter((g) => g.won);
  console.log(
    `Level ${i + 1} (target ${level.target}): wins ${Math.round((wins.length / GAMES) * 100)}%` +
      `, seconds ${median(wins.map((g) => g.time))?.toFixed(0)}` +
      `, cells taken by Flo ${median(games.map((g) => g.byPal))} of ${median(games.map((g) => g.taken))}`,
  );
}
