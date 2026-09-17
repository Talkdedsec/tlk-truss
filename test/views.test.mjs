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

test('activation bars nest the way the calls nest', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
node c "C"
a -> b : call
b -> c : deeper
c -> b : back
b -> a : done
`);
  const outer = diagram.bars.find((bar) => bar.participant === 'b');
  const inner = diagram.bars.find((bar) => bar.participant === 'c');
  assert.ok(outer.y < inner.y, 'the outer call starts first');
  assert.ok(outer.y + outer.h > inner.y + inner.h, 'and ends last');
  assert.equal(diagram.bars.length, 2);
});

test('a call that never returns stays active to the end of the lifeline', () => {
  const { diagram } = compile('view sequence\nnode a "A"\nnode b "B"\na -> b : fire');
  assert.equal(diagram.bars.length, 1);
  assert.equal(diagram.bars[0].y + diagram.bars[0].h, diagram.lifelineEnd);
});

test('an asynchronous message activates nobody', () => {
  const { diagram } = compile('view sequence\nnode a "A"\nnode q "Q"\na ~> q : published');
  assert.equal(diagram.bars.length, 0);
});

test('a note on a message is drawn clear of every lifeline', () => {
  const { diagram, model } = compile(
    'view sequence\nnode a "A"\nnode b "B"\na -> b : "charge" note="idempotent"',
  );
  assert.equal(diagram.notes.length, 1);
  const rightmost = Math.max(...diagram.lanes.map((lane) => lane.x + lane.w));
  assert.ok(diagram.notes[0].x > rightmost);
  assert.match(renderDiagram(diagram, model), /class="note"/);
});

test('a block frames the messages inside it and nothing else', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
a -> b : before
block loop "until it takes"
a -> b : try
b -> a : no
end
a -> b : after
`);
  assert.equal(diagram.frames.length, 1);
  const frame = diagram.frames[0];
  const inside = diagram.messages.filter((message) => message.frame === 'f1');
  const outside = diagram.messages.filter((message) => !message.frame);
  assert.equal(inside.length, 2);
  for (const message of inside) {
    assert.ok(message.y > frame.y && message.y < frame.y + frame.h, 'inside the frame');
  }
  for (const message of outside) {
    assert.ok(message.y < frame.y || message.y > frame.y + frame.h, 'outside the frame');
  }
  assert.equal(frame.kind, 'loop');
  assert.equal(frame.label, 'until it takes');
});

test('blocks nest and the inner one is drawn inside the outer one', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
block alt "card"
a -> b : outer
block opt "3-D Secure"
a -> b : inner
end
end
`);
  const [outer, inner] = diagram.frames;
  assert.ok(inner.y > outer.y);
  assert.ok(inner.y + inner.h <= outer.y + outer.h);
  assert.ok(inner.x >= outer.x);
});

test('an unclosed block and a stray end are both reported', () => {
  const unclosed = compile('view sequence\nnode a "A"\nnode b "B"\nblock loop "x"\na -> b');
  const stray = compile('view sequence\nnode a "A"\nnode b "B"\na -> b\nend');
  assert.equal(unclosed.diagnostics[0].code, 'E107');
  assert.equal(stray.diagnostics[0].code, 'E108');
});

test('an unknown block kind is refused with the list of known ones', () => {
  const { diagnostics } = compile('view sequence\nnode a "A"\nnode b "B"\nblock whirl "x"\na -> b\nend');
  assert.equal(diagnostics[0].code, 'E109');
  assert.match(diagnostics[0].hint, /loop, alt, opt, par/);
});

test('blocks outside a sequence are a warning, not a drawing', () => {
  const { model, diagnostics } = compile('node a "A"\nnode b "B"\nblock loop "x"\na -> b\nend');
  assert.equal(diagnostics.some((entry) => entry.code === 'W303'), true);
  assert.equal(model.frames.length, 0);
});

test('the Turkish block words mean the same thing', () => {
  const { diagram } = compile(
    'gorunum sekans\nnode a "A"\nnode b "B"\nblok dongu "tekrar"\na -> b\nson',
  );
  assert.equal(diagram.frames[0].kind, 'loop');
  assert.equal(diagram.frames[0].label, 'tekrar');
});

test('an else splits a block into branches with a divider between them', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
block alt "declined"
a -> b : refuse
else "approved"
a -> b : accept
end
`);
  const frame = diagram.frames[0];
  assert.equal(frame.dividers.length, 1);
  assert.equal(frame.dividers[0].label, 'approved');
  const [first, second] = diagram.messages;
  assert.equal(first.branch, 0);
  assert.equal(second.branch, 1);
  assert.ok(first.y < frame.dividers[0].y, 'the first branch sits above the divider');
  assert.ok(second.y > frame.dividers[0].y, 'the second below it');
  assert.ok(frame.dividers[0].y > frame.y && frame.dividers[0].y < frame.y + frame.h);
});

test('several branches each get their own divider, in order', () => {
  const { diagram } = compile(`
view sequence
node a "A"
node b "B"
block par "fan out"
a -> b : one
else "two"
a -> b : two
else "three"
a -> b : three
end
`);
  const dividers = diagram.frames[0].dividers;
  assert.deepEqual(dividers.map((entry) => entry.label), ['two', 'three']);
  assert.ok(dividers[1].y > dividers[0].y);
});

test('an else outside a block is refused', () => {
  const { diagnostics } = compile('view sequence\nnode a "A"\nnode b "B"\na -> b\nelse "x"');
  assert.equal(diagnostics[0].code, 'E112');
});

test('branches survive being written back to source', async () => {
  const { toSource } = await import('../src/source.mjs');
  const first = compile(`
view sequence
node a "A"
node b "B"
block alt "one"
a -> b : x
else "two"
a -> b : y
end
`);
  const text = toSource(first.model);
  assert.match(text, /else "two"/);
  const second = compile(text);
  assert.equal(second.model.branches.length, 1);
  assert.deepEqual(second.model.edges.map((edge) => edge.branch), [0, 1]);
});

test('the Turkish else means the same thing', () => {
  const { diagram } = compile(
    'gorunum sekans\nnode a "A"\nnode b "B"\nblok secenek "bir"\na -> b : x\nyoksa "iki"\na -> b : y\nson',
  );
  assert.equal(diagram.frames[0].dividers[0].label, 'iki');
});
