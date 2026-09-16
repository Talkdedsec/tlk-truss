import { accentOf } from './theme.mjs';

const corner = 13;

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trim(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

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

export function renderSvg(diagram, { horizontal = false } = {}) {
  const parts = [];
  parts.push(
    `<svg id="scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${diagram.width} ${diagram.height}" width="${diagram.width}" height="${diagram.height}" role="img">`,
  );
  parts.push(
    '<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-strong)"/></marker></defs>',
  );
  parts.push('<g class="viewport">');

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
    const label = trim(node.label, Math.floor((node.w - 28) / 7.6));
    parts.push(
      `<g class="node" data-id="${escapeXml(node.id)}" tabindex="0" transform="translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})">`,
    );
    parts.push(`<rect class="body" width="${node.w}" height="${node.h}" rx="12"/>`);
    parts.push(
      `<rect class="accent" width="4" height="${node.h}" rx="2" fill="${accent}"/>`,
    );
    const hasCode = Boolean(node.code);
    parts.push(
      `<text class="label" x="16" y="${hasCode ? 25 : 34}">${escapeXml(label)}</text>`,
    );
    if (hasCode) {
      parts.push(
        `<text class="code" x="16" y="42">${escapeXml(trim(node.code, Math.floor((node.w - 28) / 6)))}</text>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  parts.push('</g></svg>');
  return parts.join('\n');
}
