# Urun Veri Hazirlik Denetimi

Bu dokuman, DENTech Pro katalogunun tam aktivasyonundan once urun kayitlarini temizlemek icin kullanilacak denetim listesidir.

- Bu adimda veri otomatik guncellenmez.
- Supabase tablo yapisi degistirilmez.
- Public katalog davranisi, fiyat gorunurlugu ve talep akisina dokunulmaz.
- Amac: sorunlu urunleri ve varyantlari sistematik olarak bulmak, sonra admin urun editorunden duzeltmektir.

## Gercek Veri Modeli

Uygulamanin mevcut tipleri ve sorgularina gore katalogta kullanilan ana tablolar:

- `public.products`
- `public.product_variants`
- `public.categories`

Ayri bir `brands` tablosu yoktur.
Ayri bir `usage_areas` tablosu yoktur.

### `public.products` alanlari

- `id`
- `brand`
- `category_id`
- `product_group_code`
- `product_name`
- `description`
- `usage_area`
- `target_user_type`
- `material_tags`
- `procedure_tags`
- `image_url`
- `is_active`
- `created_at`
- `updated_at`

### `public.product_variants` alanlari

- `id`
- `product_id`
- `variant_code`
- `manufacturer_ref`
- `ikas_product_id`
- `ikas_url`
- `connection_type`
- `iso_shank`
- `diameter`
- `length`
- `grit`
- `color`
- `package_quantity`
- `price`
- `currency`
- `stock_quantity`
- `reserved_quantity`
- `stock_status`
- `uts_no`
- `image_url`
- `is_active`
- `created_at`
- `updated_at`

### `public.categories` alanlari

- `id`
- `parent_id`
- `name`
- `slug`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

## Product Card icin gereken alanlar

- `products.product_name`
- `products.brand`
- `products.category_id` ve join ile `categories.name`
- `products.image_url` veya varyant bazli `product_variants.image_url`
- `products.is_active`
- En az bir aktif varyant:
  - `product_variants.id`
  - `product_variants.variant_code` veya `manufacturer_ref`
  - `product_variants.connection_type`
  - `product_variants.color`
  - `product_variants.diameter`
  - `product_variants.grit`
  - `product_variants.package_quantity`
- Ticari gorunum gerekiyorsa:
  - `product_variants.price`
  - `product_variants.currency`
  - `product_variants.stock_quantity`
  - `product_variants.stock_status`

## Product Detail icin gereken alanlar

- Product card alanlarinin tamami
- `products.description`
- `products.usage_area`
- `product_variants.manufacturer_ref`
- `product_variants.length`
- `product_variants.uts_no`
- Varyant secimi icin birden fazla aktif varyantin temiz ayrisabilmesi

## Aktivasyon Oncesi Zorunlu Alanlar

Bir urunun aktif ve lansmana hazir sayilmasi icin asgari olarak su alanlarin dolu olmasi onerilir:

- `products.product_name`
- `products.brand`
- `products.category_id`
- En az 1 aktif varyant
- Varyant icin `variant_code` veya anlamli `manufacturer_ref`
- Onayli hesaplar icin fiyat gosterilecekse `price`
- Stok mantigi kullanilacaksa `stock_quantity` ve `stock_status`
- Tercihen urun veya varyant gorseli
- Tercihen `description`

Aktivasyon karari oncesi ayri kontrol edilmesi gereken alanlar:

- `products.is_active`
- `categories.status`
- `product_variants.is_active`
- `product_variants.price`
- `product_variants.stock_quantity`
- `product_variants.stock_status`

## Hizli Denetim Akisi

1. Admin tarafinda urun listesini marka ve kategori bazli parcali kontrol edin.
2. Once aktif urunleri kontrol edin.
3. Sonra aktif olmayan ama tam gorunen kayitlari ayirin.
4. Eksik fiyatli varyantlari ayri listeleyin.
5. Gorselsiz urunleri kategori bazli temizleyin.
6. Cakisan SKU / referans kodlarini ayiklayin.

## SQL Kontrol Listesi

Asagidaki sorgular yalnizca denetim amaclidir.

### 1. Gorselsiz aktif urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand
from public.products p
where p.is_active = true
  and nullif(trim(coalesce(p.image_url, '')), '') is null
order by p.brand, p.product_name;
```

### 2. Markasi eksik aktif urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name
from public.products p
where p.is_active = true
  and nullif(trim(coalesce(p.brand, '')), '') is null
order by p.product_name;
```

### 3. Kategorisi eksik aktif urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand
from public.products p
where p.is_active = true
  and p.category_id is null
order by p.brand, p.product_name;
```

### 4. Aktif ama aktif varyanti olmayan urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand
from public.products p
where p.is_active = true
  and not exists (
    select 1
    from public.product_variants v
    where v.product_id = p.id
      and v.is_active = true
  )
order by p.brand, p.product_name;
```

### 5. SKU / referans bilgisi eksik varyantlar

```sql
select
  p.product_name,
  p.brand,
  v.id,
  v.variant_code,
  v.manufacturer_ref
from public.product_variants v
join public.products p on p.id = v.product_id
where v.is_active = true
  and nullif(trim(coalesce(v.variant_code, '')), '') is null
  and nullif(trim(coalesce(v.manufacturer_ref, '')), '') is null
order by p.brand, p.product_name;
```

### 6. Fiyati eksik aktif varyantlar

```sql
select
  p.product_name,
  p.brand,
  v.variant_code,
  v.manufacturer_ref,
  v.price,
  v.currency
from public.product_variants v
join public.products p on p.id = v.product_id
where v.is_active = true
  and p.is_active = true
  and v.price is null
order by p.brand, p.product_name, v.variant_code;
```

### 7. Stok bilgisi eksik aktif varyantlar

```sql
select
  p.product_name,
  p.brand,
  v.variant_code,
  v.stock_quantity,
  v.stock_status
from public.product_variants v
join public.products p on p.id = v.product_id
where v.is_active = true
  and p.is_active = true
  and (
    v.stock_quantity is null
    or v.stock_status is null
  )
order by p.brand, p.product_name, v.variant_code;
```

### 8. Duplicate SKU / referans degerleri

```sql
with normalized as (
  select
    v.id,
    v.product_id,
    nullif(trim(coalesce(v.variant_code, '')), '') as variant_code,
    nullif(trim(coalesce(v.manufacturer_ref, '')), '') as manufacturer_ref
  from public.product_variants v
)
select
  source_type,
  code_value,
  count(*) as duplicate_count
from (
  select 'variant_code' as source_type, variant_code as code_value
  from normalized
  where variant_code is not null

  union all

  select 'manufacturer_ref' as source_type, manufacturer_ref as code_value
  from normalized
  where manufacturer_ref is not null
) codes
group by source_type, code_value
having count(*) > 1
order by duplicate_count desc, code_value asc;
```

### 9. Supheli derecede uzun urun adlari

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  char_length(p.product_name) as name_length,
  p.brand
from public.products p
where char_length(coalesce(p.product_name, '')) >= 120
order by name_length desc, p.product_name asc;
```

### 10. Aciklamasi eksik urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand
from public.products p
where nullif(trim(coalesce(p.description, '')), '') is null
order by p.brand, p.product_name;
```

### 11. Pasif ama buyuk olcude hazir urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  count(*) filter (where v.is_active = true) as active_variant_count
from public.products p
left join public.product_variants v on v.product_id = p.id
where p.is_active = false
  and nullif(trim(coalesce(p.brand, '')), '') is not null
  and p.category_id is not null
  and nullif(trim(coalesce(p.image_url, '')), '') is not null
group by p.id, p.product_group_code, p.product_name, p.brand
having count(*) filter (where v.is_active = true) > 0
order by p.brand, p.product_name;
```

### 12. Aktif ama lansmana hazir olmayan kayitlar

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  p.category_id,
  p.image_url,
  count(*) filter (where v.is_active = true) as active_variant_count,
  count(*) filter (where v.is_active = true and v.price is null) as active_variants_without_price
from public.products p
left join public.product_variants v on v.product_id = p.id
where p.is_active = true
group by p.id, p.product_group_code, p.product_name, p.brand, p.category_id, p.image_url
having
  nullif(trim(coalesce(p.brand, '')), '') is null
  or p.category_id is null
  or count(*) filter (where v.is_active = true) = 0
  or count(*) filter (where v.is_active = true and v.price is null) > 0
order by p.brand, p.product_name;
```

### 13. Varyanti var ama talep edilebilir varyanti olmayan urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  count(*) filter (where v.is_active = true) as active_variant_count,
  count(*) filter (
    where v.is_active = true
      and v.price is not null
      and v.stock_quantity > 0
  ) as requestable_variant_count
from public.products p
left join public.product_variants v on v.product_id = p.id
where p.is_active = true
group by p.id, p.product_group_code, p.product_name, p.brand
having
  count(*) filter (where v.is_active = true) > 0
  and count(*) filter (
    where v.is_active = true
      and v.price is not null
      and v.stock_quantity > 0
  ) = 0
order by p.brand, p.product_name;
```

### 14. Tum aktif varyantlarinda fiyat eksik olan urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  count(*) filter (where v.is_active = true) as active_variant_count
from public.products p
join public.product_variants v on v.product_id = p.id
where p.is_active = true
group by p.id, p.product_group_code, p.product_name, p.brand
having
  count(*) filter (where v.is_active = true) > 0
  and count(*) filter (where v.is_active = true and v.price is not null) = 0
order by p.brand, p.product_name;
```

### 15. Kart veya detay gorunumu eksik hissedebilecek urunler

```sql
select
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  p.category_id,
  p.image_url,
  p.description,
  p.usage_area,
  count(*) filter (where v.is_active = true) as active_variant_count,
  count(*) filter (
    where v.is_active = true
      and nullif(trim(coalesce(v.variant_code, '')), '') is not null
  ) as active_variants_with_code,
  count(*) filter (
    where v.is_active = true
      and (
        nullif(trim(coalesce(v.variant_code, '')), '') is not null
        or nullif(trim(coalesce(v.manufacturer_ref, '')), '') is not null
      )
  ) as active_variants_with_identifier
from public.products p
left join public.product_variants v on v.product_id = p.id
where p.is_active = true
group by
  p.id,
  p.product_group_code,
  p.product_name,
  p.brand,
  p.category_id,
  p.image_url,
  p.description,
  p.usage_area
having
  nullif(trim(coalesce(p.image_url, '')), '') is null
  or nullif(trim(coalesce(p.description, '')), '') is null
  or nullif(trim(coalesce(p.usage_area, '')), '') is null
  or count(*) filter (where v.is_active = true) = 0
  or count(*) filter (
    where v.is_active = true
      and (
        nullif(trim(coalesce(v.variant_code, '')), '') is not null
        or nullif(trim(coalesce(v.manufacturer_ref, '')), '') is not null
      )
  ) = 0
order by p.brand, p.product_name;
```

## Admin Uzerinden Temizlik Onceligi

Urun editoru mevcutsa su sira ile ilerleyin:

1. Marka
2. Kategori
3. Urun adi
4. Aciklama
5. Urun gorseli
6. Aktif varyantlar
7. SKU / referans
8. Fiyat
9. Stok
10. Varyant gorseli
11. Kullanim alani

## UI Hazirlik Notlari

Mevcut public UI tarafinda dusuk riskli korumalar uygulanmistir:

- Bos marka rozeti artik gosterilmez.
- Uzun basliklar iki satirda tutulur.
- Fiyati olmayan varyantlar "eklenebilir" gibi davranmaz.
- Detay sayfasinda jenerik durum rozeti yerine anlamli kullanim alani tercih edilir.
- Fiyati hazir olmayan varyantlar daha temiz bir durum mesaji ile gosterilir.

## Son Karar Kriteri

Bir urun grubunu aktif etmeden once en az su sorulara "evet" denmelidir:

- Kartta ne oldugu anlasiliyor mu?
- Detay sayfasinda varyant secimi net mi?
- SKU / referans gorunur mu?
- Fiyat mantigi dogru rolde dogru calisiyor mu?
- Gorsel veya fallback durumu kabul edilebilir mi?
- Eksik alanlar teknik goruntu olusturmuyor mu?

## Not

Bu dokuman mevcut tip tanimlari ve uygulama sorgularina gore guncellenmistir. Bu turda canli veritabani satirlari degistirilmemis, aktivasyon yapilmamis ve bulk update uygulanmamistir.
