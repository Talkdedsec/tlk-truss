const directives = new Map([
  ['title', 'title'],
  ['baslik', 'title'],
  ['view', 'view'],
  ['gorunum', 'view'],
  ['theme', 'theme'],
  ['tema', 'theme'],
  ['flow', 'flow'],
  ['akis', 'flow'],
  ['root', 'root'],
  ['kok', 'root'],
]);

const blocks = new Map([
  ['group', 'group'],
  ['grup', 'group'],
  ['node', 'node'],
  ['dugum', 'node'],
]);

const attrNames = new Map([
  ['in', 'group'],
  ['icinde', 'group'],
  ['kind', 'kind'],
  ['tur', 'kind'],
  ['code', 'code'],
  ['kod', 'code'],
  ['note', 'note'],
  ['not', 'note'],
  ['url', 'url'],
  ['bag', 'url'],
]);

const arrows = new Map([
  ['->', 'solid'],
  ['~>', 'async'],
  ['<->', 'both'],
]);

const flows = new Set(['down', 'right', 'asagi', 'saga']);
const flowValues = new Map([
  ['down', 'down'],
  ['asagi', 'down'],
  ['right', 'right'],
  ['saga', 'right'],
]);

const idPattern = /^[A-Za-z_][\w.-]*$/;
const arrowPattern = /\s(->|~>|<->)\s/;

function splitTokens(text) {
  const tokens = [];
  let buffer = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      quoted = !quoted;
      buffer += ch;
      continue;
    }
    if (!quoted && /\s/.test(ch)) {
      if (buffer) tokens.push(buffer);
      buffer = '';
      continue;
    }
    buffer += ch;
  }
  if (buffer) tokens.push(buffer);
  return { tokens, unterminated: quoted };
}

function unquote(value) {
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function readAttrs(tokens, line, report) {
  const attrs = {};
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq < 1) {
      report('E110', line, { token });
      continue;
    }
    const rawName = token.slice(0, eq).toLowerCase();
    const name = attrNames.get(rawName);
    if (!name) {
      report('E111', line, { token: rawName });
      continue;
    }
    attrs[name] = unquote(token.slice(eq + 1));
  }
  return attrs;
}

export function parse(source, { path = '<source>' } = {}) {
  const diagnostics = [];
  const spec = {
    path,
    title: '',
    view: 'architecture',
    theme: 'dark',
    flow: '',
    root: '.',
    groups: [],
    nodes: [],
    edges: [],
  };

  const report = (code, line, params = {}) => {
    diagnostics.push({ code, line, ...params });
  };

  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index];
    const text = raw.replace(/(^|\s)#.*$/, '$1').trim();
    if (!text) continue;

    const arrowMatch = text.match(arrowPattern);
    if (arrowMatch) {
      readEdge(text, arrowMatch[1], lineNumber);
      continue;
    }

    const { tokens, unterminated } = splitTokens(text);
    if (unterminated) {
      report('E100', lineNumber);
      continue;
    }
    const head = tokens[0].toLowerCase();

    if (directives.has(head)) {
      readDirective(directives.get(head), tokens.slice(1), lineNumber);
      continue;
    }
    if (blocks.has(head)) {
      readBlock(blocks.get(head), tokens.slice(1), lineNumber);
      continue;
    }
    report('E101', lineNumber, { token: tokens[0] });
  }

  return { spec, diagnostics };

  function readDirective(name, rest, line) {
    if (!rest.length) {
      report('E102', line, { token: name });
      return;
    }
    const value = unquote(rest.join(' '));
    if (name === 'flow') {
      if (!flows.has(value.toLowerCase())) {
        report('E103', line, { token: value });
        return;
      }
      spec.flow = flowValues.get(value.toLowerCase());
      return;
    }
    spec[name] = value;
  }

  function readBlock(kind, rest, line) {
    if (!rest.length) {
      report('E104', line, { token: kind });
      return;
    }
    const id = rest[0];
    if (!idPattern.test(id)) {
      report('E105', line, { token: id });
      return;
    }
    let label = '';
    let attrStart = 1;
    if (rest[1] && (rest[1].startsWith('"') || !rest[1].includes('='))) {
      label = unquote(rest[1]);
      attrStart = 2;
    }
    const attrs = readAttrs(rest.slice(attrStart), line, report);
    const entry = { id, label: label || id, line, ...attrs };
    if (kind === 'group') {
      spec.groups.push(entry);
    } else {
      spec.nodes.push(entry);
    }
  }

  function readEdge(text, arrow, line) {
    const [connection, ...labelParts] = text.split(':');
    const label = labelParts.join(':').trim();
    const sides = connection.split(arrow).map((side) => side.trim());
    if (sides.length !== 2 || !sides[0] || !sides[1]) {
      report('E106', line);
      return;
    }
    const [from, to] = sides;
    if (!idPattern.test(from) || !idPattern.test(to)) {
      report('E105', line, { token: idPattern.test(from) ? to : from });
      return;
    }

    let edgeLabel = label;
    let attrs = {};
    if (label.startsWith('"')) {
      const { tokens } = splitTokens(label);
      edgeLabel = unquote(tokens[0]);
      attrs = readAttrs(tokens.slice(1), line, report);
    }
    spec.edges.push({ from, to, label: edgeLabel, style: arrows.get(arrow), line, ...attrs });
  }
}
