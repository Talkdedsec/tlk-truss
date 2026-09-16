import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from '../src/parse.mjs';
import { build } from '../src/model.mjs';
import { check } from '../src/check.mjs';
import { toRegExp } from '../src/glob.mjs';

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'truss-'));
  mkdirSync(join(root, 'src', 'auth'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'left-pad'), { recursive: true });
  writeFileSync(join(root, 'src', 'auth', 'token.ts'), '');
  writeFileSync(join(root, 'src', 'auth', 'session.ts'), '');
  writeFileSync(join(root, 'src', 'index.ts'), '');
  writeFileSync(join(root, 'node_modules', 'left-pad', 'index.js'), '');
  return root;
}

function compile(source) {
  return build(parse(source).spec).model;
}

test('a resolving binding passes and reports how much it matched', () => {
  const root = repo();
  const result = check(compile('node auth "Auth" code=src/auth/**\nnode app "App"\nauth -> app'), {
    root,
  });
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.bindings[0].count, 2);
  assert.deepEqual(result.coverage, { bound: 1, total: 2 });
  rmSync(root, { recursive: true, force: true });
});

test('a binding that no longer matches is an error, not a warning', () => {
  const root = repo();
  const result = check(compile('node gone "Gone" code=src/billing/**\nnode app "App"\ngone -> app'), {
    root,
  });
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].code, 'E400');
  assert.equal(result.diagnostics[0].token, 'gone');
  rmSync(root, { recursive: true, force: true });
});

test('several patterns on one node are checked one by one', () => {
  const root = repo();
  const result = check(
    compile('node api "API" code=src/index.ts,src/missing.ts\nnode app "App"\napi -> app'),
    { root },
  );
  assert.equal(result.bindings.length, 2);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].hint, 'src/missing.ts');
  rmSync(root, { recursive: true, force: true });
});

test('strict mode also flags nodes that carry no binding at all', () => {
  const root = repo();
  const loose = check(compile('node a "A"\nnode b "B"\na -> b'), { root });
  const strict = check(compile('node a "A"\nnode b "B"\na -> b'), { root, strict: true });
  assert.equal(loose.diagnostics.length, 0);
  assert.deepEqual(
    strict.diagnostics.map((entry) => entry.code),
    ['W400', 'W400'],
  );
  rmSync(root, { recursive: true, force: true });
});

test('vendored directories stay out of the match', () => {
  const root = repo();
  const result = check(compile('node dep "Dep" code=**/left-pad/**\nnode app "App"\ndep -> app'), {
    root,
  });
  assert.equal(result.diagnostics[0].code, 'E400');
  rmSync(root, { recursive: true, force: true });
});

test('globs translate the way the documentation promises', () => {
  assert.ok(toRegExp('src/**').test('src/a/b.ts'));
  assert.ok(toRegExp('src/**').test('src/a'));
  assert.ok(toRegExp('src/*.ts').test('src/a.ts'));
  assert.equal(toRegExp('src/*.ts').test('src/a/b.ts'), false);
  assert.ok(toRegExp('src/**/*.{ts,tsx}').test('src/a/b.tsx'));
  assert.ok(toRegExp('src/index.ts').test('src/index.ts'));
  assert.equal(toRegExp('src/index.ts').test('src/index.tsx'), false);
});

test('the coverage report names the directories no node claims', () => {
  const root = repo();
  const model = compile('node auth "Auth" code=src/auth/**\nnode app "App"\nauth -> app');
  const quiet = check(model, { root });
  const loud = check(model, { root, uncovered: true });

  assert.equal(quiet.diagnostics.length, 0);
  assert.deepEqual(
    loud.diagnostics.map((entry) => entry.token),
    [],
    'src/ is claimed, and node_modules is never counted',
  );
  rmSync(root, { recursive: true, force: true });
});

test('a directory nobody drew is reported once, with the root as its place', () => {
  const root = repo();
  mkdirSync(join(root, 'workers'), { recursive: true });
  writeFileSync(join(root, 'workers', 'nightly.ts'), '');

  const result = check(compile('node auth "Auth" code=src/**\nnode app "App"\nauth -> app'), {
    root,
    uncovered: true,
  });
  assert.deepEqual(
    result.diagnostics.map((entry) => [entry.code, entry.token]),
    [['W401', 'workers/']],
  );
  assert.equal(result.diagnostics[0].where, root);
  rmSync(root, { recursive: true, force: true });
});
