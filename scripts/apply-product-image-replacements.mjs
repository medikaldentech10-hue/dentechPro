import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const TARGET_TYPES = new Set(["product", "variant", "family"]);
const JOTA_SUFFIXES = ["SG", "SF", "XC", "UF", "C", "F", "G", "M"];

main().catch((error) => {
  console.error("[image-replacements] failed", error);
  process.exitCode = 1;
});

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const mappingPath = args.find((arg) => !arg.startsWith("--"));

  if (!mappingPath) {
    throw new Error(
      "Usage: node scripts/apply-product-image-replacements.mjs <mapping.csv> [--apply]"
    );
  }

  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping CSV not found: ${mappingPath}`);
  }

  const rows = parseCsv(fs.readFileSync(mappingPath, "utf8"));
  const env = readEnvFile(".env.local");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const familyIndex = await getFamilyIndex(supabase);
  const results = [];

  console.log("\nDentech Pro product image replacement workflow");
  console.log("------------------------------------------------");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Mapping CSV: ${path.resolve(mappingPath)}`);
  console.log(`Rows read: ${rows.length}`);

  for (const [index, row] of rows.entries()) {
    const result = await processRow({
      apply,
      row: normalizeRow(row),
      rowNumber: index + 2,
      supabase,
      familyIndex,
    });
    results.push(result);
    printResult(result);
  }

  const summary = summarize(results);
  console.log("\nSummary");
  console.log("-------");
  console.log(`Valid changes: ${summary.valid}`);
  console.log(`Applied changes: ${summary.applied}`);
  console.log(`Dry-run changes: ${summary.dryRun}`);
  console.log(`Skipped unchanged: ${summary.unchanged}`);
  console.log(`Skipped invalid/error: ${summary.skipped}`);
  console.log(
    apply
      ? "Apply mode completed. Re-run npm.cmd run audit:images to verify catalog image coverage."
      : "Dry-run only. No database rows were updated. Add --apply when the mapping has been reviewed."
  );
}

async function processRow({ apply, row, rowNumber, supabase, familyIndex }) {
  const validationError = validateRow(row);
  if (validationError) {
    return {
      rowNumber,
      status: "skipped",
      reason: validationError,
      row,
    };
  }

  try {
    const target = await resolveTarget({ row, supabase, familyIndex });
    if (!target) {
      return {
        rowNumber,
        status: "skipped",
        reason: "Target not found",
        row,
      };
    }

    if (
      row.current_image_url &&
      target.currentImageUrl &&
      normalizeUrl(row.current_image_url) !== normalizeUrl(target.currentImageUrl)
    ) {
      return {
        rowNumber,
        status: "skipped",
        reason: "Current image URL mismatch; refresh mapping before applying",
        row,
        target,
      };
    }

    if (normalizeUrl(target.currentImageUrl) === normalizeUrl(row.new_image_path_or_url)) {
      return {
        rowNumber,
        status: "unchanged",
        reason: "New image is already set",
        row,
        target,
      };
    }

    if (!apply) {
      return {
        rowNumber,
        status: "dry-run",
        row,
        target,
      };
    }

    const error = await updateTargetImage({ supabase, target, newImageUrl: row.new_image_path_or_url });
    if (error) {
      return {
        rowNumber,
        status: "skipped",
        reason: error.message,
        row,
        target,
      };
    }

    return {
      rowNumber,
      status: "applied",
      row,
      target,
    };
  } catch (error) {
    return {
      rowNumber,
      status: "skipped",
      reason: error.message,
      row,
    };
  }
}

async function resolveTarget({ row, supabase, familyIndex }) {
  if (row.target_type === "product") {
    const { data, error } = await supabase
      .from("products")
      .select("id,product_name,image_url")
      .eq("id", row.product_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      label: data.product_name,
      table: "products",
      targetType: "product",
      currentImageUrl: data.image_url ?? "",
    };
  }

  if (row.target_type === "variant") {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id,variant_code,image_url,product:products(product_name)")
      .eq("id", row.variant_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      label: `${data.product?.product_name ?? "Variant"} / ${data.variant_code ?? data.id}`,
      table: "product_variants",
      targetType: "variant",
      currentImageUrl: data.image_url ?? "",
    };
  }

  const family = familyIndex.get(row.family_key);
  if (!family) {
    return null;
  }

  const product =
    row.product_id && isUuidLike(row.product_id)
      ? family.products.find((candidate) => candidate.id === row.product_id)
      : family.products[0];

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    label: `${product.product_name} (family representative: ${row.family_key})`,
    table: "products",
    targetType: "family",
    currentImageUrl: product.image_url ?? "",
  };
}

async function updateTargetImage({ supabase, target, newImageUrl }) {
  const { error } = await supabase
    .from(target.table)
    .update({ image_url: newImageUrl })
    .eq("id", target.id);

  return error;
}

async function getFamilyIndex(supabase) {
  const { data, error } = await supabase
    .from("products")
    .select("id,product_name,image_url,is_active")
    .order("product_name", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const index = new Map();
  for (const product of data ?? []) {
    const familyKey = getGroupedFamilyKey(product.product_name);
    if (!familyKey) continue;

    const existing = index.get(familyKey) ?? { familyKey, products: [] };
    existing.products.push(product);
    index.set(familyKey, existing);
  }

  return index;
}

function validateRow(row) {
  if (!TARGET_TYPES.has(row.target_type)) {
    return "target_type must be product, variant, or family";
  }

  if (!row.new_image_path_or_url) {
    return "new_image_path_or_url is required";
  }

  if (!isLikelyImagePathOrUrl(row.new_image_path_or_url)) {
    return "new_image_path_or_url must look like an image path or URL";
  }

  if (row.target_type === "product" && !isUuidLike(row.product_id)) {
    return "product target requires product_id";
  }

  if (row.target_type === "variant" && !isUuidLike(row.variant_id)) {
    return "variant target requires variant_id";
  }

  if (row.target_type === "family" && !row.family_key) {
    return "family target requires family_key";
  }

  return "";
}

function normalizeRow(row) {
  return {
    target_type: normalizeText(row.target_type),
    product_id: row.product_id?.trim() ?? "",
    variant_id: row.variant_id?.trim() ?? "",
    family_key: slugify(row.family_key ?? ""),
    current_image_url: row.current_image_url?.trim() ?? "",
    new_image_path_or_url: row.new_image_path_or_url?.trim() ?? "",
    notes: row.notes?.trim() ?? "",
  };
}

function printResult(result) {
  const prefix = `[row ${result.rowNumber}] ${result.status.toUpperCase()}`;
  if (result.status === "skipped" || result.status === "unchanged") {
    console.log(`${prefix}: ${result.reason}`);
    return;
  }

  console.log(`${prefix}: ${result.target.targetType} ${result.target.id}`);
  console.log(`  ${result.target.label}`);
  console.log(`  before: ${result.target.currentImageUrl || "(empty)"}`);
  console.log(`  after:  ${result.row.new_image_path_or_url}`);
}

function summarize(results) {
  return {
    valid: results.filter((result) => ["dry-run", "applied"].includes(result.status)).length,
    applied: results.filter((result) => result.status === "applied").length,
    dryRun: results.filter((result) => result.status === "dry-run").length,
    unchanged: results.filter((result) => result.status === "unchanged").length,
    skipped: results.filter((result) => result.status === "skipped").length,
  };
}

function getGroupedFamilyKey(productName) {
  const normalized = normalizeText(productName);
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

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value ?? ""
  );
}

function isLikelyImagePathOrUrl(value) {
  return /^(https?:\/\/|\/|\.\/|public\/|images\/).+\.(png|webp|jpe?g)(\?.*)?$/i.test(
    value
  );
}

function normalizeUrl(value) {
  return String(value ?? "").trim();
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
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
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

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const contents = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}
