import { writeFileSync, mkdirSync } from 'node:fs';
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

const copy = {
  architecture: [
    'Architecture',
    'Services, stores and boundaries. Every box that owns code carries the path it owns.',
  ],
  sequence: ['Sequence', 'One checkout, message by message, in the order the source lists them.'],
  dataflow: ['Data flow', 'A pipeline read left to right; sources and sinks are drawn slanted.'],
  lifecycle: ['Lifecycle', 'What an order can be, including the state that loops back on itself.'],
};

const out = 'docs';
mkdirSync(out, { recursive: true });

for (const page of pages) {
  const { model } = load(page.source);
  writeFileSync(join(out, page.file), renderPage(layout(model), model, { lang: 'en' }), 'utf8');
}

const cards = pages
  .map((page) => {
    const [title, line] = copy[page.view];
    return `  <article>
    <h2>${title}</h2>
    <p>${line}</p>
    <iframe src="${page.file}" title="${title}" loading="lazy"></iframe>
    <a href="${page.file}">Open it on its own →</a>
  </article>`;
  })
  .join('\n');

const index = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tlk-truss — architecture diagrams bound to real code</title>
<style>
:root { --canvas:#0b0f14; --surface:#161b22; --line:#2f3742; --text:#e6edf3; --muted:#8b949e; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--canvas); color: var(--text); padding: 0 20px 64px;
  font: 15px/1.6 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
main { max-width: 1040px; margin: 0 auto; }
header { padding: 64px 0 28px; border-bottom: 1px solid var(--line); }
h1 { margin: 0 0 8px; font-size: 30px; letter-spacing: -.01em; }
.lede { color: var(--muted); max-width: 62ch; margin: 0; }
pre { background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px 16px; overflow-x: auto; font-size: 13px; }
code { font-family: ui-monospace, Consolas, monospace; }
section { margin-top: 44px; }
h2 { font-size: 19px; margin: 0 0 4px; }
article { margin-top: 34px; }
article p { color: var(--muted); margin: 0 0 12px; }
iframe { width: 100%; height: 520px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--canvas); }
a { color: #4c9aff; }
article a { display: inline-block; margin-top: 8px; font-size: 14px; }
footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--line);
  color: var(--muted); font-size: 14px; }
@media (max-width: 640px) { iframe { height: 420px; } header { padding-top: 40px; } }
</style>
</head>
<body>
<main>
<header>
  <h1>tlk-truss</h1>
  <p class="lede">Architecture diagrams bound to real code. The drawings below are the tool's own
  output — one HTML file each, no network, no build step. Press <b>Edit</b> inside any of them:
  the whole engine ships in the page, so the diagram lays itself out again as you change it.</p>
</header>

<section>
  <h2>The part nobody else does</h2>
  <p class="lede">Every node can name the code it stands for. When that code moves or disappears,
  the diagram stops being a picture and starts being a failing build.</p>
  <pre><code>$ truss check docs/architecture.truss --ci
✗ docs/architecture.truss:14  E400  "ledger" is bound to src/ledger/**, which matches nothing
1 binding(s) no longer resolve
$ echo $?
1</code></pre>
</section>

<section>
  <h2>The four views</h2>
${cards}
</section>

<footer>
  <a href="https://github.com/Talkdedsec/tlk-truss">Source on GitHub</a> ·
  PolyForm Noncommercial 1.0.0 ·
  <a href="https://github.com/Talkdedsec/tlk-truss/blob/main/README.tr.md">Türkçe</a>
</footer>
</main>
</body>
</html>
`;

writeFileSync(join(out, 'index.html'), index, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');
console.log(`docs/ built: ${pages.length + 1} pages`);
