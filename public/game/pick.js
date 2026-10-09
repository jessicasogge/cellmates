// The pick page: a card for every mate you can play as, with her picture on a
// tile in her color, her name and species, and a button to pick her.
import { mateArt, PLAYABLE_MATES } from './mates.js';

export function mateCard(mate) {
  const card = document.createElement('article');
  card.className = 'mate-card';
  const tile = document.createElement('div');
  tile.className = `mate-icon ${mate.id}`;
  tile.append(mateArt(mate));
  const name = document.createElement('h2');
  name.textContent = mate.name;
  const species = document.createElement('p');
  species.className = 'species';
  species.textContent = mate.species;
  const host = document.createElement('p');
  host.className = 'host';
  host.textContent = `Gets into ${mate.host}`;
  const pick = document.createElement('a');
  pick.className = 'pick-btn';
  pick.href = `./flask.html?mate=${mate.id}`;
  pick.textContent = `Select ${mate.name}`;
  card.append(tile, name, species, host, pick);
  return card;
}

document.querySelector('.picker-grid')?.append(...PLAYABLE_MATES.map(mateCard));
