# tlk-truss

Gerçek koda bağlı mimari diyagramlar.

Metinden diyagram üreten araçların hepsi resmi çiziyor. Hiçbiri resmin ne zaman yalan söylemeye
başladığını söyleyemiyor. `truss` her düğümü depodaki bir yola bağlar ve o yol kaybolduğunda
derlemeni kırar.

```
$ truss denetle docs/mimari.truss --ci --lang tr
✗ docs/mimari.truss:14  E400  "ledger" düğümü src/ledger/** yoluna bağlı, hiçbir şeyle eşleşmiyor
1 bağ artık çözülmüyor
$ echo $?
1
```

English: [README.md](README.md)

## Durum

v0.1 sürüyor. Çekirdek çalışıyor ve test edildi: kaynak dili, mimari görünümü, ölçülü yerleşim
motoru, tek dosyalık HTML çıktısı ve sapma kapısı. Sekans, veri akışı ve durum görünümleri, kanvas
düzenleme ve Mermaid içe aktarma sırada.

## Kurulum

Node 20 ve üstü, çalışma zamanı bağımlılığı yok.

```
npm install -g @talkdedsec/tlk-truss
```

Ya da doğrudan depodan:

```
node bin/truss.mjs ciz examples/payments.truss
```

## Kaynak

```
baslik  Ödeme Platformu
akis    asagi

grup edge "Uç"
grup core "Çekirdek servisler"

dugum web  "Vitrin"    icinde=edge tur=istemci kod=apps/web/**
dugum api  "API Geçidi" icinde=core tur=servis  kod=services/api/**
dugum pay  "Ödeme"      icinde=core tur=servis  kod=services/payment/**
dugum bus  "Olay yolu"  icinde=core tur=kuyruk
dugum bank "Banka"                  tur=dis     not="üçüncü taraf"

web -> api : REST
api -> pay : tahsilat
pay ~> bus : payment.captured
pay -> bank : provizyon
```

- `->` çağrı, `~>` eşzamansız mesaj
- Bağlantıdan sonra gelen `:` etiketi taşır
- `tur=` şunlardan biri: `servis`, `depo`, `kuyruk`, `altyapi`, `istemci`, `dis`, `gorev`
- `kod=` bağdır: bir yol ya da glob; virgülle birden fazla verilebilir
- `#` yorum satırı başlatır

Her anahtar kelimenin İngilizce yazımı da geçerli (`title`, `group`, `node`, `in=`, `kind=`,
`code=`); ikisi aynı dosyada karışık kullanılabilir.

## Komutlar

```
truss ciz     <kaynak.truss> [-o cikti.html]   tek dosyalık HTML diyagram çizer
truss denetle <kaynak.truss> [--kok .]         her kod bağının çözüldüğünü doğrular
```

İkisi de `--lang en|tr`, `--json` ve `--ci` alır. `denetle`, bir bağ çözülmediğinde 1 ile çıkar —
bir CI işinin ihtiyacı olan tek şey bu:

```yaml
- run: npx @talkdedsec/tlk-truss denetle docs/mimari.truss --ci
```

Hiç bağı olmayan düğümleri de işaretlemek için `--kati` ekle.

## Çizim

Tek HTML dosyası, ağ çağrısı yok, derleme adımı yok. Koyu ve açık tema, kaydırma ve yakınlaştırma,
arama, her düğüm için bağını gösteren ayrıntı paneli, SVG/PNG dışa aktarma. "Güzel oldu" demez, ne
yaptığını sayıyla söyler: düğüm, kenar, katman sayısı ve ölçülmüş kenar kesişmesi altta durur.

Yerleşim otomatiktir ve öyle kalır: döngüler kırılır, katmanlar atanır, sıralama medyan
sezgiseliyle seçilir, kesişmeler Fenwick ağacıyla sayılır, koordinatlar düz çizgiye doğru gevşetilir
ve grup kutuları üyesi olmayan düğümlerin dışına itilir. Kaynak dilinde elle koordinat yoktur, çünkü
elle yerleştirilen diyagramı kimse güncellemez.

## Lisans

PolyForm Noncommercial 1.0.0 — kullanımı serbest, satışı değil. Bkz. [LICENSE](LICENSE).
