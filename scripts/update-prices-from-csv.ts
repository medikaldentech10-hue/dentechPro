import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types.ts";

type CsvPriceRow = {
  price: number | null;
  productName: string;
  rowNumber: number;
  sku: string;
  source: string;
};

type DbVariant = {
  currency: string;
  id: string;
  isActive: boolean;
  manufacturerRef: string | null;
  price: number | null;
  productId: string;
  productGroupCode: string;
  productName: string;
  variantCode: string;
};

type DbProductQueryRow = {
  id: string;
  product_group_code: string;
  product_name: string;
};

type DbVariantQueryRow = {
  currency: string;
  id: string;
  is_active: boolean;
  manufacturer_ref: string | null;
  price: number | null;
  product_id: string;
  product:
    | {
        product_group_code: string;
        product_name: string;
      }
    | Array<{
        product_group_code: string;
        product_name: string;
      }>
    | null;
  variant_code: string;
};

type PlannedUpdate = {
  matchSource: MatchSource;
  newPrice: number;
  oldPrice: number | null;
  row: CsvPriceRow;
  variant: DbVariant;
};

type MatchSource =
  | "manufacturer_ref"
  | "product_group_code_single_variant"
  | "product_name_single_variant"
  | "variant_code";

type DuplicateMatch = {
  matches: DbVariant[];
  matchSource: MatchSource;
  row: CsvPriceRow;
};

type SafeMatch = {
  matches: DbVariant[];
  source: MatchSource;
};

type UnmatchedDiagnostic = {
  closestProductGroupCodes: string[];
  closestVariantCodes: string[];
  reason: string;
  row: CsvPriceRow;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultCsvFiles = [
  "imports/jota_2026_tum_urunler_paket_fiyatlari_tl.csv",
  "imports/dentech_jota_haric_tum_urunler_paket_fiyatlari_tl.csv",
];

const args = parseArgs(process.argv.slice(2));

await loadLocalEnv(path.join(projectRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const csvRows = (
  await Promise.all(args.csvFiles.map((filePath) => readPriceCsv(path.join(projectRoot, filePath))))
).flat();
const dbVariants = await fetchDbVariants();
const plan = buildUpdatePlan(csvRows, dbVariants);
const diagnostics = buildDiagnostics(plan, dbVariants);

printReport(plan, diagnostics, args.commit);
await writeReportFiles(plan, diagnostics);

if (args.commit) {
  await applyUpdates(plan.updates);
  console.log(`\nCommitted ${plan.updates.length} price update(s).`);
} else {
  console.log("\nDry-run only. Re-run with --commit to write these updates.");
}

function parseArgs(argv: string[]) {
  const commit = argv.includes("--commit");
  const explicitFiles = argv.filter((arg) => !arg.startsWith("--"));

  return {
    commit,
    csvFiles: explicitFiles.length ? explicitFiles : defaultCsvFiles,
  };
}

async function readPriceCsv(filePath: string): Promise<CsvPriceRow[]> {
  const contents = await readFile(filePath, "utf8");
  const records = parseCsv(contents);
  const source = path.relative(projectRoot, filePath);
  const [headerRecord, ...dataRecords] = records;

  if (!headerRecord) {
    return [];
  }

  const headerMap = new Map(
    headerRecord.map((header, index) => [normalizeHeader(header), index])
  );
  const skuIndex = headerMap.get("sku");
  const productNameIndex = headerMap.get("urun adi");
  const priceIndex = headerMap.get("fiyat tl");

  if (skuIndex === undefined || priceIndex === undefined) {
    throw new Error(`${source} must include sku and fiyat (tl) columns.`);
  }

  return dataRecords
    .map((record, index) => {
      const sku = cleanCell(record[skuIndex]);
      const productName =
        productNameIndex === undefined ? "" : cleanCell(record[productNameIndex]);
      const priceText = cleanCell(record[priceIndex]);

      return {
        price: parsePrice(priceText),
        productName,
        rowNumber: index + 2,
        sku,
        source,
      };
    })
    .filter((row) => row.sku || row.productName || row.price !== null);
}

function parseCsv(contents: string) {
  const firstLine = contents.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = countOccurrences(firstLine, ";") > countOccurrences(firstLine, ",") ? ";" : ",";
  const records: string[][] = [];
  let current = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      record.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      record.push(current);
      if (record.some((cell) => cell.trim())) {
        records.push(record);
      }
      current = "";
      record = [];
      continue;
    }

    current += char;
  }

  record.push(current);
  if (record.some((cell) => cell.trim())) {
    records.push(record);
  }

  return records;
}

async function fetchDbVariants(): Promise<DbVariant[]> {
  const products = await fetchDbProductsById();
  const rows: DbVariantQueryRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id,product_id,variant_code,manufacturer_ref,price,currency,is_active,product:products(product_group_code,product_name)")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as unknown as DbVariantQueryRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows.map((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const mappedProduct = products.get(row.product_id);

    return {
      currency: row.currency,
      id: row.id,
      isActive: row.is_active,
      manufacturerRef: row.manufacturer_ref,
      price: row.price,
      productId: row.product_id,
      productGroupCode: mappedProduct?.product_group_code ?? product?.product_group_code ?? "",
      productName: mappedProduct?.product_name ?? product?.product_name ?? "",
      variantCode: row.variant_code,
    };
  });
}

async function fetchDbProductsById() {
  const rows: DbProductQueryRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id,product_group_code,product_name")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as DbProductQueryRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return new Map(rows.map((row) => [row.id, row]));
}

function buildUpdatePlan(rows: CsvPriceRow[], variants: DbVariant[]) {
  const eligibleVariants = variants.filter(
    (variant) => variant.isActive && !isUuidLike(variant.variantCode)
  );
  const matchIndexes = buildMatchIndexes(eligibleVariants);
  const invalidPriceRows = rows.filter((row) => row.price === null || !row.sku);
  const provisionalUpdates: PlannedUpdate[] = [];
  const unmatchedRows: CsvPriceRow[] = [];
  const duplicateMatches: DuplicateMatch[] = [];

  for (const row of rows) {
    if (row.price === null || !row.sku) {
      continue;
    }

    const safeMatch = getSafeMatch(row, matchIndexes);

    if (safeMatch.matches.length === 0) {
      unmatchedRows.push(row);
      continue;
    }

    const preferredMatch = pickPreferredJotDuplicate(safeMatch.matches);

    if (safeMatch.matches.length > 1 && !preferredMatch) {
      duplicateMatches.push({
        matchSource: safeMatch.source,
        matches: safeMatch.matches,
        row,
      });
      continue;
    }

    const variant = preferredMatch ?? safeMatch.matches[0];

    provisionalUpdates.push({
      matchSource: safeMatch.source,
      newPrice: row.price,
      oldPrice: variant.price,
      row,
      variant,
    });
  }

  const updatesByVariant = groupBy(provisionalUpdates, (update) => update.variant.id);
  const multiRowVariantMatches = [...updatesByVariant.values()].filter(
    (updates) => updates.length > 1
  );
  const blockedVariantIds = new Set(
    multiRowVariantMatches.flatMap((updates) => updates.map((update) => update.variant.id))
  );
  const updates = provisionalUpdates.filter((update) => !blockedVariantIds.has(update.variant.id));

  return {
    csvRows: rows,
    duplicateMatches,
    invalidPriceRows,
    multiRowVariantMatches,
    totalRows: rows.length,
    unmatchedRows,
    updates,
  };
}

function buildMatchIndexes(variants: DbVariant[]) {
  const productNames = groupBy(
    variants.filter((variant) => variant.productName),
    (variant) => normalizeProductName(variant.productName)
  );

  return {
    manufacturerRef: buildSingleFieldIndex(variants, (variant) => variant.manufacturerRef ?? ""),
    productGroupSingleVariant: buildSingleFieldIndex(variants, (variant) => variant.productGroupCode),
    productNameSingleVariant: buildSingleVariantIndex(productNames),
    variantCode: buildSingleFieldIndex(variants, (variant) => variant.variantCode),
  };
}

function buildSingleFieldIndex(
  variants: DbVariant[],
  getValue: (variant: DbVariant) => string
) {
  const index = new Map<string, DbVariant[]>();

  for (const variant of variants) {
    for (const key of getNormalizedCodeCandidates(getValue(variant))) {
      const current = index.get(key) ?? [];
      current.push(variant);
      index.set(key, current);
    }
  }

  return index;
}

function buildSingleVariantIndex(groups: Map<string, DbVariant[]>) {
  const index = new Map<string, DbVariant[]>();

  for (const [key, variants] of groups) {
    const unique = uniqueVariants(variants);
    index.set(key, unique.length === 1 ? unique : unique);
  }

  return index;
}

function getSafeMatch(
  row: CsvPriceRow,
  indexes: ReturnType<typeof buildMatchIndexes>
): SafeMatch {
  const skuKeys = getNormalizedCodeCandidates(row.sku);
  const productNameKey = normalizeProductName(row.productName);
  const priorities: Array<{ index: Map<string, DbVariant[]>; source: MatchSource; keys: string[] }> =
    [
      { index: indexes.variantCode, keys: skuKeys, source: "variant_code" },
      { index: indexes.manufacturerRef, keys: skuKeys, source: "manufacturer_ref" },
      {
        index: indexes.productGroupSingleVariant,
        keys: skuKeys,
        source: "product_group_code_single_variant",
      },
      {
        index: indexes.productNameSingleVariant,
        keys: productNameKey ? [productNameKey] : [],
        source: "product_name_single_variant",
      },
    ];

  for (const priority of priorities) {
    const matches = uniqueVariants(
      priority.keys.flatMap((key) => priority.index.get(key) ?? [])
    );

    if (matches.length) {
      return { matches, source: priority.source };
    }
  }

  return { matches: [], source: "variant_code" };
}

function pickPreferredJotDuplicate(matches: DbVariant[]) {
  const hasJotaCode = matches.some((match) => /^JOTA[-_]?/i.test(match.variantCode));
  const preferred = matches.filter(
    (match) => /^JOT[-_]?/i.test(match.variantCode) && !/^JOTA[-_]?/i.test(match.variantCode)
  );

  return hasJotaCode && preferred.length === 1 ? preferred[0] : null;
}

function getNormalizedCodeCandidates(value: string) {
  const normalized = normalizeCode(value);
  const withoutBrandPrefix = normalized.replace(/^(JOTA|JOT)/, "");

  return [...new Set([normalized, withoutBrandPrefix].filter(Boolean))];
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "");
}

function normalizeProductName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "I")
    .replace(/\s+/g, " ");
}

function parsePrice(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const price = Number.parseFloat(normalized);

  return Number.isFinite(price) && price >= 0 ? price : null;
}

function buildDiagnostics(plan: ReturnType<typeof buildUpdatePlan>, variants: DbVariant[]) {
  return {
    perFile: buildPerFileSummary(plan),
    unmatchedDiagnostics: plan.unmatchedRows.map((row) => buildUnmatchedDiagnostic(row, variants)),
  };
}

function buildPerFileSummary(plan: ReturnType<typeof buildUpdatePlan>) {
  const sources = new Set<string>([
    ...plan.csvRows.map((row) => row.source),
    ...plan.invalidPriceRows.map((row) => row.source),
    ...plan.unmatchedRows.map((row) => row.source),
    ...plan.duplicateMatches.map(({ row }) => row.source),
    ...plan.updates.map(({ row }) => row.source),
  ]);

  return [...sources].sort().map((source) => ({
    duplicateMatches: plan.duplicateMatches.filter(({ row }) => row.source === source).length,
    invalidRows: plan.invalidPriceRows.filter((row) => row.source === source).length,
    matchedRows: plan.updates.filter(({ row }) => row.source === source).length,
    source,
    totalRows: plan.csvRows.filter((row) => row.source === source).length,
    unmatchedRows: plan.unmatchedRows.filter((row) => row.source === source).length,
  }));
}

function buildUnmatchedDiagnostic(row: CsvPriceRow, variants: DbVariant[]): UnmatchedDiagnostic {
  const skuCandidates = getDiagnosticCodeCandidates(row.sku);
  const scored = variants
    .filter((variant) => variant.isActive && !isUuidLike(variant.variantCode))
    .map((variant) => ({
      score: getBestSimilarityScore(skuCandidates, getVariantDiagnosticKeys(variant)),
      variant,
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.variant.variantCode.localeCompare(right.variant.variantCode, "tr-TR")
    );
  const closest = scored.slice(0, 8).map((item) => item.variant);

  return {
    closestProductGroupCodes: uniqueStrings(
      closest.map((variant) => variant.productGroupCode).filter(Boolean)
    ),
    closestVariantCodes: uniqueStrings(
      closest.flatMap((variant) => [variant.variantCode, variant.manufacturerRef].filter(Boolean))
    ),
    reason: "no exact normalized SKU/code match",
    row,
  };
}

function getVariantDiagnosticKeys(variant: DbVariant) {
  return [
    variant.variantCode,
    variant.manufacturerRef,
    variant.productGroupCode,
    `${variant.productGroupCode}${variant.variantCode}`,
    `${variant.productGroupCode}${variant.manufacturerRef ?? ""}`,
  ].flatMap((value) => getDiagnosticCodeCandidates(value ?? ""));
}

function getDiagnosticCodeCandidates(value: string) {
  return getNormalizedCodeCandidates(value);
}

function getBestSimilarityScore(leftKeys: string[], rightKeys: string[]) {
  let bestScore = 0;

  for (const left of leftKeys) {
    for (const right of rightKeys) {
      bestScore = Math.max(bestScore, getSimilarityScore(left, right));
    }
  }

  return bestScore;
}

function getSimilarityScore(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 100;
  }

  const leftParts = extractCodeParts(left);
  const rightParts = extractCodeParts(right);
  let score = 0;

  if (leftParts.model && leftParts.model === rightParts.model) score += 45;
  if (leftParts.size && leftParts.size === rightParts.size) score += 25;
  if (leftParts.holder && leftParts.holder === rightParts.holder) score += 15;
  if (left.includes(right) || right.includes(left)) score += 15;

  return score;
}

function extractCodeParts(value: string) {
  const normalized = normalizeCode(value).replace(/^(JOTA|JOT)/, "");
  const match = normalized.match(/^([A-Z]*\d+[A-Z]*)(FGXL|FG|RA|HP|CA)?(XL)?(\d{3})?$/);

  return {
    holder: match?.[2] ?? null,
    model: match?.[1] ?? null,
    size: match?.[4] ?? null,
  };
}

function printReport(
  plan: ReturnType<typeof buildUpdatePlan>,
  diagnostics: ReturnType<typeof buildDiagnostics>,
  commit: boolean
) {
  console.log(`Price update ${commit ? "COMMIT" : "DRY-RUN"} report`);
  console.log(`Total CSV rows: ${plan.totalRows}`);
  console.log(`Matched update rows: ${plan.updates.length}`);
  console.log(`Unmatched rows: ${plan.unmatchedRows.length}`);
  console.log(`Duplicate DB matches: ${plan.duplicateMatches.length}`);
  console.log(`Invalid price/SKU rows: ${plan.invalidPriceRows.length}`);
  console.log(`Variants matched by multiple CSV rows: ${plan.multiRowVariantMatches.length}`);

  console.log("\nPer-file summary:");
  for (const item of diagnostics.perFile) {
    console.log(
      `- ${item.source}: total=${item.totalRows}, matched=${item.matchedRows}, unmatched=${item.unmatchedRows}, duplicates=${item.duplicateMatches}, invalid=${item.invalidRows}`
    );
  }

  printSamples(
    "Sample unmatched SKUs",
    plan.unmatchedRows.map((row) => `${row.sku} (${row.source}:${row.rowNumber})`)
  );
  printSamples(
    "Sample duplicate matches",
    plan.duplicateMatches.map(
      ({ matches, row }) =>
        `${row.sku} -> ${matches.map((match) => match.variantCode).join(", ")}`
    )
  );
  printSamples(
    "Sample updates",
    plan.updates.map(
      (update) =>
        `${update.row.sku}: ${formatPrice(update.oldPrice)} -> ${formatPrice(update.newPrice)} (${update.variant.variantCode})`
    )
  );
}

async function writeReportFiles(
  plan: ReturnType<typeof buildUpdatePlan>,
  diagnostics: ReturnType<typeof buildDiagnostics>
) {
  const matchedPath = path.join(projectRoot, "imports/price-update-report-matched.csv");
  const unmatchedPath = path.join(projectRoot, "imports/price-update-report-unmatched.csv");
  const duplicatesPath = path.join(projectRoot, "imports/price-update-report-duplicates.csv");

  await Promise.all([
    writeCsvFile(
      matchedPath,
      [
        "csv_sku",
        "csv_product_name",
        "csv_price",
        "source_file",
        "match_source",
        "db_variant_code",
        "db_manufacturer_ref",
        "db_product_group_code",
        "old_price",
        "new_price",
      ],
      plan.updates.map((update) => [
        update.row.sku,
        update.row.productName,
        formatPrice(update.row.price),
        update.row.source,
        update.matchSource,
        update.variant.variantCode,
        update.variant.manufacturerRef ?? "",
        update.variant.productGroupCode,
        formatPrice(update.oldPrice),
        formatPrice(update.newPrice),
      ])
    ),
    writeCsvFile(
      unmatchedPath,
      [
        "csv_sku",
        "csv_product_name",
        "csv_price",
        "source_file",
        "match_source",
        "closest_variant_codes",
        "closest_product_group_codes",
        "reason",
      ],
      diagnostics.unmatchedDiagnostics.map((item) => [
        item.row.sku,
        item.row.productName,
        formatPrice(item.row.price),
        item.row.source,
        "none",
        item.closestVariantCodes.join(" | "),
        item.closestProductGroupCodes.join(" | "),
        item.reason,
      ])
    ),
    writeCsvFile(
      duplicatesPath,
      [
        "csv_sku",
        "csv_product_name",
        "csv_price",
        "source_file",
        "match_source",
        "matched_variant_codes",
        "matched_product_group_codes",
        "reason",
      ],
      plan.duplicateMatches.map(({ matchSource, matches, row }) => [
        row.sku,
        row.productName,
        formatPrice(row.price),
        row.source,
        matchSource,
        uniqueStrings(matches.map((match) => match.variantCode)).join(" | "),
        uniqueStrings(matches.map((match) => match.productGroupCode)).join(" | "),
        "duplicate exact DB matches; skipped",
      ])
    ),
  ]);

  console.log("\nReport files written:");
  console.log(`- ${path.relative(projectRoot, matchedPath)}`);
  console.log(`- ${path.relative(projectRoot, unmatchedPath)}`);
  console.log(`- ${path.relative(projectRoot, duplicatesPath)}`);
}

async function writeCsvFile(filePath: string, headers: string[], rows: string[][]) {
  const contents = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  await writeFile(filePath, `${contents}\n`, "utf8");
}

function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function printSamples(label: string, values: string[]) {
  if (!values.length) {
    return;
  }

  console.log(`\n${label}:`);
  for (const value of values.slice(0, 10)) {
    console.log(`- ${value}`);
  }
}

async function applyUpdates(updates: PlannedUpdate[]) {
  if (!updates.length) {
    console.log("\nNo unambiguous matched updates. Nothing to commit.");
    return;
  }

  const updatedAt = new Date().toISOString();

  for (const update of updates) {
    const { error } = await supabase
      .from("product_variants")
      .update({
        currency: "TRY",
        price: update.newPrice,
        updated_at: updatedAt,
      })
      .eq("id", update.variant.id);

    if (error) {
      throw new Error(`Failed to update ${update.variant.variantCode}: ${error.message}`);
    }
  }
}

function cleanCell(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeHeader(value: string) {
  return cleanCell(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(value: string, character: string) {
  return value.split(character).length - 1;
}

function uniqueVariants(variants: DbVariant[]) {
  return [...new Map(variants.map((variant) => [variant.id, variant])).values()];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return groups;
}

function isUuidLike(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:$|[-_A-Z0-9].*)/i.test(
    trimmed
  );
}

function formatPrice(value: number | null) {
  return value === null ? "null" : String(value);
}

async function loadLocalEnv(envPath: string) {
  try {
    const contents = await readFile(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
