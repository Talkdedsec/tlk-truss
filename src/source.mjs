const arrowFor = { solid: '->', async: '~>', both: '<->' };

function quote(text) {
  return `"${String(text).replace(/"/g, "'")}"`;
}

export function toSource(model) {
  const lines = [];
  if (model.title) lines.push(`title  ${model.title}`);
  lines.push(`view   ${model.view}`);
  if (model.theme && model.theme !== 'dark') lines.push(`theme  ${model.theme}`);
  const defaultFlow = model.view === 'dataflow' ? 'right' : 'down';
  if (model.flow && model.flow !== defaultFlow) lines.push(`flow   ${model.flow}`);
  if (model.root && model.root !== '.') lines.push(`root   ${model.root}`);
  lines.push('');

  for (const group of model.groups) {
    lines.push(`group ${group.id} ${quote(group.label)}`);
  }
  if (model.groups.length) lines.push('');

  for (const node of model.nodes) {
    const parts = [`node ${node.id} ${quote(node.label)}`];
    if (node.group) parts.push(`in=${node.group}`);
    if (node.kind && node.kind !== 'service') parts.push(`kind=${node.kind}`);
    if (node.code) parts.push(`code=${node.code}`);
    if (node.note) parts.push(`note=${quote(node.note)}`);
    if (node.url) parts.push(`url=${node.url}`);
    lines.push(parts.join(' '));
  }
  lines.push('');

  const frameOf = new Map((model.frames ?? []).map((frame) => [frame.id, frame]));
  const chainFor = (id) => {
    const chain = [];
    let cursor = id;
    while (cursor && frameOf.has(cursor)) {
      chain.unshift(frameOf.get(cursor));
      cursor = frameOf.get(cursor).parent;
    }
    return chain;
  };
  let openFrames = [];
  const indent = () => '  '.repeat(openFrames.length);

  for (const edge of model.edges) {
    const wanted = chainFor(edge.frame);
    let shared = 0;
    while (
      shared < openFrames.length &&
      shared < wanted.length &&
      openFrames[shared].id === wanted[shared].id
    ) {
      shared += 1;
    }
    while (openFrames.length > shared) {
      openFrames.pop();
      lines.push(`${indent()}end`);
    }
    for (let i = shared; i < wanted.length; i += 1) {
      const frame = wanted[i];
      lines.push(`${indent()}block ${frame.kind}${frame.label ? ` ${quote(frame.label)}` : ''}`);
      openFrames.push(frame);
    }
    const arrow = arrowFor[edge.style] ?? '->';
    const attrs = [
      edge.code ? `code=${edge.code}` : '',
      edge.note ? `note=${quote(edge.note)}` : '',
    ].filter(Boolean);
    const tail = attrs.length
      ? ` : ${quote(edge.label)} ${attrs.join(' ')}`
      : edge.label
        ? ` : ${edge.label}`
        : '';
    lines.push(`${indent()}${edge.from} ${arrow} ${edge.to}${tail}`);
  }
  while (openFrames.length) {
    openFrames.pop();
    lines.push(`${indent()}end`);
  }
  return `${lines.join('\n')}\n`;
}
