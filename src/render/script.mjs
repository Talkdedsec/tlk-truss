export const pageScript = String.raw`
const data = window.__truss;
const engine = window.__trussEngine;
let lang = data.lang;
let source = data.source;
let model = null;
let diagram = null;
let editing = false;
let connecting = null;
let selection = null;

const canvas = document.getElementById('canvas');
const panel = document.getElementById('panel');
const view = { x: 0, y: 0, w: data.width, h: data.height };
let svg = document.getElementById('scene');

function t(key) { return data.ui[lang][key] || key; }

function compile(text) {
  const parsed = engine.parse(text);
  const built = engine.build(parsed.spec);
  const errors = parsed.diagnostics.concat(built.diagnostics).filter(function (entry) {
    return entry.code.charAt(0) === 'E';
  });
  if (errors.length) return { errors: errors };
  return { model: built.model, diagram: engine.layout(built.model) };
}

function paintScene(keepView) {
  canvas.innerHTML = engine.renderDiagram(diagram, model);
  svg = document.getElementById('scene');
  bindScene();
  if (keepView) { apply(); } else { fit(); }
  paintFooter();
}

function apply() {
  svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
}

function fit() {
  const box = svg.getBoundingClientRect();
  const ratio = Math.max((diagram.width + 24) / box.width, (diagram.height + 24) / box.height);
  view.w = box.width * ratio;
  view.h = box.height * ratio;
  view.x = (diagram.width - view.w) / 2;
  view.y = (diagram.height - view.h) / 2;
  apply();
}

function toUser(clientX, clientY) {
  const box = svg.getBoundingClientRect();
  return {
    x: view.x + ((clientX - box.left) / box.width) * view.w,
    y: view.y + ((clientY - box.top) / box.height) * view.h,
  };
}

function zoom(factor, clientX, clientY) {
  const anchor = toUser(clientX, clientY);
  const limit = Math.max(diagram.width, diagram.height);
  const next = Math.min(limit * 3, Math.max(limit / 40, view.w * factor));
  const applied = next / view.w;
  view.h *= applied;
  view.w = next;
  view.x = anchor.x - (anchor.x - view.x) * applied;
  view.y = anchor.y - (anchor.y - view.y) * applied;
  apply();
}

function centreZoom(factor) {
  const box = svg.getBoundingClientRect();
  zoom(factor, box.left + box.width / 2, box.top + box.height / 2);
}

function highlight(id) {
  const related = {};
  related[id] = true;
  const edges = svg.querySelectorAll('.edge');
  for (let i = 0; i < edges.length; i += 1) {
    const edge = edges[i];
    const touches = edge.dataset.from === id || edge.dataset.to === id;
    edge.classList.toggle('lit', touches);
    edge.classList.toggle('faded', Boolean(id) && !touches);
    if (touches) { related[edge.dataset.from] = true; related[edge.dataset.to] = true; }
  }
  const nodes = svg.querySelectorAll('.node');
  for (let i = 0; i < nodes.length; i += 1) {
    nodes[i].classList.toggle('faded', Boolean(id) && !related[nodes[i].dataset.id]);
  }
}

function bindScene() {
  svg.addEventListener('wheel', function (event) {
    event.preventDefault();
    zoom(event.deltaY < 0 ? 0.88 : 1.13, event.clientX, event.clientY);
  }, { passive: false });

  let dragging = null;
  svg.addEventListener('pointerdown', function (event) {
    dragging = { point: toUser(event.clientX, event.clientY) };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', function (event) {
    if (!dragging) return;
    const box = svg.getBoundingClientRect();
    view.x = dragging.point.x - ((event.clientX - box.left) / box.width) * view.w;
    view.y = dragging.point.y - ((event.clientY - box.top) / box.height) * view.h;
    apply();
  });
  svg.addEventListener('pointerup', function () { dragging = null; });

  const nodes = svg.querySelectorAll('.node');
  for (let i = 0; i < nodes.length; i += 1) {
    const element = nodes[i];
    element.addEventListener('click', function (event) {
      event.stopPropagation();
      pick(element.dataset.id);
    });
    element.addEventListener('mouseenter', function () {
      if (!selection) highlight(element.dataset.id);
    });
    element.addEventListener('mouseleave', function () {
      if (!selection) highlight('');
    });
    element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') pick(element.dataset.id);
    });
  }

  const boxes = svg.querySelectorAll('.group');
  for (let i = 0; i < boxes.length; i += 1) {
    const element = boxes[i];
    element.addEventListener('click', function (event) {
      if (!editing) return;
      event.stopPropagation();
      selection = { type: 'group', id: element.dataset.group };
      paintPanel();
    });
  }

  const edges = svg.querySelectorAll('.edge');
  for (let i = 0; i < edges.length; i += 1) {
    const element = edges[i];
    element.addEventListener('click', function (event) {
      if (!editing) return;
      event.stopPropagation();
      selection = { type: 'edge', from: element.dataset.from, to: element.dataset.to };
      paintPanel();
    });
  }
}

function pick(id) {
  if (connecting && connecting !== id) {
    model.edges.push({ from: connecting, to: id, label: '', style: 'solid' });
    connecting = null;
    commit();
    return;
  }
  if (connecting === id) { connecting = null; }
  selection = { type: 'node', id: id };
  paintPanel();
  highlight(id);
}

function field(label, name, value, options) {
  if (options) {
    let html = '<label>' + label + '<select data-field="' + name + '">';
    for (let i = 0; i < options.length; i += 1) {
      const chosen = options[i] === value ? ' selected' : '';
      html += '<option' + chosen + '>' + options[i] + '</option>';
    }
    return html + '</select></label>';
  }
  return (
    '<label>' + label + '<input data-field="' + name + '" value="' +
    String(value || '').replace(/"/g, '&quot;') + '"></label>'
  );
}

function row(term, value) {
  return '<dt>' + term + '</dt><dd>' + value + '</dd>';
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function paintPanel() {
  if (!selection) { panel.classList.remove('open'); return; }
  panel.classList.add('open');

  if (selection.type === 'edge') {
    const edge = model.edges.filter(function (entry) {
      return entry.from === selection.from && entry.to === selection.to;
    })[0];
    if (!edge) { selection = null; panel.classList.remove('open'); return; }
    panel.innerHTML =
      '<h2>' + escapeHtml(edge.from) + ' → ' + escapeHtml(edge.to) + '</h2>' +
      (editing
        ? '<div class="form">' +
          field(t('label'), 'label', edge.label) +
          field(t('style'), 'style', edge.style, ['solid', 'async', 'both']) +
          '<div class="actions"><button data-act="drop">' + t('remove') + '</button></div></div>'
        : '<dl>' + row(t('label'), escapeHtml(edge.label) || t('none')) + '</dl>');
    bindPanel(edge, 'edge');
    return;
  }

  if (selection.type === 'group') {
    const group = model.groups.filter(function (entry) { return entry.id === selection.id; })[0];
    if (!group) { selection = null; panel.classList.remove('open'); return; }
    const members = model.nodes.filter(function (node) { return node.group === group.id; });
    panel.innerHTML =
      '<h2>' + escapeHtml(group.label) + '</h2><div class="muted">' + escapeHtml(group.id) + '</div>' +
      (editing
        ? '<div class="form">' + field(t('labelField'), 'label', group.label) +
          '<div class="actions"><button data-act="drop">' + t('remove') + '</button></div></div>'
        : '') +
      '<dl>' + row(t('members'), members.length ? escapeHtml(members.map(function (node) { return node.id; }).join(', ')) : t('none')) + '</dl>';
    bindPanel(group, 'group');
    return;
  }

  const node = model.nodeIndex.get(selection.id);
  if (!node) { selection = null; panel.classList.remove('open'); return; }
  const inbound = model.edges.filter(function (e) { return e.to === node.id; }).map(function (e) { return e.from; });
  const outbound = model.edges.filter(function (e) { return e.from === node.id; }).map(function (e) { return e.to; });

  if (editing) {
    const groups = [''].concat(model.groups.map(function (group) { return group.id; }));
    panel.innerHTML =
      '<h2>' + escapeHtml(node.label) + '</h2><div class="muted">' + escapeHtml(node.id) + '</div>' +
      '<div class="form">' +
      field(t('labelField'), 'label', node.label) +
      field(t('kind'), 'kind', node.kind, data.kinds) +
      field(t('group'), 'group', node.group, groups) +
      field(t('code'), 'code', node.code) +
      field(t('note'), 'note', node.note) +
      '<div class="actions">' +
      '<button data-act="connect">' + t('connect') + '</button>' +
      '<button data-act="drop">' + t('remove') + '</button>' +
      '</div></div>';
    bindPanel(node, 'node');
    return;
  }

  panel.innerHTML =
    '<h2>' + escapeHtml(node.label) + '</h2><div class="muted">' + escapeHtml(node.id) + '</div><dl>' +
    row(t('kind'), node.kind) +
    (node.group ? row(t('group'), escapeHtml(node.group)) : '') +
    row(t('code'), node.code ? '<code>' + escapeHtml(node.code) + '</code>' : '<span class="muted">' + t('unbound') + '</span>') +
    (node.note ? row(t('note'), escapeHtml(node.note)) : '') +
    (node.url ? row(t('link'), '<a href="' + encodeURI(node.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(node.url) + '</a>') : '') +
    row(t('inbound'), inbound.length ? escapeHtml(inbound.join(', ')) : t('none')) +
    row(t('outbound'), outbound.length ? escapeHtml(outbound.join(', ')) : t('none')) +
    '</dl>';
}

function bindPanel(target, type) {
  const inputs = panel.querySelectorAll('[data-field]');
  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    input.addEventListener('change', function () {
      target[input.dataset.field] = input.value;
      commit();
    });
  }
  const buttons = panel.querySelectorAll('[data-act]');
  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];
    button.addEventListener('click', function () {
      if (button.dataset.act === 'connect') {
        connecting = target.id;
        button.textContent = t('pickTarget');
        return;
      }
      if (type === 'group') {
        for (const node of model.nodes) {
          if (node.group === target.id) node.group = '';
        }
        model.groups = model.groups.filter(function (entry) { return entry.id !== target.id; });
      } else if (type === 'node') {
        model.nodes = model.nodes.filter(function (entry) { return entry.id !== target.id; });
        model.edges = model.edges.filter(function (entry) {
          return entry.from !== target.id && entry.to !== target.id;
        });
      } else {
        model.edges = model.edges.filter(function (entry) { return entry !== target; });
      }
      selection = null;
      commit();
    });
  }
}

function commit() {
  for (const group of model.groups) {
    group.members = model.nodes
      .filter(function (node) { return node.group === group.id; })
      .map(function (node) { return node.id; });
  }
  const next = engine.toSource(model);
  const result = compile(next);
  if (result.errors) {
    flash(result.errors[0].code);
    return;
  }
  source = next;
  model = result.model;
  diagram = result.diagram;
  paintScene(true);
  paintPanel();
  const box = document.getElementById('sourceText');
  if (box) box.value = source;
}

function flash(message) {
  const note = document.getElementById('flash');
  note.textContent = message;
  note.classList.add('show');
  setTimeout(function () { note.classList.remove('show'); }, 2200);
}

function paintFooter() {
  const summary = diagram.summary
    .map(function (entry) {
      const name = data.names[entry.key] ? data.names[entry.key][lang] : entry.key;
      return '<span><b>' + entry.value + '</b> ' + name + '</span>';
    })
    .join('');
  document.getElementById('stats').innerHTML = summary;
}

function paintChrome() {
  document.getElementById('search').placeholder = t('search');
  document.getElementById('fit').textContent = t('fit');
  document.getElementById('lang').textContent = lang.toUpperCase();
  document.getElementById('theme').textContent = t('theme');
  document.getElementById('edit').textContent = editing ? t('editing') : t('edit');
  document.getElementById('sourceButton').textContent = t('source');
  document.getElementById('addNode').textContent = t('addNode');
  document.getElementById('addNode').hidden = !editing;
  document.getElementById('addGroup').textContent = t('addGroup');
  document.getElementById('addGroup').hidden = !editing;
  document.getElementById('sourceButton').hidden = !editing;
  paintFooter();
}

document.getElementById('search').addEventListener('input', function (event) {
  const term = event.target.value.trim().toLowerCase();
  const nodes = svg.querySelectorAll('.node');
  for (let i = 0; i < nodes.length; i += 1) {
    const entry = model.nodeIndex.get(nodes[i].dataset.id);
    const haystack = (entry.label + ' ' + entry.id + ' ' + entry.code).toLowerCase();
    nodes[i].classList.toggle('faded', Boolean(term) && haystack.indexOf(term) === -1);
  }
});

document.getElementById('theme').addEventListener('click', function () {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('truss-theme', next); } catch (error) { void error; }
});

document.getElementById('lang').addEventListener('click', function () {
  lang = lang === 'en' ? 'tr' : 'en';
  paintChrome();
  paintPanel();
});

document.getElementById('edit').addEventListener('click', function () {
  editing = !editing;
  connecting = null;
  document.body.classList.toggle('editing', editing);
  paintChrome();
  paintPanel();
});

document.getElementById('addNode').addEventListener('click', function () {
  let index = model.nodes.length + 1;
  while (model.nodeIndex.get('n' + index)) index += 1;
  const id = 'n' + index;
  model.nodes.push({ id: id, label: t('newNode'), kind: 'service', group: '', code: '', note: '', url: '' });
  if (model.nodes.length > 1) {
    model.edges.push({ from: model.nodes[model.nodes.length - 2].id, to: id, label: '', style: 'solid' });
  }
  commit();
  selection = { type: 'node', id: id };
  paintPanel();
});

document.getElementById('addGroup').addEventListener('click', function () {
  let index = model.groups.length + 1;
  const taken = {};
  for (const group of model.groups) taken[group.id] = true;
  while (taken['g' + index]) index += 1;
  const id = 'g' + index;
  model.groups.push({ id: id, label: t('newGroup'), members: [] });
  if (selection && selection.type === 'node') {
    model.nodeIndex.get(selection.id).group = id;
  }
  commit();
  selection = { type: 'group', id: id };
  paintPanel();
});

const sourceBox = document.getElementById('sourceBox');
document.getElementById('sourceButton').addEventListener('click', function () {
  sourceBox.classList.toggle('open');
  document.getElementById('sourceText').value = source;
});

document.getElementById('applySource').addEventListener('click', function () {
  const text = document.getElementById('sourceText').value;
  const result = compile(text);
  if (result.errors) { flash(result.errors[0].code); return; }
  source = text;
  model = result.model;
  diagram = result.diagram;
  selection = null;
  paintScene(false);
  paintPanel();
});

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

document.getElementById('saveSource').addEventListener('click', function () {
  download(new Blob([source], { type: 'text/plain' }), data.slug + '.truss');
});

document.getElementById('fit').addEventListener('click', function () { fit(); });
document.getElementById('zoomIn').addEventListener('click', function () { centreZoom(0.82); });
document.getElementById('zoomOut').addEventListener('click', function () { centreZoom(1.22); });

document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;
  selection = null;
  connecting = null;
  panel.classList.remove('open');
  sourceBox.classList.remove('open');
  highlight('');
});

function serialise() {
  const clone = svg.cloneNode(true);
  clone.setAttribute('viewBox', '0 0 ' + diagram.width + ' ' + diagram.height);
  clone.setAttribute('width', diagram.width);
  clone.setAttribute('height', diagram.height);
  const computed = getComputedStyle(document.documentElement);
  const names = ['canvas', 'surface', 'raised', 'line', 'line-strong', 'text', 'muted', 'grid'];
  let vars = '';
  for (let i = 0; i < names.length; i += 1) {
    vars += '--' + names[i] + ':' + computed.getPropertyValue('--' + names[i]) + ';';
  }
  const style = document.createElement('style');
  style.textContent = ':root{' + vars + '}' + data.svgStyles;
  clone.insertBefore(style, clone.firstChild);
  clone.setAttribute('style', 'background:' + computed.getPropertyValue('--canvas'));
  return new XMLSerializer().serializeToString(clone);
}

document.getElementById('svgOut').addEventListener('click', function () {
  download(new Blob([serialise()], { type: 'image/svg+xml' }), data.slug + '.svg');
});

document.getElementById('pngOut').addEventListener('click', function () {
  const image = new Image();
  image.onload = function () {
    const sheet = document.createElement('canvas');
    sheet.width = diagram.width * 2;
    sheet.height = diagram.height * 2;
    const context = sheet.getContext('2d');
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    sheet.toBlob(function (blob) { download(blob, data.slug + '.png'); });
  };
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialise());
});

try {
  const saved = localStorage.getItem('truss-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch (error) { void error; }

const boot = compile(source);
model = boot.model;
diagram = boot.diagram;
bindScene();
paintChrome();
fit();
window.addEventListener('resize', function () { fit(); });
`;
