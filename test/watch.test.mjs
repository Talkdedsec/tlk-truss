import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startWatch } from '../src/commands/watch.mjs';

function collector() {
  const out = [];
  const err = [];
  return { io: { log: (line) => out.push(line), error: (line) => err.push(line) }, out, err };
}

function settle(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

test('a change to the source rewrites the page', async () => {
  const room = mkdtempSync(join(tmpdir(), 'truss-watch-'));
  const source = join(room, 'a.truss');
  const target = join(room, 'a.html');
  writeFileSync(source, 'title One\nnode a "A"\nnode b "B"\na -> b\n', 'utf8');

  const sink = collector();
  const handle = startWatch({ source, out: target, lang: 'en', serve: false }, sink.io);
  assert.match(readFileSync(target, 'utf8'), /<title>One<\/title>/);

  writeFileSync(source, 'title Two\nnode a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c\n', 'utf8');
  await settle(400);

  const html = readFileSync(target, 'utf8');
  assert.match(html, /<title>Two<\/title>/);
  assert.match(sink.out.join('\n'), /3 nodes/);
  handle.close();
  rmSync(room, { recursive: true, force: true });
});

test('a broken change is reported and the last good page is left in place', async () => {
  const room = mkdtempSync(join(tmpdir(), 'truss-watch-'));
  const source = join(room, 'a.truss');
  const target = join(room, 'a.html');
  writeFileSync(source, 'title Good\nnode a "A"\nnode b "B"\na -> b\n', 'utf8');

  const sink = collector();
  const handle = startWatch({ source, out: target, lang: 'en', serve: false }, sink.io);

  writeFileSync(source, 'title Bad\nnode a "A"\na -> ghost\n', 'utf8');
  await settle(400);

  assert.match(readFileSync(target, 'utf8'), /<title>Good<\/title>/);
  assert.match(sink.err.join('\n'), /E202/);
  handle.close();
  rmSync(room, { recursive: true, force: true });
});

test('the served page reloads itself but the saved file never does', async () => {
  const room = mkdtempSync(join(tmpdir(), 'truss-watch-'));
  const source = join(room, 'a.truss');
  const target = join(room, 'a.html');
  writeFileSync(source, 'title Served\nnode a "A"\nnode b "B"\na -> b\n', 'utf8');

  const sink = collector();
  const handle = startWatch(
    { source, out: target, lang: 'en', serve: true, port: 4187 },
    sink.io,
  );
  await settle(200);

  const served = await fetch('http://127.0.0.1:4187/').then((response) => response.text());
  const first = await fetch('http://127.0.0.1:4187/version').then((response) => response.text());
  assert.match(served, /location\.reload/);
  assert.equal(readFileSync(target, 'utf8').includes('location.reload'), false);

  writeFileSync(source, 'title Served\nnode a "A"\nnode b "B"\nnode c "C"\na -> b\nb -> c\n', 'utf8');
  await settle(400);
  const second = await fetch('http://127.0.0.1:4187/version').then((response) => response.text());
  assert.notEqual(second, first);

  handle.close();
  rmSync(room, { recursive: true, force: true });
});
