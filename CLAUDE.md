# tlk-truss

Durum, kararlar ve sıradaki işler: **DEVAM.md**. Bu dosya sadece komutlar ve kırmızı çizgiler.

## Komutlar

```
node --test                                  # tüm testler
node bin/truss.mjs draw examples/payments.truss -o out/payments.html
node bin/truss.mjs check examples/payments.truss --ci
```

Görsel doğrulama (çıktıyı gözle görmeden "oldu" deme):

```
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --force-device-scale-factor=2 --window-size=1280,760 \
  --screenshot="$(cygpath -w "$PWD/out/shot.png")" "file:///$(cygpath -w "$PWD/out/payments.html")"
```

## Kırmızı çizgiler

- Dış bağımlılık yok, ağa çıkan kod yok, telemetri yok.
- Kullanıcıya görünen her metin `src/i18n.mjs` ya da `src/diagnostics.mjs` üzerinden; EN ve TR birlikte eklenir.
- Kaynak dilinde elle koordinat yok; yerleşim kusuru `src/layout/` içinde çözülür.
- `out/` gitmez, örnek çıktı depoya commit edilmez.
