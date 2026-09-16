import { watch as observe, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, dirname, join } from 'node:path';
import { load } from '../load.mjs';
import { layout } from '../layout/index.mjs';
import { renderPage } from '../render/page.mjs';
import { format, countErrors } from '../diagnostics.mjs';
import { strings, statName } from '../i18n.mjs';

const reloader = `
<script>
(function () {
  let stamp = null;
  setInterval(function () {
    fetch('/version').then(function (response) { return response.text(); }).then(function (value) {
      if (stamp !== null && value !== stamp) location.reload();
      stamp = value;
    }).catch(function () {});
  }, 700);
})();
</script>
`;

function clock() {
  return new Date().toTimeString().slice(0, 8);
}

export function startWatch({ source, out, lang, serve, port }, io) {
  const s = strings(lang);

  const target =
    out || join(dirname(source), `${basename(source).replace(/\.truss$/i, '')}.html`);

  let page = '';
  let version = 0;

  const build = () => {
    try {
      const { model, diagnostics, path } = load(source);
      for (const diagnostic of diagnostics) io.error(format(diagnostic, { lang, path }));
      if (countErrors(diagnostics) > 0) return false;

      const diagram = layout(model);
      page = renderPage(diagram, model, { lang });
      writeFileSync(target, page, 'utf8');
      version += 1;
      io.log(
        `${clock()}  ${s.wrote} ${target} — ` +
          diagram.summary.map((entry) => `${entry.value} ${statName(entry.key, lang)}`).join(' · '),
      );
      return true;
    } catch (error) {
      io.error(`${clock()}  ${error.message}`);
      return false;
    }
  };

  build();

  let pending = null;
  const watcher = observe(source, () => {
    clearTimeout(pending);
    pending = setTimeout(build, 80);
  });

  let listener = null;
  if (serve) {
    const server = createServer((request, response) => {
      if (request.url === '/version') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end(String(version));
        return;
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(page.replace('</body>', `${reloader}</body>`));
    });
    listener = server.listen(port, '127.0.0.1', () => {
      io.log(`${s.serving} http://127.0.0.1:${port}`);
    });
  }

  io.log(`${s.watching} ${source}`);
  return {
    rebuild: build,
    close() {
      clearTimeout(pending);
      watcher.close();
      if (listener) listener.close();
    },
  };
}

export function watch(options, io) {
  const s = strings(options.lang);
  if (!options.source) {
    io.error(s.needSource);
    return 2;
  }
  const handle = startWatch(options, io);
  process.on('SIGINT', () => {
    handle.close();
    io.log(s.stopped);
    process.exit(0);
  });
  return 0;
}
