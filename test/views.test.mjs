import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';
import { layout } from '../src/layout/index.mjs';
import { renderDiagram } from '../src/render/index.mjs';

function compile(source) {
  const parsed = parse(source);
  const built = build(parsed.spec);
  return {
    model: built.model,
    diagram: layout(built.model),
    diagnostics: [...parsed.diagnostics, ...built.diagnostics],
  };
}

test('a sequence keeps participants in declaration order and messages in source order', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
node c "C"
b -> c : second
a -> b : first
`);
  assert.deepEqual(diagram.lanes.map((lane) => lane.id), ['a', 'b', 'c']);
  assert.deepEqual(diagram.messages.map((message) => message.label), ['second', 'first']);
  assert.ok(diagram.messages[1].y > diagram.messages[0].y);
  assert.deepEqual(diagram.summary.map((entry) => entry.key), ['participants', 'messages']);
});

test('a message to itself gets a drop instead of a flat line', () => {
  const { diagram, diagnostics } = compile('view sequence\nnode a "A"\nnode b "B"\na -> a : retries\na -> b');
  const self = diagram.messages[0];
  assert.equal(self.self, true);
  assert.ok(self.drop > 0);
  assert.ok(self.reach > self.x1);
  assert.equal(diagnostics.filter((entry) => entry.code === 'W301').length, 0);
});

test('a sequence repeated between the same pair is kept, not folded away', () => {
  const { diagram, diagnostics } = compile('view sequence\nnode a "A"\nnode b "B"\na -> b : ping\na -> b : ping');
  assert.equal(diagram.messages.length, 2);
  assert.equal(diagnostics.filter((entry) => entry.code === 'W300').length, 0);
});

test('a lifecycle turns a self transition into a loop that carries its event', () => {
  const { diagram } = compile(`
view lifecycle
node idle "Idle" kind=start
node busy "Busy"
node done "Done" kind=terminal
idle -> busy : start
busy -> busy : tick
busy -> done : finish
`);
  const loop = diagram.edges.find((edge) => edge.from === 'busy' && edge.to === 'busy');
  assert.ok(loop.loop);
  assert.equal(loop.label, 'tick');
  assert.deepEqual(diagram.summary.map((entry) => entry.key), ['states', 'transitions', 'stages', 'crossings']);
});

test('lifecycle nodes are drawn as pills with start and end markers', () => {
  const { diagram, model } = compile(
    'view lifecycle\nnode a "A" kind=start\nnode b "B" kind=terminal\na -> b',
  );
  const svg = renderDiagram(diagram, model);
  assert.match(svg, new RegExp(`rx="${diagram.nodes[0].h / 2}"`));
  assert.match(svg, /class="pip ring"/);
});

test('a data flow runs left to right unless told otherwise', () => {
  const right = compile('view dataflow\nnode a "A"\nnode b "B"\na -> b');
  const down = compile('view dataflow\nflow down\nnode a "A"\nnode b "B"\na -> b');
  assert.equal(right.model.flow, 'right');
  assert.ok(right.diagram.nodes[1].x > right.diagram.nodes[0].x);
  assert.equal(down.model.flow, 'down');
  assert.ok(down.diagram.nodes[1].y > down.diagram.nodes[0].y);
});

test('sources and sinks are drawn slanted only in the data flow view', () => {
  const flow = compile('view dataflow\nnode a "A" kind=source\nnode b "B" kind=sink\na -> b');
  const plain = compile('node a "A" kind=source\nnode b "B" kind=sink\na -> b');
  assert.match(renderDiagram(flow.diagram, flow.model), /<polygon class="body slanted"/);
  assert.equal(/<polygon/.test(renderDiagram(plain.diagram, plain.model)), false);
});

test('an unknown view is reported and falls back to architecture', () => {
  const { model, diagnostics } = compile('view hologram\nnode a "A"\nnode b "B"\na -> b');
  assert.equal(diagnostics[0].code, 'E206');
  assert.equal(model.view, 'architecture');
});

test('the Turkish names for the views resolve to the same thing', () => {
  assert.equal(compile('gorunum sekans\nnode a "A"\nnode b "B"\na -> b').model.view, 'sequence');
  assert.equal(compile('gorunum durum\nnode a "A"\nnode b "B"\na -> b').model.view, 'lifecycle');
  assert.equal(compile('gorunum veriakisi\nnode a "A"\nnode b "B"\na -> b').model.view, 'dataflow');
});
