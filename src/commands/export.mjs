import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { load } from '../load.mjs';
import { layout } from '../layout/index.mjs';
import { renderDiagram } from '../render/index.mjs';
import { palettes } from '../render/theme.mjs';
import { svgStyles } from '../render/page.mjs';
import { format, countErrors } from '../diagnostics.mjs';
import { strings } from '../i18n.mjs';

const formats = new Map([
  ['svg', 'svg'],
  ['dot', 'dot'],
  ['mermaid', 'mermaid'],
  ['json', 'json'],
]);

function standaloneSvg(body, theme) {
  const palette = palettes[theme === 'light' ? 'light' : 'dark'];
  const variables = Object.entries({
    canvas: palette.canvas,
    surface: palette.surface,
    raised: palette.raised,
    line: palette.line,
    'line-strong': palette.muted,
    text: palette.text,
    muted: palette.muted,
    grid: palette.grid,
  })
    .map(([name, value]) => `--${name}:${value};`)
    .join('');
  const sheet = `<style>:root{${variables}}svg{background:${palette.canvas};font:13px ui-sans-serif,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}${svgStyles}</style>`;
  return body.replace('<g class="viewport">', `${sheet}<g class="viewport">`);
}

function toDot(model) {
  const lines = [`digraph "${model.title}" {`, '  rankdir=TB;', '  node [shape=box];'];
  for (const node of model.nodes) {
    lines.push(`  "${node.id}" [label="${node.label}"${node.code ? `, tooltip="${node.code}"` : ''}];`);
  }
  for (const edge of model.edges) {
    const style = edge.style === 'async' ? ' style=dashed' : '';
    lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.label}"${style}];`);
  }
  lines.push('}');
  return lines.join('\n');
}

function toMermaid(model) {
  if (model.view === 'sequence') {
    const lines = ['sequenceDiagram'];
    for (const node of model.nodes) lines.push(`  participant ${node.id} as ${node.label}`);
    for (const edge of model.edges) {
      const arrow = edge.style === 'async' ? '-->>' : '->>';
      lines.push(`  ${edge.from}${arrow}${edge.to}: ${edge.label}`);
    }
    return lines.join('\n');
  }

  const lines = [`flowchart ${model.flow === 'right' ? 'LR' : 'TD'}`];
  const grouped = new Set();
  for (const group of model.groups) {
    lines.push(`  subgraph ${group.id}["${group.label}"]`);
    for (const id of group.members) {
      const node = model.nodeIndex.get(id);
      lines.push(`    ${node.id}["${node.label}"]`);
      grouped.add(id);
    }
    lines.push('  end');
  }
  for (const node of model.nodes) {
    if (grouped.has(node.id)) continue;
    lines.push(`  ${node.id}["${node.label}"]`);
  }
  for (const edge of model.edges) {
    const arrow = edge.style === 'async' ? '-.->' : '-->';
    lines.push(`  ${edge.from} ${arrow}${edge.label ? `|${edge.label}|` : ''} ${edge.to}`);
  }
  return lines.join('\n');
}

export function exportDiagram({ source, out, format: wanted, lang }, io) {
  const s = strings(lang);
  if (!source) {
    io.error(s.needSource);
    return 2;
  }
  const chosen = formats.get(String(wanted || 'svg').toLowerCase());
  if (!chosen) {
    io.error(s.unknownFormat([...formats.keys()].join(', ')));
    return 2;
  }

  const { model, diagnostics, path } = load(source);
  for (const diagnostic of diagnostics) io.error(format(diagnostic, { lang, path }));
  if (countErrors(diagnostics) > 0) return 1;

  const diagram = layout(model);
  const body =
    chosen === 'svg'
      ? standaloneSvg(renderDiagram(diagram, model), model.theme)
      : chosen === 'dot'
        ? toDot(model)
        : chosen === 'mermaid'
          ? toMermaid(model)
          : JSON.stringify({ view: model.view, ...diagram }, null, 2);

  const target =
    out || join(dirname(path), `${basename(path).replace(/\.truss$/i, '')}.${chosen}`);
  writeFileSync(target, body, 'utf8');
  io.log(`${s.wrote} ${target}`);
  return 0;
}
