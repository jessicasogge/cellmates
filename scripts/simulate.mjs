// Plays each level many times with a simple computer player, to help tune
// the numbers in public/game/config.js. Run it with:
//
//   node scripts/simulate.mjs
//
// The player steers for the nearest cell it can get into that a cloud won't
// cover, curving around clouds on the way. It never hesitates, but doesn't
// plan ahead. The script prints how often
// it wins, how long that takes, how long her trail got, how many cells her
// copies took for her, and the best streak.
import { canEnter, createGame, move, step } from '../public/game/flask.js';
import { LEVELS, VIRUSES } from '../public/game/config.js';

const GAMES = 300;
const flo = VIRUSES.flo;

// The way to steer from (x, y) toward `to`: straight at it, pushed away from
// any cloud close by, the way a player curves around one.
function heading(game, x, y, to) {
  let hx = to.x - x;
  let hy = to.y - y;
  const len = Math.hypot(hx, hy) || 1;
  [hx, hy] = [hx / len, hy / len];
  for (const c of game.clouds) {
    const d = Math.hypot(x - c.x, y - c.y) || 1;
    const room = game.level.size + 22;
    if (d < room) {
      const push = ((room - d) / 10) ** 2;
      hx += ((x - c.x) / d) * push;
      hy += ((y - c.y) / d) * push;
    }
  }
  const h = Math.hypot(hx, hy) || 1;
  return [hx / h, hy / h];
}

// A cell is worth heading for unless a fully spread cloud covers it.
function reachable(game, cell) {
  return game.clouds.every((c) => Math.hypot(cell.x - c.x, cell.y - c.y) > game.level.size + 12);
}

// `human` plays more like a person: it picks a new cell to head for only
// every 0.4 s, steers a little off, and slows down for turns.
function play(level, human) {
  const game = createGame(level, flo);
  let byPal = 0;
  let longest = 0;
  let target = null;
  let rethink = 0;
  while (!game.over && game.time < 180) {
    const { pal } = game;
    rethink -= 1 / 60;
    if (!human || rethink <= 0 || !canEnter(target, true)) {
      const options = game.cells.filter((c) => canEnter(c, true) && reachable(game, c));
      target = options.length
        ? options.reduce((a, b) => (Math.hypot(a.x - pal.x, a.y - pal.y) < Math.hypot(b.x - pal.x, b.y - pal.y) ? a : b))
        : null;
      rethink = 0.4;
    }
    if (target) {
      let [hx, hy] = heading(game, pal.x, pal.y, target);
      const speed = human ? flo.speed * 0.6 : flo.speed;
      if (human) [hx, hy] = [hx + (Math.random() - 0.5) * 0.4, hy + (Math.random() - 0.5) * 0.4];
      move(game, (hx * speed) / 60, (hy * speed) / 60);
    }
    for (const e of step(game, 1 / 60)) if (e.type === 'infected' && e.byPal) byPal++;
    longest = Math.max(longest, game.copies.length);
  }
  return {
    won: game.over === 'won', time: game.time, byPal, taken: game.taken, target: game.target, longest, streak: game.bestStreak,
  };
}

const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
for (const human of [false, true]) {
  console.log(human ? 'A more human player:' : 'A perfect player:');
  for (const [i, level] of LEVELS.entries()) {
    const games = Array.from({ length: GAMES }, () => play(level, human));
    const wins = games.filter((g) => g.won);
    console.log(
      `  Level ${i + 1} (target ${median(games.map((g) => g.target))}): wins ${Math.round((wins.length / GAMES) * 100)}%` +
        `, seconds ${median(wins.map((g) => g.time))?.toFixed(0)}` +
        `, Flo took ${median(games.map((g) => g.byPal))} of ${median(games.map((g) => g.taken))}` +
        `, longest trail ${median(games.map((g) => g.longest))}, best streak ${median(games.map((g) => g.streak))}`,
    );
  }
}
