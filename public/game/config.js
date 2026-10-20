// Every mate is a bacteriophage, a virus that infects bacteria. All three
// infect Escherichia coli, so the dish is a lawn of E. coli (drawn like
// Colette, PetriPals' E. coli), and each mate bursts its cells open.
//
// `scientific`: the virus's name above the dish. Virus names aren't in
//   italics; *asterisks* mark the parts that are (a host's species name).
// `color`: her name above the dish.
// `colors`: her drawing's colors (mates.js).
// `size`: how wide she's drawn in the dish, as a fraction of the dish's
//   width. Phages are far smaller than the bacteria they infect: E. coli is
//   about 2 micrometers long, T4 about a tenth of that, and φX174 and MS2
//   only about 25 nanometers across. So she's always smaller than a cell,
//   and T4 bigger than the other two, though true to scale she'd be too
//   small to see.
// `burst`: how many new copies of her one host cell releases in the game.
//   Real bursts are much bigger (see `facts`); these are scaled way down.
// `latentMs`: how long an infected cell takes to burst, in the game.
// `disks`: the disks that stop her, in level order. Phages have no antiviral
//   drugs, so these are things that wreck or block viruses: antibodies made
//   against her, bleach, iodine and copper. There's no standard disk test for
//   any of them on phages, so the zone sizes (mm, scaled by ZONE_*) are made
//   up, roughly by how strongly each one works on her.
// `facts`: random win/lose pop-up facts (game/facts.js); *names* italicize.

// The antibiotic disk on the early levels: it kills the E. coli lawn around
// it, but can't hurt a virus. Ampicillin, since it's an E. coli drug (and
// Colette's first disk in PetriPals).
export const ANTIBIOTIC = { code: 'AMP', name: 'ampicillin', zone: 19 };

export const SPECIES = {
  tia: {
    facts: [
      "Tia is a bacteriophage: a virus that infects bacteria. Phage means \"eater.\"",
      "Tia lands on *E. coli* on six long, bendy tail fibers, like a lunar lander's legs.",
      "Once Tia lands, her tail squeezes down and pushes a tube through the cell's wall.",
      "Tia injects only her DNA into the cell. Her empty head and tail stay outside.",
      "Inside the cell, Tia's genes shut down the cell's own genes and make it build more Tias.",
      "One cell infected by Tia bursts open with about 100 to 200 new copies of her.",
      "Tia's head is a stretched-out icosahedron, a shape with 20 triangle faces.",
      "In 1952, Hershey and Chase used T2, Tia's close cousin, to show genes are made of DNA.",
      "Tia's DNA swaps cytosine for a look-alike base, which helps her dodge the cell's defenses.",
      "Doctors are testing phages like Tia to treat infections antibiotics can't cure.",
      "Phages like Tia were first seen in 1915, and named by Félix d'Hérelle in 1917.",
      "Phages like Tia outnumber every other kind of biological thing on Earth.",
    ],
    scientific: 'Bacteriophage T4',
    color: '#5b3fb0',
    size: 0.052,
    burst: 3,
    latentMs: 1100,
    colors: { fill: '#e6defc', stroke: '#6d4fc2', highlight: '#f7f3ff', dark: '#33236b' },
    disks: [
      { code: 'AB', name: 'anti-T4 antibodies', zone: 32, stops: 'Antibodies stick to her tail fibers, so she can\'t land on a cell.' },
      { code: 'BL', name: 'bleach', zone: 28, stops: 'Bleach breaks her protein shell apart.' },
      { code: 'I', name: 'iodine', zone: 24, stops: 'Iodine wrecks her proteins.' },
      { code: 'Cu', name: 'copper', zone: 18, stops: 'Copper damages her shell and her DNA.' },
    ],
  },
  phoebe: {
    facts: [
      "Phoebe's name comes from φX174: φ is the Greek letter phi.",
      "In 1977, Fred Sanger's lab made Phoebe's the first DNA genome ever read from end to end.",
      "Phoebe's genome is tiny: just 5,386 letters long, with 11 genes.",
      "Some of Phoebe's genes overlap, read two ways at once, to fit more into her tiny genome.",
      "Phoebe's DNA is single-stranded: one strand, not the usual two.",
      "In 2003, scientists built Phoebe's genome from scratch in two weeks, and it worked.",
      "Phoebe has no tail. She's a tiny 20-sided shell with a spike on each of her 12 corners.",
      "Phoebe bursts her cell with just one protein, E, which stops it from building its wall.",
      "Labs add a little of Phoebe's DNA to DNA-sequencing runs to check the machine.",
      "Phoebe infects a strain of *E. coli* called C, grabbing onto its outer coat.",
    ],
    scientific: 'Bacteriophage φX174',
    color: '#0f766e',
    size: 0.038,
    burst: 2,
    latentMs: 700,
    colors: { fill: '#c9f2ec', stroke: '#0f8a7e', highlight: '#effcfa', dark: '#0b4f48' },
    disks: [
      { code: 'AB', name: 'anti-φX174 antibodies', zone: 30, stops: 'Antibodies stick to her spikes, so she can\'t grab a cell.' },
      { code: 'BL', name: 'bleach', zone: 28, stops: 'Bleach breaks her protein shell apart.' },
      { code: 'Cu', name: 'copper', zone: 20, stops: 'Copper damages her shell and her DNA.' },
      { code: 'I', name: 'iodine', zone: 24, stops: 'Iodine wrecks her proteins.' },
    ],
  },
  missy: {
    facts: [
      "Missy's genes are made of RNA, not DNA.",
      "In 1976, Walter Fiers's lab made Missy's the first genome of any kind ever read in full.",
      "Missy has just four genes.",
      "Missy gets into *E. coli* by grabbing its F pilus, a long, thin hair some cells grow.",
      "One cell infected by Missy can burst with thousands of new copies of her.",
      "Missy's shell is only about 27 nanometers across, small even for a virus.",
      "Missy bursts her cell with one tiny protein, L.",
      "Missy's coat protein grabs a hairpin in her RNA, so scientists use it to tag RNA.",
      "Missy is harmless to people, so she's used to test how well filters stop viruses.",
      "Lined up side by side, about 2,500 Missys would stretch across one human hair.",
    ],
    scientific: 'Bacteriophage MS2',
    color: '#c2410c',
    size: 0.036,
    burst: 4,
    latentMs: 1600,
    colors: { fill: '#ffdccf', stroke: '#d9573a', highlight: '#fff4ef', dark: '#7a2614' },
    disks: [
      { code: 'AB', name: 'anti-MS2 antibodies', zone: 30, stops: 'Antibodies coat her shell, so she can\'t grab a cell.' },
      { code: 'Cu', name: 'copper', zone: 28, stops: 'Copper damages her shell and her RNA.' },
      { code: 'BL', name: 'bleach', zone: 26, stops: 'Bleach breaks her protein shell apart.' },
      { code: 'I', name: 'iodine', zone: 18, stops: 'Iodine wrecks her proteins.' },
    ],
  },
};

// Each level adds a disk and doubles how many copies of her you need. The
// early levels also get the antibiotic disk; later ones have no room for it.
export const LEVELS = [
  { disks: 1, target: 4, antibiotic: true },
  { disks: 2, target: 8, antibiotic: true },
  { disks: 3, target: 16, antibiotic: true },
  { disks: 4, target: 32, antibiotic: true },
  { disks: 5, target: 64, antibiotic: true },
  { disks: 6, target: 128, antibiotic: false },
  { disks: 7, target: 256, antibiotic: false },
];

export const GAME = {
  SPEED: 0.8, // dish radii per second
  ARRIVE: 0.01, // pointer tolerance, relative to dish radius
  DRAG_SPEED: 2, // drag cap in radii/sec; prevents skipping zones

  // How close counts as touching: this share of her drawn half-width (her
  // `size`, in dish radii), since her drawing doesn't fill its whole box.
  // Her copies are drawn COPY_SCALE times her size.
  REACH_SHARE: 0.8,
  COPY_SCALE: 0.7,

  // New copies fly out of a bursting cell at BURST_SPEED (dish radii per
  // second), slow down at SETTLE_RATE, and then just jiggle about at
  // DRIFT_SPEED: viruses can't swim, they drift.
  BURST_SPEED: 0.35,
  SETTLE_RATE: 3,
  DRIFT_SPEED: 0.04,

  // Host cells: how many are on the lawn at a time, and how soon a new one
  // turns up after one bursts.
  HOSTS: 8,
  HOST_RESPAWN_MS: 2000,
  // How wide each cell's drawing is, as a fraction of the dish's width: the
  // same as Colette's offspring in PetriPals. Her rod is HOST_ROD of that.
  HOST_SIZE: 0.105,
  HOST_ROD: 0.69,
  HOST_RADIUS: 0.05, // how close counts as touching one (dish radii)
  HOST_GAP: 0.2, // how far apart cells grow, if there's room (dish radii)
  // A plaque, the clear hole a burst cell leaves in the lawn: its radius
  // (dish radii).
  PLAQUE_RADIUS: 0.1,

  // Disk size, center distance, and center-to-center gap in dish radii.
  DISK_RADIUS: 0.085,
  DISK_MIN_DISTANCE: 0.4,
  DISK_MAX_DISTANCE: 0.65,
  DISK_MIN_GAP: 0.4,

  // mm maps linearly to zone width, clamped to these limits. Widths are
  // fractions of the dish radius.
  ZONE_MM_SMALL: 13,
  ZONE_MM_BIG: 40,
  ZONE_MIN_WIDTH: 0.02,
  ZONE_MAX_WIDTH: 0.075,

  // Zones grow from this fraction to full width over this many seconds.
  ZONE_START: 0.1,
  ZONE_SPREAD_SECONDS: 20,
  SWIM_ROOM: 0.13, // minimum gap between zones, in dish radii
};
