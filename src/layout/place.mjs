export const metrics = {
  nodeHeight: 58,
  minWidth: 132,
  maxWidth: 248,
  charWidth: 7.6,
  padding: 34,
  gap: 40,
  layerGap: 96,
  groupPad: 22,
  groupHeader: 20,
  margin: 48,
};

export function measure(label) {
  const raw = metrics.padding + label.length * metrics.charWidth;
  return Math.round(Math.min(metrics.maxWidth, Math.max(metrics.minWidth, raw)));
}

function relax(entries, desired) {
  const order = entries.map((entry, index) => index);
  for (const index of order) {
    entries[index].x = desired[index];
  }
  for (let i = 1; i < entries.length; i += 1) {
    const min = entries[i - 1].x + entries[i - 1].w / 2 + metrics.gap + entries[i].w / 2;
    if (entries[i].x < min) entries[i].x = min;
  }
  for (let i = entries.length - 2; i >= 0; i -= 1) {
    const max = entries[i + 1].x - entries[i + 1].w / 2 - metrics.gap - entries[i].w / 2;
    if (entries[i].x > max) entries[i].x = max;
  }
}

function centreOf(ids, positions) {
  const values = ids.map((id) => positions.get(id)).filter((value) => value !== undefined);
  if (!values.length) return undefined;
  values.sort((a, b) => a - b);
  const middle = values.length >> 1;
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

export function place(layers, links, sizes, { passes = 6 } = {}) {
  const above = new Map();
  const below = new Map();
  for (const [from, to] of links) {
    if (!below.has(from)) below.set(from, []);
    if (!above.has(to)) above.set(to, []);
    below.get(from).push(to);
    above.get(to).push(from);
  }

  const rows = layers.map((layer) =>
    layer.map((id) => ({ id, w: sizes.get(id) ?? 1, x: 0 })),
  );

  for (const row of rows) {
    let cursor = 0;
    for (const entry of row) {
      entry.x = cursor + entry.w / 2;
      cursor += entry.w + metrics.gap;
    }
  }

  const positions = new Map();
  const snapshot = () => {
    positions.clear();
    for (const row of rows) for (const entry of row) positions.set(entry.id, entry.x);
  };
  snapshot();

  for (let pass = 0; pass < passes; pass += 1) {
    const downward = pass % 2 === 0;
    const sequence = downward ? rows.map((_, i) => i) : rows.map((_, i) => rows.length - 1 - i);
    for (const depth of sequence) {
      const neighbours = downward ? above : below;
      const desired = rows[depth].map((entry) => {
        const centre = centreOf(neighbours.get(entry.id) ?? [], positions);
        return centre === undefined ? entry.x : centre;
      });
      relax(rows[depth], desired);
      snapshot();
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const row of rows) {
    for (const entry of row) {
      minX = Math.min(minX, entry.x - entry.w / 2);
      maxX = Math.max(maxX, entry.x + entry.w / 2);
    }
  }

  const shift = metrics.margin - minX;
  const slots = new Map();
  rows.forEach((row, depth) => {
    for (const entry of row) {
      slots.set(entry.id, { cross: entry.x + shift, size: entry.w, layer: depth });
    }
  });

  return { slots, extent: maxX - minX + metrics.margin * 2, depth: rows.length };
}
