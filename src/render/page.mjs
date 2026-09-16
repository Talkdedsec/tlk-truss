import { palettes } from './theme.mjs';
import { escapeXml } from './shared.mjs';
import { renderDiagram } from './index.mjs';
import { pageScript } from './script.mjs';
import { statLabels } from '../i18n.mjs';
import { kinds } from '../model.mjs';
import { engineBundle } from '../bundle.mjs';
import { toSource } from '../source.mjs';

const ui = {
  en: {
    search: 'Search nodes',
    fit: 'Fit',
    theme: 'Theme',
    edit: 'Edit',
    editing: 'Editing',
    source: 'Source',
    addNode: 'Add node',
    newNode: 'New node',
    addGroup: 'Add group',
    newGroup: 'New group',
    members: 'Members',
    apply: 'Apply',
    save: 'Save .truss',
    kind: 'Kind',
    group: 'Group',
    code: 'Code binding',
    note: 'Note',
    link: 'Link',
    label: 'Label',
    labelField: 'Label',
    style: 'Style',
    remove: 'Remove',
    connect: 'Connect to…',
    pickTarget: 'pick a target',
    inbound: 'Inbound',
    outbound: 'Outbound',
    none: 'none',
    unbound: 'not bound to code',
  },
  tr: {
    search: 'Düğüm ara',
    fit: 'Sığdır',
    theme: 'Tema',
    edit: 'Düzenle',
    editing: 'Düzenleniyor',
    source: 'Kaynak',
    addNode: 'Düğüm ekle',
    newNode: 'Yeni düğüm',
    addGroup: 'Grup ekle',
    newGroup: 'Yeni grup',
    members: 'Üyeler',
    apply: 'Uygula',
    save: '.truss kaydet',
    kind: 'Tür',
    group: 'Grup',
    code: 'Kod bağı',
    note: 'Not',
    link: 'Bağlantı',
    label: 'Etiket',
    labelField: 'Etiket',
    style: 'Biçim',
    remove: 'Sil',
    connect: 'Şuna bağla…',
    pickTarget: 'hedefi seç',
    inbound: 'Gelen',
    outbound: 'Giden',
    none: 'yok',
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

export const svgStyles = `
.group rect { fill: none; stroke: var(--line); stroke-dasharray: 5 5; }
body.editing .group rect { cursor: pointer; }
body.editing .group rect:hover { stroke: var(--line-strong); }
.group text { fill: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.node .body { fill: var(--surface); stroke: var(--line); }
.node polygon.body { fill: var(--surface); stroke: var(--line); }
.node polygon.slanted { stroke-width: 1.6; }
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
.lifeline { stroke: var(--line); stroke-dasharray: 4 6; }
.message-label { fill: var(--text); font-size: 11.5px; }
.pip { fill: var(--line-strong); }
.pip.ring { fill: none; stroke: var(--line-strong); stroke-width: 1.5; }
`;

const styles = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--canvas); color: var(--text);
  font: 14px/1.45 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
#shell { display: flex; flex-direction: column; height: 100vh; }
header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid var(--line); background: var(--surface); }
h1 { font-size: 14px; font-weight: 600; margin: 0 10px 0 0; }
button, input, select, textarea { font: inherit; color: var(--text); background: var(--raised);
  border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; }
button { cursor: pointer; }
button:hover { border-color: var(--line-strong); }
input[type="search"] { min-width: 170px; }
.spacer { flex: 1; }
body.editing #edit { border-color: #4c9aff; color: #4c9aff; }
main { position: relative; flex: 1; overflow: hidden;
  background-image: radial-gradient(var(--grid) 1px, transparent 1px); background-size: 22px 22px; }
#canvas, svg { width: 100%; height: 100%; display: block; }
svg { touch-action: none; }
${svgStyles}
aside { position: absolute; top: 12px; right: 12px; width: 310px; max-height: calc(100% - 24px);
  overflow: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 14px 16px; display: none; }
aside.open { display: block; }
aside h2 { margin: 0 0 2px; font-size: 15px; }
.muted { color: var(--muted); font-size: 12px; }
aside dl { margin: 12px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
aside dt { color: var(--muted); font-size: 12px; }
aside dd { margin: 0; font-size: 12px; word-break: break-word; }
aside code { font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
.form { display: grid; gap: 9px; margin-top: 12px; }
.form label { display: grid; gap: 4px; font-size: 12px; color: var(--muted); }
.form input, .form select { width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 2px; }
#sourceBox { position: absolute; left: 12px; bottom: 12px; width: min(460px, calc(100% - 24px));
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px;
  display: none; }
#sourceBox.open { display: block; }
#sourceText { width: 100%; height: 220px; resize: vertical;
  font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
#sourceBox .actions { margin-top: 8px; }
#flash { position: absolute; left: 50%; top: 14px; transform: translateX(-50%);
  background: #f85149; color: #fff; padding: 7px 14px; border-radius: 8px; font-size: 12px;
  opacity: 0; pointer-events: none; transition: opacity .18s; }
#flash.show { opacity: 1; }
footer { display: flex; gap: 16px; padding: 7px 14px; border-top: 1px solid var(--line);
  background: var(--surface); color: var(--muted); font-size: 12px; }
footer b { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) {
  aside { position: static; width: auto; margin: 12px; }
  input[type="search"] { min-width: 110px; }
}
`;

export function renderPage(diagram, model, { lang = 'en' } = {}) {
  const svg = renderDiagram(diagram, model);
  const slug =
    (model.title || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'diagram';

  const payload = {
    lang,
    ui,
    names: statLabels,
    kinds,
    slug,
    svgStyles,
    source: toSource(model),
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
  <button id="edit"></button>
  <button id="addNode" hidden></button>
  <button id="addGroup" hidden></button>
  <button id="sourceButton" hidden></button>
  <span class="spacer"></span>
  <button id="svgOut">SVG</button>
  <button id="pngOut">PNG</button>
  <button id="theme"></button>
  <button id="lang"></button>
</header>
<main>
<div id="canvas">${svg}</div>
<aside id="panel"></aside>
<div id="sourceBox">
  <textarea id="sourceText" spellcheck="false"></textarea>
  <div class="actions">
    <button id="applySource">${ui[lang].apply}</button>
    <button id="saveSource">${ui[lang].save}</button>
  </div>
</div>
<div id="flash"></div>
</main>
<footer id="stats"></footer>
</div>
<script>window.__truss = ${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>
<script>window.__trussEngine = ${engineBundle()};</script>
<script>${pageScript}</script>
</body>
</html>
`;
}
