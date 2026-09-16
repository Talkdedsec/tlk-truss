import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw, check, parse, build, toSource, fromMermaid } from '../src/index.mjs';

test('draw returns the page, the diagram and the diagnostics together', () => {
  const result = draw('title API\nnode a "A" code=src/**\nnode b "B"\na -> b : calls');
  assert.match(result.html, /<title>API<\/title>/);
  assert.equal(result.diagram.nodes.length, 2);
  assert.deepEqual(result.diagnostics, []);
});

test('draw refuses a broken source instead of rendering half of it', () => {
  const result = draw('node a "A"\na -> ghost');
  assert.equal(result.html, '');
  assert.equal(result.diagnostics[0].code, 'E202');
});

test('the pieces are exported for anyone who wants their own pipeline', () => {
  const model = build(parse('node a "A" code=package.json\nnode b "B"\na -> b').spec).model;
  assert.equal(check(model, { root: '.' }).diagnostics.length, 0);
  assert.match(toSource(model), /node a "A" code=package.json/);
  assert.match(fromMermaid('flowchart TD\n  a[A] --> b[B]').text, /a -> b/);
});
