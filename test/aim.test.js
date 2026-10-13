// aim.js: aiming the flick like a slingshot, by pulling back or with arrow keys.
import { describe, expect, it } from 'vitest';
import { aimFromPull, flickVelocity, landingSpot, nudgeAim, START_AIM } from '../public/game/aim.js';
import { DRIFT, FLASK } from '../public/game/config.js';

describe('aimFromPull', () => {
  it('aims the opposite way to the pull', () => {
    const aim = aimFromPull(0, 100, 200); // pull down
    expect(aim.angle).toBeCloseTo(-Math.PI / 2); // fly up
    expect(aim.power).toBeCloseTo(0.5);
  });

  it('tops out at full power, and never goes too weak', () => {
    expect(aimFromPull(-500, 0, 200).power).toBe(1);
    expect(aimFromPull(12, 0, 200).power).toBe(0.1);
  });

  it('ignores a pull too short to mean anything', () => {
    expect(aimFromPull(3, 4, 200)).toBeNull();
  });
});

describe('flickVelocity', () => {
  it('goes in the aim’s direction, faster for more power', () => {
    const [vx, vy] = flickVelocity({ angle: 0, power: 1 });
    expect(vx).toBeCloseTo(DRIFT.maxFlick);
    expect(vy).toBeCloseTo(0);
  });
});

describe('landingSpot', () => {
  it('is straight up from the neck for the starting aim', () => {
    const spot = landingSpot(START_AIM);
    expect(spot.x).toBeCloseTo(FLASK.launch.x);
    expect(spot.y).toBeLessThan(FLASK.launch.y);
  });

  it('stays inside the flask', () => {
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const spot = landingSpot({ angle, power: 1 });
      expect(spot.x >= 0 && spot.x <= FLASK.width && spot.y >= 0 && spot.y <= FLASK.height).toBe(true);
    }
  });

  it('is right where she starts for a flick too weak to go anywhere', () => {
    const spot = landingSpot({ angle: 0, power: 0 });
    expect(spot).toEqual({ x: FLASK.launch.x, y: FLASK.launch.y });
  });
});

describe('nudgeAim', () => {
  const aim = { angle: 0, power: 0.5 };

  it('turns with left and right', () => {
    expect(nudgeAim(aim, 'ArrowLeft').angle).toBeLessThan(0);
    expect(nudgeAim(aim, 'ArrowRight').angle).toBeGreaterThan(0);
  });

  it('powers up and down with up and down, within limits', () => {
    expect(nudgeAim(aim, 'ArrowUp').power).toBeGreaterThan(0.5);
    expect(nudgeAim(aim, 'ArrowDown').power).toBeLessThan(0.5);
    expect(nudgeAim({ angle: 0, power: 1 }, 'ArrowUp').power).toBe(1);
    expect(nudgeAim({ angle: 0, power: 0.1 }, 'ArrowDown').power).toBe(0.1);
  });

  it('ignores other keys', () => {
    expect(nudgeAim(aim, 'a')).toBe(aim);
  });
});
