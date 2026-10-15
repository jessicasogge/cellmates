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
  cellSize: 25, // middle to corner of each hex cell: 7 or 8 across
  start: { x: 180, y: 428 },
};

// Each virus, keyed by pal id. Only Flo for the prototype.
//
//   species    her real name, shown under her name
//   receptor   what she grabs onto to get into a cell
//   speed      how fast you can steer her. (Real viruses can't swim at all,
//              a game liberty, like PetriPals' cocci swimming.)
//   enterTime  s for her to get into a cell, make copies and get back out
//   copyTime   s for a cell her copies get into to make more
//   copies     copies each cell releases. Scaled way down: a real cell
//              infected with flu releases hundreds or more.
//   drift      how fast her free copies drift about
//   lifetime   s a free copy lasts before it stops being able to infect
//   facts      "Did you know?" facts for the end-of-level pop-up
export const VIRUSES = {
  flo: {
    species: 'Influenza A virus',
    receptor: 'sialic acid',
    speed: 110,
    enterTime: 1,
    copyTime: 1.4,
    copies: 4,
    drift: 40,
    lifetime: 2.5,
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

// The cells and how they fight back.
//
//   receptors   share of cells with your receptor. The rest won't let you in.
//   warnChance  when a cell releases its copies, the chance each healthy
//               neighbor gets the interferon warning. Free copies can't get
//               into a warned cell; your pal can, but it takes her twice as
//               long.
export const CELLS = {
  receptors: 0.75,
  warnChance: 0.5,
};

// The levels, like PetriPals': each adds an antibody cloud and needs more
// cells taken. Antibody clouds spread out from their drop over `spreadTime`
// s to `radius`; touching one ends the game, and free copies that drift into
// one are stopped.
export const ANTIBODIES = { radius: 46, spreadTime: 12 };
export const LEVELS = [
  { target: 20, antibodies: 1 },
  { target: 28, antibodies: 2 },
  { target: 34, antibodies: 3 },
];
