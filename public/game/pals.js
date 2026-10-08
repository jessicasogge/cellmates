// Every pal's name and drawing, in one place. The pages draw the pals from
// here, in the order listed.
//
// Each pal has:
//   id      her key, used in links and to look her up
//   name    display name
//   looks   screen-reader description after her name
//   motion  idle animation in styles.css: bob
//   art     200 x 200 drawing; the face is wrapped in <g class="face">

const SVG = 'http://www.w3.org/2000/svg';

export const PALS = [
  // Tess: phage T4, a virus that infects bacteria. Her head is a stretched
  // 20-sided shell holding her DNA, on a striped tail she squeezes like a
  // syringe to inject it, with six spidery tail fibers to land on a cell.
  {
    id: 'tess',
    name: 'Tess',
    looks: 'a lavender T4 phage with a many-sided head, a striped tail and six spidery legs',
    motion: 'bob',
    art: `
      <!-- six tail fibers, bent at the knee -->
      <path d="M84 150 L56 136 L42 178 M90 154 L74 162 L66 190 M96 156 L92 176 L96 194 M104 156 L108 176 L104 194 M110 154 L126 162 L134 190 M116 150 L144 136 L158 178" fill="none" stroke="#6d28d9" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
      <!-- the tail: a striped sheath that contracts to inject her DNA -->
      <rect x="92" y="100" width="16" height="48" rx="4" fill="#c4b5fd" />
      <path d="M92 112 H108 M92 122 H108 M92 132 H108" stroke="#7c3aed" stroke-width="2" opacity="0.5" />
      <rect x="80" y="146" width="40" height="9" rx="3" fill="#7c3aed" />
      <rect x="86" y="92" width="28" height="10" rx="3" fill="#7c3aed" />
      <!-- the head, with a few of its facets -->
      <polygon points="100,20 132,38 132,78 100,96 68,78 68,38" fill="#a78bfa" />
      <path d="M100 20 L100 96 M68 38 L132 78 M132 38 L68 78" stroke="#7c3aed" stroke-width="1.5" opacity="0.25" />
      <ellipse cx="84" cy="36" rx="8" ry="4" fill="#ffffff" opacity="0.45" />
      <g class="face">
        <circle cx="89" cy="56" r="6" fill="#3b0d2e" />
        <circle cx="111" cy="56" r="6" fill="#3b0d2e" />
        <circle cx="87.5" cy="54.5" r="2" fill="#ffffff" />
        <circle cx="109.5" cy="54.5" r="2" fill="#ffffff" />
        <ellipse cx="80" cy="66" rx="5" ry="3" fill="#f9a8d4" opacity="0.9" />
        <ellipse cx="120" cy="66" rx="5" ry="3" fill="#f9a8d4" opacity="0.9" />
        <path d="M93 69 Q100 76 107 69" fill="none" stroke="#3b0d2e" stroke-width="3.5" stroke-linecap="round" />
      </g>
    `,
  },
  // Flo: influenza A, a round virus covered in two kinds of spikes. The
  // lollipop-shaped HA spikes grab a cell's sialic acid to get in; the
  // mushroom-shaped NA spikes snip it to let new copies go. Here they're
  // simplified to teal and gold knobs, taking turns around her.
  {
    id: 'flo',
    name: 'Flo',
    looks: 'a round coral influenza A virus covered in teal and gold spikes',
    motion: 'bob',
    art: `
      <!-- 16 spike stalks, poking out from under her envelope -->
      <circle cx="100" cy="104" r="66" fill="none" stroke="#be185d" stroke-width="14" stroke-dasharray="3 22.92" />
      <!-- spike tips, taking turns: teal HA, then gold NA -->
      <circle cx="100" cy="104" r="76" fill="none" stroke="#14b8a6" stroke-width="12" stroke-linecap="round" stroke-dasharray="0.01 59.69" />
      <circle cx="100" cy="104" r="76" fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round" stroke-dasharray="0.01 59.69" stroke-dashoffset="-29.85" />
      <!-- her round envelope -->
      <circle cx="100" cy="104" r="60" fill="#fb7185" />
      <ellipse cx="76" cy="78" rx="13" ry="7" fill="#ffffff" opacity="0.45" />
      <g class="face">
        <circle cx="84" cy="102" r="7" fill="#3b0d2e" />
        <circle cx="116" cy="102" r="7" fill="#3b0d2e" />
        <circle cx="82" cy="100" r="2.4" fill="#ffffff" />
        <circle cx="114" cy="100" r="2.4" fill="#ffffff" />
        <ellipse cx="72" cy="115" rx="6" ry="3.6" fill="#fda4af" opacity="0.9" />
        <ellipse cx="128" cy="115" rx="6" ry="3.6" fill="#fda4af" opacity="0.9" />
        <path d="M89 118 Q100 128 111 118" fill="none" stroke="#3b0d2e" stroke-width="4" stroke-linecap="round" />
      </g>
    `,
  },
];

// The pals on the home page, in order.
const HOME = ['tess', 'flo'];
export const HOME_PALS = PALS.filter((pal) => HOME.includes(pal.id));

export function palById(id) {
  return PALS.find((pal) => pal.id === id);
}

// For the home page's row of pals: her drawing as an <svg>, gently moving,
// and labeled for screen readers.
export function homePal(pal) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.innerHTML = pal.art;
  svg.setAttribute('class', `pal ${pal.motion}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  return svg;
}
