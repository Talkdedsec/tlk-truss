import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { open } from '../scripts/browser-check.mjs';
import { load } from '../src/load.mjs';
import { layout } from '../src/layout/index.mjs';
import { renderPage } from '../src/render/page.mjs';

let page;
let room;

before(async () => {
  room = mkdtempSync(join(tmpdir(), 'truss-page-'));
  const { model } = load('examples/payments.truss');
  const file = join(room, 'payments.html');
  writeFileSync(file, renderPage(layout(model), model, { lang: 'en' }), 'utf8');
  page = await open(file);
}, { timeout: 30000 });

after(async () => {
  await page.close();
  rmSync(room, { recursive: true, force: true });
});

test('the page boots with no console error', async () => {
  const footer = await page.session.evaluate("document.getElementById('stats').textContent");
  assert.match(footer, /nodes/);
  assert.deepEqual(page.problems, []);
});

test('the bundled engine laid the diagram out in the browser', async () => {
  const counted = await page.session.evaluate(
    "document.querySelectorAll('.node').length + ':' + document.querySelectorAll('.edge').length",
  );
  assert.equal(counted, '8:10');
});

test('edit mode opens an editable panel on a node', async () => {
  await page.session.evaluate("document.getElementById('edit').click()");
  await page.session.evaluate("document.querySelector('[data-id=\"api\"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))");
  const fields = await page.session.evaluate(
    "[...document.querySelectorAll('#panel [data-field]')].map(function (i) { return i.dataset.field; }).join(',')",
  );
  assert.equal(fields, 'label,kind,group,code,note');
});

test('renaming a node re-runs the layout and updates the source', async () => {
  const label = await page.session.evaluate(`
    (function () {
      const input = document.querySelector('#panel [data-field="label"]');
      input.value = 'Edge Gateway';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return document.querySelector('[data-id="api"] .label').textContent;
    })()
  `);
  assert.equal(label, 'Edge Gateway');

  const source = await page.session.evaluate(`
    (function () {
      document.getElementById('sourceButton').click();
      return document.getElementById('sourceText').value;
    })()
  `);
  assert.match(source, /node api "Edge Gateway"/);
  assert.deepEqual(page.problems, []);
});

test('a broken source is refused and the drawing is left alone', async () => {
  const outcome = await page.session.evaluate(`
    (function () {
      const box = document.getElementById('sourceText');
      box.value = 'node a "A"\\na -> ghost';
      document.getElementById('applySource').click();
      return {
        flash: document.getElementById('flash').textContent,
        nodes: document.querySelectorAll('.node').length,
      };
    })()
  `);
  assert.equal(outcome.flash, 'E202');
  assert.equal(outcome.nodes, 8);
});

test('a node can be removed and the connections go with it', async () => {
  const after_ = await page.session.evaluate(`
    (function () {
      const box = document.getElementById('sourceText');
      box.value = 'title T\\nnode a "A"\\nnode b "B"\\nnode c "C"\\na -> b\\nb -> c';
      document.getElementById('applySource').click();
      document.querySelector('[data-id="b"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('#panel [data-act="drop"]').click();
      return document.querySelectorAll('.node').length + ':' + document.querySelectorAll('.edge').length;
    })()
  `);
  assert.equal(after_, '2:0');
  assert.deepEqual(page.problems, []);
});
