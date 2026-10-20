// The disks: small white paper disks soaked in something, like the ones used
// in the lab (the Kirby-Bauer disk test). Most are soaked in something that
// stops viruses (antibodies, bleach, iodine, copper), with a zone around it
// sized by how well it works on her. If the player's mate touches one of
// those disks or its zone, the game is over; copies of her that drift in are
// stopped (see stopInZones in swarm.js).
//
// The antibiotic disk is different: it kills the E. coli lawn around it, so
// its zone is clear too, but antibiotics can't hurt viruses, so she can swim
// right through it. Its zone has no host cells to infect, though.
//
// A disk is { fx, fy, r, zone } in fractions of the dish radius: its center,
// its radius, and how wide its zone is right now. Disks placed by
// placeDisks also have `fullZone`, how wide the zone gets once it has
// finished spreading (see spreadZones), `drug`, what it's soaked in, and
// `harmless`, true for the antibiotic.
import { GAME } from './config.js';

// Pick a random spot for one disk, as fractions of the dish radius from the
// center: away from the middle (where she starts) and from the rim.
export function diskSpot(random = Math.random) {
  const angle = random() * Math.PI * 2;
  const distance = GAME.DISK_MIN_DISTANCE +
    random() * (GAME.DISK_MAX_DISTANCE - GAME.DISK_MIN_DISTANCE);
  return { fx: Math.cos(angle) * distance, fy: Math.sin(angle) * distance, r: GAME.DISK_RADIUS };
}

// How wide a zone of inhibition `mm` across is in the game, as a fraction of
// the dish radius (see the ZONE_* settings in config.js). A drug with no zone
// size given has no zone.
export function zoneWidth(mm) {
  if (!Number.isFinite(mm)) return 0;
  const t = (mm - GAME.ZONE_MM_SMALL) / (GAME.ZONE_MM_BIG - GAME.ZONE_MM_SMALL);
  const clamped = Math.min(1, Math.max(0, t));
  return GAME.ZONE_MIN_WIDTH + clamped * (GAME.ZONE_MAX_WIDTH - GAME.ZONE_MIN_WIDTH);
}

// How far apart two disks with these zones must be, center to center: at
// least DISK_MIN_GAP, and far enough to leave SWIM_ROOM between their zones.
function minGap(a, b) {
  return Math.max(GAME.DISK_MIN_GAP, a.r + a.zone + b.r + b.zone + GAME.SWIM_ROOM);
}

// Pick spots for disks with the given zone widths, spread apart from each
// other so there's always room to swim between them. With lots of disks, the
// first few can land so that there's no room left for the rest; then start
// over. (A number instead of a list means that many disks with no zones.)
export function diskSpots(zones, random = Math.random) {
  if (typeof zones === 'number') zones = new Array(zones).fill(0);
  const count = zones.length;
  let best = [];
  for (let attempt = 0; attempt < 50 && best.length < count; attempt++) {
    const disks = [];
    for (let tries = 0; disks.length < count && tries < 500; tries++) {
      const spot = { ...diskSpot(random), zone: zones[disks.length] };
      if (disks.every((d) => Math.hypot(d.fx - spot.fx, d.fy - spot.fy) >= minGap(d, spot))) {
        disks.push(spot);
      }
    }
    if (disks.length > best.length) best = disks;
  }
  return best;
}

// How wide a zone `fullZone` wide is `seconds` after the level starts. A drug
// spreads out from its disk by diffusion, which moves fast at first and then
// slows down (the distance grows with the square root of the time), so the
// zone widens quickly at first and then creeps out to its full width.
export function zoneAt(fullZone, seconds) {
  const t = Math.min(1, Math.max(0, seconds / GAME.ZONE_SPREAD_SECONDS));
  return fullZone * (GAME.ZONE_START + (1 - GAME.ZONE_START) * Math.sqrt(t));
}

// Widen each disk's zone to how far its drug has spread `seconds` into the
// level, both what counts as touching it and how it's drawn. Disks without a
// `fullZone` keep the zone they have.
export function spreadZones(disks, seconds) {
  for (const disk of disks) {
    if (!Number.isFinite(disk.fullZone)) continue;
    disk.zone = zoneAt(disk.fullZone, seconds);
    if (disk.zoneEl) disk.zoneEl.style.width = `${(disk.r + disk.zone) * 100}%`;
  }
}

// Whether any of the given circles overlaps the disk or its zone. Circles are
// [x, y, radius] in pixels from the dish center; the disk is in fractions of
// the dish radius, so `dishRadius` converts between the two. `buffer` (also a
// fraction of the dish radius) counts coming within that much as touching.
export function touchesDisk(disk, circles, dishRadius, buffer = 0) {
  const dx = disk.fx * dishRadius;
  const dy = disk.fy * dishRadius;
  const reach = (disk.r + (disk.zone ?? 0) + buffer) * dishRadius;
  return circles.some(([x, y, r]) => Math.hypot(x - dx, y - dy) < reach + r);
}

// The first disk (or zone) that stops viruses the circles touch, or null if
// they touch none. The antibiotic disk doesn't count.
export function touchedDisk(disks, circles, dishRadius, margin = 0) {
  return disks.find((disk) => !disk.harmless && touchesDisk(disk, circles, dishRadius, margin)) || null;
}

// What the game-over pop-up says when the mate called `name` touches `disk`.
export function touchMessage(name, disk) {
  return `${name} drifted into the ${disk.drug.name} zone. ${disk.drug.stops}`;
}

// The disks for a level: `count` of the mate's disks, in order, starting
// over from the top if there are more disks than she has, plus the
// antibiotic disk if the level has one.
export function disksFor(list, count, antibiotic = null) {
  const disks = Array.from({ length: count }, (_, i) => list[i % list.length]);
  return antibiotic ? [{ ...antibiotic, harmless: true }, ...disks] : disks;
}

// Put one disk per drug on the agar and return where they are.
export function placeDisks(drugs) {
  const agar = document.querySelector('.agar');
  const zones = drugs.map((drug) => zoneWidth(drug.zone));
  return diskSpots(zones).map((spot, i) => {
    const drug = drugs[i];
    const harmless = drug.harmless === true;
    // The zone: a clear ring around the disk, drawn underneath it.
    const zoneEl = document.createElement('div');
    zoneEl.className = harmless ? 'zone antibiotic-zone' : 'zone';
    zoneEl.style.left = `${50 + spot.fx * 50}%`;
    zoneEl.style.top = `${50 + spot.fy * 50}%`;
    zoneEl.style.width = `${(spot.r + spot.zone) * 100}%`;
    // A slightly uneven edge, different for each zone, like on a real plate.
    const wobble = () => `${48 + Math.random() * 4}%`;
    zoneEl.style.borderRadius =
      `${wobble()} ${wobble()} ${wobble()} ${wobble()} / ${wobble()} ${wobble()} ${wobble()} ${wobble()}`;
    zoneEl.setAttribute('aria-hidden', 'true');
    agar.appendChild(zoneEl);
    const el = document.createElement('div');
    el.className = harmless ? 'disk antibiotic' : 'disk';
    el.style.left = `${50 + spot.fx * 50}%`;
    el.style.top = `${50 + spot.fy * 50}%`;
    el.style.width = `${spot.r * 100}%`;
    el.textContent = drug.code;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', harmless
      ? `Antibiotic disk: ${drug.name}. It kills the bacteria around it but can't hurt a virus, so you can swim through it.`
      : `Disk: ${drug.name}. Don't touch it or the clear zone around it!`);
    // Shown in a little label above the disk when you hover over it (see
    // .disk::after in styles.css), e.g. "Bleach".
    el.dataset.name = drug.name[0].toUpperCase() + drug.name.slice(1);
    agar.appendChild(el);
    // Drawn at full width here; the game shrinks it back to where it starts
    // spreading from before the first frame (see spreadZones).
    return { ...spot, fullZone: spot.zone, el, zoneEl, drug, harmless };
  });
}
