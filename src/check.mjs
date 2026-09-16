import { readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { toRegExp } from './glob.mjs';

const skipped = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '.next',
  '.cache',
  'coverage',
]);

export function walk(root, { limit = 60000 } = {}) {
  const found = [];
  const stack = [root];
  while (stack.length && found.length < limit) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (skipped.has(entry.name)) continue;
      const full = join(current, entry.name);
      const rel = relative(root, full).split(sep).join('/');
      if (entry.isDirectory()) {
        found.push(`${rel}/`);
        stack.push(full);
      } else {
        found.push(rel);
      }
    }
  }
  return found;
}

function patternsOf(node) {
  return node.code
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function territory(root) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !skipped.has(entry.name))
    .map((entry) => `${entry.name}/`);
}

export function check(model, { root = '.', strict = false, uncovered = false } = {}) {
  const bound = model.nodes.filter((node) => node.code);
  const diagnostics = [];
  const bindings = [];

  const needsWalk = bound.some((node) =>
    patternsOf(node).some((pattern) => /[*?{]/.test(pattern)),
  );
  const paths = needsWalk ? walk(root) : [];

  for (const node of bound) {
    for (const pattern of patternsOf(node)) {
      let count = 0;
      if (/[*?{]/.test(pattern)) {
        const expression = toRegExp(pattern.endsWith('/') ? pattern.slice(0, -1) : pattern);
        count = paths.filter((path) => expression.test(path.replace(/\/$/, ''))).length;
      } else if (existsSync(join(root, pattern))) {
        count = 1;
      }
      bindings.push({ node: node.id, pattern, count });
      if (count === 0) {
        diagnostics.push({ code: 'E400', line: node.line, token: node.id, hint: pattern });
      }
    }
  }

  if (uncovered) {
    const patterns = bound.flatMap((node) => patternsOf(node));
    const expressions = patterns.map((pattern) =>
      toRegExp(pattern.endsWith('/') ? pattern.slice(0, -1) : pattern),
    );
    const everything = paths.length ? paths : walk(root);
    for (const place of territory(root)) {
      const prefix = place.endsWith('/') ? place : `${place}`;
      const inside = everything.filter(
        (path) => path === place.replace(/\/$/, '') || path.startsWith(prefix),
      );
      const claimed = inside.some((path) =>
        expressions.some((expression) => expression.test(path.replace(/\/$/, ''))),
      );
      if (!claimed) diagnostics.push({ code: 'W401', line: 0, where: root, token: place });
    }
  }

  if (strict) {
    for (const node of model.nodes) {
      if (!node.code) diagnostics.push({ code: 'W400', line: node.line, token: node.id });
    }
  }

  return {
    diagnostics,
    bindings,
    coverage: { bound: bound.length, total: model.nodes.length },
  };
}
