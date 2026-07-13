# Excel Urun Import Runbook

Bu runbook, Dentech Pro katalogunu `imports/dentech_urunler_doldurulmus.xlsx` dosyasindan guvenli sekilde yeniden yuklemek icin hazirlanmistir.

## Dosya Konumu

Excel kaynak dosyasi:

- `imports/dentech_urunler_doldurulmus.xlsx`

Ana sekmeler:

- `01_PRODUCTS`
- `02_VARIANTS`
- `03_STOCK_UPDATE`
- `04_LISTS`
- `05_IMPORT_RULES`
- `06_JOTA_EXAMPLE`

## Dry-run Komutu

Varsayilan guvenli komut:

```bash
npm.cmd run import:products:dry
```

Bu komut:

- Excel sekmelerini ve kolonlarini okur
- Zorunlu alanlari dogrular
- Duplicate product / variant kodlarini kontrol eder
- Eksik fiyat / stok / gorsel / marka / kategori durumlarini raporlar
- JOTA grup mantigini kontrol eder
- Veritabaninda create / update / full-sync deactivate sayilarini hesaplar
- Veritabanina yazmaz

## Commit Komutu

Yalnizca acik onayla:

```bash
npm.cmd run import:products:commit
```

Bu komut:

- Kategorileri gerekli ise olusturur / gunceller
- Urunleri `product_group_code` ile upsert eder
- Varyantlari `variant_sku -> variant_code` ile upsert eder
- Kullanimda olan kategorileri aktif hale getirir
- Yazma islemi yapar

## Full Sync Notu

Varsayilan commit bile hard-delete yapmaz.

Excel disinda kalan eski kayitlari pasife cekmek isterseniz once dry-run ile full sync etkisini gorun:

```bash
node --experimental-strip-types scripts/import-products-from-xlsx.ts --dry-run --full-sync
```

Ardindan bilincli sekilde:

```bash
node --experimental-strip-types scripts/import-products-from-xlsx.ts --commit --full-sync
```

Full sync:

- Excel'de olmayan urunleri silmez
- Excel'de olmayan urun / varyantlari `is_active = false` yapabilir
- Gecmis request / order baglantilarini korur

## Hard-delete Neden Varsayilan Degil

- Gecmis talep ve siparis referanslarini bozma riski vardir
- Yanlis dosya veya eksik sekme butun katalogu kirabilir
- Soft deactivate daha geri donulebilir bir yoldur

## Validation Hatalari Nasil Okunur

Importer terminalde iki seviyede rapor verir:

- `ERROR`: commit oncesi duzeltilmesi gereken yapisal sorun
- `WARN`: veri kalitesini dusuren ama importu mutlaka bloklamayan durum

Tipik basliklar:

- `missing_product_group_code`
- `duplicate_product_group_code`
- `duplicate_variant_sku`
- `missing_variant_price`
- `missing_variant_stock`
- `missing_product_image`
- `unmatched_stock_row`
- `jota_grouping_missing_axes`

## JOTA Gruplama Mantigi

JOTA urunleri tekil urun degil, paket / aile mantigiyla ele alinir:

- `product_group_code`: paket kimligi
- `variant_sku`: renk / grit / cap varyanti

Ornek:

- Paket: `JOT-801-FG`
- Varyantlar:
  - `JOT-801-FG-BL-012`
  - `JOT-801-FG-RD-014`
  - `JOT-801-FG-GN-016`

Beklenen mantik:

- bir paket altinda birden fazla varyant olabilir
- renk / grit / cap kolonlari grup mantigini desteklemelidir
- varyant SKU, paket koduyla tutarli olmalidir

## Stok Guncelleme Mantigi

`03_STOCK_UPDATE` varsa importer bunu ek kontrol katmani olarak kullanir.

Eslesme anahtari:

- `variant_sku`

Davranis:

- `new_stock_quantity` doluysa varyant stok degerini override eder
- `stock_status` doluysa varyant stok durumunu override eder
- eslesmeyen satirlar terminalde acikca raporlanir
- sessizce ignore edilmez

## HTML Aciklama Notu

`description` alani Excel'den geldigi gibi korunur.

- inline CSS korunur
- script-benzeri bloklar strip edilmez
- ancak bu import gorevi scriptleri React icinde execute etmez

UI fazinda:

- script iceren HTML dogrudan execute edilmemeli
- gerekiyorsa sandboxed / izole render stratejisi kullanilmalidir

## Gorsel Notu

Importer:

- product `image_url`
- variant `image_url`

alanlarini korur ama dosya indirme yapmaz.

Supheli durumlar:

- bos image URL
- http/https disi deger
- media ama gorsel olmayan linkler

## Rollback Yaklasimi

Guvenli rollback icin:

1. Her zaman once dry-run alin
2. Commit oncesi terminal raporunu kaydedin
3. Gerekirse full sync kullanmayin
4. Yanlis batch olursa kayitlari silmek yerine pasife cekin
5. Buyuk importlardan once DB backup / snapshot alin

## Onerilen Operasyon Sirasi

1. Dry-run
2. Validation sorunlarini duzelt
3. Kucuk marka / kategori batch'iyle commit
4. Public katalog smoke test
5. Sonraki batch
