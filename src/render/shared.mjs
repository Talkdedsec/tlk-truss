export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function trim(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function openSvg(diagram) {
  return (
    `<svg id="scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${diagram.width} ${diagram.height}" ` +
    `width="${diagram.width}" height="${diagram.height}" role="img">` +
    '<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" ' +
    'orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-strong)"/></marker>' +
    '<marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" ' +
    'orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="var(--line-strong)" ' +
    'stroke-width="1.4"/></marker></defs><g class="viewport">'
  );
}

export function closeSvg(parts) {
  return [...parts, '</g></svg>'].join('\n');
}
