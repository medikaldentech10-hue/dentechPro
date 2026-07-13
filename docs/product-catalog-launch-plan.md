# Urun Katalog Aktivasyon Plani

Bu plan, DENTech Pro katalogunun kontrollu bicimde tam aktivasyona alinmasi icin hazirlanmistir.

- Hedef: tum urunleri bir anda acmak yerine veri kalitesi dogrulandikca kademeli acmak
- Bu plan veri migrasyonu degildir
- Aktivasyon karari manuel QA sonrasi verilmelidir

## 1. Aktivasyon Oncesi Zorunlu Veri Alanlari

Her urun icin:

- Urun adi
- Marka
- Kategori
- Anlamli urun grubu / grup kodu
- Tercihen aciklama
- Tercihen urun gorseli

Her aktif varyant icin:

- Variant / SKU kodu veya manufacturer ref
- Paket bilgisi
- Gerekliyse cap / baglanti / renk / grit
- Fiyat
- Para birimi
- Stok miktari
- Stok durumu
- Aktiflik durumu

## 2. Product Card Checklist

- Baslik iki satiri asmadan okunabiliyor mu?
- Bos marka rozeti gorunmuyor mu?
- Kategori anlamsiz kisalmadan okunuyor mu?
- Varyant oldugu anlasiliyor mu?
- Fiyati olmayan varyantlar yanlis CTA gostermiyor mu?
- Logged-out / pending kullanici fiyat gormuyor mu?
- Approved kullanici fiyati ve talep aksiyonunu dogru goruyor mu?

## 3. Product Detail Checklist

- Urun adi birinci bakista okunuyor mu?
- Marka / kategori / kullanim alani net mi?
- SKU ve ref bilgisi teknik ama temiz sekilde gorunuyor mu?
- Varyant secimi mobil ve desktopta rahat mi?
- Fiyati olmayan varyant acik sekilde ayrisiyor mu?
- Eksik alanlar teknik cop metin gibi gorunmuyor mu?
- Aciklama varsa okunakli, yoksa temiz fallback ile gorunuyor mu?

## 4. Fiyat Gorunurlugu Checklist

- Logged-out kullanici fiyat gormuyor
- Pending kullanici fiyat gormuyor
- Approved / admin / sales kullanici fiyat goruyor
- Public HTML tarafinda fiyat leak yok
- Fiyati eksik varyant "Talep listesine ekle" gibi yaniltici davranmiyor
- TODO: JOTA unit/pack pricing later 5'li frez ve 2'li polisher paket kurallarina gore hesaplanip gosterilmeli.

## 5. Variant / SKU Checklist

- Her aktif varyantta anlamli SKU veya ref var
- Duplicate SKU / ref degerleri kontrol edildi
- Secili varyant urun detayinda URL ile uyumlu
- Exact SKU search kirilmadi
- Paket, tip, cap, grit gibi teknik alanlar sadece varsa gorunuyor

## 6. Gorsel Checklist

- Kartta urun gorseli varsa net ve kirpilmamis
- Gorsel yoksa fallback kabul edilebilir
- Detay sayfasinda ana gorsel bos alan hissi vermiyor
- Varyant gorseli varsa ana gorsel seciminde kullaniliyor

## 7. Kademeli Aktivasyon Sirasi

### Faz 1 - JOTA

- Mevcut acik grup
- Faz 1 sonrasi checklist ile tekrar smoke test

### Faz 2 - iCrown

- Pedodonti urunleri
- SKU, varyant ve fiyat temizligi once tamamlanmali

### Faz 3 - RVG / cihaz urunleri

- Teknik aciklama ve gorsel kontrolu daha kritik
- Yanlis veya eksik varyant baglantilari bu fazda engellenmeli

### Faz 4 - Olcu materyalleri

- Kullanim alani ve paket bilgisi net olmali
- Kategori ve arama etiketleri kontrol edilmeli

### Faz 5 - Kalan urunler

- Yukaridaki gruplarda ogrenilen kurallar uygulanarak son toplu acilis yapilmali

## 8. Aktivasyon Adimlari

1. SQL denetim raporlarini calistir
2. Sorunlu urunleri marka / kategori bazli ayir
3. Admin urun editorunde kritik alanlari duzelt
4. Uygun urunleri aktif et
5. Public katalogta smoke test yap
6. Rol bazli fiyat gorunurlugunu dogrula
7. Add-to-request davranisini kontrol et
8. Sonra bir sonraki urun grubuna gec

## 9. Rollback Plani

Bir urun kaydi sorunlu cikarsa:

1. Ilgili urunu veya sorunlu varyanti admin panelinden pasife al
2. Fiyat / stok / SKU / gorsel kaydini duzelt
3. Public kart ve detay sayfasini tekrar kontrol et
4. Exact SKU search testini yeniden calistir
5. Yalnizca duzelen kaydi yeniden aktif et

## 10. Manual QA Akisi

Her aktivasyon dalgasindan sonra:

1. `/products`
2. `/products?page=2`
3. Logged-out katalog
4. Approved katalog
5. En az bir multi-variant urun detayi
6. En az bir fiyatsiz varyant
7. Exact SKU search
8. Talep listesine ekleme
9. `/request`

Kontrol sorulari:

- Kartlar duzgun mu?
- Fiyat gorunurlugu rol bazli dogru mu?
- Varyant secimi hizli ve dogru mu?
- Teknik alanlar anlasilir mi?
- Eksik veriler cirkin fallback uretiyor mu?

## 11. Kritik Bloklayicilar

Asagidakiler varsa ilgili grup aktive edilmemeli:

- Price leak
- Exact SKU search kirilmasi
- Add-to-request hatasi
- Duplicate SKU / ref nedeniyle yanlis urune gitme
- Urun detayinda tamamen anlamsiz veya teknik cop veri gosterimi
- Gorsel / varyant / fiyat kombinasyonu nedeniyle yaniltici katalog karti

## 12. Operasyon Notu

Ilk tam aktivasyondan once butun urunleri acmak yerine marka veya kategori bazli kucuk partilerle ilerlemek daha guvenlidir. Bu sayede hem veri temizligi hem de public katalog davranisi geri donusu kolay sekilde kontrol edilebilir.
