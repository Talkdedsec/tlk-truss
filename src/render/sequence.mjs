import { accentOf } from './theme.mjs';
import { escapeXml, openSvg, closeSvg, trim } from './shared.mjs';

export function renderSequence(diagram) {
  const parts = [openSvg(diagram)];

  parts.push('<g class="lifelines">');
  for (const lane of diagram.lanes) {
    parts.push(
      `<line class="lifeline" x1="${lane.centre.toFixed(1)}" y1="${(lane.y + lane.h).toFixed(1)}" ` +
        `x2="${lane.centre.toFixed(1)}" y2="${diagram.lifelineEnd.toFixed(1)}"/>`,
    );
  }
  parts.push('</g>');

  parts.push('<g class="frames">');
  for (const frame of diagram.frames) {
    const tag = frame.kind;
    const width = tag.length * 7 + 18;
    parts.push(
      `<g class="frame" data-frame="${escapeXml(frame.id)}">` +
        `<rect class="outline" x="${frame.x.toFixed(1)}" y="${frame.y.toFixed(1)}" ` +
        `width="${frame.w.toFixed(1)}" height="${frame.h.toFixed(1)}" rx="10"/>` +
        `<path class="tab" d="M ${frame.x.toFixed(1)} ${(frame.y + 10).toFixed(1)} ` +
        `a 10 10 0 0 1 10 -10 H ${(frame.x + width).toFixed(1)} ` +
        `l -9 20 H ${(frame.x + 10).toFixed(1)} a 10 10 0 0 1 -10 -10 Z"/>` +
        `<text class="tag" x="${(frame.x + 11).toFixed(1)}" y="${(frame.y + 15).toFixed(1)}">${escapeXml(tag)}</text>` +
        `<text class="caption" x="${(frame.x + width + 10).toFixed(1)}" y="${(frame.y + 15).toFixed(1)}">${escapeXml(trim(frame.label, 44))}</text>` +
        (frame.dividers ?? [])
          .map(
            (divider) =>
              `<line class="divider" x1="${frame.x.toFixed(1)}" y1="${divider.y.toFixed(1)}" ` +
              `x2="${(frame.x + frame.w).toFixed(1)}" y2="${divider.y.toFixed(1)}"/>` +
              `<rect class="chip" x="${(frame.x + 6).toFixed(1)}" y="${(divider.y + 4).toFixed(1)}" ` +
              `width="${(trim(divider.label || 'else', 44).length * 6.2 + 12).toFixed(1)}" height="17" rx="5"/>` +
              `<text class="caption" x="${(frame.x + 12).toFixed(1)}" y="${(divider.y + 16).toFixed(1)}">` +
              `${escapeXml(trim(divider.label || 'else', 44))}</text>`,
          )
          .join('') +
        '</g>',
    );
  }
  parts.push('</g>');

  parts.push('<g class="bars">');
  for (const bar of diagram.bars) {
    parts.push(
      `<rect class="bar" data-id="${escapeXml(bar.participant)}" x="${bar.x.toFixed(1)}" ` +
        `y="${bar.y.toFixed(1)}" width="11" height="${bar.h.toFixed(1)}" rx="2"/>`,
    );
  }
  parts.push('</g>');

  parts.push('<g class="messages">');
  for (const message of diagram.messages) {
    const classes = ['edge', message.style === 'async' ? 'async' : '']
      .filter(Boolean)
      .join(' ');
    parts.push(
      `<g class="${classes}" data-from="${escapeXml(message.from)}" data-to="${escapeXml(message.to)}">`,
    );

    if (message.self) {
      const top = message.y;
      const bottom = message.y + message.drop;
      const path =
        `M ${message.x1.toFixed(1)} ${top.toFixed(1)} ` +
        `H ${message.reach.toFixed(1)} V ${bottom.toFixed(1)} H ${(message.x1 + 6).toFixed(1)}`;
      parts.push(`<path class="stroke" d="${path}" marker-end="url(#tip)"/>`);
    } else {
      const backwards = message.x2 < message.x1;
      const offset = backwards ? 6 : -6;
      parts.push(
        `<line class="stroke" x1="${message.x1.toFixed(1)}" y1="${message.y.toFixed(1)}" ` +
          `x2="${(message.x2 + offset).toFixed(1)}" y2="${message.y.toFixed(1)}" marker-end="url(#tip)"/>`,
      );
    }

    if (message.label) {
      const text = trim(message.label, 40);
      const anchor = message.self
        ? { x: message.reach + 10, y: message.y + message.drop / 2, align: 'start' }
        : { x: (message.x1 + message.x2) / 2, y: message.y - 9, align: 'middle' };
      parts.push(
        `<text class="message-label" text-anchor="${anchor.align}" ` +
          `x="${anchor.x.toFixed(1)}" y="${anchor.y.toFixed(1)}">${escapeXml(text)}</text>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  parts.push('<g class="notes">');
  for (const note of diagram.notes) {
    const text = trim(note.text, 44);
    const width = text.length * 6.3 + 22;
    parts.push(
      `<g class="note" transform="translate(${note.x.toFixed(1)} ${note.y.toFixed(1)})">` +
        `<path d="M 0 -13 H ${(width - 9).toFixed(1)} L ${width.toFixed(1)} -4 V 13 H 0 Z"/>` +
        `<text x="11" y="4">${escapeXml(text)}</text></g>`,
    );
  }
  parts.push('</g>');

  parts.push('<g class="nodes">');
  for (const lane of diagram.lanes) {
    parts.push(
      `<g class="node" data-id="${escapeXml(lane.id)}" tabindex="0" ` +
        `transform="translate(${lane.x.toFixed(1)} ${lane.y.toFixed(1)})">`,
    );
    parts.push(`<rect class="body" width="${lane.w}" height="${lane.h}" rx="12"/>`);
    parts.push(`<rect class="accent" width="4" height="${lane.h}" rx="2" fill="${accentOf(lane.kind)}"/>`);
    const label = trim(lane.label, Math.floor((lane.w - 28) / 7.6));
    parts.push(`<text class="label" x="16" y="${lane.code ? 23 : 31}">${escapeXml(label)}</text>`);
    if (lane.code) {
      parts.push(
        `<text class="code" x="16" y="39">${escapeXml(trim(lane.code, Math.floor((lane.w - 28) / 6)))}</text>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');

  return closeSvg(parts);
}
