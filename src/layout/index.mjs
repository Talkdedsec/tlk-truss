import { breakCycles, assignLayers, insertVirtualNodes } from './rank.mjs';
import { orderLayers, countCrossings } from './order.mjs';
import { place, measure, metrics } from './place.mjs';
import { layoutSequence } from './sequence.mjs';

function chainLinks(segments) {
  const links = [];
  for (const segment of segments) {
    for (let i = 0; i + 1 < segment.chain.length; i += 1) {
      links.push([segment.chain[i], segment.chain[i + 1]]);
    }
  }
  return links;
}

function spanOf(members, horizontal) {
  const low = Math.min(...members.map((box) => (horizontal ? box.y : box.x)));
  const high = Math.max(...members.map((box) => (horizontal ? box.y + box.h : box.x + box.w)));
  const first = Math.min(...members.map((box) => box.layer));
  const last = Math.max(...members.map((box) => box.layer));
  return { low, high, first, last };
}

function pushOutsiders(model, boxOf, horizontal) {
  const pad = metrics.groupPad + metrics.gap / 2;
  const axis = horizontal ? 'y' : 'x';
  const size = horizontal ? 'h' : 'w';

  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    for (const group of model.groups) {
      const members = group.members.map((id) => boxOf.get(id)).filter(Boolean);
      if (!members.length) continue;
      const span = spanOf(members, horizontal);
      const owned = new Set(group.members);
      for (const node of model.nodes) {
        if (owned.has(node.id)) continue;
        const box = boxOf.get(node.id);
        if (box.layer < span.first || box.layer > span.last) continue;
        const start = box[axis];
        const end = start + box[size];
        if (end <= span.low - pad || start >= span.high + pad) continue;
        const centre = (start + end) / 2;
        box[axis] =
          centre < (span.low + span.high) / 2
            ? span.low - pad - box[size]
            : span.high + pad;
        moved = true;
      }
    }
    if (!moved) break;

    const byLayer = new Map();
    for (const node of model.nodes) {
      const box = boxOf.get(node.id);
      if (!byLayer.has(box.layer)) byLayer.set(box.layer, []);
      byLayer.get(box.layer).push({ id: node.id, box });
    }
    const grouped = new Set(model.groups.flatMap((group) => group.members));
    for (const row of byLayer.values()) {
      row.sort((a, b) => a.box[axis] - b.box[axis]);
      for (let i = 1; i < row.length; i += 1) {
        const previous = row[i - 1].box;
        const current = row[i].box;
        const min = previous[axis] + previous[size] + metrics.gap;
        if (current[axis] >= min) continue;
        if (grouped.has(row[i].id) && !grouped.has(row[i - 1].id)) {
          previous[axis] = current[axis] - previous[size] - metrics.gap;
        } else {
          current[axis] = min;
        }
      }
    }
  }
}

export function layout(model) {
  if (model.view === 'sequence') return layoutSequence(model);
  return layoutLayered(model);
}

function layoutLayered(model) {
  const loops = model.edges.filter((edge) => edge.from === edge.to);
  const linked = model.edges.filter((edge) => edge.from !== edge.to);
  const { acyclic, reversedCount } = breakCycles(model.nodes, linked);
  const depthOf = assignLayers(model.nodes, acyclic);
  const { segments, virtual } = insertVirtualNodes(acyclic, depthOf);

  const depth = Math.max(0, ...[...depthOf.values()]) + 1;
  const layers = Array.from({ length: depth }, () => []);
  for (const node of model.nodes) layers[depthOf.get(node.id)].push(node.id);
  for (const point of virtual) layers[point.layer].push(point.id);

  const groupOf = new Map(model.nodes.map((node) => [node.id, node.group]));
  const links = chainLinks(segments);
  const ordered = orderLayers(layers, links, groupOf);

  const horizontal = model.flow === 'right';
  const sizes = new Map();
  for (const node of model.nodes) {
    node.width = measure(node.label);
    sizes.set(node.id, horizontal ? metrics.nodeHeight : node.width);
  }
  for (const point of virtual) sizes.set(point.id, 1);

  const { slots } = place(ordered.layers, links, sizes);

  const columns = ordered.layers.map((layer) => {
    const widths = layer.map((id) => model.nodeIndex.get(id)?.width ?? 1);
    return Math.max(metrics.minWidth, ...widths);
  });
  const offsets = [];
  let cursor = metrics.margin;
  for (const width of columns) {
    offsets.push(cursor);
    cursor += (horizontal ? width : metrics.nodeHeight) + metrics.layerGap;
  }

  const boxOf = new Map();
  for (const [id, slot] of slots) {
    const node = model.nodeIndex.get(id);
    const w = node ? node.width : 1;
    const h = node ? metrics.nodeHeight : 1;
    const box = horizontal
      ? { x: offsets[slot.layer], y: slot.cross - h / 2, w, h }
      : { x: slot.cross - w / 2, y: offsets[slot.layer], w, h };
    boxOf.set(id, { ...box, layer: slot.layer });
  }

  pushOutsiders(model, boxOf, horizontal);

  const nodes = model.nodes.map((node) => ({ ...node, ...boxOf.get(node.id) }));
  const groups = model.groups
    .filter((group) => group.members.some((id) => boxOf.has(id)))
    .map((group) => {
    const members = group.members.map((id) => boxOf.get(id)).filter(Boolean);
    const left = Math.min(...members.map((box) => box.x)) - metrics.groupPad;
    const top = Math.min(...members.map((box) => box.y)) - metrics.groupPad - metrics.groupHeader;
    const right = Math.max(...members.map((box) => box.x + box.w)) + metrics.groupPad;
    const bottom = Math.max(...members.map((box) => box.y + box.h)) + metrics.groupPad;
    return { ...group, x: left, y: top, w: right - left, h: bottom - top };
  });

  const loopGeometry = loops.map((edge) => {
    const box = boxOf.get(edge.from);
    const reach = 30;
    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      style: edge.style,
      loop: horizontal
        ? { x: box.x + box.w / 2, y: box.y, reach, side: 'top' }
        : { x: box.x + box.w, y: box.y + box.h / 2, reach, side: 'right' },
      points: [],
    };
  });

  const edges = segments.map(({ edge, chain }) => {
    const points = chain.map((id, index) => {
      const box = boxOf.get(id);
      if (index === 0) {
        return horizontal
          ? { x: box.x + box.w, y: box.y + box.h / 2 }
          : { x: box.x + box.w / 2, y: box.y + box.h };
      }
      if (index === chain.length - 1) {
        return horizontal
          ? { x: box.x, y: box.y + box.h / 2 }
          : { x: box.x + box.w / 2, y: box.y };
      }
      return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    });
    const source = edge.flipped ? edge.to : edge.from;
    const target = edge.flipped ? edge.from : edge.to;
    return {
      from: source,
      to: target,
      label: edge.label,
      style: edge.style,
      flipped: edge.flipped,
      points: edge.flipped ? [...points].reverse() : points,
    };
  });

  edges.push(...loopGeometry);

  const drawn = [...nodes, ...groups];
  const points = edges.flatMap((edge) => edge.points);
  const left = Math.min(...drawn.map((box) => box.x), ...points.map((point) => point.x));
  const top = Math.min(...drawn.map((box) => box.y), ...points.map((point) => point.y));
  const right = Math.max(...drawn.map((box) => box.x + box.w), ...points.map((point) => point.x));
  const bottom = Math.max(...drawn.map((box) => box.y + box.h), ...points.map((point) => point.y));

  const shiftX = metrics.margin - left;
  const shiftY = metrics.margin - top;
  for (const box of drawn) {
    box.x += shiftX;
    box.y += shiftY;
  }
  for (const point of points) {
    point.x += shiftX;
    point.y += shiftY;
  }
  for (const edge of edges) {
    if (!edge.loop) continue;
    edge.loop.x += shiftX;
    edge.loop.y += shiftY;
  }

  return {
    kind: 'layered',
    nodes,
    groups,
    edges,
    width: Math.round(right - left + metrics.margin * 2),
    height: Math.round(bottom - top + metrics.margin * 2),
    summary: [
      { key: model.view === 'lifecycle' ? 'states' : 'nodes', value: nodes.length },
      { key: model.view === 'lifecycle' ? 'transitions' : 'edges', value: edges.length },
      { key: model.view === 'lifecycle' ? 'stages' : 'layers', value: ordered.layers.length },
      { key: 'crossings', value: ordered.crossings },
    ],
    stats: {
      crossings: ordered.crossings,
      verified: countCrossings(ordered.layers, links),
      layers: ordered.layers.length,
      reversed: reversedCount,
      virtual: virtual.length,
    },
  };
}
