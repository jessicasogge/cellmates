// The home page: the row of pals.
import { HOME_PALS, homePal } from './game/pals.js';

document.querySelector('.friends')?.append(...HOME_PALS.map(homePal));
