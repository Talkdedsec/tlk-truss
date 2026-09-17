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
      box.value = ['title T', 'node a "A"', 'node b "B"', 'node c "C"', 'a -> b', 'b -> c'].join(String.fromCharCode(10));
      document.getElementById('applySource').click();
      document.querySelector('[data-id="b"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('#panel [data-act="drop"]').click();
      return document.querySelectorAll('.node').length + ':' + document.querySelectorAll('.edge').length;
    })()
  `);
  assert.equal(after_, '2:0');
  assert.deepEqual(page.problems, []);
});

test('a group can be created, filled, renamed and removed from the canvas', async () => {
  const outcome = await page.session.evaluate(`
    (function () {
      const box = document.getElementById('sourceText');
      box.value = ['title T', 'node a "A"', 'node b "B"', 'a -> b'].join(String.fromCharCode(10));
      document.getElementById('applySource').click();

      document.querySelector('[data-id="a"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.getElementById('addGroup').click();

      const rename = document.querySelector('#panel [data-field="label"]');
      rename.value = 'Edge';
      rename.dispatchEvent(new Event('change', { bubbles: true }));

      const drawn = document.querySelectorAll('.group').length;
      const label = document.querySelector('.group text').textContent;
      const source = document.getElementById('sourceText').value;
      return { drawn: drawn, label: label, source: source };
    })()
  `);
  assert.equal(outcome.drawn, 1);
  assert.equal(outcome.label, 'Edge');
  assert.match(outcome.source, /group g1 "Edge"/);
  assert.match(outcome.source, /node a "A" in=g1/);

  const removed = await page.session.evaluate(`
    (function () {
      document.querySelector('.group').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('#panel [data-act="drop"]').click();
      return {
        groups: document.querySelectorAll('.group').length,
        nodes: document.querySelectorAll('.node').length,
        source: document.getElementById('sourceText').value,
      };
    })()
  `);
  assert.equal(removed.groups, 0);
  assert.equal(removed.nodes, 2);
  assert.equal(/in=g1/.test(removed.source), false);
  assert.deepEqual(page.problems, []);
});

test('a block can be retyped, given a branch and removed from the canvas', async () => {
  const built = await page.session.evaluate(`
    (function () {
      const box = document.getElementById('sourceText');
      box.value = [
        'title T', 'view sequence', 'node a "A"', 'node b "B"',
        'block loop "twice"', 'a -> b : one', 'b -> a : two', 'end',
      ].join(String.fromCharCode(10));
      document.getElementById('applySource').click();
      document.querySelector('.frame').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return [...document.querySelectorAll('#panel [data-field]')].map(function (i) { return i.dataset.field; }).join(',');
    })()
  `);
  assert.equal(built, 'kind,label');

  const retyped = await page.session.evaluate(`
    (function () {
      const kind = document.querySelector('#panel [data-field="kind"]');
      kind.value = 'alt';
      kind.dispatchEvent(new Event('change', { bubbles: true }));
      return document.querySelector('.frame .tag').textContent;
    })()
  `);
  assert.equal(retyped, 'alt');

  const branched = await page.session.evaluate(`
    (function () {
      document.querySelector('.frame').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('#panel [data-act="branch"]').click();
      return {
        dividers: document.querySelectorAll('.frame .divider').length,
        source: document.getElementById('sourceText').value,
      };
    })()
  `);
  assert.equal(branched.dividers, 1);
  assert.match(branched.source, /else/);

  const removed = await page.session.evaluate(`
    (function () {
      document.querySelector('.frame').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('#panel [data-act="drop"]').click();
      return {
        frames: document.querySelectorAll('.frame').length,
        messages: document.querySelectorAll('.edge').length,
        source: document.getElementById('sourceText').value,
      };
    })()
  `);
  assert.equal(removed.frames, 0);
  assert.equal(removed.messages, 2, 'the messages outlive the block');
  assert.equal(/block /.test(removed.source), false);
  assert.deepEqual(page.problems, []);
});
