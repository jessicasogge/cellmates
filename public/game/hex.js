// The flask's sheet of host cells, as a grid of hexagons, the way cells in a
// monolayer pack together. Hexes are "pointy-top", in rows that are shifted
// half a cell to the right on every odd row.
//
// Positions are in flask units (the flask is FLASK.width x FLASK.height, see
// config.js), not screen px; the page scales the whole flask to fit.
//
// Each cell has axial coordinates (q, r), the usual way to do hex math
// (https://www.redblobgames.com/grids/hexagons/), plus its middle (x, y).

export const SQRT3 = Math.sqrt(3);

// The middle of the cell at axial (q, r), for cells `size` from middle to
// corner, with the middle of cell (0, 0) at `origin`.
export function hexCenter(q, r, size, origin) {
  return {
    x: origin.x + size * SQRT3 * (q + r / 2),
    y: origin.y + size * 1.5 * r,
  };
}

// The axial (q, r) of the cell that point (x, y) falls in.
export function hexAt(x, y, size, origin) {
  const px = x - origin.x;
  const py = y - origin.y;
  const r = (2 / 3) * py / size;
  const q = (SQRT3 / 3) * px / size - r / 2;
  return hexRound(q, r);
}

// Round fractional axial coordinates to the nearest cell, by rounding in
// cube coordinates (q + r + s = 0) and fixing whichever was rounded most.
export function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // Math.round gives -0 for small negatives; 0 is the same cell and easier
  // to compare.
  return { q: rq + 0, r: rr + 0 };
}

export function hexKey(q, r) {
  return `${q},${r}`;
}

// Fill the box `area` ({ left, top, right, bottom }) with whole cells of
// `size`. Returns { cells, origin }: every cell { q, r, x, y } that fits
// completely, row by row, and the middle of cell (0, 0), for hexAt().
export function buildGrid(area, size) {
  const width = SQRT3 * size; // from one flat side to the other
  const origin = { x: area.left + width / 2, y: area.top + size };
  const cells = [];
  for (let row = 0; origin.y + row * 1.5 * size + size <= area.bottom; row++) {
    const shift = row & 1; // odd rows sit half a cell to the right
    for (let col = 0; ; col++) {
      const x = origin.x + width * (col + shift / 2);
      if (x + width / 2 > area.right) break;
      const q = col - (row - shift) / 2;
      cells.push({ q, r: row, x, y: origin.y + row * 1.5 * size });
    }
  }
  return { cells, origin };
}

// The six corners of the hexagon around (x, y), for drawing it.
export function hexCorners(x, y, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push([x + size * Math.cos(angle), y + size * Math.sin(angle)]);
  }
  return corners;
}
