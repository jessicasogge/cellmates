// The numbers the game is built on. Most of these are tuning knobs for
// playtesting, so they're all in one place.
//
// Distances are in flask units: the flask is FLASK.width x FLASK.height, and
// the page scales it to fit the screen. Times are in seconds, speeds in
// flask units per second. The real science is sped up a lot: flu takes about
// 6 to 8 hours to make copies inside a cell.

export const FLASK = {
  width: 360,
  height: 460,
  // The sheet of cells, inside the flask's walls. Below it is the neck of
  // the flask, where your pal starts.
  cells: { left: 12, top: 12, right: 348, bottom: 392 },
  cellSize: 18, // middle to corner of each hex cell: 10 or 11 across
  start: { x: 180, y: 428 },
};

// Each virus, keyed by pal id. Only Flo for the prototype.
//
//   species    her real name, shown under her name
//   receptor   what she grabs onto to get into a cell
//   speed      how fast you can steer her. (Real viruses can't swim at all,
//              a game liberty, like PetriPals' cocci swimming.)
//   burstTime  s from a cell being infected to it bursting
//   copies     copies each cell she gets into herself releases (one a copy
//              gets into releases one). Scaled way down: a real cell
//              infected with flu releases hundreds or more.
//   maxTrail   the most copies that can follow her at once
//   facts      "Did you know?" facts for the end-of-level pop-up
export const VIRUSES = {
  flo: {
    species: 'Influenza A virus',
    receptor: 'sialic acid',
    speed: 120,
    burstTime: 0.8,
    copies: 2,
    maxTrail: 30,
    color: '#fb7185',
    facts: [
      'Flo has two kinds of spikes. Her HA spikes grab sialic acid on a cell to get in, and her NA spikes snip it away so new copies can get out.',
      'Flo keeps her genes in eight separate pieces. When two flu viruses get into the same cell, they can swap pieces.',
      'Flo’s spikes change a little every year. That’s why there’s a new flu vaccine every year too.',
      'Cells that are infected send out a warning called interferon, and the cells around them switch on their defenses.',
      'Scientists grow flu in flasks of cells, and count the clear holes it leaves, called plaques, to see how much virus there is.',
      'Antibodies stick to Flo’s spikes so she can’t grab onto cells anymore. That’s how a flu vaccine protects you.',
    ],
  },
};

// Her copies follow her in a trail, like the cells of a PetriPals colony
// follow their leader: `spacing` flask units apart along the path she took.
// They sit off to alternate sides, up to `spread` from her path, so a long
// trail sweeps a wide path. New copies fly from the cell that burst to the
// end of the trail at `flySpeed`. A copy in the trail that comes within
// `seek` of a cell it can get into peels off and goes for it at
// `seekSpeed`, so the longer the trail, the faster the flask is taken.
export const TRAIL = { spacing: 9, spread: 24, flySpeed: 260, seek: 60, seekSpeed: 80 };

// The cells and how they fight back.
//
//   receptors   share of cells with your receptor. The rest won't let you in,
//               so the ones that do are worth steering for.
//   warnChance  when a cell bursts, the chance each healthy neighbor gets the
//               interferon warning. Her copies can't get into a warned cell;
//               she can, but it takes twice as long to burst.
export const CELLS = {
  receptors: 0.35,
  warnChance: 0.3,
};

// Bursts that follow each other within this many seconds count as a streak.
export const STREAK_GAP = 1.2;

// The levels, like PetriPals': each adds an antibody cloud, with bigger
// clouds, and needs more of the flask taken. Like PetriPals' zones of
// inhibition, each cloud spreads out over the first `growTime` s (quickly,
// then slowly) to its level's `size` and then stays put, so you can learn
// the flask and plan a way around. Touching a cloud ends the game; copies
// that touch one are lost.
//
//   antibodies  how many clouds
//   size        how far each cloud spreads, from its middle
//   share       how many of the cells with your receptor you need to take,
//               not counting ones a cloud covers, so a level can always be won
export const ANTIBODIES = { start: 8, growTime: 4 };
export const LEVELS = [
  { antibodies: 2, size: 34, share: 0.75 },
  { antibodies: 3, size: 38, share: 0.8 },
  { antibodies: 4, size: 42, share: 0.85 },
  { antibodies: 5, size: 46, share: 0.9 },
  { antibodies: 6, size: 50, share: 0.95 },
];
