// @vitest-environment jsdom
// game.js runs a level of Plaque Assay: steer, infect cells to make copies of
// her, and show the level-complete, win or game-over pop-up. These tests
// load the real petri dish page into jsdom and stand in for the swarm,
// steering and effects, so each test can say exactly what happens ("there
// are 4 copies", "she touched a disk") and then check what the player sees.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';
import { plainText } from '../public/game/italics.js';

// A stand-in swarm whose count each test sets.
const fake = vi.hoisted(() => ({ swarm: null, hit: null, keys: [0, 0] }));

vi.mock('../public/game/swarm.js', () => ({ makeSwarm: vi.fn(() => fake.swarm) }));
vi.mock('../public/game/keyboard.js', () => ({
  arrowKeys: vi.fn(() => ({ direction: () => fake.keys, stop: vi.fn() })),
}));
vi.mock('../public/game/touch.js', async (importActual) => ({
  steer: (await importActual()).steer,
  touchSteering: vi.fn(() => ({ target: () => null, drag: () => [0, 0], stop: vi.fn() })),
}));
vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));
vi.mock('../public/game/track.js', () => ({ track: vi.fn() }));
// Keep the real pop-up wording; only decide which disk (if any) is touched.
vi.mock('../public/game/antiviral.js', async (importActual) => ({
  ...(await importActual()),
  touchedDisk: vi.fn(() => fake.hit),
}));

const { keepInDish, playGame } = await import('../public/game/game.js');
const { makeSwarm } = await import('../public/game/swarm.js');
const { sporeBurst } = await import('../public/game/spores.js');

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/petri-dish.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));

let frames; // the animation frames waiting to run
let hosts;
let location;

function makeFakeSwarm() {
  let count = 1;
  return {
    count: () => count,
    setCount(n) { count = n; },
    reach: 0.05,
    body: () => [[0, 0, 5]],
    step: vi.fn(),
  };
}

// Start a level as Tia (or `mate`) and return the pop-up.
function start({ level = 1, target = LEVELS[level - 1].target, mate = 'tia', disks = [] } = {}) {
  const mateEl = document.createElement('div');
  mateEl.dataset.mate = mate;
  mateEl.dataset.name = mate[0].toUpperCase() + mate.slice(1);
  playGame(mateEl, SPECIES[mate], hosts, disks, { level, target });
  return document.querySelector('.win-banner');
}

// Run the next animation frame, `ms` after the last one.
let now = 0;
function frame(ms = 16) {
  now += ms;
  const waiting = frames;
  frames = [];
  for (const run of waiting) run(now);
}

const disk = (zone) => ({ fx: 0.5, fy: 0, r: 0.08, zone, drug: SPECIES.tia.disks[1] });

beforeEach(() => {
  document.body.outerHTML = body;
  frames = [];
  now = 0;
  fake.swarm = makeFakeSwarm();
  fake.hit = null;
  fake.keys = [0, 0];
  hosts = { stop: vi.fn() };
  sessionStorage.clear();
  location = { href: 'http://localhost/petri-dish.html?mate=tia&level=3' };
  vi.stubGlobal('location', location);
  vi.stubGlobal('requestAnimationFrame', (run) => frames.push(run));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('the counter', () => {
  it('shows the level and how many copies it takes to win', () => {
    start({ level: 2 });
    expect(document.querySelector('.cell-count').textContent).toBe('Level 2 · 1 / 8 copies');
  });

  it('puts the target in the how-to-play line too', () => {
    start({ level: 3 });
    expect(document.querySelector('.target-copies').textContent).toBe('16');
  });

  it('updates when the swarm changes, and stops at the target', () => {
    start({ level: 1 });
    const [{ onChange }] = vi.mocked(makeSwarm).mock.calls[0];
    fake.swarm.setCount(3);
    onChange();
    expect(document.querySelector('.cell-count').textContent).toBe('Level 1 · 3 / 4 copies');
    fake.swarm.setCount(7);
    onChange();
    expect(document.querySelector('.cell-count').textContent).toBe('Level 1 · 4 / 4 copies');
  });

  it('draws her at her own size', () => {
    start({ mate: 'phoebe' });
    expect(document.querySelector('.mate-mover').style.width).toBe(`${SPECIES.phoebe.size * 100}%`);
  });

  it("makes the swarm with her species, the level's target, and her drawing", () => {
    start({ level: 2, mate: 'missy' });
    const [options] = vi.mocked(makeSwarm).mock.calls[0];
    expect(options.species).toBe(SPECIES.missy);
    expect(options.target).toBe(8);
    expect(options.hosts).toBe(hosts);
    expect(options.svg.dataset.mate).toBe('missy');
  });
});

describe('playing', () => {
  it('moves the swarm on every frame, infecting cells while the level is on', () => {
    start();
    frame();
    frame();
    expect(fake.swarm.step).toHaveBeenCalledTimes(2);
    expect(fake.swarm.step.mock.calls[1][2]).toEqual({ infect: true });
  });

  it('steers her with the arrow keys', () => {
    start();
    const [{ player }] = vi.mocked(makeSwarm).mock.calls[0];
    fake.keys = [1, 0];
    frame();
    frame(50);
    // jsdom has no layout, so the dish is 0px wide and she stays put; what
    // matters is she turned to face the way she's going.
    expect(player.facing).toBe(1);
    fake.keys = [-1, 0];
    frame(50);
    expect(player.facing).toBe(-1);
  });
});

describe('keeping her in the dish', () => {
  it('leaves her alone inside the dish', () => {
    const player = { x: 10, y: 20 };
    keepInDish(player, 200, 0.05);
    expect(player).toEqual({ x: 10, y: 20 });
  });

  it('pulls her back in along the same line when she goes past the rim', () => {
    const player = { x: 300, y: 0 };
    keepInDish(player, 200, 0.05);
    expect(player.x).toBeCloseTo(190);
    expect(player.y).toBe(0);
  });
});

describe('beating a level', () => {
  it('waits until there are enough copies', () => {
    const banner = start({ level: 1 });
    fake.swarm.setCount(3);
    frame();
    vi.runAllTimers();
    expect(banner.hidden).toBe(true);
  });

  it('says the level is complete and offers the next one', () => {
    const banner = start({ level: 2 });
    fake.swarm.setCount(8);
    frame();
    vi.runAllTimers();
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Level 2 complete!');
    expect(banner.querySelector('.win-message').textContent).toBe('You made 8 copies of Tia!');
    expect(banner.querySelector('.play-again').textContent).toBe('Play level 3');
    expect(banner.querySelector('.start-over').hidden).toBe(true);
    expect(sporeBurst).toHaveBeenCalledWith(expect.anything(), { big: false });
  });

  it('says "You won!" after the last level, with a big burst, and starts over from level 1', () => {
    const last = LEVELS.length;
    const banner = start({ level: last });
    fake.swarm.setCount(LEVELS[last - 1].target);
    frame();
    vi.runAllTimers();
    expect(sporeBurst).toHaveBeenCalledWith(expect.anything(), { big: true });
    expect(banner.querySelector('h2').textContent).toBe('You won!');
    expect(banner.querySelector('.win-message').textContent)
      .toBe(`You beat all ${last} levels with ${LEVELS[last - 1].target} copies of Tia!`);
    expect(banner.querySelector('.play-again').textContent).toBe('Play again');
    banner.querySelector('.play-again').click();
    expect(new URL(location.href).searchParams.get('level')).toBe('1');
  });

  it('"Play level N" goes to the next level and keeps the mate', () => {
    const banner = start({ level: 3 });
    fake.swarm.setCount(16);
    frame();
    vi.runAllTimers();
    banner.querySelector('.play-again').click();
    const url = new URL(location.href);
    expect(url.searchParams.get('level')).toBe('4');
    expect(url.searchParams.get('mate')).toBe('tia');
  });

  it('stops play once the target is reached', () => {
    start({ level: 1 });
    fake.swarm.setCount(4);
    frame();
    expect(hosts.stop).toHaveBeenCalled();
    frame();
    expect(fake.swarm.step.mock.calls[1][2]).toEqual({ infect: false });
    // Touching a disk after winning doesn't turn it into a game over.
    fake.hit = disk(0.05);
    frame();
    vi.runAllTimers();
    expect(document.querySelector('.win-banner h2').textContent).toBe('Level 1 complete!');
  });
});

describe('touching a disk', () => {
  it('is game over, with a message naming the disk and how it stops her', () => {
    const banner = start({ level: 2 });
    fake.hit = disk(0.05);
    frame();
    expect(document.querySelector('.mate-mover').classList).toContain('killed');
    expect(hosts.stop).toHaveBeenCalled();
    vi.runAllTimers();
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Game over');
    expect(banner.querySelector('.win-message').textContent)
      .toBe('Tia drifted into the bleach zone. Bleach breaks her protein shell apart.');
  });

  it('waits a moment before the pop-up, so she can be seen greying out', () => {
    const banner = start({ level: 1 });
    fake.hit = disk(0.05);
    frame();
    vi.advanceTimersByTime(499);
    expect(banner.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(banner.hidden).toBe(false);
  });

  it("doesn't let her win after a game over", () => {
    start({ level: 1 });
    fake.hit = disk(0.05);
    frame();
    fake.swarm.setCount(4);
    frame();
    vi.runAllTimers();
    expect(sporeBurst).not.toHaveBeenCalled();
    expect(document.querySelector('.win-banner h2').textContent).toBe('Game over');
  });
});

describe('the game-over buttons', () => {
  function gameOver(level) {
    const banner = start({ level });
    fake.hit = disk(0.05);
    frame();
    vi.runAllTimers();
    return banner;
  }

  it('"Try level N again" replays the same level', () => {
    const banner = gameOver(3);
    expect(banner.querySelector('.play-again').textContent).toBe('Try level 3 again');
    banner.querySelector('.play-again').click();
    expect(new URL(location.href).searchParams.get('level')).toBe('3');
  });

  it('"Start over" goes back to level 1', () => {
    const banner = gameOver(3);
    const startOver = banner.querySelector('.start-over');
    expect(startOver.hidden).toBe(false);
    startOver.click();
    expect(new URL(location.href).searchParams.get('level')).toBe('1');
  });

  it('hides "Start over" on level 1, where it would do the same thing', () => {
    expect(gameOver(1).querySelector('.start-over').hidden).toBe(true);
  });
});

describe('the fun fact', () => {
  const factShown = () => {
    const line = document.querySelector('.fun-fact');
    return line.hidden ? null : line.querySelector('.fun-fact-text').textContent;
  };

  it('is hidden while playing', () => {
    start({ level: 1 });
    frame();
    expect(factShown()).toBeNull();
  });

  it("shows one of the mate's facts when she beats a level", () => {
    start({ level: 1, mate: 'phoebe' });
    fake.swarm.setCount(4);
    frame();
    vi.runAllTimers();
    expect(SPECIES.phoebe.facts.map(plainText)).toContain(factShown());
  });

  it("shows one of the mate's facts on a game over", () => {
    start({ level: 2, mate: 'tia' });
    fake.hit = disk(0.05);
    frame();
    vi.runAllTimers();
    expect(SPECIES.tia.facts.map(plainText)).toContain(factShown());
  });
});

describe('spreading zones', () => {
  const spreading = () => ({ ...disk(0.06), fullZone: 0.06 });

  it('starts the zones small before the first frame', () => {
    const d = spreading();
    start({ disks: [d] });
    expect(d.zone).toBeCloseTo(0.06 * GAME.ZONE_START);
  });

  it('widens them as the level goes on', () => {
    const d = spreading();
    start({ disks: [d] });
    frame();
    const early = d.zone;
    for (let i = 0; i < 100; i++) frame(50);
    expect(d.zone).toBeGreaterThan(early);
  });

  it("doesn't jump ahead after a long pause, like a hidden tab", () => {
    const d = spreading();
    start({ disks: [d] });
    frame();
    frame(60_000);
    expect(d.zone).toBeLessThan(0.06 * 0.5);
  });

  it('stops spreading once the level is over', () => {
    const d = spreading();
    start({ disks: [d] });
    frame();
    fake.hit = d;
    frame(50);
    const atGameOver = d.zone;
    for (let i = 0; i < 50; i++) frame(50);
    expect(d.zone).toBe(atGameOver);
  });
});
