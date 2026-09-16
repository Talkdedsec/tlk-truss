import { accentOf } from './theme.mjs';
import { escapeXml, trim, openSvg, closeSvg } from './shared.mjs';

const corner = 13;

function waypoints(points, horizontal) {
  const path = [points[0]];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    if (horizontal) {
      if (Math.abs(from.y - to.y) > 1) {
        const mid = (from.x + to.x) / 2;
        path.push({ x: mid, y: from.y }, { x: mid, y: to.y });
      }
    } else if (Math.abs(from.x - to.x) > 1) {
      const mid = (from.y + to.y) / 2;
      path.push({ x: from.x, y: mid }, { x: to.x, y: mid });
    }
    path.push(to);
  }
  return path.filter((point, index) => {
    if (index === 0) return true;
    const previous = path[index - 1];
    return Math.abs(point.x - previous.x) > 0.5 || Math.abs(point.y - previous.y) > 0.5;
  });
}

function roundedPath(points) {
  if (points.length < 2) return '';
  const parts = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    const inLength = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outLength = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(corner, inLength / 2, outLength / 2);
    const entry = {
      x: current.x + ((previous.x - current.x) / inLength) * radius,
      y: current.y + ((previous.y - current.y) / inLength) * radius,
    };
    const exit = {
      x: current.x + ((next.x - current.x) / outLength) * radius,
      y: current.y + ((next.y - current.y) / outLength) * radius,
    };
    parts.push(`L ${entry.x.toFixed(1)} ${entry.y.toFixed(1)}`);
    parts.push(
      `Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${exit.x.toFixed(1)} ${exit.y.toFixed(1)}`,
    );
  }
  const last = points[points.length - 1];
  parts.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  return parts.join(' ');
}

function labelAnchor(points) {
  const middle = Math.max(1, Math.floor(points.length / 2));
  const a = points[middle - 1];
  const b = points[middle];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y
  );
}

function placeLabels(labels, horizontal) {
  const placed = [];
  for (const label of labels) {
    const step = horizontal ? 24 : 23;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const offset = (attempt % 2 ? -1 : 1) * Math.ceil(attempt / 2) * step;
      const box = horizontal
        ? { ...label.box, x: label.box.x + offset }
        : { ...label.box, y: label.box.y + offset };
      if (!placed.some((other) => overlaps(box, other))) {
        label.box = box;
        break;
      }
    }
    placed.push(label.box);
  }
}

function bodyOf(node, view) {
  if (view === 'lifecycle') {
    const radius = node.h / 2;
    return `<rect class="body" width="${node.w}" height="${node.h}" rx="${radius}"/>`;
  }
  if (view === 'dataflow' && (node.kind === 'source' || node.kind === 'sink')) {
    const lean = 14;
    const points =
      node.kind === 'source'
        ? `${lean},0 ${node.w},0 ${node.w - lean},${node.h} 0,${node.h}`
        : `0,0 ${node.w - lean},0 ${node.w},${node.h} ${lean},${node.h}`;
    return `<polygon class="body slanted" points="${points}"/>`;
  }
  return `<rect class="body" width="${node.w}" height="${node.h}" rx="12"/>`;
}

function markerOf(node) {
  if (node.kind === 'start') {
    return `<circle class="pip" cx="${node.w - 16}" cy="${node.h / 2}" r="5"/>`;
  }
  if (node.kind === 'terminal') {
    return (
      `<circle class="pip ring" cx="${node.w - 16}" cy="${node.h / 2}" r="7"/>` +
      `<circle class="pip" cx="${node.w - 16}" cy="${node.h / 2}" r="3.5"/>`
    );
  }
  return '';
}

export function renderSvg(diagram, { horizontal = false, view = 'architecture' } = {}) {
  const parts = [openSvg(diagram)];

  parts.push('<g class="groups">');
  for (const group of diagram.groups) {
    parts.push(
      `<g class="group" data-group="${escapeXml(group.id)}">` +
        `<rect x="${group.x.toFixed(1)}" y="${group.y.toFixed(1)}" width="${group.w.toFixed(1)}" height="${group.h.toFixed(1)}" rx="18"/>` +
        `<text x="${(group.x + 16).toFixed(1)}" y="${(group.y + 22).toFixed(1)}">${escapeXml(group.label)}</text>` +
        '</g>',
    );
  }
  parts.push('</g>');

  const drawnEdges = diagram.edges.map((edge) => {
    if (edge.loop) {
      const { x, y, reach, side } = edge.loop;
      const path =
        side === 'right'
          ? `M ${x.toFixed(1)} ${(y - 12).toFixed(1)} H ${(x + reach).toFixed(1)} V ${(y + 12).toFixed(1)} H ${(x + 6).toFixed(1)}`
          : `M ${(x - 12).toFixed(1)} ${y.toFixed(1)} V ${(y - reach).toFixed(1)} H ${(x + 12).toFixed(1)} V ${(y - 6).toFixed(1)}`;
      const label = edge.label ? trim(edge.label, 24) : '';
      return {
        edge,
        path,
        label,
        box: label
          ? side === 'right'
            ? { x: x + reach + 8, y: y - 10, w: label.length * 6.4 + 14, h: 20 }
            : { x: x + 18, y: y - reach - 10, w: label.length * 6.4 + 14, h: 20 }
          : null,
      };
    }
    const points = waypoints(edge.points, horizontal);
    const label = edge.label ? trim(edge.label, 28) : '';
    const anchor = label ? labelAnchor(points) : null;
    return {
      edge,
      points,
      path: roundedPath(points),
      label,
      box: label
        ? { x: anchor.x - (label.length * 6.4 + 14) / 2, y: anchor.y - 10, w: label.length * 6.4 + 14, h: 20 }
        : null,
    };
  });
  placeLabels(drawnEdges.filter((entry) => entry.label), horizontal);

  parts.push('<g class="edges">');
  for (const drawn of drawnEdges) {
    const { edge } = drawn;
    const classes = ['edge', edge.style === 'async' ? 'async' : '', edge.flipped ? 'back' : '']
      .filter(Boolean)
      .join(' ');
    parts.push(
      `<g class="${classes}" data-from="${escapeXml(edge.from)}" data-to="${escapeXml(edge.to)}">`,
    );
    parts.push(`<path class="hit" d="${drawn.path}"/>`);
    parts.push(`<path class="stroke" d="${drawn.path}" marker-end="url(#tip)"/>`);
    if (drawn.label) {
      const { box } = drawn;
      parts.push(
        `<g class="edge-label" transform="translate(${(box.x + box.w / 2).toFixed(1)} ${(box.y + 10).toFixed(1)})">` +
          `<rect x="${(-box.w / 2).toFixed(1)}" y="-10" width="${box.w.toFixed(1)}" height="20" rx="6"/>` +
          `<text text-anchor="middle" y="4">${escapeXml(drawn.label)}</text></g>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  parts.push('<g class="nodes">');
  for (const node of diagram.nodes) {
    const accent = accentOf(node.kind);
    const reserved = view === 'lifecycle' ? 52 : 28;
    const label = trim(node.label, Math.floor((node.w - reserved) / 7.6));
    parts.push(
      `<g class="node" data-id="${escapeXml(node.id)}" tabindex="0" transform="translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})">`,
    );
    const slanted = view === 'dataflow' && (node.kind === 'source' || node.kind === 'sink');
    parts.push(slanted ? bodyOf(node, view).replace('class="body slanted"', `class="body slanted" stroke="${accent}"`) : bodyOf(node, view));
    if (slanted) {
      parts.push('');
    } else if (view === 'lifecycle') {
      parts.push(
        `<rect class="accent" x="6" y="${(node.h - 22) / 2}" width="4" height="22" rx="2" fill="${accent}"/>`,
      );
      parts.push(markerOf(node).replace('class="pip"', `class="pip" fill="${accent}"`));
    } else {
      parts.push(`<rect class="accent" width="4" height="${node.h}" rx="2" fill="${accent}"/>`);
    }
    const hasCode = Boolean(node.code);
    parts.push(
      `<text class="label" x="${view === 'lifecycle' ? 20 : 16}" y="${hasCode ? 25 : 34}">${escapeXml(label)}</text>`,
    );
    if (hasCode) {
      parts.push(
        `<text class="code" x="${view === 'lifecycle' ? 20 : 16}" y="42">${escapeXml(trim(node.code, Math.floor((node.w - 28) / 6)))}</text>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  parts.push('</g></svg>');
  return parts.join('\n');
}
