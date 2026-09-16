# tlk-truss

Durum, kararlar ve sıradaki işler: **DEVAM.md**. Bu dosya sadece komutlar ve kırmızı çizgiler.

## Komutlar

```
npm test                 # birim testleri
npm run test:browser     # sayfayı gerçek Edge'de sürer (CDP), Edge şart
npm run test:all         # ikisi birden
node bin/truss.mjs draw examples/payments.truss -o out/payments.html
node bin/truss.mjs check examples/payments.truss --ci
node bin/truss.mjs export examples/checkout.truss --to mermaid
node bin/truss.mjs import diagram.mmd
```

Görsel doğrulama (çıktıyı gözle görmeden "oldu" deme) — `scripts/browser-check.mjs` sayfayı açar,
tıklar, ekran görüntüsü alır, konsol hatalarını toplar:

```
node -e "const {open}=await import('./scripts/browser-check.mjs');
const p=await open('out/payments.html'); await p.shot('out/shot.png');
console.log(p.problems); await p.close();" --input-type=module
```

## Kırmızı çizgiler

- Dış bağımlılık yok, ağa çıkan kod yok, telemetri yok.
- Kullanıcıya görünen her metin `src/i18n.mjs` ya da `src/diagnostics.mjs` üzerinden; EN ve TR birlikte eklenir.
- Kaynak dilinde elle koordinat yok; yerleşim kusuru `src/layout/` içinde çözülür.
- `out/` gitmez, örnek çıktı depoya commit edilmez.
- Motor tarayıcıya tek kapsamda gömülüyor (`src/bundle.mjs`): üst düzey isimler dosyalar arasında eşsiz olmalı.
- Kaynak düzenleyen Python script'lerinde r-string kullan; ters eğik çizgili kaçış gerçek bayta dönüşüyor.
