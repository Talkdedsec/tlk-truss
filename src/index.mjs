export { parse } from './parse.mjs';
export { build, kinds } from './model.mjs';
export { layout } from './layout/index.mjs';
export { renderDiagram } from './render/index.mjs';
export { renderPage } from './render/page.mjs';
export { check } from './check.mjs';
export { toSource } from './source.mjs';
export { fromMermaid } from './mermaid.mjs';
export { describe, format, countErrors } from './diagnostics.mjs';

import { parse } from './parse.mjs';
import { build } from './model.mjs';
import { layout } from './layout/index.mjs';
import { renderPage } from './render/page.mjs';
import { countErrors } from './diagnostics.mjs';

export function draw(source, { lang = 'en' } = {}) {
  const parsed = parse(source);
  const built = build(parsed.spec);
  const diagnostics = [...parsed.diagnostics, ...built.diagnostics];
  if (countErrors(diagnostics) > 0) return { diagnostics, html: '', diagram: null };
  const diagram = layout(built.model);
  return {
    diagnostics,
    diagram,
    model: built.model,
    html: renderPage(diagram, built.model, { lang }),
  };
}
