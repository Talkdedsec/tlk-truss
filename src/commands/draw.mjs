import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { load } from '../load.mjs';
import { layout } from '../layout/index.mjs';
import { renderPage } from '../render/page.mjs';
import { format, countErrors } from '../diagnostics.mjs';
import { strings, statName } from '../i18n.mjs';

export function draw({ source, out, lang, json }, io) {
  const s = strings(lang);
  if (!source) {
    io.error(s.needSource);
    return 2;
  }

  const { model, diagnostics, path } = load(source);
  for (const diagnostic of diagnostics) {
    io.error(format(diagnostic, { lang, path }));
  }
  if (countErrors(diagnostics) > 0) return 1;

  const diagram = layout(model);
  const target = out || join(dirname(path), `${basename(path).replace(/\.truss$/i, '')}.html`);
  writeFileSync(target, renderPage(diagram, model, { lang }), 'utf8');

  if (json) {
    io.log(JSON.stringify({ output: target, view: model.view, ...diagram.stats }, null, 2));
    return 0;
  }

  io.log(`${s.wrote} ${target}`);
  io.log(
    `  ${diagram.summary.map((entry) => `${entry.value} ${statName(entry.key, lang)}`).join(' · ')}`,
  );
  return 0;
}
