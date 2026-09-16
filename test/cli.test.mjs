import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/cli.mjs';
import { languages, strings } from '../src/i18n.mjs';

function capture(argv) {
  const out = [];
  const err = [];
  const code = run(argv, { log: (line) => out.push(line), error: (line) => err.push(line) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

function sample(body) {
  const root = mkdtempSync(join(tmpdir(), 'truss-cli-'));
  const source = join(root, 'demo.truss');
  writeFileSync(source, body, 'utf8');
  return { root, source };
}

test('help answers in both languages and exits clean', () => {
  const english = capture(['help']);
  const turkish = capture(['yardim', '--lang', 'tr']);
  assert.equal(english.code, 0);
  assert.equal(turkish.code, 0);
  assert.match(english.out, /Commands:/);
  assert.match(turkish.out, /Komutlar:/);
});

test('every message key exists in every language', () => {
  const reference = Object.keys(strings('en'));
  for (const lang of languages) {
    const keys = Object.keys(strings(lang));
    assert.deepEqual(keys.sort(), reference.slice().sort(), `${lang} is missing keys`);
  }
});

test('an unknown command explains itself and exits 2', () => {
  const result = capture(['fly']);
  assert.equal(result.code, 2);
  assert.match(result.err, /Unknown command: fly/);
});

test('draw writes a self contained page and reports the crossing count', () => {
  const { root, source } = sample('node a "A"\nnode b "B"\na -> b : calls\n');
  const result = capture(['draw', source, '--out', join(root, 'demo.html')]);
  assert.equal(result.code, 0);
  const html = readFileSync(join(root, 'demo.html'), 'utf8');
  assert.match(html, /<svg id="scene"/);
  assert.equal(html.includes('src="http'), false);
  assert.match(result.out, /0 crossings/);
  rmSync(root, { recursive: true, force: true });
});

test('draw refuses a source with errors and touches no output', () => {
  const { root, source } = sample('node a "A"\na -> ghost\n');
  const result = capture(['draw', source, '--out', join(root, 'demo.html')]);
  assert.equal(result.code, 1);
  assert.match(result.err, /E202/);
  assert.throws(() => readFileSync(join(root, 'demo.html'), 'utf8'));
  rmSync(root, { recursive: true, force: true });
});

test('check exits 1 on drift and 0 once the binding resolves', () => {
  const { root, source } = sample('node a "A" code=demo.truss\nnode b "B"\na -> b\n');
  assert.equal(capture(['check', source, '--root', root]).code, 0);

  writeFileSync(source, 'node a "A" code=gone.truss\nnode b "B"\na -> b\n', 'utf8');
  const drifted = capture(['check', source, '--root', root]);
  assert.equal(drifted.code, 1);
  assert.match(drifted.err, /E400/);
  rmSync(root, { recursive: true, force: true });
});

test('json output stays machine readable on failure', () => {
  const { root, source } = sample('node a "A" code=gone.truss\nnode b "B"\na -> b\n');
  const result = capture(['check', source, '--root', root, '--json']);
  const report = JSON.parse(result.out);
  assert.equal(result.code, 1);
  assert.equal(report.ok, false);
  assert.equal(report.diagnostics[0].code, 'E400');
  assert.ok(report.diagnostics[0].message.length > 0);
  rmSync(root, { recursive: true, force: true });
});

test('turkish diagnostics come back translated', () => {
  const { root, source } = sample('node a "A" code=gone.truss\nnode b "B"\na -> b\n');
  const result = capture(['denetle', source, '--root', root, '--lang', 'tr']);
  assert.match(result.err, /hiçbir şeyle eşleşmiyor/);
  rmSync(root, { recursive: true, force: true });
});
