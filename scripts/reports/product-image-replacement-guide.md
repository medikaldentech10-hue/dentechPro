# Dentech Pro Product Image Replacement Guide

Generated from `scripts/reports/product-image-audit.csv`.

## Replacement Asset Standard

- Use transparent WebP or PNG.
- Use a square 1:1 canvas.
- Prefer minimum 1000x1000 px when possible.
- Center the product with consistent padding.
- Keep the visual product-only.
- Do not include text, watermark, logo overlays, shadows baked into a white box, or any background.
- For grouped JOTA families, create one family-level image when the products share the same physical shape.
- For visually distinct grits/colors, create variant-level assets only when the distinction is meaningful in the catalog.

## Workflow

1. Start from `product-image-replacement-priority.csv`.
2. Replace high-priority grouped family images first.
3. Then fix common search products for 014, 881, 881F, 881SG, zirkonya, and elmas-frezler.
4. Fill missing product images before polishing variant-only images.
5. Convert non-square or white-canvas assets into transparent 1:1 WebP files.
6. Keep replacement filenames lowercase, ASCII-only, hyphen-separated, and stable.
7. Do not upload or write database values until the replacement assets are reviewed.

## Top 20 Replacement Priorities

| Priority | Product | Issue | Recommended asset |
| --- | --- | --- | --- |
| 1 | Jota Z801L Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya Uzun Boyunlu Yuvarlak Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z801l-family.webp |
| 2 | Jota Z818 Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya Disk Form Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z818-family.webp |
| 3 | Jota Z850 Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya İnce Konik Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z850-family.webp |
| 4 | Jota 881F Elmas Frez - Kırmızı Kuşak (İnce) Silindirik Düz Uç Finishing Frezi | likely_non_transparent_or_white_canvas|duplicate_image_url | jota-881-family.webp |
| 5 | Jota 881SG Elmas Frez - Siyah Kuşak (Süper Kaba) Silindirik Düz Uç Agresif Preparasyon Frezi | likely_non_transparent_or_white_canvas|duplicate_image_url | jota-881-family.webp |
| 6 | Jota Z801L Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya Uzun Boyunlu Yuvarlak Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z801l-blue-elmas-frez.webp |
| 7 | Jota Z818 Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya Disk Form Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z818-blue-elmas-frez.webp |
| 8 | Jota Z850 Zirkonya Elmas Frez - Mavi Kuşak (Standard) Zirkonya İnce Konik Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-z850-blue-elmas-frez.webp |
| 9 | Jota 881F Elmas Frez - Kırmızı Kuşak (İnce) Silindirik Düz Uç Finishing Frezi | likely_non_transparent_or_white_canvas|duplicate_image_url | jota-881-f-elmas-frez.webp |
| 10 | Jota 881SG Elmas Frez - Siyah Kuşak (Süper Kaba) Silindirik Düz Uç Agresif Preparasyon Frezi | likely_non_transparent_or_white_canvas|duplicate_image_url | jota-881-sg-black-elmas-frez.webp |
| 11 | Z850 Zirkonya Elmas Frez | missing_product_image|missing_variant_image | jota-z850-zirkonya-elmas-frez-elmas-frez.webp |
| 12 | Jota 558 Elmas Frez - Mavi Kuşak (Standard) Silindirik Uzun Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-558-family.webp |
| 13 | Jota 558F Elmas Frez - Kırmızı Kuşak (İnce) Silindirik Uzun Finishing Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-558-family.webp |
| 14 | Jota 834 Elmas Frez - Mavi Kuşak (Lamine) Mikro Silindirik Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-834-family.webp |
| 15 | Jota 837LG Elmas Frez - Yeşil Kuşak (Kaba) Uzun Silindirik Hızlı Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-837l-family.webp |
| 16 | Jota 850 Elmas Frez - Mavi Kuşak (Standard) İnce Konik Genel Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-850-family.webp |
| 17 | Jota 850F Elmas Frez - Kırmızı Kuşak (İnce) İnce Konik Finishing Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-850-family.webp |
| 18 | Jota 850G Elmas Frez - Yeşil Kuşak (Kaba) İnce Konik Hızlı Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-850-family.webp |
| 19 | Jota 852SG Elmas Frez - Siyah Kuşak (Süper Kaba) İğne / İnce Konik Agresif Preparasyon Frezi | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-852-family.webp |
| 20 | Jota 859EF Elmas Frez - Sarı Extra İnce Uzun İğne Elmas Frez | likely_non_square_image|likely_non_transparent_or_white_canvas|duplicate_image_url | jota-859e-family.webp |
