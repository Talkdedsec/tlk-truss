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

## Bitti (v0.1 çekirdek)

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
- **38 test** (`node --test`), hepsi yeşil. Görsel doğrulama: `examples/payments.truss` headless Edge
  ile ekran görüntüsü alınarak gözle kontrol edildi.

Ölçüm (16 Eyl): örnek 8 düğüm / 10 kenar / 7 katman → **0 kesişme**, çıktı 22 KB tek dosya.

## Tuzaklar / kararlar

- `node --test test/` Windows'ta patlıyor ("test" modülü sanıyor) → `node --test` (otomatik keşif).
- SVG'ye hem `width/height` hem `viewBox` verip üstüne `transform` ile zoom yapmak çifte ölçek
  yaratıyordu; pan/zoom artık **viewBox** üstünden.
- Grup kutusu üyesi olmayan düğümü yutuyordu → `pushOutsiders` pası (kutu aralığına giren yabancıyı
  dışarı it, sonra katmanda asgari boşluğu tazele).
- `src/auth/**` dizinin kendisini saymaz, altındakileri sayar — test beklentisi buna göre.
- Sayfa yükü `JSON.stringify` sonrası `<` → `<`; etiketten `</script>` kaçışı kapalı (testi var).

## Sıradaki

1. Sekans görünümü (`view sequence`) — aynı kaynaktan, yaşam çizgisi + mesaj sırası.
2. Veri akışı ve durum görünümleri.
3. Kanvas düzenleme: tarayıcıda sürükle/yeniden adlandır → DSL'e geri yazma.
4. Mermaid içe aktarma (`truss import`): flowchart/sequence/state → .truss.
5. `truss export` (svg/png/dot/mermaid) CLI tarafı.
6. GitHub: depo public, Pages demosu, CI (ubuntu+windows × node 20/22/24), npm yayını.

## Kırmızı çizgiler

- Dış bağımlılık yok (Node stdlib yeter). Çıktı ağa çıkmaz, telemetri yok, sürüm kontrolü için
  uzak sunucuya bağlanma yok.
- Kaynak dilinde elle koordinat yok. Yerleşim sorunu, yerleşim motorunda çözülür.
- Çıktıda ve kodda başka marka adı geçmez.
- Her kullanıcıya görünen metin i18n'den geçer; tek dilli dize eklenmez.
