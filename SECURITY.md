# Security · Güvenlik

## English

### What the tool touches

`truss` reads the `.truss` source you give it and, for `check`, walks the directory tree under
`--root` to match the code bindings. It writes only to the output path. It makes no network
requests, and neither does the HTML it generates.

### What ends up in the output

The generated page embeds node labels, notes, links and the code binding patterns — the paths you
wrote in the source, never file contents. The engine is inlined so the page can lay itself out
again after an edit; it is the same code you can read in `src/`.

### Reporting a problem

Use GitHub's private vulnerability reporting on this repository, or write to
**talkdedsec@proton.me**. Please include the source that triggers it. You get an answer within a
few days.

## Türkçe

### Araç neye dokunuyor

`truss` verdiğin `.truss` kaynağını okur; `denetle` için `--kok` altındaki dizin ağacını gezip kod
bağlarını eşleştirir. Yalnızca çıktı yoluna yazar. Ağa istek atmaz, ürettiği HTML de atmaz.

### Çıktıya ne giriyor

Üretilen sayfa düğüm etiketlerini, notları, bağlantıları ve kod bağı desenlerini — yani kaynakta
yazdığın yolları — gömer, dosya içeriğini asla. Motor sayfaya gömülüdür ki düzenleme sonrası
yeniden yerleşebilsin; o motor `src/` altında okuyabildiğin kodun aynısıdır.

### Sorun bildirme

Bu depoda GitHub'ın özel güvenlik bildirimi akışını kullan ya da **talkdedsec@proton.me** adresine
yaz. Tetikleyen kaynağı eklersen iyi olur. Birkaç gün içinde cevap alırsın.
