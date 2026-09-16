import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineBundle } from '../src/bundle.mjs';
import { toSource } from '../src/source.mjs';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';

const engine = new Function(`return ${engineBundle()};`)();

test('the bundled engine parses, lays out and renders on its own', () => {
  const built = engine.build(engine.parse('title Demo\nnode a "A"\nnode b "B"\na -> b : calls').spec);
  const diagram = engine.layout(built.model);
  assert.equal(diagram.nodes.length, 2);
  assert.match(engine.renderDiagram(diagram, built.model), /<svg id="scene"/);
});

test('the bundle carries no import or export statement', () => {
  const code = engineBundle();
  assert.equal(/^\s*import\s/m.test(code), false);
  assert.equal(/^\s*export\s/m.test(code), false);
});

test('an edit made the way the page makes it survives the round trip', () => {
  const built = engine.build(
    engine.parse('title Demo\nnode api "API" code=src/**\nnode db "DB" kind=store\napi -> db : writes').spec,
  );
  const model = built.model;

  model.nodeIndex.get('api').label = 'Gateway';
  model.nodeIndex.get('api').code = 'services/api/**';
  model.edges.push({ from: 'db', to: 'api', label: 'rows', style: 'async' });

  const text = engine.toSource(model);
  const again = engine.build(engine.parse(text).spec).model;
  assert.equal(again.nodeIndex.get('api').label, 'Gateway');
  assert.equal(again.nodeIndex.get('api').code, 'services/api/**');
  assert.equal(again.edges.length, 2);
  assert.equal(again.edges[1].style, 'async');
});

test('removing a node takes its connections with it', () => {
  const model = engine.build(
    engine.parse('node a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c').spec,
  ).model;

  model.nodes = model.nodes.filter((node) => node.id !== 'b');
  model.edges = model.edges.filter((edge) => edge.from !== 'b' && edge.to !== 'b');

  const again = engine.build(engine.parse(engine.toSource(model)).spec);
  assert.equal(again.model.nodes.length, 2);
  assert.equal(again.model.edges.length, 0);
  assert.equal(again.diagnostics.filter((entry) => entry.code.startsWith('E')).length, 0);
});

test('the serialiser and the parser agree on every example', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  for (const name of readdirSync('examples').filter((file) => file.endsWith('.truss'))) {
    const first = build(parse(readFileSync(`examples/${name}`, 'utf8')).spec).model;
    const second = build(parse(toSource(first)).spec).model;
    assert.equal(second.nodes.length, first.nodes.length, name);
    assert.equal(second.edges.length, first.edges.length, name);
    assert.equal(second.view, first.view, name);
    assert.equal(second.flow, first.flow, name);
    assert.deepEqual(
      second.nodes.map((node) => [node.id, node.label, node.kind, node.code, node.group]),
      first.nodes.map((node) => [node.id, node.label, node.kind, node.code, node.group]),
      name,
    );
  }
});
