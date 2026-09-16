import { palettes } from './theme.mjs';
import { renderSvg, escapeXml } from './svg.mjs';

const ui = {
  en: {
    search: 'Search nodes',
    fit: 'Fit',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    theme: 'Theme',
    language: 'Language',
    exportSvg: 'SVG',
    exportPng: 'PNG',
    close: 'Close',
    kind: 'Kind',
    group: 'Group',
    code: 'Code binding',
    note: 'Note',
    link: 'Link',
    connections: 'Connections',
    inbound: 'Inbound',
    outbound: 'Outbound',
    none: 'none',
    nodes: 'nodes',
    edges: 'edges',
    layers: 'layers',
    crossings: 'crossings',
    unbound: 'not bound to code',
  },
  tr: {
    search: 'Düğüm ara',
    fit: 'Sığdır',
    zoomIn: 'Yakınlaş',
    zoomOut: 'Uzaklaş',
    theme: 'Tema',
    language: 'Dil',
    exportSvg: 'SVG',
    exportPng: 'PNG',
    close: 'Kapat',
    kind: 'Tür',
    group: 'Grup',
    code: 'Kod bağı',
    note: 'Not',
    link: 'Bağlantı',
    connections: 'Bağlantılar',
    inbound: 'Gelen',
    outbound: 'Giden',
    none: 'yok',
    nodes: 'düğüm',
    edges: 'kenar',
    layers: 'katman',
    crossings: 'kesişme',
    unbound: 'koda bağlı değil',
  },
};

function themeVariables(name) {
  const palette = palettes[name];
  return [
    `--canvas:${palette.canvas}`,
    `--surface:${palette.surface}`,
    `--raised:${palette.raised}`,
    `--line:${palette.line}`,
    `--line-strong:${palette.muted}`,
    `--text:${palette.text}`,
    `--muted:${palette.muted}`,
    `--grid:${palette.grid}`,
  ].join(';');
}

const svgStyles = `
.group rect { fill: none; stroke: var(--line); stroke-dasharray: 5 5; }
.group text { fill: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.node .body { fill: var(--surface); stroke: var(--line); }
.node .label { fill: var(--text); font-size: 13px; font-weight: 550; }
.node .code { fill: var(--muted); font-size: 10px;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; }
.node { cursor: pointer; }
.node:hover .body, .node:focus .body { stroke: var(--line-strong); }
.edge .stroke { fill: none; stroke: var(--line-strong); stroke-width: 1.6; opacity: .75; }
.edge .hit { fill: none; stroke: transparent; stroke-width: 14; }
.edge.async .stroke { stroke-dasharray: 6 5; }
.edge-label rect { fill: var(--canvas); stroke: var(--line); }
.edge-label text { fill: var(--muted); font-size: 11px; }
.faded { opacity: .12; }
.lit .stroke { stroke: #4c9aff; opacity: 1; stroke-width: 2.2; }
`;

const styles = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--canvas); color: var(--text);
  font: 14px/1.45 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
#shell { display: flex; flex-direction: column; height: 100vh; }
header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid var(--line); background: var(--surface); }
h1 { font-size: 14px; font-weight: 600; margin: 0 10px 0 0; letter-spacing: .01em; }
button, input { font: inherit; color: var(--text); background: var(--raised);
  border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; }
button { cursor: pointer; }
button:hover { border-color: var(--line-strong); }
input { min-width: 180px; }
.spacer { flex: 1; }
main { position: relative; flex: 1; overflow: hidden;
  background-image: radial-gradient(var(--grid) 1px, transparent 1px); background-size: 22px 22px; }
svg { width: 100%; height: 100%; display: block; touch-action: none; }
.viewport { transition: transform .06s linear; }
${svgStyles}
aside { position: absolute; top: 12px; right: 12px; width: 300px; max-height: calc(100% - 24px);
  overflow: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 14px 16px; display: none; }
aside.open { display: block; }
aside h2 { margin: 0 0 2px; font-size: 15px; }
aside dl { margin: 12px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
aside dt { color: var(--muted); font-size: 12px; }
aside dd { margin: 0; font-size: 12px; word-break: break-word; }
aside code { font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
footer { display: flex; gap: 16px; padding: 7px 14px; border-top: 1px solid var(--line);
  background: var(--surface); color: var(--muted); font-size: 12px; }
footer b { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) { aside { position: static; width: auto; margin: 12px; } input { min-width: 120px; } }
`;

const script = `
const data = window.__truss;
let lang = data.lang;
const svg = document.getElementById('scene');
const panel = document.getElementById('panel');
const view = { x: 0, y: 0, w: data.width, h: data.height };

function t(key) { return data.ui[lang][key] || key; }

function apply() {
  svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
}

function fit() {
  const box = svg.getBoundingClientRect();
  const pad = 24;
  const ratio = Math.max((data.width + pad) / box.width, (data.height + pad) / box.height);
  view.w = box.width * ratio;
  view.h = box.height * ratio;
  view.x = (data.width - view.w) / 2;
  view.y = (data.height - view.h) / 2;
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
  const limit = Math.max(data.width, data.height);
  const next = Math.min(limit * 3, Math.max(limit / 40, view.w * factor));
  const applied = next / view.w;
  view.h *= applied;
  view.w = next;
  view.x = anchor.x - (anchor.x - view.x) * applied;
  view.y = anchor.y - (anchor.y - view.y) * applied;
  apply();
}

svg.addEventListener('wheel', function (event) {
  event.preventDefault();
  zoom(event.deltaY < 0 ? 0.88 : 1.13, event.clientX, event.clientY);
}, { passive: false });

let dragging = null;
svg.addEventListener('pointerdown', function (event) {
  dragging = { point: toUser(event.clientX, event.clientY), x: view.x, y: view.y };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove', function (event) {
  if (!dragging) return;
  const box = svg.getBoundingClientRect();
  const dx = ((event.clientX - box.left) / box.width) * view.w;
  const dy = ((event.clientY - box.top) / box.height) * view.h;
  view.x = dragging.point.x - dx;
  view.y = dragging.point.y - dy;
  apply();
});
svg.addEventListener('pointerup', function () { dragging = null; });

function highlight(id) {
  const related = new Set([id]);
  document.querySelectorAll('.edge').forEach(function (edge) {
    const from = edge.dataset.from;
    const to = edge.dataset.to;
    const touches = from === id || to === id;
    edge.classList.toggle('lit', touches);
    edge.classList.toggle('faded', Boolean(id) && !touches);
    if (touches) { related.add(from); related.add(to); }
  });
  document.querySelectorAll('.node').forEach(function (node) {
    node.classList.toggle('faded', Boolean(id) && !related.has(node.dataset.id));
  });
}

function row(term, value) {
  return '<dt>' + term + '</dt><dd>' + value + '</dd>';
}

function open(id) {
  const node = data.nodes.find(function (entry) { return entry.id === id; });
  if (!node) return;
  const inbound = data.edges.filter(function (e) { return e.to === id; }).map(function (e) { return e.from; });
  const outbound = data.edges.filter(function (e) { return e.from === id; }).map(function (e) { return e.to; });
  let html = '<h2>' + node.label + '</h2><div style="color:var(--muted);font-size:12px">' + node.id + '</div><dl>';
  html += row(t('kind'), node.kind);
  if (node.group) html += row(t('group'), node.group);
  html += row(t('code'), node.code ? '<code>' + node.code + '</code>' : '<span style="color:var(--muted)">' + t('unbound') + '</span>');
  if (node.note) html += row(t('note'), node.note);
  if (node.url) html += row(t('link'), '<a href="' + node.url + '" target="_blank" rel="noreferrer">' + node.url + '</a>');
  html += row(t('inbound'), inbound.length ? inbound.join(', ') : t('none'));
  html += row(t('outbound'), outbound.length ? outbound.join(', ') : t('none'));
  html += '</dl>';
  panel.innerHTML = html;
  panel.classList.add('open');
  highlight(id);
}

document.querySelectorAll('.node').forEach(function (node) {
  node.addEventListener('click', function () { open(node.dataset.id); });
  node.addEventListener('mouseenter', function () { if (!panel.classList.contains('open')) highlight(node.dataset.id); });
  node.addEventListener('mouseleave', function () { if (!panel.classList.contains('open')) highlight(''); });
  node.addEventListener('keydown', function (event) { if (event.key === 'Enter') open(node.dataset.id); });
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') { panel.classList.remove('open'); highlight(''); }
});

document.getElementById('search').addEventListener('input', function (event) {
  const term = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.node').forEach(function (node) {
    const entry = data.nodes.find(function (item) { return item.id === node.dataset.id; });
    const hit = !term || (entry.label + ' ' + entry.id + ' ' + entry.code).toLowerCase().includes(term);
    node.classList.toggle('faded', !hit);
  });
});

document.getElementById('theme').addEventListener('click', function () {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('truss-theme', next); } catch (error) { void error; }
});

document.getElementById('lang').addEventListener('click', function () {
  lang = lang === 'en' ? 'tr' : 'en';
  paintChrome();
  panel.classList.remove('open');
  highlight('');
});

function paintChrome() {
  document.getElementById('search').placeholder = t('search');
  document.getElementById('fit').textContent = t('fit');
  document.getElementById('lang').textContent = lang.toUpperCase();
  document.getElementById('theme').textContent = t('theme');
  document.getElementById('stats').innerHTML =
    '<span><b>' + data.stats.nodes + '</b> ' + t('nodes') + '</span>' +
    '<span><b>' + data.stats.edges + '</b> ' + t('edges') + '</span>' +
    '<span><b>' + data.stats.layers + '</b> ' + t('layers') + '</span>' +
    '<span><b>' + data.stats.crossings + '</b> ' + t('crossings') + '</span>';
}

document.getElementById('fit').addEventListener('click', fit);
function centreZoom(factor) {
  const box = svg.getBoundingClientRect();
  zoom(factor, box.left + box.width / 2, box.top + box.height / 2);
}
document.getElementById('zoomIn').addEventListener('click', function () { centreZoom(0.82); });
document.getElementById('zoomOut').addEventListener('click', function () { centreZoom(1.22); });

function serialise() {
  const clone = svg.cloneNode(true);
  clone.setAttribute('viewBox', '0 0 ' + data.width + ' ' + data.height);
  clone.setAttribute('width', data.width);
  clone.setAttribute('height', data.height);
  const computed = getComputedStyle(document.documentElement);
  const names = ['canvas', 'surface', 'raised', 'line', 'line-strong', 'text', 'muted', 'grid'];
  let vars = '';
  names.forEach(function (name) { vars += '--' + name + ':' + computed.getPropertyValue('--' + name) + ';'; });
  const style = document.createElement('style');
  style.textContent = ':root{' + vars + '}' + data.svgStyles;
  clone.insertBefore(style, clone.firstChild);
  clone.setAttribute('style', 'background:' + computed.getPropertyValue('--canvas'));
  return new XMLSerializer().serializeToString(clone);
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

document.getElementById('svgOut').addEventListener('click', function () {
  download(new Blob([serialise()], { type: 'image/svg+xml' }), data.slug + '.svg');
});

document.getElementById('pngOut').addEventListener('click', function () {
  const source = serialise();
  const image = new Image();
  image.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = data.width * 2;
    canvas.height = data.height * 2;
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    canvas.toBlob(function (blob) { download(blob, data.slug + '.png'); });
  };
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
});

try {
  const saved = localStorage.getItem('truss-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch (error) { void error; }

paintChrome();
fit();
window.addEventListener('resize', fit);
`;

export function renderPage(diagram, model, { lang = 'en' } = {}) {
  const horizontal = model.flow === 'right';
  const svg = renderSvg(diagram, { horizontal });
  const slug = (model.title || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const payload = {
    lang,
    ui,
    width: diagram.width,
    height: diagram.height,
    slug: slug || 'diagram',
    svgStyles,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      group: node.group,
      code: node.code,
      note: node.note,
      url: node.url,
    })),
    edges: diagram.edges.map((edge) => ({ from: edge.from, to: edge.to, label: edge.label })),
    stats: {
      nodes: diagram.nodes.length,
      edges: diagram.edges.length,
      layers: diagram.stats.layers,
      crossings: diagram.stats.crossings,
    },
  };

  return `<!doctype html>
<html lang="${lang}" data-theme="${model.theme === 'light' ? 'light' : 'dark'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="tlk-truss">
<title>${escapeXml(model.title)}</title>
<style>
:root[data-theme="dark"] { ${themeVariables('dark')} }
:root[data-theme="light"] { ${themeVariables('light')} }
${styles}
</style>
</head>
<body>
<div id="shell">
<header>
  <h1>${escapeXml(model.title)}</h1>
  <input id="search" type="search" autocomplete="off">
  <button id="fit"></button>
  <button id="zoomOut" title="-">−</button>
  <button id="zoomIn" title="+">+</button>
  <span class="spacer"></span>
  <button id="svgOut">SVG</button>
  <button id="pngOut">PNG</button>
  <button id="theme"></button>
  <button id="lang"></button>
</header>
<main>
${svg}
<aside id="panel"></aside>
</main>
<footer id="stats"></footer>
</div>
<script>window.__truss = ${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>
<script>${script}</script>
</body>
</html>
`;
}
