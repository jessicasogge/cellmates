// The lawn: E. coli cells scattered over the agar for the mate to infect.
// A cell she (or a copy of her) touches gets infected, swells for her
// latent period, then bursts, leaving a plaque: a clear hole in the lawn.
// A new cell turns up somewhere else a moment later, never in a plaque or a
// zone while there's room elsewhere.
//
// Positions are kept relative to the dish center, as fractions of the dish
// radius (-1 to 1), so they stay put when the window is resized. `avoid`
// lists the disks, { fx, fy, r, fullZone }: nothing grows in their zones.
import { GAME } from './config.js';

const SVG = 'http://www.w3.org/2000/svg';
const SPLINES = 'calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"';

// One wavy flagellum, as in PetriPals: from (x, y), pointing `angle`
// degrees, `length` long, waving once every `duration`.
function flagellum(x, y, angle, length, duration) {
  const a = (angle * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const at = (t, wave) => `${(x + ux * length * t - uy * wave).toFixed(1)} ${(y + uy * length * t + ux * wave).toFixed(1)}`;
  const d = (wave) => `M${x} ${y} C${at(0.33, wave)} ${at(0.66, -wave)} ${at(1, 0)}`;
  const frames = [12, 3, -12, -3, 12].map(d).join(';');
  return `<path d="${d(12)}" stroke="#2e6b0e" stroke-width="3.5" fill="none" stroke-linecap="round">` +
    `<animate attributeName="d" dur="${duration}" repeatCount="indefinite" ${SPLINES} values="${frames}" /></path>`;
}

// Each cell is drawn like one of Colette's offspring in PetriPals (she's
// E. coli too): a long, slim green-apple rod with flagella all around, and
// no face.
export const ECOLI_ART = [
  [60, 80, -115, 34, '0.7s'],
  [100, 78, -90, 32, '0.64s'],
  [140, 80, -65, 34, '0.74s'],
  [60, 120, 115, 34, '0.72s'],
  [100, 122, 90, 32, '0.68s'],
  [140, 120, 65, 34, '0.7s'],
  [36, 100, 180, 32, '0.6s'],
  [164, 100, 0, 30, '0.66s'],
].map((f) => flagellum(...f)).join('') + `
  <rect x="34" y="78" width="132" height="44" rx="22" fill="#abee64" stroke="#2e6b0e" stroke-width="4" />
  <path d="M118 85 Q136 81 152 88" stroke="#effde0" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.95" />
  <circle cx="148" cy="113" r="2.8" fill="#effde0" />`;

// One cell's drawing. Its flagella wave, unless someone has asked for less
// motion (CSS can't pause <animate>).
function ecoli() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '4 4 192 192');
  svg.innerHTML = ECOLI_ART;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    for (const wave of svg.querySelectorAll('animate')) wave.remove();
  }
  return svg;
}

export function growLawn({ avoid = [], count = GAME.HOSTS, random = Math.random } = {}) {
  const agar = document.querySelector('.agar');
  const hosts = []; // { el, fx, fy, infected, left } (left: ms to bursting)
  const plaques = []; // { fx, fy }
  // Cells that burst, each growing back `left` ms from now, away from
  // where it burst ({ left, fx, fy }).
  let waiting = [];
  let stopped = false;

  // Pick a spot for a new cell. At first, keep it well away from where the
  // mate starts (or the cell that just burst), other cells and plaques; if
  // the lawn is too crowded for that, just keep it out of the zones.
  function randomSpot(awayX, awayY) {
    for (const strict of [true, false]) {
      for (let tries = 0; tries < 100; tries++) {
        // Uniform over the disk, kept away from the rim.
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 0.82;
        const fx = Math.cos(angle) * distance;
        const fy = Math.sin(angle) * distance;
        const near = (spots, gap) => spots.some((s) => Math.hypot(fx - s.fx, fy - s.fy) < gap);
        if (strict && (Math.hypot(fx - awayX, fy - awayY) < 0.3 || near(hosts, GAME.HOST_GAP) ||
            near(plaques, GAME.PLAQUE_RADIUS + GAME.HOST_RADIUS))) continue;
        const inZone = avoid.some((a) =>
          Math.hypot(fx - a.fx, fy - a.fy) < a.r + (a.fullZone ?? a.zone ?? 0) + GAME.HOST_RADIUS);
        if (!inZone) return { fx, fy };
      }
    }
    return null;
  }

  // Grow a cell, if there's room for one.
  function grow(awayX, awayY) {
    const spot = randomSpot(awayX, awayY);
    if (!spot) return false;
    const el = document.createElement('div');
    el.className = 'host';
    el.style.width = `${GAME.HOST_SIZE * 100}%`;
    el.append(ecoli());
    el.style.left = `${50 + spot.fx * 50}%`;
    el.style.top = `${50 + spot.fy * 50}%`;
    el.style.setProperty('--angle', `${Math.floor(random() * 180)}deg`);
    el.setAttribute('aria-hidden', 'true');
    agar.appendChild(el);
    hosts.push({ el, ...spot, infected: false, left: 0 });
    return true;
  }

  // The clear hole a burst cell leaves. It opens up from nothing (see
  // .plaque in styles.css).
  function addPlaque(fx, fy) {
    const el = document.createElement('div');
    el.className = 'plaque';
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    el.style.width = `${GAME.PLAQUE_RADIUS * 100}%`;
    el.setAttribute('aria-hidden', 'true');
    // Under the cells and the disks, so they're never hidden.
    agar.prepend(el);
    plaques.push({ fx, fy, el });
  }

  // The mate starts in the middle, so the first cells keep away from it.
  for (let i = 0; i < count; i++) grow(0, 0);

  return {
    // Infect every healthy cell touching a circle of radius `reach` at
    // (bx, by), all in fractions of the dish radius. Each bursts
    // `latentMs` from now. Returns how many were infected.
    infectNear(bx, by, reach, latentMs) {
      let infected = 0;
      for (const host of hosts) {
        if (host.infected) continue;
        if (Math.hypot(host.fx - bx, host.fy - by) > reach + GAME.HOST_RADIUS) continue;
        host.infected = true;
        host.left = latentMs;
        host.el.classList.add('infected');
        host.el.style.setProperty('--latent', `${latentMs}ms`);
        infected++;
      }
      return infected;
    },

    // Move time on by `seconds`: infected cells whose time is up burst, and
    // missing cells grow back. Returns where each burst was, as { fx, fy }.
    tick(seconds) {
      const ms = seconds * 1000;
      if (!stopped) {
        for (const cell of waiting) cell.left -= ms;
        // A cell with no room to grow tries again next frame.
        waiting = waiting.filter((cell) => cell.left > 0 || !grow(cell.fx, cell.fy));
      }
      const bursts = [];
      for (let i = hosts.length - 1; i >= 0; i--) {
        const host = hosts[i];
        if (!host.infected) continue;
        host.left -= ms;
        if (host.left > 0) continue;
        hosts.splice(i, 1);
        host.el.remove();
        addPlaque(host.fx, host.fy);
        bursts.push({ fx: host.fx, fy: host.fy });
        waiting.push({ left: GAME.HOST_RESPAWN_MS, fx: host.fx, fy: host.fy });
      }
      return bursts;
    },

    // Where every cell is, as { fx, fy, infected }.
    positions() {
      return hosts.map(({ fx, fy, infected }) => ({ fx, fy, infected }));
    },

    // Where every plaque is, as { fx, fy }.
    plaques() {
      return plaques.map(({ fx, fy }) => ({ fx, fy }));
    },

    // No new cells once the game is over. Infected ones still burst.
    stop() {
      stopped = true;
    },
  };
}
