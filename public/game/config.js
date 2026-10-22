// Each mate infects one kind of cell (`host`, in HOSTS below): the phages
// burst E. coli, drawn like Colette in PetriPals, and Polly, poliovirus,
// bursts human HeLa cells.
//
// `scientific`: virus name above dish; only *marked parts* italicize.
// `host`: the cells in her dish (HOSTS).
// `color`: name color.
// `colors`: drawing palette (mates.js).
// `size`: width relative to dish; smaller than cells, T4 larger than the
//   others. Enlarged for visibility, not true scale.
// `burst`: copies released per cell; scaled down from real bursts.
// `latentMs`: delay before bursting; she stays inside cells she infects.
// `facts`: random win/lose facts (game/facts.js); *names* italicize.
export const SPECIES = {
  tia: {
    facts: [
      "Tia is a bacteriophage: a virus that infects bacteria. Phage means \"eater.\"",
      "Tia grips *E. coli* with six long, jointed tail fibers, like a lunar lander's legs.",
      "Tia's tail sheath contracts, pushing a tube through the cell's outer layers.",
      "Tia delivers her DNA into the cell. Her empty head and tail stay outside.",
      "Tia takes over the cell's machinery and makes it build more Tias.",
      "An infected cell can burst open with roughly 100 to 200 new Tias.",
      "Tia's DNA-filled head is an elongated, roughly icosahedral shell.",
      "In 1952, Hershey and Chase used Tia's cousin T2 to help show DNA carries genes.",
      "Tia uses a modified DNA base that helps protect her from bacterial defenses.",
      "Phages like Tia are being tested against antibiotic-resistant bacterial infections.",
      "Tia's fellow phages were described in 1915 and named by Félix d'Hérelle in 1917.",
      "Tia belongs to the phages, thought to be among Earth's most abundant biological entities.",
    ],
    scientific: 'Bacteriophage T4',
    host: 'ecoli',
    color: '#5b3fb0',
    size: 0.052,
    burst: 3,
    latentMs: 1500,
    colors: { fill: '#e6defc', stroke: '#6d4fc2', highlight: '#f7f3ff', dark: '#33236b' },
  },
  phoebe: {
    facts: [
      "Phoebe's name comes from φX174: φ is the Greek letter phi.",
      "In 1977, Sanger's team read Phoebe's genome, the first DNA genome fully sequenced.",
      "Phoebe's genome has just 5,386 DNA letters and 11 genes.",
      "Some of Phoebe's genes overlap, reusing DNA letters to make different proteins.",
      "Phoebe carries her DNA in a single-stranded circle, not a double strand.",
      "In 2003, scientists assembled Phoebe's working genome from synthetic DNA in 14 days.",
      "Phoebe has no tail: her 20-sided shell has a spike at each of its 12 corners.",
      "Phoebe's protein E makes her host burst by blocking cell-wall construction.",
      "Labs add prepared Phoebe DNA to Illumina sequencing runs as a control.",
      "Phoebe infects *E. coli* C by binding to sugars on its outer surface.",
    ],
    scientific: 'Bacteriophage φX174',
    host: 'ecoli',
    color: '#0f766e',
    size: 0.038,
    burst: 2,
    latentMs: 1100,
    colors: { fill: '#c9f2ec', stroke: '#0f8a7e', highlight: '#effcfa', dark: '#0b4f48' },
  },
  missy: {
    facts: [
      "Missy's genes are made of RNA, not DNA.",
      "In 1976, Fiers's team fully read Missy's genome, the first genome ever sequenced.",
      "Missy has just four genes.",
      "Missy grabs the F pilus, a long, thin appendage on some *E. coli* cells.",
      "One cell infected by Missy can burst with thousands of new copies of her.",
      "Missy's shell is only about 27 nanometers across, small even for a virus.",
      "Missy makes her host burst using one tiny protein called L.",
      "Missy's coat protein binds an RNA hairpin, a trick scientists use to track RNA.",
      "Missy infects bacteria, not people, so labs use her to test virus filters.",
      "Missy packs her four genes into just 3,569 RNA letters.",
    ],
    scientific: 'Bacteriophage MS2',
    host: 'ecoli',
    color: '#c2410c',
    size: 0.036,
    burst: 4,
    latentMs: 2000,
    colors: { fill: '#ffdccf', stroke: '#d9573a', highlight: '#fff4ef', dark: '#7a2614' },
  },
  polly: {
    facts: [
      "Polly is poliovirus, which causes polio, a disease that can paralyze people.",
      "Polly is tiny, about 30 nanometers across.",
      "Polly has no envelope, just a 20-sided protein shell around her RNA.",
      "Polly's genes are one strand of RNA, about 7,500 letters long.",
      "Polly enters human cells by binding to a surface protein called CD155.",
      "Polly spreads through tiny traces of infected poop, including in food and water.",
      "Polly first multiplies in the throat and gut.",
      "In 1949, Enders, Weller and Robbins grew Polly in tissue cultures.",
      "Growing Polly in tissue cultures earned Enders, Weller and Robbins a 1954 Nobel Prize.",
      "In 1954, Dulbecco and Vogt published a way to count Polly using plaques.",
      "HeLa cells helped scientists test antibodies against Polly during vaccine trials.",
      "Jonas Salk's injected vaccine against Polly was licensed in 1955.",
      "Albert Sabin's oral vaccine against Polly could be given on a sugar cube.",
      "In 2002, scientists made infectious Polly using a chemically synthesized DNA copy.",
      "Vaccination has cut polio cases caused by wild Polly by over 99% since 1988.",
    ],
    scientific: 'Poliovirus',
    host: 'hela',
    color: '#2f4fbf',
    size: 0.036,
    burst: 5,
    latentMs: 1800,
    colors: { fill: '#dbe5ff', stroke: '#3b5bdb', highlight: '#f4f7ff', dark: '#1e2f78' },
  },
};

// Host cells: `name` supports *italics*; `size` is width/dish width,
// `body` the cell's share. In dish radii: `radius` = touch range,
// `gap` = spacing when possible, `plaque` = burst-hole radius.
// `speed` = healthy-cell radii/sec; `count` = cells in the dish.
export const HOSTS = {
  // Drawn and sized like Colette's offspring in PetriPals.
  ecoli: {
    id: 'ecoli', name: '*E. coli*', size: 0.105, body: 0.69,
    radius: 0.05, gap: 0.17, plaque: 0.1, speed: 0.025, count: 12,
  },
  // Human cells grown flat on the bottom of the dish. They stick down and
  // don't swim, so they stay put.
  hela: {
    id: 'hela', name: 'HeLa', size: 0.15, body: 0.8,
    radius: 0.09, gap: 0.27, plaque: 0.16, speed: 0, count: 9,
  },
};

// Each level doubles how many copies of her you need to make, counting
// the ones her copies make too.
export const LEVELS = [
  { target: 4 },
  { target: 8 },
  { target: 16 },
  { target: 32 },
  { target: 64 },
  { target: 128 },
  { target: 256 },
];

export const GAME = {
  SPEED: 0.8, // dish radii per second
  ARRIVE: 0.01, // pointer tolerance, relative to dish radius
  DRAG_SPEED: 2, // drag cap in radii/sec, so a fast swipe doesn't fling her

  // How close counts as touching: this share of her drawn half-width (her
  // `size`, in dish radii), since her drawing doesn't fill its whole box.
  // Her copies are drawn COPY_SCALE times her size.
  REACH_SHARE: 0.8,
  COPY_SCALE: 0.7,
  MAX_COPIES: 100, // no more copies burst out once there are this many

  // New copies fly out of a bursting cell at BURST_SPEED (dish radii per
  // second), slow down at SETTLE_RATE, and then just jiggle about at
  // DRIFT_SPEED: viruses can't swim, they drift.
  BURST_SPEED: 0.6,
  SETTLE_RATE: 3,
  DRIFT_SPEED: 0.09,

  // How soon a new host cell turns up after one bursts. Healthy cells that
  // glide (HOSTS) turn a little as they go and never go past HOST_EDGE from
  // the middle. Infected ones stop.
  HOST_RESPAWN_MS: 1200,
  HOST_EDGE: 0.85,
};
