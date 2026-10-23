// Every mate's drawing, in one place. The home page, the picker and the
// petri dish all draw the mates from here, so a change to how a mate looks
// only has to be made once.
//
// Each mate has:
//   id      her key, matching SPECIES in config.js and ?mate= in addresses
//   name    what she's called
//   looks   what a screen reader says after her name
//   motion  her idle animation in styles.css (bob, squish or wobble)
//   frames  the part of the drawing each page shows (an SVG viewBox): a
//           little room around her on the home page, filling her tile on the
//           picker, snug in the dish
//   art     the drawing itself, in a 200 x 200 space. Wrap the face in
//           <g class="face">.
//
// To add a mate: add her to this list and to SPECIES in config.js, and give
// her tile a color in styles.css (.<id> next to .tia and the others).

const SVG = 'http://www.w3.org/2000/svg';

// A cute face: eyes with a glint, rosy cheeks and a smile, centered on
// (x, y), in the mate's `dark` color.
const face = (x, y, dark) => `
      <g class="face">
        <circle cx="${x - 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x + 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x - 9}" cy="${y - 2}" r="2" fill="white" />
        <circle cx="${x + 13}" cy="${y - 2}" r="2" fill="white" />
        <ellipse cx="${x - 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <ellipse cx="${x + 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <path d="M${x - 6} ${y + 12} Q${x} ${y + 18} ${x + 6} ${y + 12}" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>`;

// A regular polygon with `sides` corners, `r` from (cx, cy), the first
// corner at `start` degrees (0 is straight right), as SVG points.
export function polygon(cx, cy, r, sides, start = 0) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = ((start + (360 * i) / sides) * Math.PI) / 180;
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

// A five-pointed star centered on (cx, cy), its points `r` out, as SVG
// points.
export function star(cx, cy, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const d = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + d * Math.cos(angle)).toFixed(1)},${(cy + d * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

// Phoebe's 12 spikes, one on each corner of her shell. Seen from the front,
// six stick out around her edge.
const PHOEBE_SPIKES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * 60 * Math.PI) / 180;
  const at = (r) => [100 + r * Math.cos(angle), 104 + r * Math.sin(angle)].map((n) => n.toFixed(1));
  const [x1, y1] = at(58);
  const [x2, y2] = at(72);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f8a7e" stroke-width="5" stroke-linecap="round" />
      <circle cx="${x2}" cy="${y2}" r="7" fill="#c9f2ec" stroke="#0f8a7e" stroke-width="3.5" />`;
}).join('\n      ');

// Missy's shell is built from 180 copies of one coat protein; a ring of
// little bumps around her edge stands in for them.
const MISSY_BUMPS = Array.from({ length: 14 }, (_, i) => {
  const angle = ((i * 360) / 14 + 8) * (Math.PI / 180);
  const x = (100 + 46 * Math.cos(angle)).toFixed(1);
  const y = (108 + 46 * Math.sin(angle)).toFixed(1);
  return `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff4ef" opacity="0.9" />`;
}).join('\n      ');

// Polly's surface: a star-shaped plateau (a mesa) on each corner of her
// shell, ringed by a groove (the canyon) where she grabs a cell. Five show
// around her face.
const POLLY_MESAS = Array.from({ length: 5 }, (_, i) => {
  const angle = ((-90 + i * 72) * Math.PI) / 180;
  const x = (100 + 42 * Math.cos(angle)).toFixed(1);
  const y = (106 + 42 * Math.sin(angle)).toFixed(1);
  return `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#9fb4f2" stroke-width="2.5" />
      <polygon points="${star(Number(x), Number(y), 9)}" fill="#f4f7ff" stroke="#9fb4f2" stroke-width="1.5" stroke-linejoin="round" />`;
}).join('\n      ');

// Flo's two kinds of spike, alternating all around her envelope: H
// (hemagglutinin), a thick stalk with a round club on the end, and N
// (neuraminidase), a thin stalk with a square head.
const FLO_SPIKES = Array.from({ length: 16 }, (_, i) => {
  const degrees = i * 22.5 - 90;
  const angle = (degrees * Math.PI) / 180;
  const at = (r) => [100 + r * Math.cos(angle), 104 + r * Math.sin(angle)].map((n) => n.toFixed(1));
  const [x1, y1] = at(46);
  const [x2, y2] = at(64);
  if (i % 2 === 0) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c98a0a" stroke-width="5" stroke-linecap="round" />
      <circle cx="${x2}" cy="${y2}" r="5.5" fill="#fff1c2" stroke="#c98a0a" stroke-width="3" />`;
  }
  const [hx, hy] = at(66);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c98a0a" stroke-width="3" stroke-linecap="round" />
      <rect x="${(hx - 4.5).toFixed(1)}" y="${(hy - 4.5).toFixed(1)}" width="9" height="9" rx="1.5" fill="#fde68a" stroke="#c98a0a" stroke-width="2.5" transform="rotate(${degrees} ${hx} ${hy})" />`;
}).join('\n      ');

export const MATES = [
  // Tia: phage T4, a lavender lunar lander: a gem-shaped head full of DNA on
  // a striped tail, standing on bendy tail fibers
  {
    id: 'tia',
    name: 'Tia',
    looks: 'a lavender T4 phage shaped like a lunar lander: a gem-shaped head on a striped tail, standing on long, bendy legs',
    motion: 'bob',
    frames: { home: '0 0 200 200', picker: '4 4 192 192', dish: '6 6 188 188' },
    art: `
      <!-- tail fibers: six in all, four showing, bent at the knee -->
      <g fill="none" stroke="#6d4fc2" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="86,154 50,146 34,186" />
        <polyline points="92,158 72,170 64,192" />
        <polyline points="114,154 150,146 166,186" />
        <polyline points="108,158 128,170 136,192" />
      </g>
      <!-- baseplate, tail sheath and collar -->
      <polygon points="80,148 120,148 114,160 86,160" fill="#e6defc" stroke="#6d4fc2" stroke-width="4" stroke-linejoin="round" />
      <rect x="90" y="106" width="20" height="44" rx="4" fill="#e6defc" stroke="#6d4fc2" stroke-width="4" />
      <g stroke="#b6a4ec" stroke-width="2.5">
        <line x1="93" y1="118" x2="107" y2="118" />
        <line x1="93" y1="128" x2="107" y2="128" />
        <line x1="93" y1="138" x2="107" y2="138" />
      </g>
      <!-- the head: a stretched-out icosahedron, packed with her DNA -->
      <polygon points="100,12 140,34 140,88 100,110 60,88 60,34" fill="#e6defc" stroke="#6d4fc2" stroke-width="4" stroke-linejoin="round" />
      <polyline points="60,34 100,52 140,34" fill="none" stroke="#b6a4ec" stroke-width="2.5" stroke-linejoin="round" />
      <line x1="100" y1="12" x2="100" y2="52" stroke="#b6a4ec" stroke-width="2.5" />
      <ellipse cx="78" cy="40" rx="7" ry="4" fill="#f7f3ff" transform="rotate(25 78 40)" />
      ${face(100, 74, '#33236b')}
    `,
  },
  // Phoebe: phage φX174, a small teal gem with no tail and a knobbed spike
  // on every corner
  {
    id: 'phoebe',
    name: 'Phoebe',
    looks: 'a teal φX174 phage: a little twenty-sided gem with no tail and a knobby spike on every corner',
    motion: 'squish',
    frames: { home: '0 0 200 200', picker: '14 18 172 172', dish: '18 20 164 164' },
    art: `
      ${PHOEBE_SPIKES}
      <!-- her shell: twenty triangle faces, which from the front look like a hexagon -->
      <polygon points="${polygon(100, 104, 60, 6)}" fill="#c9f2ec" stroke="#0f8a7e" stroke-width="4" stroke-linejoin="round" />
      <polyline points="70,52 100,76 130,52" fill="none" stroke="#7fd3c8" stroke-width="2.5" stroke-linejoin="round" />
      <ellipse cx="66" cy="84" rx="8" ry="4.5" fill="#effcfa" transform="rotate(-50 66 84)" />
      ${face(100, 108, '#0b4f48')}
    `,
  },
  // Missy: phage MS2, a small, round coral shell with a bumpy coat and one
  // little tab (her maturation protein) that grabs the cell's pilus
  {
    id: 'missy',
    name: 'Missy',
    looks: 'a coral MS2 phage: a small, round, bumpy shell with one little tab on top',
    motion: 'wobble',
    frames: { home: '0 0 200 200', picker: '22 22 156 156', dish: '26 24 148 148' },
    art: `
      <!-- the tab: her one maturation protein, which grabs the cell's pilus -->
      <rect x="92" y="40" width="16" height="22" rx="8" fill="#ffdccf" stroke="#d9573a" stroke-width="4" />
      <!-- her shell: nearly round, made of 180 copies of one coat protein -->
      <polygon points="${polygon(100, 108, 54, 10, -90)}" fill="#ffdccf" stroke="#d9573a" stroke-width="4" stroke-linejoin="round" />
      ${MISSY_BUMPS}
      ${face(100, 110, '#7a2614')}
    `,
  },
  // Polly: poliovirus, a small cornflower-blue twenty-sided shell with a
  // star-shaped mesa ringed by a canyon on each corner, and no tail
  {
    id: 'polly',
    name: 'Polly',
    looks: 'a cornflower-blue poliovirus: a small, round, twenty-sided shell dotted with little stars',
    motion: 'bob',
    frames: { home: '0 0 200 200', picker: '24 26 152 152', dish: '28 28 148 148' },
    art: `
      <!-- her shell: a protein icosahedron around her RNA, with no envelope -->
      <polygon points="${polygon(100, 106, 56, 12, -90)}" fill="#dbe5ff" stroke="#3b5bdb" stroke-width="4" stroke-linejoin="round" />
      ${POLLY_MESAS}
      ${face(100, 112, '#1e2f78')}
    `,
  },
  // Flo: influenza A, a round golden envelope bristling with two kinds of
  // spike, H clubs and N squares
  {
    id: 'flo',
    name: 'Flo',
    looks: 'a golden influenza A virus: a round, fuzzy ball bristling with two kinds of spikes, little clubs and little squares',
    motion: 'squish',
    frames: { home: '0 0 200 200', picker: '18 20 164 164', dish: '22 22 156 156' },
    art: `
      ${FLO_SPIKES}
      <!-- her envelope: a bubble of the last cell's membrane, around eight pieces of RNA -->
      <circle cx="100" cy="104" r="48" fill="#fff1c2" stroke="#c98a0a" stroke-width="4" />
      <ellipse cx="80" cy="80" rx="9" ry="5" fill="#fffaeb" transform="rotate(-30 80 80)" />
      ${face(100, 108, '#5c4300')}
    `,
  },
];

// The home page's order: the biggest in the middle.
const HOME = ['phoebe', 'flo', 'tia', 'missy', 'polly'];
export const HOME_MATES = HOME.map((id) => MATES.find((mate) => mate.id === id));

export function mateById(id) {
  return MATES.find((mate) => mate.id === id);
}

// Her drawing as an <svg>, framed for `page` ('home', 'picker' or 'dish').
function drawing(mate, page) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', mate.frames[page]);
  svg.innerHTML = mate.art;
  return svg;
}

// For the home page's row of mates.
export function homeMate(mate) {
  const svg = drawing(mate, 'home');
  svg.setAttribute('class', `mate ${mate.motion}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${mate.name}, ${mate.looks}`);
  return svg;
}

// Her picture on a colored tile, for the picker. The name next to it says
// who she is, so the picture is hidden from screen readers.
export function mateTile(mate) {
  const tile = document.createElement('div');
  tile.className = `mate-icon ${mate.id}`;
  const svg = drawing(mate, 'picker');
  svg.setAttribute('aria-hidden', 'true');
  tile.append(svg);
  return tile;
}

// For the petri dish, hidden until the game picks her (main.js).
export function dishMate(mate) {
  const svg = drawing(mate, 'dish');
  svg.setAttribute('class', `dish-mate ${mate.motion}`);
  svg.dataset.mate = mate.id;
  svg.dataset.name = mate.name;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${mate.name}, ${mate.looks}`);
  svg.setAttribute('hidden', '');
  return svg;
}
