// Entry point for the petri dish page: find the mate and level picked in the
// address and start the game with them:
//   petri-dish.html?mate=tia&level=2
import { HOSTS, LEVELS, SPECIES } from './config.js';
import { playGame } from './game.js';
import { growLawn } from './hosts.js';
import { withItalics } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { dishMate, MATES } from './mates.js';
import { watchInputMode } from './touch.js';

// Show touch or arrow-key directions, whichever fits the device.
watchInputMode();
// "Finding host cells…" while the next screen loads.
watchLoading();

// Every mate's drawing, hidden: yours is shown below.
document.querySelector('.mate-mover').append(...MATES.map(dishMate));

const params = new URLSearchParams(window.location.search);
const choice = params.get('mate');
// Compare names rather than building a CSS selector from the address, so a
// mangled link (e.g. ?mate=tia"]) can't crash the page.
const mate = [...document.querySelectorAll('.dish-mate')].find((el) => el.dataset.mate === choice);
// Level 1 unless the address says otherwise.
const levelNumber = Math.min(Math.max(parseInt(params.get('level'), 10) || 1, 1), LEVELS.length);
const level = LEVELS[levelNumber - 1];

if (!mate) {
  // No mate (or an unknown one) in the address: send them back to choose.
  window.location.replace('./pick-a-mate.html');
} else {
  start();
  // The dish is set up: take the loading card away.
  pageReady();
}

function start() {
  mate.removeAttribute('hidden');
  document.title = `CellMates | ${mate.dataset.name} | Level ${levelNumber}`;
  const species = SPECIES[mate.dataset.mate];
  // Her name and virus above the dish.
  const title = document.querySelector('.mate-name');
  title.textContent = mate.dataset.name;
  title.style.color = species.color;
  document.querySelector('.species-name').replaceChildren(...withItalics(species.scientific));
  // Her own host cells, on a lawn to match, named in the directions.
  const kind = HOSTS[species.host];
  document.querySelector('.agar').classList.add(`lawn-${kind.id}`);
  for (const el of document.querySelectorAll('.host-name')) el.replaceChildren(...withItalics(kind.name));
  playGame(mate, species, growLawn({ kind }), { level: levelNumber, target: level.target });
}
