// The swarm: the mate the player steers, and every copy of her that has
// burst out of a cell. When she touches a healthy cell she goes into it and
// stays there until it bursts, then comes out with `species.burst` new
// copies of her, which fly out and drift. Viruses can't swim, so copies
// just jiggle about where they land. A copy that touches a cell goes into
// it too (it's used up), and that cell bursts with more copies. Every cell
// that bursts, hers or a copy's, counts toward the level.
//
// Positions are in px from the dish center, like the steering in touch.js.
import { touchesDisk } from './antiviral.js';
import { GAME } from './config.js';

// `player` is { x, y, facing, mover }, the mate the player steers. `svg` is
// her drawing, copied for each new copy. `hosts` is the lawn (hosts.js) and
// `disks` the disks (antiviral.js). `onChange` is called whenever a cell
// bursts.
export function makeSwarm({
  player, svg, hosts, disks = [], species, random = Math.random, onChange = () => {},
}) {
  const copies = []; // { x, y, vx, vy, heading, mover }
  let burst = 0; // how many cells have burst
  let inside = null; // the cell she's in, { id, fx, fy }, or null
  // How close counts as touching, for her and for a copy (dish radii).
  const reach = species.size * GAME.REACH_SHARE;
  const copyReach = reach * GAME.COPY_SCALE;
  const copyWidth = `${species.size * GAME.COPY_SCALE * 100}%`;

  const swarm = {
    player,
    copies,
    // How many cells have burst so far.
    burst: () => burst,
    // Whether she's inside a cell right now.
    inside: () => inside !== null,
    reach,
    // Her body for touching things, as circles [x, y, r] in px.
    body: (radius) => [[player.x, player.y, reach * radius]],

    // One frame. `infect` is false once the level is over: cells still
    // burst, but nothing new gets infected.
    step(seconds, radius, { infect = true } = {}) {
      // Cells whose time is up burst with new copies of her. If she's in
      // one, she comes out too.
      const bursts = hosts.tick(seconds);
      for (const { id, fx, fy } of bursts) {
        for (let i = 0; i < species.burst && copies.length < GAME.MAX_COPIES; i++) {
          copies.push(newCopy(fx * radius, fy * radius, radius));
        }
        if (inside?.id === id) {
          inside = null;
          player.mover.classList.remove('inside');
        }
      }
      burst += bursts.length;

      // She goes into a cell she touches, and stays put until it bursts.
      if (infect && !inside) {
        inside = hosts.infectOne(player.x / radius, player.y / radius, reach, species.latentMs);
        if (inside) {
          player.x = inside.fx * radius;
          player.y = inside.fy * radius;
          player.mover.classList.add('inside');
        }
      }

      for (let i = copies.length - 1; i >= 0; i--) {
        const copy = copies[i];
        drift(copy, seconds, radius);
        const circle = [copy.x, copy.y, copyReach * radius];
        // Disks that stop viruses stop her copies too.
        if (disks.some((disk) => !disk.harmless && touchesDisk(disk, [circle], radius))) {
          showPop(copy.mover.parentElement, circle, species.color);
          remove(i);
          continue;
        }
        // A copy that infects a cell goes into it.
        if (infect && hosts.infectNear(copy.x / radius, copy.y / radius, copyReach, species.latentMs) > 0) {
          remove(i);
          continue;
        }
        place(copy);
      }

      place(player);
      if (bursts.length > 0) onChange(burst);
    },
  };

  function remove(i) {
    copies[i].mover.remove();
    copies.splice(i, 1);
  }

  // A new copy at (x, y) px, flying off in a random direction.
  function newCopy(x, y, radius) {
    const angle = random() * Math.PI * 2;
    const speed = GAME.BURST_SPEED * radius * (0.6 + 0.4 * random());
    const copy = {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      heading: angle,
      mover: copyMover(svg, copyWidth),
    };
    place(copy);
    return copy;
  }

  // Slow down from the burst, then wander a little, and stay in the dish.
  function drift(copy, seconds, radius) {
    const slowdown = Math.exp(-GAME.SETTLE_RATE * seconds);
    copy.vx *= slowdown;
    copy.vy *= slowdown;
    copy.heading += (random() - 0.5) * 6 * seconds;
    const wander = GAME.DRIFT_SPEED * radius;
    copy.x += (copy.vx + Math.cos(copy.heading) * wander) * seconds;
    copy.y += (copy.vy + Math.sin(copy.heading) * wander) * seconds;
    const limit = radius - copyReach * radius;
    const fromCenter = Math.hypot(copy.x, copy.y);
    if (fromCenter > limit) {
      copy.x *= limit / fromCenter;
      copy.y *= limit / fromCenter;
      // Bounce back in.
      copy.vx = -copy.vx;
      copy.vy = -copy.vy;
      copy.heading += Math.PI;
    }
  }

  return swarm;
}

// Move a mover to where its virus is.
export function place({ x, y, mover }) {
  mover.style.transform = `translate(${x}px, ${y}px)`;
}

// A new copy's mover, `width` wide (a share of the dish's width), with a
// copy of her drawing, added to the dish.
export function copyMover(svg, width) {
  const mover = document.createElement('div');
  mover.className = 'mate-mover copy';
  mover.style.width = width;
  const art = svg.cloneNode(true);
  art.removeAttribute('role');
  art.removeAttribute('aria-label');
  art.removeAttribute('hidden');
  art.setAttribute('aria-hidden', 'true');
  mover.appendChild(art);
  document.querySelector('.agar').appendChild(mover);
  return mover;
}

// A little "pop" where a copy was stopped: a ring in her color that bursts
// outward and fades (see .pop in styles.css). `circle` is [x, y, r] in px
// from the dish center.
export function showPop(dish, [x, y, r], color) {
  if (!dish) return;
  const ring = document.createElement('div');
  ring.className = 'pop';
  ring.setAttribute('aria-hidden', 'true');
  ring.style.left = `calc(50% + ${x}px)`;
  ring.style.top = `calc(50% + ${y}px)`;
  ring.style.width = `${2 * r}px`;
  ring.style.borderColor = color;
  dish.appendChild(ring);
  const remove = () => ring.remove();
  ring.addEventListener('animationend', remove);
  setTimeout(remove, 1000); // in case the animation never runs
}
