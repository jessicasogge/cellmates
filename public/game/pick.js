// The pick page: a card for every pal you can play as, linking to her game.
import { palArt, PLAYABLE_PALS } from './pals.js';

export function palCard(pal) {
  const card = document.createElement('a');
  card.className = `pal-card ${pal.id}`;
  card.href = `./flask.html?pal=${pal.id}`;
  const name = document.createElement('h2');
  name.textContent = pal.name;
  const species = document.createElement('span');
  species.className = 'species';
  species.textContent = pal.species;
  const host = document.createElement('span');
  host.className = 'host';
  host.textContent = `Gets into ${pal.host}`;
  card.append(palArt(pal), name, species, host);
  return card;
}

document.querySelector('.pal-cards')?.append(...PLAYABLE_PALS.map(palCard));
