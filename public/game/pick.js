// The pick page: a card for every pal you can play as, with her picture on a
// tile in her color, her name and species, and a button to pick her.
import { palArt, PLAYABLE_PALS } from './pals.js';

export function palCard(pal) {
  const card = document.createElement('article');
  card.className = 'pal-card';
  const tile = document.createElement('div');
  tile.className = `pal-icon ${pal.id}`;
  tile.append(palArt(pal));
  const name = document.createElement('h2');
  name.textContent = pal.name;
  const species = document.createElement('p');
  species.className = 'species';
  species.textContent = pal.species;
  const host = document.createElement('p');
  host.className = 'host';
  host.textContent = `Gets into ${pal.host}`;
  const pick = document.createElement('a');
  pick.className = 'pick-btn';
  pick.href = `./flask.html?pal=${pal.id}`;
  pick.textContent = `Select ${pal.name}`;
  card.append(tile, name, species, host, pick);
  return card;
}

document.querySelector('.picker-grid')?.append(...PLAYABLE_PALS.map(palCard));
