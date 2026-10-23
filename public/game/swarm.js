// The swarm: the mate the player steers, and every copy of her that has
// burst out of a cell. When she touches a healthy cell she goes into it and
// stays there until it bursts, then comes out with `species.burst` new
// copies of her, which fly out and drift. Viruses can't swim, so copies
// just jiggle about where they land. A copy that touches a cell goes into
// it too (it's used up), and that cell bursts with more copies. Every copy
// that bursts out, from her cells or her copies', counts toward the level.
//
// A mate who buds (`species.budding`, like Flo) is different: her copies
// bud out of the cell one at a time while she's inside, and when the last
// one is out the cell dies and she comes out too.
//
// Positions are in px from the dish center, like the steering in touch.js.
import { GAME } from './config.js';

// `player` is { x, y, facing, mover }, the mate the player steers. `svg` is
// her drawing, copied for each new copy. `hosts` is the lawn (hosts.js).
// `onChange` is called with how many copies she's made whenever a cell
// bursts.
export function makeSwarm({
  player, svg, hosts, species, random = Math.random, onChange = () => {},
}) {
  const copies = []; // { x, y, vx, vy, heading, mover }
  let made = 0; // how many copies of her have burst out, in all
  let inside = null; // the cell she's in, { id, fx, fy }, or null
  // How close counts as touching, for her and for a copy (dish radii).
  const reach = species.size * GAME.REACH_SHARE;
  const copyReach = reach * GAME.COPY_SCALE;
  const copyWidth = `${species.size * GAME.COPY_SCALE * 100}%`;
  // How many copies bud out of each cell, for a mate who buds.
  const buds = species.budding ? species.burst : 0;

  const swarm = {
    player,
    copies,
    // How many copies of her have burst out so far, in all (the ones that
    // have since gone into cells too).
    made: () => made,
    // Whether she's inside a cell right now.
    inside: () => inside !== null,
    reach,

    // One frame. `infect` is false once the level is over: cells still
    // burst, but nothing new gets infected.
    step(seconds, radius, { infect = true } = {}) {
      // Cells whose time is up burst with new copies of her (or, if she
      // buds, copies bud out one at a time and then the cell dies). If she's
      // in one when it bursts or dies, she comes out too.
      const events = hosts.tick(seconds);
      for (const { id, fx, fy, bud } of events) {
        const born = bud ? 1 : species.burst - buds;
        for (let i = 0; i < born && copies.length < GAME.MAX_COPIES; i++) {
          copies.push(newCopy(fx * radius, fy * radius, radius));
        }
        made += born;
        if (!bud && inside?.id === id) {
          inside = null;
          player.mover.classList.remove('inside');
        }
      }

      // She goes into a cell she touches, and stays put until it bursts.
      if (infect && !inside) {
        inside = hosts.infectOne(player.x / radius, player.y / radius, reach, species.latentMs, buds);
        if (inside) {
          player.x = inside.fx * radius;
          player.y = inside.fy * radius;
          player.mover.classList.add('inside');
        }
      }

      for (let i = copies.length - 1; i >= 0; i--) {
        const copy = copies[i];
        drift(copy, seconds, radius);
        // A copy that infects a cell goes into it.
        if (infect && hosts.infectNear(copy.x / radius, copy.y / radius, copyReach, species.latentMs, buds) > 0) {
          remove(i);
          continue;
        }
        place(copy);
      }

      place(player);
      if (events.length > 0) onChange(made);
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
