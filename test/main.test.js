// @vitest-environment jsdom
// main.js starts the petri dish page from its address, e.g.
// petri-dish.html?mate=tia&level=2. These tests load the real page into
// jsdom, a simulated browser page, and check it picks the right mate and
// level, and copes with addresses that are broken or made up.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';

// Don't run the real game loop; just record how the game was started.
vi.mock('../public/game/game.js', () => ({ playGame: vi.fn() }));

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/petri-dish.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));

let location;

// Open the dish page at `search` (like '?mate=tia&level=2') and run main.js.
async function open(search) {
  location = { search, href: `http://localhost/petri-dish.html${search}`, replace: vi.fn() };
  vi.stubGlobal('location', location);
  document.body.outerHTML = body;
  vi.resetModules();
  await import('../public/game/main.js');
  const { playGame } = await import('../public/game/game.js');
  return playGame;
}

beforeEach(() => {
  document.title = 'CellMates | Plaque Assay';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('picking the mate', () => {
  it('shows the chosen mate and hides the others', async () => {
    await open('?mate=phoebe');
    const shown = [...document.querySelectorAll('.dish-mate:not([hidden])')];
    expect(shown.map((el) => el.dataset.mate)).toEqual(['phoebe']);
  });

  it('puts her name, in her color, and her virus above the dish', async () => {
    await open('?mate=missy');
    const name = document.querySelector('.mate-name');
    expect(name.textContent).toBe('Missy');
    // jsdom reports colors as rgb(), so compare against the same color set the same way.
    const expected = document.createElement('span');
    expected.style.color = SPECIES.missy.color;
    expect(name.style.color).toBe(expected.style.color);
    expect(document.querySelector('.species-name').textContent).toBe('Bacteriophage MS2');
  });

  it('names the mate and level in the tab title', async () => {
    await open('?mate=tia&level=3');
    expect(document.title).toBe('CellMates | Tia | Level 3');
  });

  it.each(Object.keys(SPECIES))('starts the game for %s with her own settings', async (mate) => {
    const playGame = await open(`?mate=${mate}`);
    expect(playGame).toHaveBeenCalledTimes(1);
    const [mateEl, species, hosts] = playGame.mock.calls[0];
    expect(mateEl.dataset.mate).toBe(mate);
    expect(species).toEqual(SPECIES[mate]);
    expect(typeof hosts.infectNear).toBe('function');
  });

  it('grows a lawn of cells to infect', async () => {
    await open('?mate=tia');
    expect(document.querySelectorAll('.agar .host')).toHaveLength(GAME.HOSTS);
  });
});

describe('picking the level', () => {
  // The level and target the game was started with.
  async function startedAt(search) {
    const playGame = await open(search);
    return playGame.mock.calls[0][4];
  }

  it('starts at level 1 when the address has no level', async () => {
    expect(await startedAt('?mate=tia')).toEqual({ level: 1, target: LEVELS[0].target });
  });

  it.each(LEVELS.map((level, i) => [i + 1, level]))(
    'level %i uses its own target and disks',
    async (n, level) => {
      expect(await startedAt(`?mate=tia&level=${n}`)).toEqual({ level: n, target: level.target });
      expect(document.querySelectorAll('.agar .disk:not(.antibiotic)')).toHaveLength(level.disks);
      expect(document.querySelectorAll('.agar .disk.antibiotic')).toHaveLength(level.antibiotic ? 1 : 0);
    },
  );

  it.each([
    ['too high', '99', LEVELS.length],
    ['zero', '0', 1],
    ['negative', '-3', 1],
    ['not a number', 'abc', 1],
    ['empty', '', 1],
    ['a decimal', '2.7', 2],
  ])('a level that is %s ("%s") becomes level %i', async (_, value, expected) => {
    const { level } = await startedAt(`?mate=tia&level=${value}`);
    expect(level).toBe(expected);
  });
});

describe('a broken address', () => {
  it.each([
    ['no mate', ''],
    ['an unknown mate', '?mate=bogus'],
    ['a mate with the wrong capitals', '?mate=Tia'],
    ['a mangled mate name', '?mate=tia"]'],
  ])('with %s, sends them back to pick a mate instead of starting', async (_, search) => {
    const playGame = await open(search);
    expect(location.replace).toHaveBeenCalledWith('./pick-a-mate.html');
    expect(playGame).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.dish-mate:not([hidden])')).toHaveLength(0);
  });
});
