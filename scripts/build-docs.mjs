import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from '../src/load.mjs';
import { layout } from '../src/layout/index.mjs';
import { renderPage } from '../src/render/page.mjs';

const pages = [
  { source: 'examples/payments.truss', file: 'architecture.html', view: 'architecture' },
  { source: 'examples/checkout.truss', file: 'sequence.html', view: 'sequence' },
  { source: 'examples/events.truss', file: 'dataflow.html', view: 'dataflow' },
  { source: 'examples/order-state.truss', file: 'lifecycle.html', view: 'lifecycle' },
];

const out = 'docs';
mkdirSync(out, { recursive: true });

for (const page of pages) {
  const { model } = load(page.source);
  writeFileSync(join(out, page.file), renderPage(layout(model), model), 'utf8');
}

// The landing page is hand-written in site/; only the diagrams are generated.
for (const file of ['index.html', 'site.css', 'site.js', 'og.png']) copyFileSync(join('site', file), join(out, file));
writeFileSync(join(out, '.nojekyll'), '', 'utf8');
console.log(`docs/ built: ${pages.length + 1} pages`);
