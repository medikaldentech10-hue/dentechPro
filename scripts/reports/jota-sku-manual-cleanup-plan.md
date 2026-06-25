# JOTA SKU Manual Cleanup Plan

Generated: 2026-06-25

## Scope

- Safe SKU normalization has already been applied.
- This plan triages the remaining manual-review rows only.
- No SKU apply, image apply, schema change, or business logic change was performed.

## Summary

- Manual cleanup rows: 132
- Full skipped report rows, including already-normalized rows: 321
- Already normalized rows in skipped report: 189

## Remaining Row Breakdown By Reason

- duplicate_source_rows: 4
- missing_holder: 47
- missing_model: 76
- missing_safe_diameter: 2
- seed_import_duplicate: 3

## Product Type Grouping

- carbide rows: 43
- package/set products: 73
- polisher rows: 9
- rotary instrument rows: 7

## Priority Rules

1. duplicate_source_rows
2. seed_import_duplicate
3. already_normalized
4. missing_safe_diameter
5. package/set missing holder rows
6. missing_holder
7. package/set missing model rows
8. missing_model

## Recommended Next Safe Group

duplicate_source_rows and seed_import_duplicate should be reviewed first because they represent source data ownership/canonicalization decisions; after that, handle missing_safe_diameter rows with explicit source confirmation. Do not normalize missing_model or missing_holder rows until source fields are improved.

## Package / Set Recommendation

For set/package products, do not force the rotary-instrument SKU format. After manual source review, consider a separate convention such as `JOT-SET-[MODEL]` or `JOT-PKG-[MODEL]`. This is a recommendation only and was not applied.

## Carbide / Polisher Recommendation

Carbide and polisher rows may need different SKU rules from diamond burs. Keep them unchanged until model, holder, material/step, and diameter conventions are confirmed from source data.

## Top 20 Manual Decisions Needed

| Priority | Reason | Product | Current SKU | Model | Holder | Diameter | Action |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | duplicate_source_rows | Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi | 5a1f73d9-a830-4082-95e2-3f6813ae0433 | 801 | FG | 008 | Review duplicate imported variant rows; leave unchanged until canonical row or merge/retire decision is made. |
| 1 | duplicate_source_rows | Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi | d03dd80c-2b5d-4897-b6ef-85a7427e3e0f | 801 | FG | 014 | Review duplicate imported variant rows; leave unchanged until canonical row or merge/retire decision is made. |
| 1 | duplicate_source_rows | Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi | e30455b1-1090-49ba-a9a6-b29179ca3160 | 801 | FG | 008 | Review duplicate imported variant rows; leave unchanged until canonical row or merge/retire decision is made. |
| 1 | duplicate_source_rows | Jota 801 Elmas Frez - Mavi Kuşak (Standard) Yuvarlak (Round) Genel Preparasyon Frezi | eea23e94-fe62-4226-97d6-e95ed2c20b00 | 801 | FG | 008 | Review duplicate imported variant rows; leave unchanged until canonical row or merge/retire decision is made. |
| 2 | seed_import_duplicate | 852 Chamfer Elmas Frez | JOTA-852-FG-014 | 852 | FG | 014 | Review seed/import overlap; leave unchanged until canonical SKU ownership is chosen. |
| 2 | seed_import_duplicate | 859L Uzun Alev Elmas Frez | JOTA-859L-FG-012 | 859L | FG | 012 | Review seed/import overlap; leave unchanged until canonical SKU ownership is chosen. |
| 2 | seed_import_duplicate | Jota 859L Elmas Frez - Mavi Kuşak (Standard) Extra Uzun İğne Genel Preparasyon Frezi | 6429000a-2371-498d-8404-6d9bb192a49e | 859L | FG | 012 | Review seed/import overlap; leave unchanged until canonical SKU ownership is chosen. |
| 4 | missing_safe_diameter | 9805 Polisaj Frezi | JOTA-9805G-RA | 9805 | RA |  | Confirm explicit diameter/size from source; do not infer from product model/code. |
| 4 | missing_safe_diameter | 9805 Polisaj Frezi | JOTA-9805M-RA | 9805M | RA |  | Confirm explicit diameter/size from source; do not infer from product model/code. |
| 5 | missing_holder | 558 Silindirik Uzun Elmas Paketi | 4d8ef04b-75d7-4b4a-8b76-02476488767a | 558 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 801 L Paketi | 8b120bc6-a183-4e18-821d-b7378c4b41b7 | 801 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 801 L Paketi | de5bf2a0-46bb-4d93-8423-f788cc20b2b6 | 801 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 805 Elmas Frez Paketi | 1e37bbf7-c5a5-4cea-b125-72919633d428 | 805 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 830 Alev Elmas Frez Paketi | 0302d1e0-fdef-4744-840a-85956487209e | 830 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 830 Alev Elmas Frez Paketi | 62d9036c-c667-4883-96fa-672e7f5b39c9 | 830 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 830 Alev Elmas Frez Paketi | 661db6b8-9e71-40d7-a2e0-2b17170219c5 | 830 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 830 Alev Elmas Frez Paketi | f94bbad1-f913-47e2-88dc-ddc370b1a76a | 830 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 833 Armut Elmas Frez Paketi | 3746b29a-e23c-4d41-b0c6-00937d0c0018 | 833 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 833 Armut Elmas Frez Paketi | 37cddf9f-0efa-45c3-bbff-2f438434e977 | 833 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |
| 5 | missing_holder | 833 Armut Elmas Frez Paketi | 96964907-ae94-4ef5-a9b6-632d8756a3fa | 833 |  |  | Recommend package SKU convention only after manual review, e.g. JOT-SET-[MODEL] or JOT-PKG-[MODEL]. |

## Output Files

- CSV: C:\Users\samet\Documents\Dentech Pro\scripts\reports\jota-sku-manual-cleanup.csv
- Plan: C:\Users\samet\Documents\Dentech Pro\scripts\reports\jota-sku-manual-cleanup-plan.md
