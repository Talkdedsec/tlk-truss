import { dirname, resolve } from 'node:path';
import { load } from '../load.mjs';
import { check as inspect } from '../check.mjs';
import { format, countErrors, describe } from '../diagnostics.mjs';
import { strings } from '../i18n.mjs';

export function check({ source, sources, root, lang, json, ci, strict, uncovered }, io) {
  const s = strings(lang);
  const files = sources && sources.length ? sources : source ? [source] : [];
  if (!files.length) {
    io.error(s.needSource);
    return 2;
  }

  const loaded = files.map((file) => load(file));
  const base = resolve(root || loaded[0].model.root || dirname(loaded[0].path));
  const united = { nodes: loaded.flatMap((entry) => entry.model.nodes) };
  const result = inspect(united, { root: base, strict, uncovered });
  const all = [...loaded.flatMap((entry) => entry.diagnostics), ...result.diagnostics];
  const errors = countErrors(all);
  const path = loaded.length === 1 ? loaded[0].path : files.join(', ');

  if (json) {
    io.log(
      JSON.stringify(
        {
          sources: files,
          root: base,
          ok: errors === 0,
          coverage: result.coverage,
          bindings: result.bindings,
          diagnostics: all.map((entry) => ({ ...entry, message: describe(entry, lang) })),
        },
        null,
        2,
      ),
    );
    return errors === 0 ? 0 : 1;
  }

  for (const diagnostic of all) {
    io.error(format(diagnostic, { lang, path }));
    if (ci && diagnostic.code.startsWith('E')) return 1;
  }

  if (errors === 0) {
    const { bound, total } = result.coverage;
    io.log(`✓ ${s.checkPassed} — ${bound}/${total} ${s.statBound}`);
    return 0;
  }
  io.error(`${errors} ${s.checkFailed}`);
  return 1;
}
