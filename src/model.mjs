const kindAliases = new Map([
  ['service', 'service'],
  ['servis', 'service'],
  ['store', 'store'],
  ['depo', 'store'],
  ['queue', 'queue'],
  ['kuyruk', 'queue'],
  ['infra', 'infra'],
  ['altyapi', 'infra'],
  ['client', 'client'],
  ['istemci', 'client'],
  ['external', 'external'],
  ['dis', 'external'],
  ['job', 'job'],
  ['gorev', 'job'],
  ['source', 'source'],
  ['kaynak', 'source'],
  ['transform', 'transform'],
  ['donusum', 'transform'],
  ['sink', 'sink'],
  ['havuz', 'sink'],
  ['state', 'state'],
  ['durum', 'state'],
  ['start', 'start'],
  ['baslangic', 'start'],
  ['terminal', 'terminal'],
  ['son', 'terminal'],
  ['failure', 'failure'],
  ['hata', 'failure'],
]);

export const kinds = [...new Set(kindAliases.values())];

const views = new Map([
  ['architecture', 'architecture'],
  ['mimari', 'architecture'],
  ['sequence', 'sequence'],
  ['sekans', 'sequence'],
  ['dataflow', 'dataflow'],
  ['veriakisi', 'dataflow'],
  ['lifecycle', 'lifecycle'],
  ['yasamdongusu', 'lifecycle'],
  ['durum', 'lifecycle'],
]);

export function build(spec) {
  const diagnostics = [];
  const report = (code, line, params = {}) => diagnostics.push({ code, line, ...params });

  const view = views.get((spec.view || 'architecture').toLowerCase());
  if (!view) report('E206', 0, { token: spec.view, hint: [...new Set(views.values())].join(', ') });
  const kept = view ?? 'architecture';
  const ordered = kept === 'sequence';
  const loops = kept === 'lifecycle' || kept === 'sequence';

  const groups = [];
  const groupIndex = new Map();
  for (const entry of spec.groups) {
    if (groupIndex.has(entry.id)) {
      report('E201', entry.line, { token: entry.id });
      continue;
    }
    const group = { id: entry.id, label: entry.label, members: [] };
    groupIndex.set(entry.id, group);
    groups.push(group);
  }

  const nodes = [];
  const nodeIndex = new Map();
  for (const entry of spec.nodes) {
    if (nodeIndex.has(entry.id)) {
      report('E200', entry.line, { token: entry.id });
      continue;
    }
    let kind = 'service';
    if (entry.kind) {
      const resolved = kindAliases.get(entry.kind.toLowerCase());
      if (!resolved) {
        report('E205', entry.line, { token: entry.kind, hint: kinds.join(', ') });
      } else {
        kind = resolved;
      }
    }
    let group = '';
    if (entry.group) {
      if (!groupIndex.has(entry.group)) {
        report('E203', entry.line, { token: entry.group });
      } else {
        group = entry.group;
        groupIndex.get(entry.group).members.push(entry.id);
      }
    }
    const node = {
      id: entry.id,
      label: entry.label,
      kind,
      group,
      code: entry.code ?? '',
      note: entry.note ?? '',
      url: entry.url ?? '',
      line: entry.line,
      degree: 0,
    };
    nodeIndex.set(node.id, node);
    nodes.push(node);
  }

  const edges = [];
  const seen = new Set();
  for (const entry of spec.edges) {
    const missing = [entry.from, entry.to].find((id) => !nodeIndex.has(id));
    if (missing) {
      report('E202', entry.line, { token: missing });
      continue;
    }
    if (entry.from === entry.to && !loops) {
      report('W301', entry.line, { token: entry.from });
      continue;
    }
    const signature = JSON.stringify([entry.from, entry.to, entry.label ?? '']);
    if (!ordered && seen.has(signature)) {
      report('W300', entry.line, { token: `${entry.from} → ${entry.to}` });
      continue;
    }
    seen.add(signature);
    nodeIndex.get(entry.from).degree += 1;
    nodeIndex.get(entry.to).degree += 1;
    edges.push({
      from: entry.from,
      to: entry.to,
      label: entry.label ?? '',
      style: entry.style ?? 'solid',
      note: entry.note ?? '',
      code: entry.code ?? '',
      line: entry.line,
    });
  }

  for (const node of nodes) {
    if (node.degree === 0) report('W302', node.line, { token: node.id });
  }

  return {
    model: {
      title: spec.title || 'untitled',
      view: kept,
      theme: spec.theme,
      flow: spec.flow || (kept === 'dataflow' ? 'right' : 'down'),
      root: spec.root,
      groups,
      nodes,
      edges,
      nodeIndex,
    },
    diagnostics,
  };
}
