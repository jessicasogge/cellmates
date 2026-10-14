// The numbers Plaque is built on. Most of these are tuning knobs for
// playtesting, so they're all in one place.
//
// The real science, sped up: a T4 phage's whole life cycle inside E. coli
// takes about 25 minutes at body temperature. In the game, one second is
// about ten real minutes, so it takes a few seconds.

// The petri dish, in dish units: it's DISH.size across, and the page scales
// it to fit the screen. It's covered in a lawn of bacteria, one per hex.
export const DISH = {
  size: 360,
  radius: 166, // the lawn, inside the dish's rim
  cellSize: 15, // middle to corner of each hex: about 12 across the lawn
};

// Each virus's life cycle, keyed by pal id. Only Tess for the prototype.
//
//   host        the bacterium she infects
//   eclipse     s after getting in before the first whole copy exists.
//               Until then the cell is only copying her DNA and making
//               parts (the "eclipse"). Real T4: about 12 minutes.
//   perSecond   whole copies made each second after that. Real T4 makes
//               them at a roughly steady rate.
//   full        copies in a full cell. Real T4: about 100 to 200.
//   perNeighbor copies it takes to infect each neighbor when the cell
//               bursts: a full cell infects all six around it, a cell
//               burst early only some
//   facts       "Did you know?" facts for the end-of-dish pop-up
export const VIRUSES = {
  tess: {
    host: 'E. coli',
    eclipse: 0.8,
    perSecond: 45,
    full: 150,
    perNeighbor: 25,
    color: '#a78bfa',
    facts: [
      'The clear spots phages make in a lawn of bacteria are called plaques. Scientists count them to find out how many phages they started with.',
      'A T4 phage like Tess makes 100 to 200 copies of herself inside one *E. coli*, in under half an hour.',
      'Some bacteria self-destruct on purpose when a phage gets in. They die, but the phage dies with them, so it can’t spread to their neighbors.',
      'Tess never goes inside a cell. She injects her DNA like a syringe, and her empty shell stays stuck to the outside.',
      'For the first part of an infection, there are no whole copies of Tess in the cell at all, only her DNA and loose parts. Scientists call it the eclipse.',
      'Doctors can use phages like Tess to treat infections that antibiotics can’t cure anymore. It’s called phage therapy.',
    ],
  },
};

// How the lawn fights back. Every infected cell is getting ready to
// self-destruct (bacteria call it abortive infection), each at its own
// speed. You can see how close each one is: it turns red and shakes.
//
//   selfDestruct  the range of s after the eclipse that an infected cell
//                 lasts before it self-destructs, taking its copies with it.
//                 A self-destructed cell is a dead end: nothing gets past it.
//   target        share of the lawn your plaque has to clear to win
//   enterTime     s for Tess to land at the start
export const LAWN = {
  selfDestruct: [1, 3],
  target: 0.6,
  enterTime: 0.9,
};
