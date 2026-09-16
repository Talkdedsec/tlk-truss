import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';
import { layout } from '../src/layout/index.mjs';
import { renderPage } from '../src/render/page.mjs';

function page(source, options) {
  const { model } = build(parse(source).spec);
  return renderPage(layout(model), model, options);
}

test('a label carrying markup cannot break out of the document', () => {
  const html = page('node a "</text><script>alert(1)</script>"\nnode b "B"\na -> b');
  assert.equal(html.includes('<script>alert(1)'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)/);
});

test('the embedded payload cannot close its own script tag', () => {
  const html = page('node a "A" note="</script><img onerror=x>"\nnode b "B"\na -> b');
  const payload = html.slice(html.indexOf('window.__truss'), html.indexOf('</script>'));
  assert.equal(payload.includes('</script>'), false);
});

test('both themes ship in one file and no asset is fetched', () => {
  const html = page('node a "A"\nnode b "B"\na -> b');
  assert.match(html, /:root\[data-theme="dark"\]/);
  assert.match(html, /:root\[data-theme="light"\]/);
  assert.equal(/src="https?:/.test(html), false);
  assert.equal(/href="https?:\/\/(?!.*rel="noreferrer")/.test(html), false);
});

test('the page carries the interface text for both languages', () => {
  const html = page('node a "A"\nnode b "B"\na -> b', { lang: 'tr' });
  assert.match(html, /"Kod bağı"/);
  assert.match(html, /"Code binding"/);
  assert.match(html, /"lang":"tr"/);
});

test('a code binding is drawn on the node itself', () => {
  const html = page('node a "A" code=src/a.ts\nnode b "B"\na -> b');
  assert.match(html, /class="code"[^>]*>src\/a\.ts</);
});
