# tlk-truss — durum

Başlangıç: 16 Eylül 2026. Sıfırdan yazıldı, dış bağımlılık yok, kod tamamen bize ait.
Depo: `Talkdedsec/tlk-truss` (henüz sadece yerel git, uzak açılmadı). Lisans: PolyForm Noncommercial 1.0.0.
Ana dil İngilizce; Türkçe tam çeviri (CLI komutları, yardım, tanılar, sayfa arayüzü, README).

## Neden

archify (kurulu skill) elle JSON yazdırıyor, yerleşimi model onarıyor (`via`, `channelX`, `labelAt`),
çıktı donuk ve kodla hiçbir bağı yok. D2, Structurizr, likec4, Mermaid, Ilograph — hepsi güzel çiziyor,
hiçbiri diyagramın ne zaman bayatladığını bilmiyor. Öbür uçta dependency-cruiser/ArchUnit/deptrac kuralı
CI'da zorluyor ama sunulabilir çizim üretmiyor. Boşluk tam ortada: **anlatı diyagramı + koda bağlanma +
CI kapısı**. Konumumuz burası.

talk-graph'tan ayrı ürün: talk-graph mekanik grafı depodan çıkarır, truss insanın anlattığı hikâyeyi
çizer ve o hikâyeyi koda mühürler. Ortak paket yok, motor bu projede yeniden yazıldı.

## Bitti (v0.1 — özellikler tamam)

- **DSL** (`src/parse.mjs`): satır tabanlı, `title/flow/group/node` + `->` `~>` `<->`, `:` etiket,
  `key=value` öznitelik, `#` yorum. Her anahtar kelimenin Türkçe yazımı var, karışık kullanılabilir.
- **Model** (`src/model.mjs`): kimlik çakışması, bilinmeyen grup/uç, kendine bağlantı, tekrar eden
  bağlantı, bağlantısız düğüm, bilinmeyen tür — hepsi kodlu tanı (E1xx/E2xx/W3xx).
- **Tanılar** (`src/diagnostics.mjs`): kod → EN/TR metin. Yeni tanı eklerken iki dili de doldur.
- **Yerleşim** (`src/layout/`): DFS ile döngü kırma → topolojik katman atama → uzun kenarlara sanal
  düğüm → medyan sezgiseliyle sıralama + grup kümeleme (kesişme artmıyorsa kabul) → Fenwick ağacıyla
  kesişme sayımı → koordinat gevşetme → grup kutusundan yabancı düğüm itme.
- **Çizim** (`src/render/`): tek dosya HTML, gömülü SVG, koyu/açık tema, viewBox tabanlı pan/zoom,
  arama, düğüm ayrıntı paneli, SVG/PNG dışa aktarma, etiket çakışma çözümü, iki dilli arayüz.
- **Sapma kapısı** (`src/check.mjs` + `src/glob.mjs`): `code=` yolları glob ile eşleşiyor mu; eşleşmezse
  E400 ve exit 1. `--strict` bağsız düğümleri de işaretler. Kendi glob'umuz (`**`, `*`, `?`, `{a,b}`),
  node_modules/dist/target gibi dizinler taranmıyor.
- **CLI**: `draw|ciz`, `check|denetle`, `--lang`, `--json`, `--ci`, `--out/-o`, `--root/--kok`,
  `--strict/--kati`. Bilinmeyen komut exit 2, kaynak hatası exit 1.
- **Dört görünüm**: mimari, sekans (kendi yerleşimi: yaşam çizgisi + kaynak sırasıyla mesaj +
  kendine çağrı), veriakisi (varsayılan soldan sağa, kaynak/havuz eğik çokgen), durum (hap kutu,
  başlangıç noktası, bitiş halkası, kendine geçiş döngüsü). Kurallar görünüme göre: `W300`/`W301`
  sekans ve durumda susar.
- **Dışa aktarma** (`src/commands/export.mjs`): kendi stilini taşıyan standalone svg, dot, mermaid, json.
- **Mermaid içe aktarma** (`src/mermaid.mjs`): flowchart / sequenceDiagram / stateDiagram → .truss;
  subgraph, şekil, `-.->`, `|etiket|` korunur.
- **Kanvasta düzenleme**: motorun tamamı sayfaya gömülü (`src/bundle.mjs` import/export'ları sıyırıp
  tek IIFE üretiyor, ~45 KB). Düzenle modunda etiket/tür/grup/kod bağı/not değişir, düğüm ve bağlantı
  eklenir-silinir, her değişiklikte **yeniden yerleşir**. Kaynak kutusu canlı `.truss` metnini gösterir,
  yapıştırmayı kabul eder, dosyayı indirir. Ayrıştırılamayan değişiklik tanı koduyla reddedilir.
- **Tarayıcı koşucusu** (`scripts/browser-check.mjs`): Edge'i CDP ile sürer (WebSocket + fetch,
  bağımlılık yok); tıklama / JS değerlendirme / ekran görüntüsü + konsol hatası toplama.
- **57 birim + 6 tarayıcı testi**, hepsi yeşil.

Ölçüm (16 Eyl): örnek 8 düğüm / 10 kenar / 7 katman → **0 kesişme**; çıktı motorla birlikte 79 KB
tek dosya (motorsuz 22 KB).

## Tuzaklar / kararlar

- SVG'ye hem `width/height` hem `viewBox` verip üstüne `transform` ile zoom yapmak çifte ölçek
  yaratıyordu; pan/zoom artık **viewBox** üstünden.
- Grup kutusu üyesi olmayan düğümü yutuyordu → `pushOutsiders` pası (kutu aralığına giren yabancıyı
  dışarı it, sonra katmanda asgari boşluğu tazele).
- `src/auth/**` dizinin kendisini saymaz, altındakileri sayar — test beklentisi buna göre.
- Sayfa yükünde `<` karakteri kaçırılıyor; etiketten `</script>` ile çıkış kapalı (testi var).
- **Python heredoc'ta ters eğik çizgili kaçış yazma**: kabuk katmanı onu yiyip dosyaya gerçek NUL
  bastı, grep dosyayı ikili sandı. Ayraç gerekiyorsa `JSON.stringify([...])`, sanal düğüm öneki `#v`.
  Aynı tuzak Python'un kendi kaynağında da patlar; düzenleme script'lerinde r-string kullan.
- Paket motoru tek kapsamda birleştiği için **isim çakışması** patlatıyor (`arrows` iki dosyadaydı
  → `arrowFor`). Yeni modül eklerken üst düzey isimleri eşsiz tut.
- `node --test test/` Windows'ta "test" modülü sanıyor; `npm test` → `node --test test/*.test.mjs`,
  tarayıcı testi ayrı (`npm run test:browser`) çünkü Edge şart.

## Sıradaki

1. GitHub: depo **public** aç, CI (ubuntu+windows × node 20/22/24), CodeQL, depo-standart dosyaları.
2. Pages demosu: `docs/` altına örnek diyagramlar + anlatım sayfası.
3. npm yayını `@talkdedsec/tlk-truss` (org kapsamı, 2FA passkey → gerçek konsol penceresi gerekir).
4. README görselleri: dört görünümün ekran görüntüsü + düzenleme modu.
5. `truss watch`: kaynak değişince HTML'i tazele.
6. Kanvasta grup ekleme/silme (şu an düğüm ve bağlantı var, grup yalnız kaynaktan).

## Kırmızı çizgiler

- Dış bağımlılık yok (Node stdlib yeter). Çıktı ağa çıkmaz, telemetri yok, sürüm kontrolü için
  uzak sunucuya bağlanma yok.
- Kaynak dilinde elle koordinat yok. Yerleşim sorunu, yerleşim motorunda çözülür.
- Çıktıda ve kodda başka marka adı geçmez.
- Her kullanıcıya görünen metin i18n'den geçer; tek dilli dize eklenmez.
