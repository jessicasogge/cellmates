// The lawn: her host cells (HOSTS in config.js) scattered over the dish for
// the mate to infect. Healthy E. coli glide very slowly, wandering a little
// as they go; HeLa cells stick down and stay put.
// A cell she (or a copy of her) touches gets infected, swells for her
// latent period, then bursts, leaving a plaque: a clear hole in the lawn.
// A new cell turns up somewhere else a moment later, never in a plaque
// while there's room elsewhere.
//
// Positions are kept relative to the dish center, as fractions of the dish
// radius (-1 to 1), so they stay put when the window is resized.
import { GAME, HOSTS } from './config.js';

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

// A HeLa cell: human cells grown flat on the bottom of the dish, so seen
// from above each is a wide, uneven, pale peach blob with a big round
// nucleus in the middle (with two dark nucleoli) and a few granules.
export const HELA_ART = `
  <path d="M38 112 C26 74 64 40 104 46 C142 38 174 66 166 100 C178 132 150 164 110 158 C76 168 44 150 38 112 Z" fill="#fde4d6" stroke="#c98a76" stroke-width="4" stroke-linejoin="round" />
  <circle cx="104" cy="102" r="28" fill="#f1c3cf" stroke="#b77490" stroke-width="3.5" />
  <circle cx="96" cy="96" r="5" fill="#a65a7c" />
  <circle cx="113" cy="109" r="4" fill="#a65a7c" />
  <circle cx="62" cy="96" r="3" fill="#e2a993" />
  <circle cx="146" cy="84" r="2.5" fill="#e2a993" />
  <circle cx="136" cy="138" r="3" fill="#e2a993" />
  <circle cx="72" cy="140" r="2.5" fill="#e2a993" />`;

// One cell's drawing. E. coli's flagella wave, unless someone has asked
// for less motion (CSS can't pause <animate>).
function cellArt(kind) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '4 4 192 192');
  svg.innerHTML = kind.id === 'hela' ? HELA_ART : ECOLI_ART;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    for (const wave of svg.querySelectorAll('animate')) wave.remove();
  }
  return svg;
}

// `kind` is which cells, from HOSTS, and `count` how many at a time.
export function growLawn({ kind = HOSTS.ecoli, count = kind.count, random = Math.random } = {}) {
  const agar = document.querySelector('.agar');
  // { id, el, fx, fy, heading, infected, left }: heading is the way it's
  // going, in radians, and left the ms until it bursts.
  const hosts = [];
  let nextId = 1;
  const plaques = []; // { fx, fy }
  // Cells that burst, each growing back `left` ms from now ({ left }).
  let waiting = [];
  let stopped = false;

  // Pick a spot for a new cell, away from other cells and plaques, and at
  // the start, from the middle, where she starts. If the lawn is too
  // crowded for that, anywhere will do.
  function randomSpot(clearOfMiddle) {
    let spot;
    for (let tries = 0; tries < 100; tries++) {
      // Uniform over the dish, kept away from the rim.
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 0.82;
      spot = { fx: Math.cos(angle) * distance, fy: Math.sin(angle) * distance };
      const near = (spots, gap) => spots.some((s) => Math.hypot(spot.fx - s.fx, spot.fy - s.fy) < gap);
      if (!(clearOfMiddle && Math.hypot(spot.fx, spot.fy) < 0.3) && !near(hosts, kind.gap) &&
          !near(plaques, kind.plaque + kind.radius)) return spot;
    }
    return spot;
  }

  // Grow a cell somewhere with room, clear of the middle if asked.
  function grow(clearOfMiddle = false) {
    const spot = randomSpot(clearOfMiddle);
    const el = document.createElement('div');
    el.className = `host ${kind.id}`;
    el.style.width = `${kind.size * 100}%`;
    el.append(cellArt(kind));
    el.setAttribute('aria-hidden', 'true');
    agar.appendChild(el);
    const host = { id: nextId++, el, ...spot, heading: random() * Math.PI * 2, infected: false, left: 0 };
    place(host);
    hosts.push(host);
  }

  // Put a cell's drawing where it is, pointing the way it's going.
  function place(host) {
    host.el.style.left = `${50 + host.fx * 50}%`;
    host.el.style.top = `${50 + host.fy * 50}%`;
    host.el.style.setProperty('--angle', `${Math.round((host.heading * 180) / Math.PI)}deg`);
  }

  // Glide a healthy cell along for `seconds`, turning a little at random.
  // At the edge it turns back toward the middle.
  function glide(host, seconds) {
    host.heading += (random() - 0.5) * 1.5 * seconds;
    host.fx += Math.cos(host.heading) * kind.speed * seconds;
    host.fy += Math.sin(host.heading) * kind.speed * seconds;
    const fromCenter = Math.hypot(host.fx, host.fy);
    if (fromCenter > GAME.HOST_EDGE) {
      host.fx *= GAME.HOST_EDGE / fromCenter;
      host.fy *= GAME.HOST_EDGE / fromCenter;
      host.heading = Math.atan2(-host.fy, -host.fx) + (random() - 0.5);
    }
    place(host);
  }

  // The clear hole a burst cell leaves. It opens up from nothing (see
  // .plaque in styles.css). Real plaques are round but never perfect
  // circles, so each gets a slightly uneven edge of its own.
  function addPlaque(fx, fy) {
    const el = document.createElement('div');
    el.className = 'plaque';
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    el.style.width = `${kind.plaque * 100}%`;
    const wobble = () => `${44 + Math.floor(random() * 12)}%`;
    el.style.borderRadius =
      `${wobble()} ${wobble()} ${wobble()} ${wobble()} / ${wobble()} ${wobble()} ${wobble()} ${wobble()}`;
    el.setAttribute('aria-hidden', 'true');
    // Under the cells, so they're never hidden.
    agar.prepend(el);
    plaques.push({ fx, fy, el });
  }

  // The mate starts in the middle, so the first cells keep away from it.
  for (let i = 0; i < count; i++) grow(true);

  function infect(host, latentMs) {
    host.infected = true;
    host.left = latentMs;
    host.el.classList.add('infected');
    host.el.style.setProperty('--latent', `${latentMs}ms`);
  }

  const touching = (host, bx, by, reach) =>
    !host.infected && Math.hypot(host.fx - bx, host.fy - by) <= reach + kind.radius;

  return {
    // Infect every healthy cell touching a circle of radius `reach` at
    // (bx, by), all in fractions of the dish radius. Each bursts
    // `latentMs` from now. Returns how many were infected.
    infectNear(bx, by, reach, latentMs) {
      let infected = 0;
      for (const host of hosts) {
        if (!touching(host, bx, by, reach)) continue;
        infect(host, latentMs);
        infected++;
      }
      return infected;
    },

    // Infect just one healthy cell touching that circle, the nearest, for
    // her to go into. Returns it as { id, fx, fy }, or null if there's none.
    infectOne(bx, by, reach, latentMs) {
      const distance = (host) => Math.hypot(host.fx - bx, host.fy - by);
      const host = hosts.filter((h) => touching(h, bx, by, reach)).sort((a, b) => distance(a) - distance(b))[0];
      if (!host) return null;
      infect(host, latentMs);
      return { id: host.id, fx: host.fx, fy: host.fy };
    },

    // Move time on by `seconds`: healthy cells glide, infected cells whose
    // time is up burst, and missing cells grow back. Returns each cell that burst, as
    // { id, fx, fy }.
    tick(seconds) {
      const ms = seconds * 1000;
      if (!stopped) {
        for (const cell of waiting) {
          cell.left -= ms;
          if (cell.left <= 0) grow();
        }
        waiting = waiting.filter((cell) => cell.left > 0);
      }
      const bursts = [];
      for (let i = hosts.length - 1; i >= 0; i--) {
        const host = hosts[i];
        if (!host.infected) {
          if (kind.speed > 0) glide(host, seconds);
          continue;
        }
        host.left -= ms;
        if (host.left > 0) continue;
        hosts.splice(i, 1);
        host.el.remove();
        addPlaque(host.fx, host.fy);
        bursts.push({ id: host.id, fx: host.fx, fy: host.fy });
        waiting.push({ left: GAME.HOST_RESPAWN_MS });
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
