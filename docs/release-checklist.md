# Dentech Pro Release Checklist

## 1. Public Rotalar
- `/` hızlı açılıyor mu?
- `/products` liste ve filtreler düzgün çalışıyor mu?
- `/products/[id]` ürün detayı ve varyant seçimi sorunsuz mu?
- `/nasil-calisir` ve diğer kamuya açık sayfalar normal açılıyor mu?

## 2. Auth / Rol Kontrolü
- Giriş yapılmamış kullanıcı fiyat göremiyor mu?
- Pending kullanıcı fiyat ve talep listesi erişimi alamıyor mu?
- Approved kullanıcı fiyatları görebiliyor mu?
- Admin ve sales kullanıcı özel yetkilerini koruyor mu?

## 3. Fiyat Görünürlüğü
- Logged-out kullanıcıya profesyonel giriş mesajı gösteriliyor mu?
- Pending kullanıcıya onay sonrası erişim mesajı gösteriliyor mu?
- Approved kullanıcıda fiyat, stok ve talep aksiyonları normal mi?

## 4. Ürün / Katalog
- Arama, filtre ve sayfalama çalışıyor mu?
- Boş sonuç ekranında yardımcı metin görünüyor mu?
- Gerekliyse “Filtreleri Temizle” çalışıyor mu?
- Exact SKU araması doğru ürünü buluyor mu?

## 5. Ürün Detayı
- Görsel, başlık ve açıklama alanı düzgün mü?
- Varyant değişimi hızlı ve doğru mu?
- Talep listesine ekleme sonrası sayfada kalıyor mu?
- Başarı mesajı ve “Talep Listesine Git” akışı düzgün mü?

## 6. Talep Akışı
- `/request` açılıyor mu?
- Adet artırma / azaltma doğru çalışıyor mu?
- Ürün silme ve liste temizleme normal mi?
- WhatsApp ile gönderme akışı bozulmadan çalışıyor mu?

## 7. Admin Akışı
- `/admin` ve alt sayfalar açılıyor mu?
- Kullanıcı rol düzenleme kalıcı mı?
- Approve / reject / reactivate akışları çalışıyor mu?
- Admin ekranlarında console warning kalmadı mı?

## 8. PDF / CSV
- Teklif PDF’i açılıyor ve indiriliyor mu?
- CSV export doğru kolonlarla açılıyor mu?
- Türkçe karakterler Excel’de bozulmadan görünüyor mu?

## 9. Mobil Kontrol
- `/products` kartları ve filtreleri taşmadan görünüyor mu?
- Ürün detayında varyant ve CTA butonları rahat tıklanıyor mu?
- `/request` miktar butonları mobilde rahat kullanılabiliyor mu?
- Login / register formları mobilde temiz görünüyor mu?

## 10. Deployment / Geri Dönüş
- Production env değerleri doğru mu?
- Son build başarıyla alındı mı?
- Deploy sonrası temel rotalar hızlı smoke test edildi mi?
- Geri dönüş için önceki stabil deployment not edildi mi?
