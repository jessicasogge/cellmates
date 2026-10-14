// The Burst or Wait page (cell.html): runs the game, draws it, and handles
// your two moves, the score, and the end-of-run pop-up.

import { HOST, VIRUSES } from './config.js';
import { block, burst, canBlock, canBurst, createRun, step } from './cell.js';
import { drawCell, STAGE } from './draw.js';
import { pop } from './sound.js';
import { palById } from './pals.js';
import { hideFact, showFact } from './facts.js';
import { sporeBurst } from './spores.js';

const PAL = 'tess';

// What to call out for a burst of `copies`.
export function burstCall(copies) {
  if (copies >= 150) return `Huge burst! +${copies}`;
  if (copies >= 90) return `Big burst! +${copies}`;
  return `+${copies}`;
}

// The pitch step for the pop of the `copies`th copy: a note higher about
// every dozen copies, so waiting sounds like it's building up.
export function copyNote(copies) {
  return 1 + Math.floor(copies / 12);
}

// The end-of-run pop-up's words.
export function resultText(run, best, isNewBest) {
  const score = isNewBest ? `${run.score} copies: a new best!` : `${run.score} copies`;
  const bursts = run.bursts === 1 ? '1 cell' : `${run.bursts} cells`;
  const detail = run.bursts > 0
    ? `You burst ${bursts}, the biggest with ${run.bestBurst} copies. Best run: ${best}.`
    : `Every cell self-destructed before you burst. Try bursting a little sooner! Best run: ${best}.`;
  return { score, detail };
}

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing, etc.: it just won't be remembered.
  }
}

// A pal's drawing from pals.js, as an image the canvas can draw.
export function palImage(pal) {
  const image = new Image();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${pal.art}</svg>`;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return image;
}

// Start the page. Returns a few handles for tests.
export function start() {
  const virus = VIRUSES[PAL];
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#cell');
  const ctx = canvas.getContext('2d');
  const result = $('.result');
  const callLine = $('.call');
  const burstButton = $('.burst-button');
  const blockButton = $('.block-button');
  const mark = $('.breaking-mark');
  const muteButton = $('.mute');

  const view = { palImage: palImage(palById(PAL)), clock: 0 };
  let run;
  let muted = load('cellmates-muted') === '1';
  let lastPop = -1; // view.clock of the last copy pop, so they don't pile up

  // Where the danger zone starts on the alarm meter.
  $('.danger').style.left = `${HOST.breaking[0] * 100}%`;

  function showMute() {
    muteButton.textContent = muted ? '🔇' : '🔊';
    muteButton.setAttribute('aria-pressed', String(muted));
  }
  muteButton.addEventListener('click', () => {
    muted = !muted;
    save('cellmates-muted', muted ? '1' : '0');
    showMute();
  });
  showMute();

  function sound(note) {
    if (!muted) pop(note);
  }

  function call(words) {
    callLine.textContent = words;
    // Restart the pop-in animation, even if the words are the same.
    callLine.classList.remove('show');
    void callLine.offsetWidth;
    callLine.classList.add('show');
  }

  // Everything on the page that changes as you play.
  function show() {
    const { cell } = run;
    $('.cell-number').textContent = `Cell ${run.number}`;
    $('.score').textContent = String(run.score);
    $('.lives').textContent = '●'.repeat(run.lives) + '○'.repeat(HOST.lives - run.lives);
    $('.copies-count').textContent = String(cell.copies);
    $('.copies-word').textContent = cell.copies === 1 ? 'copy' : 'copies';
    const alarm = Math.round(Math.min(1, cell.alarm) * 100);
    $('.alarm-fill').style.width = `${alarm}%`;
    $('.alarm').setAttribute('aria-valuenow', String(alarm));
    burstButton.disabled = !canBurst(run);
    blockButton.disabled = !canBlock(run);
  }

  // Once a cell is over, show where its breaking point was, so you can see
  // how close you came (or how much longer you could have waited).
  const label = $('.alarm-label');
  const usualLabel = label.textContent;
  function reveal(breaking, burstOut) {
    const percent = Math.round(breaking * 100);
    mark.style.left = `${percent}%`;
    mark.hidden = false;
    label.textContent = burstOut ? `It would have held out to ${percent}%.` : `It broke at ${percent}%.`;
  }
  function unreveal() {
    mark.hidden = true;
    label.textContent = usualLabel;
  }

  function restart() {
    run = createRun(virus, HOST);
    result.hidden = true;
    unreveal();
    callLine.textContent = '';
    hideFact();
    show();
  }

  function finish() {
    const before = Number(load('cellmates-best')) || 0;
    const best = Math.max(before, run.score);
    save('cellmates-best', String(best));
    const isNewBest = run.score > before && run.score > 0;
    const { score, detail } = resultText(run, best, isNewBest);
    $('.result-score').textContent = score;
    $('.result-detail').textContent = detail;
    showFact(PAL, virus);
    result.hidden = false;
    if (isNewBest) sporeBurst(canvas, { big: true });
  }

  function handle(event) {
    switch (event.type) {
      case 'entered':
        call('Copying her DNA…');
        break;
      case 'copy':
        if (view.clock - lastPop > 0.07) {
          sound(copyNote(event.copies));
          lastPop = view.clock;
        }
        break;
      case 'died':
        sound(1);
        call(event.lost ? `Self-destruct! Lost ${event.lost}` : 'Self-destruct!');
        reveal(event.breaking, false);
        break;
      case 'next':
        unreveal();
        callLine.textContent = '';
        break;
      case 'over':
        finish();
        break;
      default: // 'jolt': the cell's shake shows it
    }
  }

  function tryBurst() {
    const event = burst(run);
    if (!event) return;
    sound(15);
    call(burstCall(event.copies));
    reveal(run.cell.breaking, true);
    sporeBurst(canvas);
    show();
  }

  function tryBlock() {
    if (block(run)) show();
  }

  burstButton.addEventListener('click', tryBurst);
  blockButton.addEventListener('click', tryBlock);
  $('.again').addEventListener('click', restart);
  // Tapping the cell itself bursts it too: it's the biggest thing to hit.
  canvas.addEventListener('pointerdown', tryBurst);

  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('button, a')) return; // let buttons and links work
    if (e.key === ' ') {
      e.preventDefault();
      if (run.over) restart();
      else tryBurst();
    } else if (e.key === 'q' || e.key === 'Q') {
      tryBlock();
    }
  });

  // Keep the canvas sharp at any size: draw at the screen's real pixels.
  function fit() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio) || STAGE.width;
    canvas.height = Math.round((canvas.width * STAGE.height) / STAGE.width);
    const scale = canvas.width / STAGE.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  let last = null;
  function frame(now) {
    // At most 1/20 s at a time, so coming back to a hidden tab doesn't jump.
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    view.clock += dt;
    step(run, dt).forEach(handle);
    show();
    drawCell(ctx, run, view);
    requestAnimationFrame(frame);
  }

  restart();
  requestAnimationFrame(frame);
  return { get run() { return run; }, view, restart };
}

// Start right away on the game page. Exported so tests can reach the game.
export const running = document.querySelector('#cell') ? start() : null;
