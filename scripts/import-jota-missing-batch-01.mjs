import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const PREVIEW_PATH = path.join(REPORT_DIR, "jota-missing-products-batch-01-preview.csv");
const DRY_RUN_PATH = path.join(REPORT_DIR, "jota-batch-01-insert-dry-run.csv");
const BACKUP_PATH = path.join(REPORT_DIR, "jota-batch-01-insert-backup.csv");
const EXPECTED_BATCH_SKUS = new Set([
  "JOT-801-FG-008",
  "JOT-801-FG-021",
  "JOT-801XL-FG-014",
  "JOT-801XL-FG-018",
  "JOT-833-EFG-023",
  "JOT-83O-EFFG-018",
  "JOT-83O-EFFG-021",
  "JOT-83O-EFFG-023",
]);

main().catch((error) => {
  console.error("[jota-batch-01] failed", error);
  process.exitCode = 1;
});

async function main() {
  const apply = process.argv.includes("--apply");
  const env = readEnvFile(".env.local");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const previewRows = readBatchPreviewRows();
  const products = await fetchProducts(supabase);
  const existingVariants = await fetchExistingVariants(supabase, previewRows);
  const duplicateSkuCount = await countDuplicateSkus(supabase);
  const dryRunRows = buildDryRunRows({ duplicateSkuCount, existingVariants, previewRows, products });

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(DRY_RUN_PATH, toCsv(dryRunRows, dryRunHeaders()), "utf8");

  const safeCount = dryRunRows.filter((row) => row.safe_to_insert === "true").length;
  console.log("\nDentech Pro JOTA Batch 01 missing variants");
  console.log("------------------------------------------");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Rows checked: ${dryRunRows.length}`);
  console.log(`safe_to_insert count: ${safeCount}`);
  console.log(`Duplicate SKU groups: ${duplicateSkuCount}`);
  console.log(`Dry-run report: ${DRY_RUN_PATH}`);
  console.log(`Backup report: ${BACKUP_PATH}`);

  if (!apply) {
    console.log("Dry-run only. No database rows were inserted.");
    return;
  }

  if (dryRunRows.length !== EXPECTED_BATCH_SKUS.size || safeCount !== EXPECTED_BATCH_SKUS.size || duplicateSkuCount !== 0) {
    throw new Error("Batch 01 apply blocked: dry-run is not fully safe for all 8 expected SKUs.");
  }

  writeInsertBackup(dryRunRows);

  for (const row of dryRunRows) {
    const { error } = await supabase.from("product_variants").insert({
      color: null,
      connection_type: row.holder,
      currency: "TRY",
      diameter: row.diameter ? Number(row.diameter) / 10 : null,
      grit: row.grit || null,
      image_url: row.proposed_image_url || null,
      is_active: false,
      manufacturer_ref: row.proposed_variant_name,
      package_quantity: 1,
      price: null,
      product_id: row.target_product_id,
      reserved_quantity: 0,
      stock_quantity: 0,
      stock_status: "ask_for_stock",
      variant_code: row.proposed_variant_code,
    });

    if (error) {
      throw new Error(`${row.proposed_variant_code}: ${error.message}`);
    }

    console.log(`INSERTED inactive variant ${row.proposed_variant_code} -> ${row.target_product_id}`);
  }
}

function readBatchPreviewRows() {
  if (!fs.existsSync(PREVIEW_PATH)) {
    throw new Error(`Missing Batch 01 preview: ${PREVIEW_PATH}`);
  }

  const rows = parseCsv(fs.readFileSync(PREVIEW_PATH, "utf8"));
  const candidateRows = hasExpectedBatchRows(rows) ? rows : readFallbackRowsFromBackup();
  const unknownRows = candidateRows.filter((row) => !EXPECTED_BATCH_SKUS.has(normalizeSku(row.reference_sku)));
  const missingSkus = [...EXPECTED_BATCH_SKUS].filter(
    (sku) => !candidateRows.some((row) => normalizeSku(row.reference_sku) === sku)
  );

  if (unknownRows.length || missingSkus.length) {
    throw new Error(
      `Batch 01 preview must contain exactly the expected 8 SKUs. Unknown=${unknownRows
        .map((row) => row.reference_sku)
        .join("|")} Missing=${missingSkus.join("|")}`
    );
  }

  return candidateRows;
}

function hasExpectedBatchRows(rows) {
  return [...EXPECTED_BATCH_SKUS].every((sku) => rows.some((row) => normalizeSku(row.reference_sku) === sku));
}

function readFallbackRowsFromBackup() {
  if (!fs.existsSync(BACKUP_PATH)) return [];

  return parseCsv(fs.readFileSync(BACKUP_PATH, "utf8")).map((row) => ({
    category: row.category,
    detected_diameter: row.diameter,
    detected_grit: row.grit,
    detected_holder: row.holder,
    detected_model: row.model,
    image_source: row.proposed_image_url ? `copy family product image: ${row.proposed_image_url}` : "",
    proposed_product_id: row.target_product_id,
    proposed_variant_code: row.proposed_variant_code,
    proposed_variant_name: row.proposed_name,
    reference_name: row.reference_name,
    reference_sku: row.reference_sku,
    target_existing_family: row.target_family,
  }));
}

async function fetchProducts(supabase) {
  const { data, error } = await supabase
    .from("products")
    .select("id,brand,category_id,image_url,is_active,product_group_code,product_name,category:categories(name,slug)")
    .eq("brand", "JOTA")
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return {
    byId: new Map((data ?? []).map((product) => [product.id, product])),
    rows: data ?? [],
  };
}

async function fetchExistingVariants(supabase, previewRows) {
  const skus = previewRows.map((row) => row.reference_sku);
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,product_id,variant_code,is_active")
    .in("variant_code", skus);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((variant) => [normalizeSku(variant.variant_code), variant]));
}

async function countDuplicateSkus(supabase) {
  const { data, error } = await supabase.from("product_variants").select("variant_code").limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map();
  for (const row of data ?? []) {
    const key = normalizeSku(row.variant_code);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function buildDryRunRows({ duplicateSkuCount, existingVariants, previewRows, products }) {
  return previewRows.map((row) => {
    const sku = normalizeSku(row.reference_sku);
    const parsed = parseReferenceSku(sku);
    const existingVariant = existingVariants.get(sku);
    const product = existingVariant
      ? products.byId.get(existingVariant.product_id) ?? products.byId.get(row.proposed_product_id)
      : findBestProduct(row, parsed, products) ?? products.byId.get(row.proposed_product_id);
    const imageUrl = extractImageUrl(row.image_source) || product?.image_url || "";
    const category = product?.category?.name ?? row.category ?? "";
    const brand = product?.brand ?? "JOTA";
    const reasons = [];

    if (!EXPECTED_BATCH_SKUS.has(sku)) reasons.push("not_expected_batch_sku");
    if (!product) reasons.push("target_product_not_found");
    if (product && !product.is_active) reasons.push("target_product_inactive");
    if (existingVariant) reasons.push(`variant_already_exists:${existingVariant.id}`);
    if (!parsed.model) reasons.push("missing_model");
    if (!parsed.shaft) reasons.push("missing_holder");
    if (!parsed.diameter) reasons.push("missing_diameter");
    if (duplicateSkuCount > 0) reasons.push("existing_duplicate_sku_groups_present");

    return {
      reference_sku: row.reference_sku,
      reference_name: row.reference_name,
      action: existingVariant ? "skip_existing_variant" : "insert_inactive_variant",
      target_family: row.target_existing_family,
      target_product_id: product?.id ?? row.proposed_product_id,
      new_product_needed: "false",
      new_variant_needed: existingVariant ? "false" : "true",
      category,
      brand,
      model: parsed.model || row.detected_model,
      holder: parsed.shaft || normalizeHolder(row.detected_holder),
      diameter: parsed.diameter || row.detected_diameter,
      grit: parsed.grit || row.detected_grit,
      proposed_name: row.reference_name,
      proposed_variant_code: row.reference_sku,
      proposed_image_url: imageUrl,
      proposed_price: "",
      proposed_stock: "0",
      proposed_active_state: "inactive_variant",
      safe_to_insert: reasons.length === 0 ? "true" : "false",
      reason: reasons.length
        ? reasons.join("; ")
        : "Safe inactive variant insert. Price is null and stock is 0 for admin completion before activation.",
    };
  });
}

function parseReferenceSku(sku) {
  const parts = normalizeSku(sku).split("-");
  const model = parts[1] ?? "";
  const holderToken = parts[2] ?? "";
  const diameter = parts[3] ?? "";
  const { grit, shaft } = splitGritHolder(holderToken);
  return { diameter, grit, holderToken, model, shaft };
}

function splitGritHolder(value) {
  const token = normalizeSku(value);
  const normalizedToken = token === "EFG" ? "EFFG" : token;
  const match = normalizedToken.match(/^(SG|EF|G|F)?(FG|RA|HP)$/);
  if (!match) return { grit: "", shaft: token };
  return { grit: match[1] ?? "", shaft: match[2] };
}

function normalizeHolder(value) {
  return splitGritHolder(value).shaft;
}

function findBestProduct(row, parsed, products) {
  const candidates = products.rows.filter((product) => product.is_active && looksLikeModel(product.product_name, parsed.model));
  if (!candidates.length) return null;

  const scored = candidates
    .map((product) => ({ product, score: scoreProductMatch(product, row, parsed) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.product.product_name.localeCompare(b.product.product_name, "tr-TR"));

  return scored[0]?.product ?? null;
}

function scoreProductMatch(product, row, parsed) {
  const text = normalizeText(`${product.product_name} ${product.product_group_code}`);
  const model = normalizeModel(parsed.model);
  const grit = normalizeSku(parsed.grit);
  let score = 0;

  if (text.includes(model.toLowerCase())) score += 20;
  if (product.id === row.proposed_product_id) score += 1;

  if (grit) {
    if (text.includes(`${model}${grit}`.toLowerCase())) score += 30;
    if (grit === "EF" && (text.includes("extra ince") || text.includes("sari"))) score += 12;
    if (grit === "F" && (text.includes("ince") || text.includes("kirmizi"))) score += 10;
    if (grit === "G" && (text.includes("kaba") || text.includes("yesil"))) score += 10;
    if (grit === "SG" && (text.includes("super kaba") || text.includes("siyah"))) score += 10;
  } else {
    if (text.includes(`${model}g`.toLowerCase()) || text.includes(`${model}f`.toLowerCase()) || text.includes(`${model}sg`.toLowerCase())) {
      score -= 25;
    }
    if (text.includes("mavi") || text.includes("standard")) score += 12;
  }

  return score;
}

function looksLikeModel(productName, model) {
  const text = normalizeText(productName);
  const normalizedModel = normalizeModel(model).toLowerCase();
  return text.includes(normalizedModel);
}

function normalizeModel(model) {
  return normalizeSku(model).replace(/O/g, "0");
}

function extractImageUrl(value) {
  return String(value ?? "").match(/https?:\/\/\S+/)?.[0] ?? "";
}

function writeInsertBackup(dryRunRows) {
  fs.writeFileSync(BACKUP_PATH, toCsv(dryRunRows, dryRunHeaders()), "utf8");
  console.log(`Insert backup written: ${BACKUP_PATH}`);
}

function dryRunHeaders() {
  return [
    "reference_sku",
    "reference_name",
    "action",
    "target_family",
    "target_product_id",
    "new_product_needed",
    "new_variant_needed",
    "category",
    "brand",
    "model",
    "holder",
    "diameter",
    "grit",
    "proposed_name",
    "proposed_variant_code",
    "proposed_image_url",
    "proposed_price",
    "proposed_stock",
    "proposed_active_state",
    "safe_to_insert",
    "reason",
  ];
}

function parseCsv(contents) {
  const [headerLine, ...lines] = contents.replace(/^\uFEFF/u, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  values.push(current);
  return values;
}

function toCsv(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function normalizeSku(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}
