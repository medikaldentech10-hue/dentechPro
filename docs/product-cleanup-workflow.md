# Urun Temizlik Is Akisi

Bu dokuman, DENTech Pro urun katalog aktivasyonundan once uygulanacak gunluk temizlik surecini tanimlar.

- Bu surecte urun verisi otomatik guncellenmez.
- Aktivasyon karari ancak manuel kontrol ve smoke test sonrasi verilir.
- Her parti kucuk tutulur.

## 1. Gunluk Temizlik Sureci

1. Sabah ilk is olarak `docs/product-data-readiness.md` icindeki SQL denetimlerini calistir.
2. Bugun temizlenecek marka veya urun grubunu sec.
3. Sorunlu urunleri uc listeye ayir:
   - hizli duzeltilebilir
   - gorsel bekliyor
   - fiyat / stok bekliyor
4. Admin urun editorunden urun bazli duzeltmeleri yap.
5. Varyantlari tek tek kontrol et.
6. Hazir urunleri "ready to activate" listesine al, ama bu turda otomatik acma.
7. Gun sonunda kisa bir QA turu yap.

## 2. Urun Bazli Checklist

Her urun icin:

- Urun adi temiz ve okunur mu?
- Marka dogru mu?
- Kategori dogru mu?
- `product_group_code` mantikli mi?
- Aciklama var mi?
- `usage_area` dolu mu?
- Urun gorseli var mi?
- Kartta kullanilan alanlar eksik mi?
- Detay sayfasinda teknik cop veri gorunur mu?
- En az bir aktif varyant var mi?

## 3. Varyant Bazli Checklist

Her aktif varyant icin:

- `variant_code` dolu mu?
- `manufacturer_ref` varsa dogru mu?
- `connection_type` dogru mu?
- `diameter`, `grit`, `color`, `length` alanlari mantikli mi?
- `package_quantity` dogru mu?
- `price` dolu mu?
- `currency` dogru mu?
- `stock_quantity` mantikli mi?
- `stock_status` dogru mu?
- Varyant gorseli gerekiyorsa var mi?
- Public kart veya detayda varyant secimi anlasilir mi?

## 4. Gorsel Kontrol Kurallari

- Urun gorseli yoksa once urun bazli `image_url` kontrol edilir.
- Urun gorseli zayif ama varyant gorseli gucluyse `product_variants.image_url` da kontrol edilir.
- Kirma, beyaz fon kaybi veya anlamsiz crop varsa aktivasyon ertelenir.
- Ayni urun ailesinde farkli varyantlar tamamen alakasiz gorseller kullaniyorsa duzeltilmeden acilmaz.

## 5. Fiyat / Stok / SKU Kurallari

- `variant_code` veya `manufacturer_ref` olmadan aktif varyant birakilmaz.
- Fiyati olmayan aktif varyant publicte temiz gorunse bile launch-ready sayilmaz.
- `stock_quantity = 0` olan varyant aktif kalabilir, ama teklif akisi icin anlamli olmasi gerekir.
- `stock_status` ile `stock_quantity` birbiriyle celismemelidir.
- Duplicate SKU veya ref tespit edilirse aktivasyon durdurulur.

## 6. Kategori / Marka Kurallari

- `brand` zorunludur.
- Ayri `brands` tablosu olmadigi icin spelling tutarliligi manuel korunmalidir.
- `category_id` dolu olmalidir.
- `categories.status` aktif degilse publicte o kategori davranisi tekrar kontrol edilmelidir.
- `usage_area` arama ve detay deneyimini destekliyorsa doldurulmasi tavsiye edilir.

## 7. Aktivasyon Karar Kurallari

### Ready to activate

- Urun adi, marka, kategori tamam
- En az bir aktif varyant var
- SKU veya ref anlamli
- Fiyat hazir
- Stok mantigi temiz
- Kart ve detay gorunumu kabul edilebilir

### Needs data cleanup

- Ad, marka, kategori, aciklama veya kullanim alani eksik
- Teknik alanlar karisik veya anlamsiz
- Varyant ayristirma yetersiz

### Needs image

- Urun gorseli yok
- Varyant gorseli yok ve fallback zayif
- Gorsel dogru urunu temsil etmiyor

### Needs price

- Tum aktif varyantlarda fiyat eksik
- Fiyat var ama para birimi veya varyant mantigi sorunlu

### Keep inactive

- Aktif varyant yok
- Duplicate SKU / ref var
- Urun ailesi yanlis birlesiyor
- Kart veya detay sayfasi guven vermiyor

## 8. Onerilen Temizlik Sirasi

1. JOTA
2. iCrown
3. Xpect Vision RVG
4. D'Cam / cihazlar
5. HuLaser
6. Olcu materyalleri
7. Kalan urunler

Bu sirada her marka veya grup kucuk partilere bolunmelidir.

## 9. Parti Sonrasi Smoke Test

Her batch icin:

1. `/products`
2. `/products?page=2`
3. Logged-out katalog
4. Approved katalog
5. Exact SKU search
6. En az bir multi-variant urun
7. En az bir aciklamali urun
8. En az bir eksik alanli urun
9. Talep listesine ekleme
10. Urun detayindan varyant degistirme

## 10. Admin Readiness View Onerisi

Bu turda uygulanmadi. Ancak dusuk riskli bir sonraki adim olarak faydali olabilir.

### Onerilen kolonlar

- Marka
- Kategori
- Urun adi
- Grup kodu
- Aktif varyant sayisi
- Fiyatli varyant sayisi
- Stoklu varyant sayisi
- Gorsel durumu
- Aciklama durumu
- Readiness status
- Eksik alanlar

### Onerilen filtreler

- Marka
- Kategori
- Aktif / pasif
- Ready / not ready
- Gorselsiz
- Fiyatsiz
- Varyantsiz

### Readiness status mantigi

- Hazir
- Fiyat eksik
- Gorsel eksik
- Varyant eksik
- Kategori / marka eksik
- Inceleme gerekli

### Neden simdi build edilmedi

- Mevcut amac once kurallari ve SQL denetimlerini netlestirmekti.
- Veri aktivasyonu henuz baslamadigi icin once manuel cleanup sureci daha dusuk riskli.
- Sonraki asamada admin sayfasinda bu sorgularin ozetlenmesi faydali olabilir.
