import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from '../src/load.mjs';
import { layout } from '../src/layout/index.mjs';
import { renderPage } from '../src/render/page.mjs';

const pages = [
  { source: 'examples/payments.truss', file: 'architecture.html', view: 'architecture' },
  { source: 'examples/checkout.truss', file: 'sequence.html', view: 'sequence' },
  { source: 'examples/events.truss', file: 'dataflow.html', view: 'dataflow' },
  { source: 'examples/order-state.truss', file: 'lifecycle.html', view: 'lifecycle' },
];

const copy = {
  architecture: [
    'Architecture',
    'Services, stores and boundaries. Every box that owns code carries the path it owns.',
  ],
  sequence: ['Sequence', 'One checkout, message by message, in the order the source lists them.'],
  dataflow: ['Data flow', 'A pipeline read left to right; sources and sinks are drawn slanted.'],
  lifecycle: ['Lifecycle', 'What an order can be, including the state that loops back on itself.'],
};

// Turkish for the same cards; the page switches with the reader's language.
const copyTr = {
  architecture: [
    'Mimari',
    'Servisler, depolar ve sınırlar. Kod sahibi olan her kutu, sahip olduğu yolu taşıyor.',
  ],
  sequence: ['Sekans', 'Tek bir ödeme akışı, mesaj mesaj, kaynakta sıralandığı düzende.'],
  dataflow: ['Veri akışı', 'Soldan sağa okunan bir hat; kaynaklar ve hedefler eğik çiziliyor.'],
  lifecycle: ['Yaşam döngüsü', 'Bir siparişin olabileceği haller, kendine geri dönen durum dahil.'],
};

const out = 'docs';
mkdirSync(out, { recursive: true });

for (const page of pages) {
  const { model } = load(page.source);
  writeFileSync(join(out, page.file), renderPage(layout(model), model), 'utf8');
}

const cards = pages
  .map((page) => {
    const [title, line] = copy[page.view];
    const [titleTr, lineTr] = copyTr[page.view];
    return `  <article>
    <h2 data-tr="${titleTr}">${title}</h2>
    <p data-tr="${lineTr}">${line}</p>
    <iframe src="${page.file}" title="${title}" loading="lazy"></iframe>
    <a href="${page.file}" data-tr="Tek başına aç →">Open it on its own →</a>
  </article>`;
  })
  .join('\n');

const index = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-tr="tlk-truss — gerçek koda bağlı mimari diyagramlar">tlk-truss — architecture diagrams bound to real code</title>
<style>
:root { --canvas:#0b0f14; --surface:#161b22; --line:#2f3742; --text:#e6edf3; --muted:#8b949e; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--canvas); color: var(--text); padding: 0 20px 64px;
  font: 15px/1.6 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
main { max-width: 1040px; margin: 0 auto; }
header { padding: 64px 0 28px; border-bottom: 1px solid var(--line); }
h1 { margin: 0 0 8px; font-size: 30px; letter-spacing: -.01em; }
.lede { color: var(--muted); max-width: 62ch; margin: 0; }
pre { background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px 16px; overflow-x: auto; font-size: 13px; }
code { font-family: ui-monospace, Consolas, monospace; }
section { margin-top: 44px; }
h2 { font-size: 19px; margin: 0 0 4px; }
article { margin-top: 34px; }
article p { color: var(--muted); margin: 0 0 12px; }
iframe { width: 100%; height: 520px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--canvas); }
a { color: #4c9aff; }
article a { display: inline-block; margin-top: 8px; font-size: 14px; }
footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--line);
  color: var(--muted); font-size: 14px; }
@media (max-width: 640px) { iframe { height: 420px; } header { padding-top: 40px; } }
.lang-toggle { position: fixed; top: 14px; right: 14px; z-index: 20; cursor: pointer;
  font: 600 12px/1 ui-monospace, Consolas, monospace; letter-spacing: .08em; padding: 9px 12px;
  border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--text); }
.lang-toggle:hover { border-color: var(--muted); }
</style>
</head>
<body>
<main>
<header>
  <h1>tlk-truss</h1>
  <p class="lede" data-tr="Gerçek koda bağlı mimari diyagramlar. Aşağıdaki çizimler aracın kendi çıktısı — her biri tek bir HTML dosyası, ağ yok, derleme adımı yok. Herhangi birinde &lt;b&gt;Düzenle&lt;/b&gt;&#x27;ye bas: motorun tamamı sayfanın içinde geliyor, sen değiştirdikçe diyagram kendini yeniden yerleştiriyor.">Architecture diagrams bound to real code. The drawings below are the tool's own
  output — one HTML file each, no network, no build step. Press <b>Edit</b> inside any of them:
  the whole engine ships in the page, so the diagram lays itself out again as you change it.</p>
</header>

<section>
  <h2 data-tr="Başka kimsenin yapmadığı kısım">The part nobody else does</h2>
  <p class="lede" data-tr="Her düğüm temsil ettiği kodu adıyla gösterebilir. O kod taşındığında ya da silindiğinde diyagram bir resim olmaktan çıkıp başarısız bir build&#x27;e dönüşüyor.">Every node can name the code it stands for. When that code moves or disappears,
  the diagram stops being a picture and starts being a failing build.</p>
  <pre><code>$ truss check docs/architecture.truss --ci
✗ docs/architecture.truss:14  E400  "ledger" is bound to src/ledger/**, which matches nothing
1 binding(s) no longer resolve
$ echo $?
1</code></pre>
</section>

<section>
  <h2 data-tr="Dört görünüm">The four views</h2>
${cards}
</section>

<footer>
  <a href="https://github.com/Talkdedsec/tlk-truss" data-tr="GitHub'da kaynak kodu">Source on GitHub</a> ·
  PolyForm Noncommercial 1.0.0 ·
  <a href="https://github.com/Talkdedsec/tlk-truss/blob/main/README.tr.md" data-tr="Türkçe README">Türkçe</a>
</footer>
</main>
<button class="lang-toggle" type="button" hidden></button>
<script>
// English is the page's source text; translated elements carry their Turkish in
// data-tr. Shares the diagram pages' key, so one choice covers the whole site.
(() => {
  const KEY = 'truss-lang';
  const root = document.documentElement;
  const nodes = [...document.querySelectorAll('[data-tr]')];
  nodes.forEach((n) => (n.dataset.en = n.innerHTML));
  const toggle = document.querySelector('.lang-toggle');
  const apply = (lang) => {
    root.lang = lang;
    nodes.forEach((n) => (n.innerHTML = lang === 'tr' ? n.dataset.tr : n.dataset.en));
    toggle.textContent = lang === 'tr' ? 'EN' : 'TR';
    toggle.lang = lang === 'tr' ? 'en' : 'tr';
    toggle.setAttribute('aria-label', lang === 'tr' ? 'Switch to English' : 'Türkçeye geç');
  };
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch {}
  if (lang !== 'en' && lang !== 'tr')
    lang = (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  apply(lang);
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    lang = lang === 'tr' ? 'en' : 'tr';
    try { localStorage.setItem(KEY, lang); } catch {}
    apply(lang);
  });
})();
</script>
</body>
</html>
`;

writeFileSync(join(out, 'index.html'), index, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');
console.log(`docs/ built: ${pages.length + 1} pages`);
