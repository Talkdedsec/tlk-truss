const shapes = [
  [/^\(\[(.+)\]\)$/, 'service'],
  [/^\[\[(.+)\]\]$/, 'store'],
  [/^\[\((.+)\)\]$/, 'store'],
  [/^\(\((.+)\)\)$/, 'state'],
  [/^\{\{(.+)\}\}$/, 'queue'],
  [/^\{(.+)\}$/, 'state'],
  [/^\[\/(.+)\/\]$/, 'source'],
  [/^\((.+)\)$/, 'service'],
  [/^\[(.+)\]$/, 'service'],
  [/^>(.+)\]$/, 'external'],
];

function readLabel(raw) {
  if (!raw) return null;
  for (const [pattern, kind] of shapes) {
    const match = raw.match(pattern);
    if (match) return { label: match[1].replace(/^["']|["']$/g, ''), kind };
  }
  return null;
}

function safeId(text, taken) {
  let base = text
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  if (!base || /^\d/.test(base)) base = `n_${base}`;
  let id = base;
  let counter = 2;
  while (taken.has(id)) {
    id = `${base}${counter}`;
    counter += 1;
  }
  taken.add(id);
  return id;
}

function quote(text) {
  return `"${text.replace(/"/g, "'")}"`;
}

export function fromMermaid(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('%%'));
  const header = lines.find((line) => /^(flowchart|graph|sequenceDiagram|stateDiagram)/i.test(line));
  if (!header) return { text: '', diagnostics: [{ code: 'E500', line: 1 }] };

  if (/^sequenceDiagram/i.test(header)) return readSequence(lines);
  if (/^stateDiagram/i.test(header)) return readState(lines);
  return readFlowchart(lines, header);
}

function readFlowchart(lines, header) {
  const direction = /\b(LR|RL)\b/i.test(header) ? 'right' : 'down';
  const out = ['view   architecture', `flow   ${direction}`, ''];
  const declared = new Map();
  const body = [];
  const groups = [];
  let open = null;

  const declare = (token) => {
    const match = token.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
    if (!match) return null;
    const [, raw, rest] = match;
    const shape = readLabel(rest.trim());
    const id = raw.toLowerCase();
    if (!declared.has(id)) {
      declared.set(id, { id, label: shape ? shape.label : raw, kind: shape ? shape.kind : '' });
      if (open) open.members.push(id);
    } else if (shape) {
      declared.get(id).label = shape.label;
      declared.get(id).kind = shape.kind;
    }
    return id;
  };

  for (const line of lines) {
    if (line === header) continue;
    if (/^subgraph\s+/i.test(line)) {
      const match = line.match(/^subgraph\s+([A-Za-z0-9_.-]+)\s*(?:\[(.*)\])?/i);
      open = {
        id: (match?.[1] ?? `group${groups.length + 1}`).toLowerCase(),
        label: (match?.[2] ?? match?.[1] ?? '').replace(/^["']|["']$/g, ''),
        members: [],
      };
      groups.push(open);
      continue;
    }
    if (/^end$/i.test(line)) {
      open = null;
      continue;
    }

    const link = line.match(/^(.*?)\s*(-\.->|-->|==>|---)\s*(?:\|([^|]*)\|\s*)?(.*)$/);
    if (!link) {
      declare(line);
      continue;
    }
    const [, left, arrow, pipeLabel, right] = link;
    const tailLabel = right.match(/^\s*([^|]*?)\s*\|/)?.[1];
    const from = declare(left.trim());
    const to = declare(right.replace(/^\s*[^|]*\|/, '').trim());
    if (!from || !to) continue;
    const label = (pipeLabel ?? tailLabel ?? '').trim();
    body.push(`${from} ${arrow === '-.->' ? '~>' : '->'} ${to}${label ? ` : ${label}` : ''}`);
  }

  for (const group of groups) {
    if (!group.members.length) continue;
    out.push(`group ${group.id} ${quote(group.label || group.id)}`);
  }
  if (groups.some((group) => group.members.length)) out.push('');

  for (const node of declared.values()) {
    const group = groups.find((entry) => entry.members.includes(node.id));
    out.push(
      `node ${node.id} ${quote(node.label)}` +
        (group ? ` in=${group.id}` : '') +
        (node.kind ? ` kind=${node.kind}` : ''),
    );
  }
  out.push('', ...body);
  return { text: out.join('\n'), diagnostics: [] };
}

function readSequence(lines) {
  const out = ['view   sequence', ''];
  const declared = new Map();
  const taken = new Set();
  const body = [];

  const declare = (raw, label) => {
    const key = raw.trim();
    if (!declared.has(key)) {
      declared.set(key, { id: safeId(key, taken), label: (label ?? key).trim() });
    } else if (label) {
      declared.get(key).label = label.trim();
    }
    return declared.get(key).id;
  };

  for (const line of lines) {
    if (/^sequenceDiagram/i.test(line)) continue;
    const participant = line.match(/^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/i);
    if (participant) {
      declare(participant[1], participant[2]);
      continue;
    }
    const message = line.match(/^(\S+?)\s*(-?->>?|-?->)\s*([^:]+?)\s*:\s*(.*)$/);
    if (!message) continue;
    const [, from, arrow, to, label] = message;
    const source = declare(from);
    const target = declare(to);
    body.push(`${source} ${arrow.startsWith('--') ? '~>' : '->'} ${target}${label ? ` : ${label}` : ''}`);
  }

  for (const entry of declared.values()) out.push(`node ${entry.id} ${quote(entry.label)}`);
  out.push('', ...body);
  return { text: out.join('\n'), diagnostics: [] };
}

function readState(lines) {
  const out = ['view   lifecycle', ''];
  const declared = new Map();
  const taken = new Set();
  const body = [];

  const declare = (raw) => {
    const key = raw.trim();
    if (key === '[*]') return null;
    if (!declared.has(key)) declared.set(key, { id: safeId(key, taken), label: key, kind: '' });
    return declared.get(key).id;
  };

  for (const line of lines) {
    if (/^stateDiagram/i.test(line) || /^direction\s/i.test(line)) continue;
    const described = line.match(/^(\S+)\s*:\s*(.+)$/);
    const transition = line.match(/^(.+?)\s*-->\s*([^:]+?)(?:\s*:\s*(.*))?$/);
    if (transition) {
      const [, left, right, label] = transition;
      const from = declare(left);
      const to = declare(right);
      if (!from && to) declared.get(right.trim()).kind = 'start';
      if (from && !to) declared.get(left.trim()).kind = 'terminal';
      if (from && to) body.push(`${from} -> ${to}${label ? ` : ${label.trim()}` : ''}`);
      continue;
    }
    if (described) {
      const id = declare(described[1]);
      if (id) declared.get(described[1].trim()).label = described[2].trim();
    }
  }

  for (const entry of declared.values()) {
    out.push(`node ${entry.id} ${quote(entry.label)}${entry.kind ? ` kind=${entry.kind}` : ''}`);
  }
  out.push('', ...body);
  return { text: out.join('\n'), diagnostics: [] };
}
