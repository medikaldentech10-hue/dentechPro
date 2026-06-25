# JOTA SKU Normalization Review

## Recommended final format

`JOT-[MODEL]-[GRIT][SHAFT]-[DIAMETER]`

- `MODEL` preserves real model identity such as `801L`, `859L`, `Z850`, `9813`.
- `GRIT` is included when the model/source name carries `F`, `G`, `SG`, or `EF` as a grit suffix.
- `SHAFT` remains `FG`, `RA`, or `HP`; grit prefixes can produce `FFG`, `GRA`, `SGFG`, `EFRA`, etc.
- `DIAMETER` uses explicit manufacturer ref or safe diameter field only; model numbers such as `558` are not interpreted as diameters.

## Dry-run summary

- Variants checked: 321
- Safe proposed changes: 16
- Skipped rows: 305
- Remaining duplicate target conflicts: 0

## Skipped row summary

- missing_holder: 47
- missing_model: 76
- duplicate_source_rows: 4
- seed_import_duplicate: 2
- already_normalized: 174
- missing_safe_diameter: 2

## Conflict cause summary

- Previous duplicate target conflicts for `F/G/SG/EF` polishers were caused by dropping grit suffixes when shaft was `RA` or `HP`.
- The dry-run now keeps grit before all shaft codes, so examples such as `9813F` and `9813G` no longer collide.
- Remaining skipped duplicates are blocked as source data issues, not automatically normalized.
- Package/set rows and some carbide rows still lack safe model/holder data and remain skipped.

## Grit-aware sample proposals

- None

## Duplicate source row examples

- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / 9d172e33-8798-4146-b071-fb48e36a900d: 5a1f73d9-a830-4082-95e2-3f6813ae0433 -> JOT-801-FG-008
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / f94786d2-6ea6-41bb-9883-c26a0a58ee4b: d03dd80c-2b5d-4897-b6ef-85a7427e3e0f -> JOT-801-FG-014
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / b7e9c8e8-9ce6-4a28-91e3-5fef5c3c1671: e30455b1-1090-49ba-a9a6-b29179ca3160 -> JOT-801-FG-008
- Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi / 5ebe090b-b3c0-4664-8492-88a1ec5ea8da: eea23e94-fe62-4226-97d6-e95ed2c20b00 -> JOT-801-FG-008

## Seed/import overlap examples

- Jota 859L Elmas Frez - Mavi Kuşak (Standard) Extra Uzun İğne Genel Preparasyon Frezi / 1731abc0-669e-4d96-a313-cc111fd8473d: 6429000a-2371-498d-8404-6d9bb192a49e -> JOT-859L-FG-012
- 852 Chamfer Elmas Frez / a953a6c0-9b0d-47ef-840b-2893bf4d0697: JOTA-852-FG-014 -> JOT-852-FG-014

## Apply readiness

Do not run `sku:normalize:apply` yet. Duplicate source rows, seed/import overlaps, and missing model/holder rows still need manual review even though hard duplicate target conflicts are removed.
