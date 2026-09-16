import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';
import { layout } from '../src/layout/index.mjs';
import { countCrossings } from '../src/layout/order.mjs';

function draw(source) {
  const { spec } = parse(source);
  const { model } = build(spec);
  return { diagram: layout(model), model };
}

test('a chain lands one node per layer with no crossings', () => {
  const { diagram } = draw('node a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c');
  assert.equal(diagram.stats.layers, 3);
  assert.equal(diagram.stats.crossings, 0);
  assert.equal(diagram.stats.reversed, 0);
});

test('the reported crossing count is the measured one', () => {
  const { diagram } = draw(`
node a1 "A1"
node a2 "A2"
node b1 "B1"
node b2 "B2"
a1 -> b2
a2 -> b1
a1 -> b1
a2 -> b2
`);
  assert.equal(diagram.stats.crossings, diagram.stats.verified);
});

test('a cycle is broken rather than hanging the layering', () => {
  const { diagram } = draw('node a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c\nc -> a');
  assert.equal(diagram.stats.reversed, 1);
  assert.equal(diagram.nodes.length, 3);
});

test('a long connection gets virtual points and keeps its direction', () => {
  const { diagram } = draw('node a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c\na -> c');
  assert.equal(diagram.stats.virtual, 1);
  const skip = diagram.edges.find((edge) => edge.from === 'a' && edge.to === 'c');
  assert.equal(skip.points.length, 3);
  assert.ok(skip.points[0].y < skip.points[2].y);
});

test('no two nodes overlap and nothing sits outside the canvas', () => {
  const { diagram } = draw(`
group core "Core"
node a "Alpha" in=core
node b "Beta" in=core
node c "Gamma"
node d "Delta"
a -> b
a -> c
c -> d
b -> d
`);
  for (const node of diagram.nodes) {
    assert.ok(node.x >= 0 && node.y >= 0, `${node.id} is off canvas`);
    assert.ok(node.x + node.w <= diagram.width, `${node.id} overflows width`);
    assert.ok(node.y + node.h <= diagram.height, `${node.id} overflows height`);
  }
  for (const first of diagram.nodes) {
    for (const second of diagram.nodes) {
      if (first.id >= second.id) continue;
      const apart =
        first.x + first.w <= second.x ||
        second.x + second.w <= first.x ||
        first.y + first.h <= second.y ||
        second.y + second.h <= first.y;
      assert.ok(apart, `${first.id} overlaps ${second.id}`);
    }
  }
});

test('a group box never swallows a node that does not belong to it', () => {
  const { diagram } = draw(`
group core "Core"
node api "API" in=core
node worker "Worker" in=core
node outsider "Outsider"
node sink "Sink"
api -> worker
api -> outsider
worker -> sink
outsider -> sink
`);
  const group = diagram.groups[0];
  const stranger = diagram.nodes.find((node) => node.id === 'outsider');
  const inside =
    stranger.x < group.x + group.w &&
    stranger.x + stranger.w > group.x &&
    stranger.y < group.y + group.h &&
    stranger.y + stranger.h > group.y;
  assert.equal(inside, false);
});

test('left to right flow turns layers into columns', () => {
  const { diagram } = draw('flow right\nnode a "A"\nnode b "B"\na -> b');
  const [first, second] = diagram.nodes;
  assert.ok(second.x > first.x + first.w);
  assert.equal(diagram.width > diagram.height, true);
});

test('crossing count matches a hand counted case', () => {
  const layers = [
    ['a', 'b'],
    ['c', 'd'],
  ];
  const links = [
    ['a', 'd'],
    ['b', 'c'],
  ];
  assert.equal(countCrossings(layers, links), 1);
});
