# Contributing · Katkı

## English

The rules that matter here:

- **No dependencies.** Node's standard library is the whole toolbox, at build time and at runtime.
- **No network.** Neither the CLI nor the generated page may reach out, and CI checks the page.
- **Both languages, always.** Every string a user can see goes through `src/i18n.mjs` or
  `src/diagnostics.mjs`, with the English and the Turkish written in the same commit.
- **No manual coordinates.** If a diagram looks wrong, the fix belongs in `src/layout/`, not in a
  positioning attribute in the source language.
- **Claims come with numbers.** "Cleaner layout" is not a result; a lower measured crossing count is.

Run `npm test` before you push, and `npm run publish:check` before a release. `npm run test:browser` drives the generated page in a real browser
and needs Edge or Chrome; set `TRUSS_BROWSER` if yours lives somewhere unusual.

New top-level names must be unique across `src/`: the engine is concatenated into one scope when it
is inlined into the page.

## Türkçe

Burada önemli olan kurallar:

- **Bağımlılık yok.** Node'un standart kütüphanesi bütün alet çantası — hem derlemede hem çalışmada.
- **Ağ yok.** Ne CLI ne de üretilen sayfa dışarı çıkar; CI sayfayı bunun için denetler.
- **Her zaman iki dil.** Kullanıcının görebildiği her dize `src/i18n.mjs` ya da
  `src/diagnostics.mjs` üzerinden geçer, İngilizcesi ve Türkçesi aynı commit'te yazılır.
- **Elle koordinat yok.** Diyagram kötü görünüyorsa düzeltme `src/layout/` içindedir, kaynak
  dilindeki bir konum özniteliğinde değil.
- **İddia sayıyla gelir.** "Yerleşim iyileşti" sonuç değildir; ölçülmüş kesişme sayısının düşmesi
  sonuçtur.

Göndermeden önce `npm test`, sürüm çıkarmadan önce `npm run publish:check` çalıştır. `npm run test:browser` üretilen sayfayı gerçek tarayıcıda
sürer, Edge ya da Chrome ister; başka yerdeyse `TRUSS_BROWSER` ile yolunu ver.

Yeni üst düzey isimler `src/` genelinde eşsiz olmalı: motor sayfaya gömülürken tek kapsamda
birleşiyor.
