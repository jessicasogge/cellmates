// The home page: the row of mates, and the "Press Start to Play" button.
import { goTo, watchLoading } from './game/loading.js';
import { HOME_MATES, homeMate } from './game/mates.js';

// "Finding host cells…" while the next screen loads.
watchLoading();

const friends = document.querySelector('.friends');
friends?.append(...HOME_MATES.map(homeMate));

const startButton = document.querySelector('.start-btn');

if (startButton) {
  const label = startButton.textContent;

  startButton.addEventListener('click', () => {
    startButton.textContent = 'Opening picker...';
    startButton.disabled = true;

    setTimeout(() => {
      goTo('./pick-a-mate.html');
    }, 250);
  });

  // When you come back with the browser's Back button, the browser may show
  // this page exactly as it was left, still saying "Opening picker...".
  // Put the button back the way it started.
  window.addEventListener('pageshow', () => {
    startButton.textContent = label;
    startButton.disabled = false;
  });
}
