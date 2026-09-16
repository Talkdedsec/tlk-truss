import { dirname, resolve } from 'node:path';
import { load } from '../load.mjs';
import { check as inspect } from '../check.mjs';
import { format, countErrors, describe } from '../diagnostics.mjs';
import { strings } from '../i18n.mjs';

export function check({ source, root, lang, json, ci, strict }, io) {
  const s = strings(lang);
  if (!source) {
    io.error(s.needSource);
    return 2;
  }

  const { model, diagnostics, path } = load(source);
  const base = resolve(root || model.root || dirname(path));
  const result = inspect(model, { root: base, strict });
  const all = [...diagnostics, ...result.diagnostics];
  const errors = countErrors(all);

  if (json) {
    io.log(
      JSON.stringify(
        {
          source: path,
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
