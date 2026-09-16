import { readFileSync } from 'node:fs';

const order = [
  'parse.mjs',
  'model.mjs',
  'source.mjs',
  'layout/rank.mjs',
  'layout/order.mjs',
  'layout/place.mjs',
  'layout/sequence.mjs',
  'layout/index.mjs',
  'render/theme.mjs',
  'render/shared.mjs',
  'render/svg.mjs',
  'render/sequence.mjs',
  'render/index.mjs',
];

function strip(code) {
  return code
    .replace(/^import[\s\S]*?from\s+'[^']+';\s*$/gm, '')
    .replace(/^export\s+(const|function|class|let)\s/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+default\s/gm, 'const __default = ');
}

export function engineBundle() {
  const base = new URL('./', import.meta.url);
  const parts = order.map((name) => strip(readFileSync(new URL(name, base), 'utf8')));
  return `(function () {\n${parts.join('\n')}\nreturn { parse, build, layout, renderDiagram, toSource };\n})()`;
}
