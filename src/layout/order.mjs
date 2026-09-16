function countInversions(values) {
  const size = values.length;
  if (size < 2) return 0;
  const width = Math.max(...values) + 2;
  const tree = new Array(width).fill(0);
  let crossings = 0;
  let seen = 0;

  for (const value of values) {
    const key = value + 1;
    let smaller = 0;
    for (let i = key; i > 0; i -= i & -i) smaller += tree[i];
    crossings += seen - smaller;
    seen += 1;
    for (let i = key; i < width; i += i & -i) tree[i] += 1;
  }
  return crossings;
}

export function countCrossings(layers, links) {
  let total = 0;
  for (let depth = 0; depth + 1 < layers.length; depth += 1) {
    const upper = new Map(layers[depth].map((id, position) => [id, position]));
    const lower = new Map(layers[depth + 1].map((id, position) => [id, position]));
    const pairs = [];
    for (const [from, to] of links) {
      if (upper.has(from) && lower.has(to)) pairs.push([upper.get(from), lower.get(to)]);
    }
    pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    total += countInversions(pairs.map((pair) => pair[1]));
  }
  return total;
}

function median(positions) {
  if (!positions.length) return -1;
  const sorted = [...positions].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  if (sorted.length % 2) return sorted[middle];
  const left = sorted[middle - 1] - sorted[0];
  const right = sorted[sorted.length - 1] - sorted[middle];
  if (left === right) return (sorted[middle - 1] + sorted[middle]) / 2;
  return (sorted[middle - 1] * right + sorted[middle] * left) / (left + right);
}

function sweep(layers, neighbours, depth, reference) {
  const anchor = new Map(layers[reference].map((id, position) => [id, position]));
  const scored = layers[depth].map((id, position) => {
    const related = (neighbours.get(id) ?? [])
      .filter((other) => anchor.has(other))
      .map((other) => anchor.get(other));
    const value = median(related);
    return { id, position, value: value < 0 ? position : value };
  });
  scored.sort((a, b) => a.value - b.value || a.position - b.position);
  return scored.map((entry) => entry.id);
}

function cluster(layer, groupOf) {
  const average = new Map();
  const counts = new Map();
  layer.forEach((id, position) => {
    const group = groupOf.get(id);
    if (!group) return;
    average.set(group, (average.get(group) ?? 0) + position);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });
  for (const [group, total] of average) average.set(group, total / counts.get(group));

  return layer
    .map((id, position) => ({
      id,
      position,
      key: groupOf.get(id) ? average.get(groupOf.get(id)) : position,
    }))
    .sort((a, b) => a.key - b.key || a.position - b.position)
    .map((entry) => entry.id);
}

export function orderLayers(layers, links, groupOf, { passes = 8 } = {}) {
  const above = new Map();
  const below = new Map();
  for (const [from, to] of links) {
    if (!below.has(from)) below.set(from, []);
    if (!above.has(to)) above.set(to, []);
    below.get(from).push(to);
    above.get(to).push(from);
  }

  let current = layers.map((layer) => [...layer]);
  let best = current.map((layer) => [...layer]);
  let bestCrossings = countCrossings(best, links);

  for (let pass = 0; pass < passes && bestCrossings > 0; pass += 1) {
    const downward = pass % 2 === 0;
    if (downward) {
      for (let depth = 1; depth < current.length; depth += 1) {
        current[depth] = sweep(current, above, depth, depth - 1);
      }
    } else {
      for (let depth = current.length - 2; depth >= 0; depth -= 1) {
        current[depth] = sweep(current, below, depth, depth + 1);
      }
    }

    const clustered = current.map((layer) => cluster(layer, groupOf));
    const clusteredCrossings = countCrossings(clustered, links);
    const plainCrossings = countCrossings(current, links);
    if (clusteredCrossings <= plainCrossings) current = clustered;

    const crossings = Math.min(clusteredCrossings, plainCrossings);
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      best = current.map((layer) => [...layer]);
    }
  }

  return { layers: best, crossings: bestCrossings };
}
