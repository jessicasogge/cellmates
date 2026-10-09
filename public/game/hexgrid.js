// The flask's sheet of cells: flat-topped hexagons in columns, every other
// column shifted down half a cell, like a monolayer of cells growing one
// layer thick on the bottom of a culture flask.

const SQRT3 = Math.sqrt(3);

// Every cell that fits in a `width` x `height` box, for hexagons `size` from
// center to corner. Each cell has an `id` (its place in the list), its
// center (`x`, `y`) and the ids of the cells touching it (`neighbors`).
export function hexGrid(width, height, size) {
  const tall = SQRT3 * size; // flat side to flat side
  const cells = [];
  for (let col = 0; size + col * 1.5 * size <= width - size; col++) {
    const x = size + col * 1.5 * size;
    for (let row = 0; ; row++) {
      const y = tall / 2 + row * tall + (col % 2 ? tall / 2 : 0);
      if (y + tall / 2 > height) break;
      cells.push({ id: cells.length, x, y });
    }
  }
  // In this layout all six neighbors are exactly one cell height apart.
  for (const cell of cells) {
    cell.neighbors = cells
      .filter((other) => other !== cell && Math.hypot(other.x - cell.x, other.y - cell.y) < tall * 1.01)
      .map((other) => other.id);
  }
  return cells;
}

// A hexagon's corners as an SVG `points` string.
export function hexPoints(x, y, size) {
  return [0, 60, 120, 180, 240, 300]
    .map((degrees) => {
      const angle = (degrees * Math.PI) / 180;
      return `${(x + size * Math.cos(angle)).toFixed(2)},${(y + size * Math.sin(angle)).toFixed(2)}`;
    })
    .join(' ');
}

// The cell under the point (x, y), or null if it's outside every cell.
export function cellAt(cells, x, y, size) {
  let nearest = null;
  let distance = Infinity;
  for (const cell of cells) {
    const d = Math.hypot(cell.x - x, cell.y - y);
    if (d < distance) [nearest, distance] = [cell, d];
  }
  // Inside the circle that fits in the hexagon counts as on it.
  return distance <= (SQRT3 / 2) * size ? nearest : null;
}
