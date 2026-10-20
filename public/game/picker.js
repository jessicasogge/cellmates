// The picker: a card for each mate, with her picture, name and virus; the
// whole card is the link that picks her.
import { SPECIES } from './config.js';
import { withItalics } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { MATES, mateTile } from './mates.js';

// "Finding host cells…" while the next screen loads.
watchLoading();

document.querySelector('.picker-grid').append(...MATES.map(card));

function card(mate) {
  const link = document.createElement('a');
  link.className = 'mate-card';
  link.href = `./petri-dish.html?mate=${mate.id}`;
  link.setAttribute('aria-label', `Pick ${mate.name}`);

  const name = document.createElement('h2');
  name.textContent = mate.name;

  const species = document.createElement('p');
  species.className = 'species';
  species.append(...withItalics(SPECIES[mate.id].scientific));

  link.append(mateTile(mate), name, species);
  return link;
}

// All filled in: take the loading card away.
pageReady();
