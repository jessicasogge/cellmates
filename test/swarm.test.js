// @vitest-environment jsdom
// swarm.js runs her and her copies: getting into cells, bursting copies out
// of them, and drifting. These tests use a stand-in lawn, so each can say
// exactly which cells are where and when they burst.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { copyMover, makeSwarm, place } from '../public/game/swarm.js';

const RADIUS = 200; // px
// How close counts as touching, for Tia and for one of her copies.
const REACH = SPECIES.tia.size * GAME.REACH_SHARE;
const COPY_REACH = REACH * GAME.COPY_SCALE;

// A stand-in lawn: `bursts` is what the next tick returns, `healthy`
// whether there's a cell to infect wherever a copy touches, and `cell` the
// cell she goes into when she touches one (null for none).
function fakeLawn() {
  return {
    bursts: [],
    healthy: false,
    cell: null,
    tick: vi.fn(function tick() {
      const out = this.bursts;
      this.bursts = [];
      return out;
    }),
    infectNear: vi.fn(function infectNear() {
      return this.healthy ? 1 : 0;
    }),
    infectOne: vi.fn(function infectOne() {
      return this.cell;
    }),
  };
}

let player;
let svg;

beforeEach(() => {
  document.body.innerHTML = '<div class="agar"><div class="mate-mover"></div></div>';
  player = { x: 0, y: 0, facing: 1, mover: document.querySelector('.mate-mover') };
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Tia');
  svg.setAttribute('hidden', '');
});

function swarmWith(options = {}) {
  const hosts = options.hosts ?? fakeLawn();
  const onChange = vi.fn();
  const swarm = makeSwarm({ player, svg, hosts, species: SPECIES.tia, onChange, random: () => 0.5, ...options });
  return { swarm, hosts, onChange };
}

const copies = () => document.querySelectorAll('.mate-mover.copy');

// Burst a cell at (fx, fy) and return the swarm, with its copies out.
function withCopies(fx = 0.5, fy = 0, options = {}) {
  const made = swarmWith(options);
  made.hosts.bursts = [{ id: 99, fx, fy }];
  made.swarm.step(0, RADIUS);
  return made;
}

describe('going into a cell', () => {
  it('goes into the nearest cell she touches, with her own latent period', () => {
    const { swarm, hosts } = swarmWith();
    player.x = 40;
    player.y = -20;
    swarm.step(0.016, RADIUS);
    expect(hosts.infectOne).toHaveBeenCalledWith(0.2, -0.1, REACH, SPECIES.tia.latentMs);
    expect(swarm.inside()).toBe(false); // there was no cell there
  });

  it('moves her into the middle of the cell and holds her there', () => {
    const { swarm, hosts } = swarmWith();
    hosts.cell = { id: 1, fx: 0.25, fy: 0.1 };
    swarm.step(0.016, RADIUS);
    expect(swarm.inside()).toBe(true);
    expect([player.x, player.y]).toEqual([50, 20]);
    expect(player.mover.classList).toContain('inside');
  });

  it("doesn't infect another cell while she's inside one", () => {
    const { swarm, hosts } = swarmWith();
    hosts.cell = { id: 1, fx: 0.25, fy: 0.1 };
    swarm.step(0.016, RADIUS);
    swarm.step(0.016, RADIUS);
    expect(hosts.infectOne).toHaveBeenCalledTimes(1);
  });

  it('comes out when her cell bursts, with her copies', () => {
    const { swarm, hosts, onChange } = swarmWith();
    hosts.cell = { id: 1, fx: 0.25, fy: 0.1 };
    swarm.step(0.016, RADIUS);
    hosts.cell = null;
    hosts.bursts = [{ id: 1, fx: 0.25, fy: 0.1 }];
    swarm.step(0.016, RADIUS);
    expect(swarm.inside()).toBe(false);
    expect(player.mover.classList).not.toContain('inside');
    expect(copies()).toHaveLength(SPECIES.tia.burst);
    expect(swarm.made()).toBe(SPECIES.tia.burst);
    expect(onChange).toHaveBeenCalledWith(SPECIES.tia.burst);
  });

  it("stays in her cell when a different one bursts", () => {
    const { swarm, hosts } = swarmWith();
    hosts.cell = { id: 1, fx: 0.25, fy: 0.1 };
    swarm.step(0.016, RADIUS);
    hosts.bursts = [{ id: 2, fx: -0.5, fy: 0 }];
    swarm.step(0.016, RADIUS);
    expect(swarm.inside()).toBe(true);
  });

  it("doesn't go into anything once the level is over", () => {
    const { swarm, hosts } = swarmWith();
    swarm.step(0.016, RADIUS, { infect: false });
    expect(hosts.infectOne).not.toHaveBeenCalled();
  });
});

describe('counting', () => {
  it('starts with no copies made', () => {
    expect(swarmWith().swarm.made()).toBe(0);
  });

  it("counts every copy that bursts out, from her copies' cells too", () => {
    const { swarm, hosts, onChange } = swarmWith();
    hosts.bursts = [{ id: 1, fx: 0.5, fy: 0 }, { id: 2, fx: -0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    expect(swarm.made()).toBe(2 * SPECIES.tia.burst);
    expect(onChange).toHaveBeenCalledWith(2 * SPECIES.tia.burst);
  });

  it('keeps counting copies that have since gone into cells', () => {
    const { swarm, hosts } = withCopies();
    hosts.healthy = true;
    swarm.step(0.016, RADIUS);
    expect(swarm.copies).toHaveLength(0);
    expect(swarm.made()).toBe(SPECIES.tia.burst);
  });

  it("doesn't call back on a frame with no bursts", () => {
    const { swarm, onChange } = swarmWith();
    swarm.step(0.016, RADIUS);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('a cell bursting', () => {
  it('releases her burst size in new copies, where it burst', () => {
    const { swarm } = withCopies(0.5, 0);
    expect(copies()).toHaveLength(SPECIES.tia.burst);
    expect(swarm.copies[0].x).toBe(100);
  });

  it('stops making copies once there are lots, to keep the dish smooth', () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = Array.from({ length: 40 }, (_, i) => ({ id: i, fx: 0, fy: 0 }));
    swarm.step(0, RADIUS);
    expect(swarm.copies).toHaveLength(GAME.MAX_COPIES);
    expect(swarm.made()).toBe(40 * SPECIES.tia.burst); // every copy still counts
  });

  it('copies fly out, slow down, then just drift', () => {
    const { swarm } = withCopies(0, 0);
    const [copy] = swarm.copies;
    const speed = () => Math.hypot(copy.vx, copy.vy);
    const start = speed();
    for (let i = 0; i < 60; i++) swarm.step(0.05, RADIUS);
    expect(speed()).toBeLessThan(start / 100);
    expect(Math.hypot(copy.x, copy.y)).toBeGreaterThan(0);
  });

  it("copies' drawings are hidden from screen readers", () => {
    withCopies();
    const art = copies()[0].querySelector('svg');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.hasAttribute('role')).toBe(false);
    expect(art.hasAttribute('aria-label')).toBe(false);
    expect(art.hasAttribute('hidden')).toBe(false);
  });

  it('draws copies smaller than her', () => {
    withCopies();
    expect(copies()[0].style.width).toBe(`${SPECIES.tia.size * GAME.COPY_SCALE * 100}%`);
  });
});

describe('copies infecting cells', () => {
  it('a copy that infects a cell goes into it', () => {
    const { swarm, hosts } = withCopies();
    hosts.healthy = true;
    swarm.step(0.016, RADIUS);
    expect(swarm.copies).toHaveLength(0);
    expect(copies()).toHaveLength(0);
    expect(hosts.infectNear).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), COPY_REACH, SPECIES.tia.latentMs);
  });

  it("copies don't infect anything once the level is over", () => {
    const { swarm, hosts } = withCopies();
    hosts.healthy = true;
    swarm.step(0.016, RADIUS, { infect: false });
    expect(swarm.copies).toHaveLength(SPECIES.tia.burst);
  });
});

describe('the rim', () => {
  it('keeps copies inside the dish, bouncing them back in', () => {
    const { swarm } = withCopies(0.95, 0);
    for (const copy of swarm.copies) {
      copy.vx = 1000;
      copy.vy = 0;
    }
    swarm.step(0.05, RADIUS);
    for (const copy of swarm.copies) {
      expect(Math.hypot(copy.x, copy.y)).toBeLessThanOrEqual(RADIUS * (1 - COPY_REACH) + 1e-9);
      expect(copy.vx).toBeLessThan(0);
    }
  });
});

describe('drawing', () => {
  it('moves each mover to where its virus is', () => {
    const mover = document.createElement('div');
    place({ x: 12, y: -3, mover });
    expect(mover.style.transform).toBe('translate(12px, -3px)');
  });

  it('adds a copy to the dish, at the size given', () => {
    const mover = copyMover(svg, '4%');
    expect(mover.className).toBe('mate-mover copy');
    expect(mover.style.width).toBe('4%');
    expect(mover.parentElement).toBe(document.querySelector('.agar'));
  });
});
