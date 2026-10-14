// The numbers Burst or Wait is built on. Most of these are tuning knobs for
// playtesting, so they're all in one place.
//
// The real science, sped up: a T4 phage's whole life cycle inside E. coli
// takes about 25 minutes at body temperature. In the game, one second is
// about ten real minutes, so it takes a few seconds.

// Each virus's life cycle inside one host cell, keyed by pal id. Only Tess
// for the prototype.
//
//   host      the cell she infects, drawn as a cartoon
//   eclipse   s after getting in before the first whole copy exists. Until
//             then the cell is only copying her DNA and making parts (the
//             "eclipse"). Real T4: about 12 minutes.
//   perSecond whole copies assembled each second after that. Real T4 makes
//             them at a roughly steady rate, about 100 to 200 by the time
//             the cell bursts, so these are real-sized numbers.
//   block     how far her anti-defense protein knocks the alarm back, once
//             per cell
//   facts     "Did you know?" facts for the end-of-run pop-up
export const VIRUSES = {
  tess: {
    host: 'E. coli',
    eclipse: 1.2,
    perSecond: 40,
    block: 0.3,
    color: '#a78bfa',
    facts: [
      'Tess can’t burst out whenever she likes. Waiting longer means more copies, but slower spreading, so every kind of phage has its own best time to burst.',
      'A T4 phage like Tess makes 100 to 200 copies of herself inside one *E. coli*, in under half an hour.',
      'Some bacteria self-destruct on purpose when a phage gets in. They die, but the phage dies with them, so it can’t spread to their neighbors.',
      'Tess makes a protein called Dmd that switches off one of *E. coli*’s self-destruct systems.',
      'For the first part of an infection, there are no whole copies of Tess in the cell at all, only her DNA and loose parts. Scientists call it the eclipse.',
      'To burst out, Tess makes one protein that punches holes in the cell’s inner skin, and another that chews through its tough wall.',
    ],
  },
};

// How the host cell fights back. It's always noticing the virus, and at some
// point it self-destructs (bacteria call it abortive infection; our own cells
// call it apoptosis). You can see how alarmed it is, but not exactly where
// its breaking point is.
//
//   enterTime   s for her to land and get in at the start of each cell
//   alarmRate   how fast the alarm rises, per s, on average
//   jumpRate    how often (per s, on average) it jumps up suddenly
//   jumpSize    how big a sudden jump is, on average
//   breaking    the range the hidden breaking point is picked from, as a
//               share of the alarm meter, with high points likelier than
//               low ones. The meter shows this range as its danger zone.
//   tougher     each cell after one you burst has an alarm this many times
//               faster than the last, since the next bacterium might carry
//               more defense systems. This is what ends a run sooner or later.
//   lives       how many cells can self-destruct on you before the run ends
//   afterTime   s to show a burst or a self-destruct before the next cell
export const HOST = {
  enterTime: 0.7,
  alarmRate: 0.16,
  jumpRate: 0.7,
  jumpSize: 0.08,
  breaking: [0.2, 1],
  tougher: 1.2,
  lives: 3,
  afterTime: 1.1,
};
