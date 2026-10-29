(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add('js');

  const TR = {
    'skip': 'İçeriğe geç', 'nav.views': 'Dört görünüm', 'nav.source': 'Kaynak', 'nav.ci': 'CI’da', 'nav.install': 'Kurulum',
    'hero.over': 'Kod olarak diyagram · dört görünüm · tek dosya HTML',
    'hero.h': 'Yalan söylediği anda <em>derlemeyi düşüren</em> mimari diyagramlar.',
    'hero.lede': 'Her kod-olarak-diyagram aracı metni resme çevirir. Hiçbiri resmin ne zaman yalan söylemeye başladığını söyleyemez. truss her düğümü depodaki bir yola bağlar; o yol yok olduğunda truss check derlemeni düşürür.',
    'd.aria': 'Kayma demosu', 'd.repo': 'depo', 'd.hint': 'Bir klasörü sil, çizime bak.', 'd.reset': 'Depoyu geri yükle', 'd.del': 'sil',
    'd.ok': 'her kod bağı çözülüyor', 'd.bound': 'düğüm koda bağlı', 'd.bad': 'bağ artık çözülmüyor', 'd.match': 'yoluna bağlı, hiçbir şeyle eşleşmiyor',
    'v.over': '01 — Dört görünüm', 'v.h': 'Ekran görüntüsü değil, gerçek çıktı. Kaydır, ara, Düzenle’ye bas.',
    'v.arch': 'Mimari', 'v.seq': 'Sekans', 'v.flow': 'Veri akışı', 'v.life': 'Yaşam döngüsü', 'v.open': 'tam sayfa aç ↗',
    's.over': '02 — Kaynak', 's.h': 'İncelenebilir metin. <em>Koordinat yok.</em>',
    's.p': 'Yerleşim otomatik ve hep öyle: döngüler kırılır, katmanlar atanır, kesişmeler sayılıp azaltılır, grup kutuları ait olmayan düğümlerden uzaklaştırılır. Elle yerleştirmen gereken bir diyagram, kimsenin güncellemediği bir diyagramdır.',
    's.call': 'bir çağrı', 's.async': 'asenkron bir mesaj', 's.code': 'bağ: bir yol ya da glob', 's.tr': 'her anahtar kelimenin Türkçe yazımı da var',
    'c.over': '03 — CI’da', 'c.1h': 'İş akışında tek satır', 'c.2h': 'Ya da action', 'c.3h': 'Soruyu tersine çevir',
    'c.3p': '--strict hiç bağı olmayan düğümleri işaretler. --uncovered hangi klasörü hiçbir diyagramın sahiplenmediğini sorar; birden çok kaynak birlikte kontrol edilir, kapsam birleşimleridir.',
    'k.over': '04 — Komutlar', 'k.draw': 'tek dosya HTML diyagram çizer', 'k.check': 'her kod bağının hâlâ çözüldüğünü doğrular', 'k.import': 'Mermaid’i .truss kaynağına çevirir', 'k.watch': 'her kayıtta yeniden çizer, --serve tarayıcıyı yeniler',
    'n.unit': 'birim testi', 'n.browser': 'sayfayı gerçek tarayıcıda süren test', 'n.deps': 'çalışma zamanı bağımlılığı, Node 20+', 'n.speed': '250 düğüm ve 369 bağlantıyı yerleştirme süresi',
    'n.note': 'Hız asla sorun değil; okunabilirlik sorun. Kabaca otuz düğümden sonra resim hiçbir şey anlatmaz; hikâyeyi birkaç diyagrama böl.',
    'i.over': '05 — Kurulum', 'i.h': 'Tek paket. <em>Derleme adımı yok.</em>',
    'i.p': 'Diyagram başına tek HTML dosyası: ağ çağrısı yok, koyu ve açık tema, kaydırma ve yakınlaştırma, arama, düğüm başına detay paneli, SVG ve PNG dışa aktarma.',
    'i.lic': '<a href="https://github.com/Talkdedsec/tlk-truss/blob/main/LICENSE">PolyForm Noncommercial 1.0.0</a> altında ticari olmayan kullanım için ücretsiz. İşte mi kullanıyorsun? <a href="https://github.com/Talkdedsec/tlk-truss/blob/main/COMMERCIAL.md">COMMERCIAL.md</a>’ye bak.',
    'copy': 'Kopyala', 'copied': 'Kopyalandı', 'foot.log': 'Değişiklikler', 'foot.sec': 'Güvenlik'
  };
  const EN = { 'd.del': 'delete', 'd.ok': 'every code binding resolves', 'd.bound': 'nodes bound to code', 'd.bad': 'binding(s) no longer resolve', 'd.match': 'which matches nothing', 'copied': 'Copied' };
  // the same card lines scripts/build-docs.mjs used to print
  const VIEWS = {
    architecture: ['Services, stores and boundaries. Every box that owns code carries the path it owns.', 'Servisler, depolar ve sınırlar. Kod sahibi olan her kutu, sahip olduğu yolu taşıyor.'],
    sequence: ['One checkout, message by message, in the order the source lists them.', 'Tek bir ödeme akışı, mesaj mesaj, kaynakta sıralandığı düzende.'],
    dataflow: ['A pipeline read left to right; sources and sinks are drawn slanted.', 'Soldan sağa okunan bir hat; kaynaklar ve hedefler eğik çiziliyor.'],
    lifecycle: ['What an order can be, including the state that loops back on itself.', 'Bir siparişin olabileceği haller, kendine geri dönen durum dahil.']
  };
  let lang = 'en', view = 'architecture';
  const t = k => (lang === 'tr' ? TR[k] : EN[k]) ?? '';
  const orig = new Map();
  const keep = (el, a, get) => { if (!orig.has(el)) orig.set(el, {}); const o = orig.get(el); if (!(a in o)) o[a] = get(); return o[a]; };
  function applyLang(l) {
    lang = l; root.lang = l;
    const tr = k => l === 'tr' ? TR[k] : undefined;
    $$('[data-i18n]').forEach(el => { const en = keep(el, 't', () => el.textContent); el.textContent = tr(el.dataset.i18n) ?? en; });
    $$('[data-i18n-html]').forEach(el => { const en = keep(el, 'h', () => el.innerHTML); el.innerHTML = tr(el.dataset.i18nHtml) ?? en; });
    $$('[data-i18n-aria]').forEach(el => { const en = keep(el, 'a', () => el.getAttribute('aria-label')); el.setAttribute('aria-label', tr(el.dataset.i18nAria) ?? en); });
    $('.vdesc').textContent = VIEWS[view][l === 'tr' ? 1 : 0];
    renderTree(); runCheck();
    // the embedded diagrams read this key, so they follow the page language
    try { localStorage.setItem('tlk-truss-lang', l); localStorage.setItem('truss-lang', l); } catch {}
    const fr = $('.frame iframe'); if (fr.contentWindow) fr.src = view + '.html';
  }
  $('.lang').addEventListener('click', () => applyLang(lang === 'en' ? 'tr' : 'en'));
  addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 8), { passive: true });

  /* ---------- drift demo: bindings from examples/payments.truss ---------- */
  const BIND = [
    { node: 'web', glob: 'apps/web/**', dir: 'apps/web/', line: 5 },
    { node: 'api', glob: 'services/api/**', dir: 'services/api/', line: 6 },
    { node: 'pay', glob: 'services/payment/**', dir: 'services/payment/', line: 7 }
  ];
  const TREE = ['apps/web/', 'services/api/', 'services/payment/', 'docs/architecture.truss', 'package.json'];
  const gone = new Set();
  function renderTree() {
    $('.files').innerHTML = TREE.map(f => `<li class="${gone.has(f) ? 'gone' : ''}"><span>${f}</span>${f.endsWith('/') ? `<button class="x" type="button" data-f="${f}" aria-label="${t('d.del')} ${f}">${t('d.del')}</button>` : ''}</li>`).join('');
  }
  $('.files').addEventListener('click', e => { const b = e.target.closest('.x'); if (!b) return; gone.add(b.dataset.f); renderTree(); runCheck(true); });
  $('.reset').addEventListener('click', () => { gone.clear(); renderTree(); runCheck(true); });
  function runCheck() {
    const broken = BIND.filter(b => gone.has(b.dir));
    $$('.node').forEach(n => n.classList.toggle('drift', broken.some(b => b.node === n.dataset.n)));
    const out = $('.ci-out');
    const lines = broken.length
      ? [...broken.map(b => [`✗ docs/architecture.truss:${b.line}  E400  "${b.node}" ${lang === 'tr' ? `${b.glob} ${t('d.match')}` : `is bound to ${b.glob}, ${t('d.match')}`}`, 'bad']),
        [`${broken.length} ${t('d.bad')}`, 'dim'], ['$ echo $?', 'dim'], ['1', 'bad']]
      : [[`✓ ${t('d.ok')} — ${BIND.length}/5 ${t('d.bound')}`, 'good'], ['$ echo $?', 'dim'], ['0', 'good']];
    out.innerHTML = lines.map(([s, c]) => `<li class="${c}">${s.replace(/[&<>]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]))}</li>`).join('');
  }

  /* ---------- views ---------- */
  const tabs = $$('.vtabs [role="tab"]'), frame = $('.frame iframe'), open = $('.open');
  function pick(tab) {
    view = tab.dataset.v;
    tabs.forEach(x => { const on = x === tab; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    frame.src = view + '.html'; open.href = view + '.html';
    $('.vdesc').textContent = VIEWS[view][lang === 'tr' ? 1 : 0];
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => pick(tab));
    tab.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; pick(n); n.focus();
    });
  });

  /* ---------- copy + reveals ---------- */
  $$('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.previousElementSibling.textContent); } catch { return; }
    b.textContent = t('copied'); b.classList.add('ok');
    setTimeout(() => { b.textContent = lang === 'tr' ? TR.copy : 'Copy'; b.classList.remove('ok'); }, 1400);
  }));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  let saved = null;
  try { saved = localStorage.getItem('tlk-truss-lang'); } catch {}
  const q = new URLSearchParams(location.search).get('lang');
  applyLang(q === 'tr' || q === 'en' ? q : saved || (/^tr\b/i.test(navigator.language) ? 'tr' : 'en'));
})();
