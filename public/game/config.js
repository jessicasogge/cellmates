// The numbers the game is built on: the flask, how virions drift, each
// virus's life cycle, and the levels. Most of these are tuning knobs for
// playtesting, so they're all in one place.
//
// Distances are in flask units: the flask is FLASK.width wide and
// FLASK.height tall, and the page scales it to fit the screen. Times are in
// seconds and speeds in flask units per second.

export const FLASK = {
  width: 360,
  height: 600,
  // The sheet of cells, inside the flask's walls, leaving room at the bottom
  // for the neck, where your pal waits to be flicked.
  cells: { left: 14, top: 14, right: 346, bottom: 500 },
  cellSize: 20, // middle to corner: about 9 cells across
  // Where your pal waits before each flick, in the neck of the flask.
  launch: { x: 180, y: 552 },
};

// How virions move. Viruses can't swim: no flagella, no legs. Once
// something (your flick, or a bursting cell) sends them off, they slow down
// in the thick liquid and then just jiggle about (Brownian motion).
export const DRIFT = {
  drag: 2.4, // how fast they slow down: speed shrinks by e every 1/drag s
  jiggle: 200, // strength of the random jiggling
  settle: 30, // below this speed, a virion can land on a cell
  maxFlick: 1300, // the fastest flick, enough to reach the top of the flask
};

// Each virus's life cycle, keyed by pal id. Only Flo for the prototype.
//
//   receptor   what she grabs onto on a cell (shown in the help text)
//   burst      new virions out of each cell. Scaled way down: a real cell
//              releases hundreds or more.
//   copyTime   s from getting in to bursting out. Sped way up: really it's
//              about 6 to 8 hours for flu.
//   lifetime   s a virion lasts once it's drifting slowly, before it stops
//              being able to infect anything. Real flu lasts hours in a
//              flask, but a short life is what makes chains end.
//   color      her color, for infected cells and her virions
//   facts      "Did you know?" facts for the end-of-level pop-up
export const VIRUSES = {
  flo: {
    receptor: 'sialic acid',
    burst: 6,
    copyTime: 0.9,
    lifetime: 0.6,
    color: '#fb7185',
    spike: '#14b8a6',
    facts: [
      'Flo has two kinds of spikes. Her HA spikes grab sialic acid on a cell to get in, and her NA spikes snip it away so new copies can get out.',
      'Flo keeps her genes in eight separate pieces. When two flu viruses get into the same cell, they can swap pieces.',
      'Flo’s spikes change a little every year. That’s why there’s a new flu vaccine every year too.',
      'In the game, a cell releases 6 copies of Flo. A real cell infected with flu releases hundreds of them, or more.',
      'Flo is only about 100 nanometers across. You could line up hundreds of her across the width of a hair.',
    ],
  },
};

// The levels. Every level's cells are laid out the same way each time (from
// `seed`), so you can learn a flask and try a better flick.
//
//   receptors  share of cells that have your receptor and let you in
//   flicks     how many times you can flick your pal in
//   stars      share of the flask's cells you need to take over for one,
//              two and three stars. One star beats the level.
//   antibodies clouds of neutralizing antibody: any virion that drifts into
//              one is stopped. { x, y, r } in flask units.
export const LEVELS = [
  { seed: 12, receptors: 0.5, flicks: 3, stars: [0.3, 0.45, 0.54], antibodies: [] },
  { seed: 8, receptors: 0.5, flicks: 3, stars: [0.2, 0.35, 0.45],
    antibodies: [{ x: 180, y: 330, r: 46 }] },
  { seed: 4, receptors: 0.5, flicks: 3, stars: [0.12, 0.2, 0.28],
    antibodies: [{ x: 110, y: 380, r: 40 }, { x: 250, y: 220, r: 40 }] },
];

// At most this many drifting virions at once, so phones keep up. Any
// more from a burst are left out.
export const MAX_VIRIONS = 90;
