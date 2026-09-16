import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.mjs';

test('reads directives, groups, nodes and connections', () => {
  const { spec, diagnostics } = parse(`
title  Billing
flow   right
group core "Core"
node api "API Gateway" in=core kind=service code=src/**
node db "Postgres" kind=store
api -> db : writes
`);
  assert.equal(diagnostics.length, 0);
  assert.equal(spec.title, 'Billing');
  assert.equal(spec.flow, 'right');
  assert.equal(spec.groups.length, 1);
  assert.equal(spec.nodes[0].code, 'src/**');
  assert.deepEqual(
    spec.edges.map((edge) => [edge.from, edge.to, edge.label, edge.style]),
    [['api', 'db', 'writes', 'solid']],
  );
});

test('accepts the Turkish spelling of every keyword', () => {
  const { spec, diagnostics } = parse(`
baslik  Fatura
akis    saga
grup    cekirdek "Çekirdek"
dugum   api "Geçit" icinde=cekirdek tur=servis kod=src/**
dugum   db "Postgres" tur=depo not="tek kopya"
api ~> db : yazar
`);
  assert.equal(diagnostics.length, 0);
  assert.equal(spec.title, 'Fatura');
  assert.equal(spec.flow, 'right');
  assert.equal(spec.nodes[0].group, 'cekirdek');
  assert.equal(spec.nodes[0].kind, 'servis');
  assert.equal(spec.nodes[1].note, 'tek kopya');
  assert.equal(spec.edges[0].style, 'async');
});

test('keeps comments and blank lines out of the model', () => {
  const { spec } = parse(`
# a comment
node a "A"   # trailing note
node b "B"

a -> b
`);
  assert.equal(spec.nodes.length, 2);
  assert.equal(spec.nodes[0].label, 'A');
  assert.equal(spec.edges.length, 1);
});

test('reports unterminated quotes, unknown statements and bad attributes', () => {
  const { diagnostics } = parse(`
node a "A
wibble c
node b "B" colour=red
node c "C" kind
`);
  const codes = diagnostics.map((entry) => entry.code);
  assert.deepEqual(codes, ['E100', 'E101', 'E111', 'E110']);
});

test('rejects an invalid identifier on both sides of a connection', () => {
  const { diagnostics } = parse('9lives -> home');
  assert.equal(diagnostics[0].code, 'E105');
  assert.equal(diagnostics[0].token, '9lives');
});

test('carries the source line on every statement', () => {
  const { spec } = parse('\n\nnode a "A"\n\na -> a\n');
  assert.equal(spec.nodes[0].line, 3);
  assert.equal(spec.edges[0].line, 5);
});
