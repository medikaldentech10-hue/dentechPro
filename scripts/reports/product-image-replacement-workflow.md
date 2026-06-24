# Dentech Pro Product Image Replacement Workflow

This workflow is for connecting reviewed transparent product images to existing products or variants. It is intentionally dry-run first and does not upload files.

## Asset Standard

- Use transparent WebP or PNG.
- Use a square 1:1 canvas.
- Prefer at least 1000x1000 px.
- Center the product with consistent padding.
- Keep the visual product-only.
- Do not include text, watermark, logo overlays, or a background.
- Use lowercase ASCII filenames with hyphens.

Recommended naming examples:

- `jota-881-elmas-frez-family.webp`
- `jota-881-f-red.webp`
- `jota-z850-blue-elmas-frez.webp`

## Mapping CSV

Start from:

`scripts/data/product-image-replacements.sample.csv`

Columns:

- `target_type`: `product`, `variant`, or `family`
- `product_id`: required for product targets; optional family representative override
- `variant_id`: required for variant targets
- `family_key`: required for family targets, for example `jota-881`
- `current_image_url`: optional safety check; if present, it must match the current DB value
- `new_image_path_or_url`: required replacement path or URL
- `notes`: operator notes

## Family Replacement Behavior

`target_type=family` updates only the grouped family representative product image. It does not update every product or variant in the family. Use explicit `product` or `variant` rows for additional image changes.

## Commands

Dry-run first:

```bash
npm.cmd run image:replace:dry
```

Apply after review:

```bash
npm.cmd run image:replace:apply
```

For a custom mapping file:

```bash
node scripts/apply-product-image-replacements.mjs scripts/data/my-reviewed-image-map.csv
node scripts/apply-product-image-replacements.mjs scripts/data/my-reviewed-image-map.csv --apply
```

## Verification

After applying reviewed replacements:

1. Run `npm.cmd run audit:images`.
2. Run `npm.cmd run prioritize:images`.
3. Review product cards in `/products`.
4. Confirm no price/request/auth behavior changed.
