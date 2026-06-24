# JOTA SKU Normalization Review

## Recommended final format

`JOT-[MODEL]-[GRIT][SHAFT]-[DIAMETER]`

- `MODEL` preserves real model identity such as `801L`, `859L`, `Z850`, `9813`.
- `GRIT` is included when the model/source name carries `F`, `G`, `SG`, or `EF` as a grit suffix.
- `SHAFT` remains `FG`, `RA`, or `HP`; grit prefixes can produce `FFG`, `GRA`, `SGFG`, `EFRA`, etc.
- `DIAMETER` uses explicit manufacturer ref or safe diameter field only; model numbers such as `558` are not interpreted as diameters.

## Dry-run summary

- Variants checked: 321
- Safe proposed changes: 189
- Skipped rows: 132
- Remaining duplicate target conflicts: 0

## Skipped row summary

- missing_holder: 47
- missing_model: 75
- duplicate_source_rows: 4
- seed_import_duplicate: 2
- already_normalized: 2
- missing_safe_diameter: 2

## Conflict cause summary

- Previous duplicate target conflicts for `F/G/SG/EF` polishers were caused by dropping grit suffixes when shaft was `RA` or `HP`.
- The dry-run now keeps grit before all shaft codes, so examples such as `9813F` and `9813G` no longer collide.
- Remaining skipped duplicates are blocked as source data issues, not automatically normalized.
- Package/set rows and some carbide rows still lack safe model/holder data and remain skipped.

## Grit-aware sample proposals

- Jota 895F Elmas Frez - Kırmızı Kuşak (İnce) Armut İnce Form Finishing Frezi / 6a133184-e205-41c8-9888-af2709f0bfe0: 00d12820-cefe-43b5-b40e-6b9c4c20cbd4 -> JOT-895-FFG-016
- Jota 801LG Elmas Frez - Yeşil Kuşak (Kaba) Uzun Boyunlu Yuvarlak (Long Neck Round) Hızlı Preparasyon Frezi / 4fbf3d66-2a10-4402-ba9c-2c649ba9b35a: 0642937f-4847-46dd-8759-1eb1005c0900 -> JOT-801L-GFG-012
- Jota 850G Elmas Frez - Yeşil Kuşak (Kaba) İnce Konik Hızlı Preparasyon Frezi / 32973745-76dc-4099-9a42-6ec4477803ae: 07a0b5b6-dd36-49ac-b86e-95759c022d44 -> JOT-850-GFG-014
- Jota 837LG Elmas Frez - Yeşil Kuşak (Kaba) Uzun Silindirik Hızlı Preparasyon Frezi / 6f63d83e-ac81-4a75-81a3-320f059e5c06: 092a034b-28a0-42d6-a0cf-552be10e20e5 -> JOT-837L-GFG-012
- Jota 852F Elmas Frez - Kırmızı Kuşak (İnce) İğne / İnce Konik Finishing Frezi / 4efefdc1-9f43-4bcd-9cee-e907da78137c: 0a2f87c0-4ef0-4c4d-979a-3f18be24f8cb -> JOT-852-FFG-012
- Jota 862F Elmas Frez - Kırmızı Kuşak (İnce) Konik Finishing Frezi / ced9688e-61c7-4269-a002-45cba329e015: 0bffd456-bbfe-44dd-a740-4115b5177f48 -> JOT-862-FFG-012
- Jota 881F Elmas Frez - Kırmızı Kuşak (İnce) Silindirik Düz Uç Finishing Frezi / 8b92b0b2-816d-4a30-95b8-a925df08f09d: 0ed90828-e12e-4d68-92d3-bd49bd6cbfac -> JOT-881-FFG-016
- Jota 9765F Kompozit Cilalama Ucu (Polisher) - Step 2 / b2936649-b739-4c64-ad6c-71f251a9256a: 12d4b1a8-8af5-4199-9a04-51066e3f939b -> JOT-9765-FRA-055
- Jota 863G Elmas Frez - Yeşil Kuşak (Kaba) Alev / Uzun Konik Hızlı Preparasyon Frezi / 5f77e25e-6827-4408-9990-5fdab7734baf: 142640a8-6ac6-4e19-a095-f1c9c9d757b5 -> JOT-863-GFG-016
- Jota 801G Elmas Frez - Yeşil Kuşak (Kaba) Yuvarlak (Round) Hızlı Preparasyon Frezi / d4276260-3552-41a5-b04f-f222b2f347ed: 14e47bfb-0e4b-409e-9974-e449548a4721 -> JOT-801-GFG-014
- Jota 859LF Elmas Frez - Kırmızı Kuşak (İnce) Extra Uzun İğne Finishing Frezi / e113f113-57be-472c-abc4-7f96b365250c: 1881f058-a422-4c8d-b449-aaf1e459c790 -> JOT-859L-FFG-014
- Jota 862G Elmas Frez - Yeşil Kuşak (Kaba) Konik Hızlı Preparasyon Frezi / b0560879-a498-4a0d-9746-e6a294f2f58d: 1a5bdb3d-7e23-4de8-b7dd-484ed9c9d187 -> JOT-862-GFG-012

## Duplicate source row examples

- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / 9d172e33-8798-4146-b071-fb48e36a900d: 5a1f73d9-a830-4082-95e2-3f6813ae0433 -> JOT-801-FG-008
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / f94786d2-6ea6-41bb-9883-c26a0a58ee4b: d03dd80c-2b5d-4897-b6ef-85a7427e3e0f -> JOT-801-FG-014
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / b7e9c8e8-9ce6-4a28-91e3-5fef5c3c1671: e30455b1-1090-49ba-a9a6-b29179ca3160 -> JOT-801-FG-008
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / 5ebe090b-b3c0-4664-8492-88a1ec5ea8da: eea23e94-fe62-4226-97d6-e95ed2c20b00 -> JOT-801-FG-008

## Seed/import overlap examples

- Jota 859L Elmas Frez - Mavi Kuşak (Standard) Extra Uzun İğne Genel Preparasyon Frezi / 1731abc0-669e-4d96-a313-cc111fd8473d: 6429000a-2371-498d-8404-6d9bb192a49e -> JOT-859L-FG-012
- 859L Uzun Alev Elmas Frez / 502a49cb-b3a2-4ae3-ac97-c3d2b71d3991: JOTA-859L-FG-012 -> JOT-859L-FG-012

## Apply readiness

Do not run `sku:normalize:apply` yet. Duplicate source rows, seed/import overlaps, and missing model/holder rows still need manual review even though hard duplicate target conflicts are removed.
