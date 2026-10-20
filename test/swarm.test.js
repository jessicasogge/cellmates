// @vitest-environment jsdom
// swarm.js runs her and her copies: infecting cells, bursting copies out of
// them, drifting, and getting stopped by disks. These tests use a stand-in
// lawn, so each can say exactly which cells are where and when they burst.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { copyMover, makeSwarm, place, showPop } from '../public/game/swarm.js';

const RADIUS = 200; // px
// How close counts as touching, for Tia and for one of her copies.
const REACH = SPECIES.tia.size * GAME.REACH_SHARE;
const COPY_REACH = REACH * GAME.COPY_SCALE;

// A stand-in lawn: `bursts` is what the next tick returns, and `healthy`
// whether there's a cell to infect wherever anything touches.
function fakeLawn() {
  return {
    bursts: [],
    healthy: false,
    tick: vi.fn(function tick() {
      const out = this.bursts;
      this.bursts = [];
      return out;
    }),
    infectNear: vi.fn(function infectNear() {
      return this.healthy ? 1 : 0;
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

describe('infecting cells', () => {
  it('infects cells she touches, with her own latent period', () => {
    const { swarm, hosts } = swarmWith();
    player.x = 40;
    player.y = -20;
    swarm.step(0.016, RADIUS);
    expect(hosts.infectNear).toHaveBeenCalledWith(0.2, -0.1, REACH, SPECIES.tia.latentMs);
  });

  it("doesn't infect anything once the level is over", () => {
    const { swarm, hosts } = swarmWith();
    swarm.step(0.016, RADIUS, { infect: false });
    expect(hosts.infectNear).not.toHaveBeenCalled();
  });

  it('counts her as one, before there are any copies', () => {
    expect(swarmWith().swarm.count()).toBe(1);
  });

  it('gives her body for touching disks', () => {
    player.x = 10;
    expect(swarmWith().swarm.body(RADIUS)).toEqual([[10, 0, REACH * RADIUS]]);
  });
});

describe('a cell bursting', () => {
  it('releases her burst size in new copies, where it burst', () => {
    const { swarm, hosts, onChange } = swarmWith();
    hosts.bursts = [{ fx: 0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    expect(swarm.count()).toBe(1 + SPECIES.tia.burst);
    expect(copies()).toHaveLength(SPECIES.tia.burst);
    expect(swarm.copies[0].x).toBe(100);
    expect(onChange).toHaveBeenCalledWith(1 + SPECIES.tia.burst);
  });

  it("stops making copies once there are enough to win", () => {
    const { swarm, hosts } = swarmWith({ target: 2 });
    hosts.bursts = [{ fx: 0.5, fy: 0 }, { fx: -0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    expect(swarm.count()).toBe(2);
  });

  it('copies fly out, slow down, then just drift', () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = [{ fx: 0, fy: 0 }];
    swarm.step(0, RADIUS);
    const [copy] = swarm.copies;
    const speed = () => Math.hypot(copy.vx, copy.vy);
    const start = speed();
    for (let i = 0; i < 60; i++) swarm.step(0.05, RADIUS);
    expect(speed()).toBeLessThan(start / 100);
    expect(Math.hypot(copy.x, copy.y)).toBeGreaterThan(0);
  });

  it("copies' drawings are hidden from screen readers and have no face of their own", () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = [{ fx: 0, fy: 0 }];
    swarm.step(0, RADIUS);
    const art = copies()[0].querySelector('svg');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.hasAttribute('role')).toBe(false);
    expect(art.hasAttribute('aria-label')).toBe(false);
    expect(art.hasAttribute('hidden')).toBe(false);
  });

  it('draws copies smaller than her', () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = [{ fx: 0, fy: 0 }];
    swarm.step(0, RADIUS);
    expect(copies()[0].style.width).toBe(`${SPECIES.tia.size * GAME.COPY_SCALE * 100}%`);
  });
});

describe('copies infecting cells', () => {
  it('a copy that infects a cell goes into it', () => {
    const { swarm, hosts, onChange } = swarmWith();
    hosts.bursts = [{ fx: 0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    onChange.mockClear();
    hosts.healthy = true;
    swarm.step(0.016, RADIUS);
    expect(swarm.count()).toBe(1);
    expect(copies()).toHaveLength(0);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("copies don't infect anything once the level is over", () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = [{ fx: 0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    hosts.healthy = true;
    swarm.step(0.016, RADIUS, { infect: false });
    expect(swarm.count()).toBe(1 + SPECIES.tia.burst);
  });
});

describe('disks', () => {
  it('stop copies that drift into their zone, with a pop', () => {
    const disks = [{ fx: 0.5, fy: 0, r: 0.1, zone: 0.05 }];
    const { swarm, hosts } = swarmWith({ disks });
    hosts.bursts = [{ fx: 0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    swarm.step(0.016, RADIUS);
    expect(swarm.count()).toBe(1);
    expect(document.querySelectorAll('.pop')).toHaveLength(SPECIES.tia.burst);
  });

  it("don't stop copies when it's the antibiotic", () => {
    const disks = [{ fx: 0.5, fy: 0, r: 0.1, zone: 0.05, harmless: true }];
    const { swarm, hosts } = swarmWith({ disks });
    hosts.bursts = [{ fx: 0.5, fy: 0 }];
    swarm.step(0, RADIUS);
    swarm.step(0.016, RADIUS);
    expect(swarm.count()).toBe(1 + SPECIES.tia.burst);
  });
});

describe('the rim', () => {
  it('keeps copies inside the dish, bouncing them back in', () => {
    const { swarm, hosts } = swarmWith();
    hosts.bursts = [{ fx: 0.95, fy: 0 }];
    swarm.step(0, RADIUS);
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

  it('shows a pop in her color, which cleans itself up', () => {
    vi.useFakeTimers();
    try {
      const dish = document.querySelector('.agar');
      showPop(dish, [10, 20, 5], 'rgb(255, 0, 0)');
      const ring = dish.querySelector('.pop');
      expect(ring.style.width).toBe('10px');
      expect(ring.style.borderColor).toBe('rgb(255, 0, 0)');
      ring.dispatchEvent(new Event('animationend'));
      expect(dish.querySelector('.pop')).toBeNull();
      showPop(dish, [0, 0, 5], 'red');
      vi.advanceTimersByTime(1000);
      expect(dish.querySelector('.pop')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does nothing for a pop with no dish to show it in", () => {
    expect(() => showPop(null, [0, 0, 5], 'red')).not.toThrow();
  });
});
