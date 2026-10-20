// The end-of-level pop-up (game.js). Its button goes on to the next level,
// or back to level 1 after the last one.
import { goTo } from './loading.js';

export function levelBanner(level) {
  let nextLevel = level;
  function goToLevel(n) {
    const url = new URL(window.location.href);
    url.searchParams.set('level', n);
    goTo(url.toString());
  }
  document.querySelector('.play-again').addEventListener('click', () => goToLevel(nextLevel));

  return {
    // Show the pop-up; its main button says `button` and goes to level `next`.
    show(title, message, button, { next = level } = {}) {
      nextLevel = next;
      const banner = document.querySelector('.win-banner');
      banner.querySelector('h2').textContent = title;
      banner.querySelector('.win-message').textContent = message;
      banner.querySelector('.play-again').textContent = button;
      banner.removeAttribute('hidden');
      banner.querySelector('.play-again').focus();
    },
  };
}
