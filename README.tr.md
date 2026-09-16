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

v0.1 sürüyor; özellikleri tamam ve test edildi: dört görünüm, ölçülü yerleşim motoru, tek dosyalık
HTML çıktısı ve içindeki canlı düzenleme, sapma kapısı, dışa aktarıcılar ve Mermaid içe aktarma.
Kalan iş paketleme — CI, yayınlanan demo ve npm sürümü.

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

- `gorunum` şunlardan biri: `mimari`, `sekans`, `veriakisi`, `durum`
- `->` çağrı, `~>` eşzamansız mesaj
- Bağlantıdan sonra gelen `:` etiketi taşır
- `tur=` şunlardan biri: `servis`, `depo`, `kuyruk`, `altyapi`, `istemci`, `dis`, `gorev`
- `kod=` bağdır: bir yol ya da glob; virgülle birden fazla verilebilir
- `#` yorum satırı başlatır

Her anahtar kelimenin İngilizce yazımı da geçerli (`title`, `group`, `node`, `in=`, `kind=`,
`code=`); ikisi aynı dosyada karışık kullanılabilir.

## Dört görünüm

| `gorunum` | Ne çizer | Ne değişir |
|---|---|---|
| `mimari` | servisler, depolar, sınırlar | gruplu kutular, yukarıdan aşağı katmanlar |
| `sekans` | tek bir akış, mesaj mesaj | yaşam çizgileri, kaynak sırasıyla mesajlar, kendine çağrı |
| `veriakisi` | bir boru hattı | soldan sağa, kaynak ve havuz eğik çizilir |
| `durum` | bir durum makinesi | hap kutular, başlangıç noktası, bitiş halkası, kendine geçiş döngüsü |

İlk üçü tek yerleşim motorunu paylaşır, sekansın kendi motoru vardır. Bir durum kendini gösterebilir,
sekansta aynı ikili iki kez konuşabilir — kurallar görünüme göre işler.

## Komutlar

```
truss ciz       <kaynak.truss> [-o cikti.html]   tek dosyalık HTML diyagram çizer
truss denetle   <kaynak.truss> [--kok .]         her kod bağının çözüldüğünü doğrular
truss disaaktar <kaynak.truss> --bicim svg|dot|mermaid|json
truss iceaktar  <diyagram.mmd>                   Mermaid'i .truss kaynağına çevirir
```

`iceaktar`, Mermaid `flowchart`, `sequenceDiagram` ve `stateDiagram` kaynaklarını okur; alt grafları,
şekilleri, ok biçimlerini ve kenar etiketlerini korur ve depoya girebilecek bir kaynak yazar.

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

Hiçbir şey donuk değil. **Düzenle**'ye bas, sayfa editöre dönüşür: düğümü yeniden adlandır, türünü,
grubunu ya da kod bağını değiştir, düğüm ve bağlantı ekle ya da sil. Her değişiklikte motorun tamamı
— sayfanın içinde duruyor — yeniden çalışır ve diyagram gözünün önünde yeniden yerleşir. **Kaynak**
düğmesi `.truss` metnini canlı gösterir, yapıştırılanı geri alır ve dosyayı kaydeder. Ayrıştırılamayan
bir değişiklik tanı koduyla reddedilir, çizime dokunulmaz.

Yerleşim otomatiktir ve öyle kalır: döngüler kırılır, katmanlar atanır, sıralama medyan
sezgiseliyle seçilir, kesişmeler Fenwick ağacıyla sayılır, koordinatlar düz çizgiye doğru gevşetilir
ve grup kutuları üyesi olmayan düğümlerin dışına itilir. Kaynak dilinde elle koordinat yoktur, çünkü
elle yerleştirilen diyagramı kimse güncellemez.

## Lisans

PolyForm Noncommercial 1.0.0 — kullanımı serbest, satışı değil. Bkz. [LICENSE](LICENSE).
