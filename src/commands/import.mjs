import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fromMermaid } from '../mermaid.mjs';
import { parse } from '../parse.mjs';
import { build } from '../model.mjs';
import { format, countErrors } from '../diagnostics.mjs';
import { strings, statName } from '../i18n.mjs';

export function importDiagram({ source, out, lang }, io) {
  const s = strings(lang);
  if (!source) {
    io.error(s.needSource);
    return 2;
  }

  const { text, diagnostics } = fromMermaid(readFileSync(source, 'utf8'));
  for (const diagnostic of diagnostics) io.error(format(diagnostic, { lang, path: source }));
  if (countErrors(diagnostics) > 0) return 1;

  const title = basename(source).replace(/\.(mmd|mermaid|md|txt)$/i, '');
  const body = `title  ${title}\n${text}\n`;

  const rebuilt = build(parse(body).spec);
  const failed = [...parse(body).diagnostics, ...rebuilt.diagnostics].filter((entry) =>
    entry.code.startsWith('E'),
  );
  for (const diagnostic of failed) io.error(format(diagnostic, { lang, path: source }));
  if (failed.length) return 1;

  const target = out || join(dirname(source), `${title}.truss`);
  writeFileSync(target, body, 'utf8');
  io.log(`${s.wrote} ${target}`);
  io.log(
    `  ${rebuilt.model.nodes.length} ${statName('nodes', lang)} · ` +
      `${rebuilt.model.edges.length} ${statName('edges', lang)}`,
  );
  return 0;
}
