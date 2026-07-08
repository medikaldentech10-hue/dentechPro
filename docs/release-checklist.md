# Dentech Pro Release Checklist

Bu listeyi production deploy oncesi adim adim takip edin. Her maddeyi `Gecti` veya `Kaldi` olarak isaretleyin. Kritik engel maddelerinden biri kalirsa deploy durdurulmalidir.

## 1. Public Sayfalar
- [ ] `/` aciliyor, hero alani, header, footer ve kategori kartlari duzgun gorunuyor.
- [ ] `/products` aciliyor, liste bos kalmiyor ve ekran tasmasi olmuyor.
- [ ] `/products/[id]` urun detay sayfasi aciliyor, gorsel ve aciklama alani duzgun.
- [ ] `/nasil-calisir` aciliyor ve CTA butonlari dogru sayfalara gidiyor.

## 2. Auth ve Rol Yonlendirmeleri
- [ ] Logged-out kullanici `/request` acmaya calistiginda login akisina yonleniyor.
- [ ] Pending kullanici fiyat veya talep aksiyonu gerektiren alanlarda onay bekleme akisina yonleniyor.
- [ ] Suspended kullanici uygun bilgilendirme ekranina yonleniyor.
- [ ] Admin rotalari sadece admin kullanici ile aciliyor.

Kritik engel:
- Farkli rol ile korunmasi gereken sayfaya erisim saglanabiliyorsa deploy durdur.

## 3. Fiyat Gorunurlugu
- [ ] Logged-out kullanici urun karti ve detay sayfasinda fiyat gormuyor.
- [ ] Pending kullanici fiyat ve talep listesine ekleme aksiyonlarini gormuyor.
- [ ] Approved kullanici fiyatlari ve talep listesine ekleme aksiyonlarini goruyor.
- [ ] Admin ve sales rolleri beklenen fiyat gorunurlugunu koruyor.

Kritik engel:
- Herhangi bir public HTML veya client ekranda fiyat sizintisi varsa deploy durdur.

## 4. Katalog ve Arama
- [ ] `/products` varsayilan liste hizli aciliyor.
- [ ] Arama kutusu URL'deki `q` degeri ile senkron gorunuyor.
- [ ] Filtreler degistiginde sonuc listesi yenileniyor.
- [ ] Sayfalama ileri/geri dogru calisiyor.
- [ ] Exact SKU aramasi `JOT-801-FG-010` benzeri tam kodlarda dogru urunu buluyor.
- [ ] Bos sonuc durumunda yardimci metin ve aksiyon butonlari duzgun gorunuyor.

## 5. Urun Detayi ve Varyant Gecisi
- [ ] Varyant secimi urun detayinda dogru bilgiyi gosteriyor.
- [ ] Urun aciklamasi varsa render ediliyor, yoksa fallback metin gorunuyor.
- [ ] Public ve pending kullanici fiyat gormuyor.
- [ ] Approved kullanici icin talep listesine ekle aksiyonu calisiyor.

## 6. Talep Akisi
- [ ] `/request` sayfasinda aktif taslak ilk bakista ana alan olarak gorunuyor.
- [ ] Urun adedi artirma/azaltma dogru calisiyor.
- [ ] Urun silme ve liste temizleme aksiyonlari calisiyor.
- [ ] Talep notu ve odeme tercihi alanlari kaybolmuyor.
- [ ] Talep WhatsApp akisi dogru basliyor.

Kritik engel:
- Talep gonderme akisi calismiyorsa deploy durdur.

## 7. Admin Kullanicilar
- [ ] `/admin/users` aciliyor, arama ve filtreler korunuyor.
- [ ] Kullanici rolu degistiriliyor, kaydediliyor ve sayfa yenilenince kalici gorunuyor.
- [ ] Approve, reject, suspend ve reactivate aksiyonlari calisiyor.
- [ ] Pending ve kaydetme durumlari butonlarda anlasilir gorunuyor.

Kritik engel:
- Approve/reject/reactivate veya rol kaydetme bozuksa deploy durdur.

## 8. Admin Talepler
- [ ] `/admin/requests` aciliyor, filtreler ve sayfalama calisiyor.
- [ ] Talep detayi aciliyor.
- [ ] Hizli aksiyon butonlari dogru calisiyor.
- [ ] PDF indirme linki erisilebilir durumda.

## 9. Admin Urunler
- [ ] `/admin/products` aciliyor.
- [ ] Arama, kategori ve aktif/pasif filtreleri calisiyor.
- [ ] Liste ve detay gecisleri duzgun.

## 10. PDF ve CSV
- [ ] Teklif PDF'i indiriliyor ve REQ numarasi ile musteriyi ilgilendiren temiz icerik gosteriyor.
- [ ] Admin CSV export indiriliyor.
- [ ] CSV Excel'de sutunlara ayrilmis aciliyor.
- [ ] Turkce karakterler bozulmadan gorunuyor.

Kritik engel:
- PDF veya CSV bozuksa deploy durdur.

## 11. Mobile Kontrol
- [ ] `/products` mobilde yatay tasma yapmiyor.
- [ ] Urun kartlari okunabilir ve ana CTA'lar rahat tiklaniyor.
- [ ] Urun detayinda varyant ve talep aksiyonlari rahat kullaniliyor.
- [ ] `/request` adet butonlari ve gonder butonu rahat tiklaniyor.
- [ ] Login ve register ekranlari mobilde temiz gorunuyor.

## 12. Deploy ve Geri Donus
- [ ] Son `npm.cmd run lint` gecti.
- [ ] Son `npm.cmd exec tsc -- --noEmit` gecti.
- [ ] Son production build gecti veya bilinen engel notu kaydedildi.
- [ ] Production env degiskenleri dogrulandi.
- [ ] Deploy sonrasi temel smoke test rotalari kontrol edildi.
- [ ] Geri donulecek son stabil deployment not edildi.
