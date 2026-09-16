import { readFileSync } from 'node:fs';
import { parse } from './parse.mjs';
import { build } from './model.mjs';

export function load(path) {
  const source = readFileSync(path, 'utf8');
  const parsed = parse(source, { path });
  const built = build(parsed.spec);
  return {
    path,
    model: built.model,
    diagnostics: [...parsed.diagnostics, ...built.diagnostics].sort(
      (a, b) => (a.line ?? 0) - (b.line ?? 0),
    ),
  };
}
