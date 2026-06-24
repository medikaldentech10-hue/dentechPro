import fs from "node:fs";
import path from "node:path";

const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const AUDIT_PATH = path.join(REPORT_DIR, "product-image-audit.csv");
const PRIORITY_PATH = path.join(
  REPORT_DIR,
  "product-image-replacement-priority.csv"
);
const GUIDE_PATH = path.join(REPORT_DIR, "product-image-replacement-guide.md");

const COMMON_SEARCH_TERMS = [
  "014",
  "881",
  "881f",
  "881sg",
  "zirkonya",
  "zirconia",
  "elmas-frezler",
];

const ISSUE_WEIGHTS = {
  missing_product_image: 120,
  missing_variant_image: 95,
  likely_non_square_image: 55,
  likely_non_transparent_or_white_canvas: 45,
  duplicate_image_url: 30,
  image_header_check_failed: 25,
};

const JOTA_SUFFIXES = ["SG", "SF", "XC", "UF", "C", "F", "G", "M"];

main();

function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    throw new Error(
      `Missing audit report at ${AUDIT_PATH}. Run npm.cmd run audit:images first.`
    );
  }

  const rows = parseCsv(fs.readFileSync(AUDIT_PATH, "utf8"));
  const duplicateUrlCounts = countBy(rows, (row) => row.image_url || "");
  const groupedFamilyCounts = countBy(rows, (row) => getGroupedFamilyKey(row));
  const entries = buildPriorityEntries(rows, duplicateUrlCounts, groupedFamilyCounts);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(PRIORITY_PATH, toCsv(entries), "utf8");
  fs.writeFileSync(GUIDE_PATH, buildGuide(entries), "utf8");

  const summary = summarize(entries);

  console.log("\nDentech Pro image replacement priority");
  console.log("--------------------------------------");
  console.log(`Audit rows read: ${rows.length}`);
  console.log(`Replacement rows written: ${entries.length}`);
  console.log(`Priority CSV: ${PRIORITY_PATH}`);
  console.log(`Guide: ${GUIDE_PATH}`);
  console.log("\nIssue grouping summary:");
  for (const [issueType, count] of Object.entries(summary.issueCounts)) {
    console.log(`- ${issueType}: ${count}`);
  }
  console.log(`- grouped family rows: ${summary.groupedFamilyRows}`);
  console.log(`- common search rows: ${summary.commonSearchRows}`);

  console.log("\nTop 20 priorities:");
  for (const entry of entries.slice(0, 20)) {
    console.log(
      `${entry.priority}. ${entry.product_name} | ${entry.issue_type} | ${entry.recommended_asset_name}`
    );
  }
}

function buildPriorityEntries(rows, duplicateUrlCounts, groupedFamilyCounts) {
  const grouped = new Map();

  for (const row of rows) {
    const entityKey =
      row.entity_type === "variant" && row.variant_id
        ? `variant:${row.variant_id}`
        : `product:${row.product_id}`;
    const existing = grouped.get(entityKey);

    if (!existing) {
      grouped.set(entityKey, {
        ...row,
        issue_types: new Set([row.issue_type]),
        grouped_family_key: getGroupedFamilyKey(row),
        duplicate_url_count: duplicateUrlCounts.get(row.image_url || "") ?? 0,
      });
      continue;
    }

    existing.issue_types.add(row.issue_type);
    existing.duplicate_url_count = Math.max(
      existing.duplicate_url_count,
      duplicateUrlCounts.get(row.image_url || "") ?? 0
    );

    if (!existing.image_url && row.image_url) {
      existing.image_url = row.image_url;
    }
  }

  const entries = [...grouped.values()].map((row) => {
    const familyKey = row.grouped_family_key;
    const isGroupedFamily =
      familyKey !== "" && (groupedFamilyCounts.get(familyKey) ?? 0) > 2;
    const commonSearchMatches = getCommonSearchMatches(row);
    const issueTypes = [...row.issue_types].sort(sortIssueTypes);
    const score =
      getIssueScore(issueTypes) +
      (isGroupedFamily ? 75 : 0) +
      commonSearchMatches.length * 30 +
      (row.entity_type === "product" ? 10 : 0) +
      Math.min(row.duplicate_url_count, 12) * 3;

    return {
      score,
      product_id: row.product_id,
      product_name: row.product_name,
      variant_id: row.entity_type === "variant" ? row.variant_id : "",
      "sku / variant_code": getSafeVariantCode(row),
      current_image_url: row.image_url,
      issue_type: issueTypes.join("|"),
      grouped_family_key: familyKey,
      recommended_asset_name: getRecommendedAssetName(row, isGroupedFamily),
      recommended_action: getRecommendedAction(row, {
        isGroupedFamily,
        commonSearchMatches,
        issueTypes,
      }),
    };
  });

  return entries
    .sort((a, b) => b.score - a.score || a.product_name.localeCompare(b.product_name))
    .map((entry, index) => ({
      priority: index + 1,
      product_id: entry.product_id,
      product_name: entry.product_name,
      variant_id: entry.variant_id,
      "sku / variant_code": entry["sku / variant_code"],
      current_image_url: entry.current_image_url,
      issue_type: entry.issue_type,
      grouped_family_key: entry.grouped_family_key,
      recommended_asset_name: entry.recommended_asset_name,
      recommended_action: entry.recommended_action,
    }));
}

function getGroupedFamilyKey(row) {
  const normalized = normalizeText(row.product_name);
  const code = extractJotaCode(normalized);
  if (!code) {
    return "";
  }

  const baseCode = stripJotaSuffix(code);
  const descriptor = normalized
    .replace(/^jota\s+/, "")
    .replace(code.toLowerCase(), "")
    .split(/\s+-\s+|\spaketi\b|\sku[sş]ak\b|\(/u)[0]
    .replace(/\b(elmas|frez|paketi|jota)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return slugify(["jota", baseCode, descriptor].filter(Boolean).join("-"));
}

function getRecommendedAssetName(row, isGroupedFamily) {
  const normalized = normalizeText(row.product_name);
  const rawCode = extractJotaCode(normalized);
  const baseCode = rawCode ? stripJotaSuffix(rawCode) : "";
  const codeSuffix = rawCode ? rawCode.slice(baseCode.length).toLowerCase() : "";
  const color = getColorToken(normalized);
  const category = normalizeText(row.category).replace(/ler$/, "");
  const parts = ["jota"];

  if (baseCode) {
    parts.push(baseCode);
  } else {
    parts.push(slugify(row.product_name).slice(0, 48));
  }

  if (row.entity_type === "variant" && codeSuffix) {
    parts.push(codeSuffix);
  }

  if (color && row.entity_type === "variant") {
    parts.push(color);
  }

  if (isGroupedFamily && row.entity_type === "product") {
    parts.push("family");
  } else if (category && !parts.includes(category)) {
    parts.push(category);
  }

  return `${slugify(parts.filter(Boolean).join("-"))}.webp`;
}

function getRecommendedAction(row, { isGroupedFamily, commonSearchMatches, issueTypes }) {
  const actions = [];

  if (isGroupedFamily) {
    actions.push("Create one family-level transparent asset for grouped catalog cards");
  }

  if (commonSearchMatches.length > 0) {
    actions.push(`Prioritize for common search: ${commonSearchMatches.join(", ")}`);
  }

  if (issueTypes.includes("missing_product_image")) {
    actions.push("Add product image before manual transparent-background cleanup");
  }

  if (issueTypes.includes("missing_variant_image")) {
    actions.push("Add variant image only if this variant is visually distinct");
  }

  if (issueTypes.includes("likely_non_square_image")) {
    actions.push("Replace with centered 1:1 transparent WebP/PNG");
  }

  if (issueTypes.includes("likely_non_transparent_or_white_canvas")) {
    actions.push("Remove white canvas/background and export transparent WebP");
  }

  if (issueTypes.includes("duplicate_image_url")) {
    actions.push("Review shared URL; replace once if the image serves this family");
  }

  if (issueTypes.includes("image_header_check_failed")) {
    actions.push("Manually verify image URL and replacement asset");
  }

  return actions.join("; ");
}

function getIssueScore(issueTypes) {
  const sortedWeights = issueTypes
    .map((issueType) => ISSUE_WEIGHTS[issueType] ?? 10)
    .sort((a, b) => b - a);
  const [primary = 0, ...secondary] = sortedWeights;

  return primary + secondary.reduce((sum, weight) => sum + Math.round(weight * 0.35), 0);
}

function sortIssueTypes(a, b) {
  return (ISSUE_WEIGHTS[b] ?? 0) - (ISSUE_WEIGHTS[a] ?? 0) || a.localeCompare(b);
}

function getCommonSearchMatches(row) {
  const haystack = normalizeText(
    [
      row.product_name,
      row.category,
      isUuidLike(row.product_group_code) ? "" : row.product_group_code,
      getSafeVariantCode(row),
      row.manufacturer_ref,
      getGroupedFamilyKey(row),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return COMMON_SEARCH_TERMS.filter((term) => haystack.includes(normalizeText(term)));
}

function getSafeVariantCode(row) {
  const code = row.manufacturer_ref || row.variant_code || "";
  return isUuidLike(code) ? "" : code;
}

function summarize(entries) {
  return {
    issueCounts: Object.fromEntries(
      [...countBy(entries, (entry) => entry.issue_type).entries()].sort()
    ),
    groupedFamilyRows: entries.filter((entry) => entry.grouped_family_key).length,
    commonSearchRows: entries.filter((entry) =>
      getCommonSearchMatches({
        product_name: entry.product_name,
        product_group_code: "",
        category: "",
        variant_code: entry["sku / variant_code"],
        manufacturer_ref: "",
      }).length > 0
    ).length,
  };
}

function buildGuide(entries) {
  const topRows = entries
    .slice(0, 20)
    .map(
      (entry) =>
        `| ${entry.priority} | ${escapeMarkdown(entry.product_name)} | ${entry.issue_type} | ${entry.recommended_asset_name} |`
    )
    .join("\n");

  return `# Dentech Pro Product Image Replacement Guide

Generated from \`scripts/reports/product-image-audit.csv\`.

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

1. Start from \`product-image-replacement-priority.csv\`.
2. Replace high-priority grouped family images first.
3. Then fix common search products for 014, 881, 881F, 881SG, zirkonya, and elmas-frezler.
4. Fill missing product images before polishing variant-only images.
5. Convert non-square or white-canvas assets into transparent 1:1 WebP files.
6. Keep replacement filenames lowercase, ASCII-only, hyphen-separated, and stable.
7. Do not upload or write database values until the replacement assets are reviewed.

## Top 20 Replacement Priorities

| Priority | Product | Issue | Recommended asset |
| --- | --- | --- | --- |
${topRows}
`;
}

function extractJotaCode(value) {
  const match = value.match(/\bjota\s+([a-z]*\d{3,4}[a-z]*)\b/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function stripJotaSuffix(code) {
  for (const suffix of JOTA_SUFFIXES) {
    if (code.endsWith(suffix) && code.length > suffix.length) {
      return code.slice(0, -suffix.length).toLowerCase();
    }
  }

  return code.toLowerCase();
}

function getColorToken(value) {
  if (/\b(kirmizi|kırmızı|red)\b/u.test(value)) return "red";
  if (/\b(mavi|blue)\b/u.test(value)) return "blue";
  if (/\b(yesil|ye[sş]il|green)\b/u.test(value)) return "green";
  if (/\b(sari|sarı|yellow)\b/u.test(value)) return "yellow";
  if (/\b(siyah|black)\b/u.test(value)) return "black";
  return "";
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/Ä±/g, "i")
    .replace(/Ä°/g, "i")
    .replace(/ÅŸ/g, "s")
    .replace(/Åž/g, "s")
    .replace(/ÄŸ/g, "g")
    .replace(/Äž/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ãœ/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã–/g, "o")
    .replace(/Ã§/g, "c")
    .replace(/Ã‡/g, "c")
    .replace(/Ä°/g, "i")
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function countBy(values, getKey) {
  const counts = new Map();
  for (const value of values) {
    const key = getKey(value);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function toCsv(rows) {
  const headers = [
    "priority",
    "product_id",
    "product_name",
    "variant_id",
    "sku / variant_code",
    "current_image_url",
    "issue_type",
    "grouped_family_key",
    "recommended_asset_name",
    "recommended_action",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}
