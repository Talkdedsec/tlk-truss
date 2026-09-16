import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';

function compile(source) {
  const { spec, diagnostics } = parse(source);
  const built = build(spec);
  return { ...built, diagnostics: [...diagnostics, ...built.diagnostics] };
}

test('resolves kinds, groups and membership', () => {
  const { model, diagnostics } = compile(`
group core "Core"
node api "API" in=core kind=servis
node db "DB" in=core tur=store
api -> db
`);
  assert.equal(diagnostics.length, 0);
  assert.equal(model.nodes[0].kind, 'service');
  assert.equal(model.nodes[1].kind, 'store');
  assert.deepEqual(model.groups[0].members, ['api', 'db']);
});

test('catches duplicate declarations and unknown references', () => {
  const { diagnostics } = compile(`
node a "A"
node a "A again"
group g "G"
group g "G again"
node b "B" in=missing
b -> ghost
`);
  const codes = diagnostics
    .map((entry) => entry.code)
    .filter((code) => code.startsWith('E'))
    .sort();
  assert.deepEqual(codes, ['E200', 'E201', 'E202', 'E203']);
});

test('warns on self connections, repeats and unconnected nodes', () => {
  const { diagnostics } = compile(`
node a "A"
node b "B"
node lonely "Lonely"
a -> a
a -> b
a -> b
`);
  const codes = diagnostics.map((entry) => entry.code);
  assert.ok(codes.includes('W301'));
  assert.ok(codes.includes('W300'));
  assert.ok(codes.includes('W302'));
});

test('a group with no members is kept in the model so one can be filled later', () => {
  const { model } = compile('group ghost "Ghost"\nnode a "A"\nnode b "B"\na -> b');
  assert.equal(model.groups.length, 1);
  assert.deepEqual(model.groups[0].members, []);
});

test('reports an unknown kind and falls back to service', () => {
  const { model, diagnostics } = compile('node a "A" kind=spaceship\nnode b "B"\na -> b');
  assert.equal(diagnostics[0].code, 'E205');
  assert.equal(model.nodes[0].kind, 'service');
});
