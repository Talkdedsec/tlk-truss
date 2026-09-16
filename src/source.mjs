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

  for (const edge of model.edges) {
    const arrow = arrowFor[edge.style] ?? '->';
    lines.push(`${edge.from} ${arrow} ${edge.to}${edge.label ? ` : ${edge.label}` : ''}`);
  }
  return `${lines.join('\n')}\n`;
}
