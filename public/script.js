// The home page: the row of mates.
import { HOME_MATES, homeMate } from './game/mates.js';

document.querySelector('.friends')?.append(...HOME_MATES.map(homeMate));
