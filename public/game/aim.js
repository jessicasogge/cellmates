// Aiming the flick, like a slingshot: press anywhere on the flask, pull
// back, and let go. She flies the opposite way to your pull, and the farther
// you pull, the harder the flick. On a keyboard, the arrow keys turn and
// power up the aim, and the space bar flicks.
//
// An aim is { angle, power }: the direction she'll fly, in radians (0 is
// right, -π/2 is straight up the flask), and how hard, from 0 to 1.

import { DRIFT, FLASK } from './config.js';

// Straight up the middle, half power: where every level starts.
export const START_AIM = { angle: -Math.PI / 2, power: 0.5 };

const MIN_POWER = 0.1;

// The aim for a pull of (dx, dy) screen px from where the press started,
// where a pull of `full` px is full power. Null for a pull too short to
// count, so a tap doesn't flick her.
export function aimFromPull(dx, dy, full) {
  const length = Math.hypot(dx, dy);
  if (length < 10) return null;
  return {
    angle: Math.atan2(-dy, -dx), // the opposite way to the pull
    power: Math.max(MIN_POWER, Math.min(1, length / full)),
  };
}

// Her starting velocity for `aim`, as [vx, vy].
export function flickVelocity(aim) {
  const speed = aim.power * DRIFT.maxFlick;
  return [Math.cos(aim.angle) * speed, Math.sin(aim.angle) * speed];
}

// About where she'll land for `aim`: she slows down steadily (DRIFT.drag)
// and can land once she's slower than DRIFT.settle. Ignores bouncing off the
// walls and jiggling, so it's kept inside the flask and is only a guide.
export function landingSpot(aim) {
  const speed = aim.power * DRIFT.maxFlick;
  const distance = Math.max(0, speed - DRIFT.settle) / DRIFT.drag;
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  return {
    x: clamp(FLASK.launch.x + Math.cos(aim.angle) * distance, 4, FLASK.width - 4),
    y: clamp(FLASK.launch.y + Math.sin(aim.angle) * distance, 4, FLASK.height - 4),
  };
}

// The aim after pressing arrow key `key`: left and right turn it, up and
// down power it up and down. Returns `aim` itself for any other key.
export function nudgeAim(aim, key) {
  const turn = Math.PI / 60; // 3 degrees
  switch (key) {
    case 'ArrowLeft':
      return { ...aim, angle: aim.angle - turn };
    case 'ArrowRight':
      return { ...aim, angle: aim.angle + turn };
    case 'ArrowUp':
      return { ...aim, power: Math.min(1, aim.power + 0.04) };
    case 'ArrowDown':
      return { ...aim, power: Math.max(MIN_POWER, aim.power - 0.04) };
    default:
      return aim;
  }
}
