import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types.ts";

type Product = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "brand" | "id" | "is_active" | "product_group_code" | "product_name"
>;
type Variant = Pick<
  Database["public"]["Tables"]["product_variants"]["Row"],
  "id" | "product_id"
>;
type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];

type CsvRow = {
  price: number | null;
  priceText: string;
  productName: string;
  rowNumber: number;
  sku: string;
};

type CreatePlan = {
  matchSource: "sku" | "product_name" | "none";
  price: number | null;
  product: Product;
  row: CsvRow | null;
};

type AmbiguousMatch = {
  basis: "sku" | "product_name";
  key: string;
  product: Product;
  reason: string;
  rows: CsvRow[];
};

type SkippedRow = {
  details: string;
  entity: "csv" | "product";
  identifier: string;
  reason: string;
  rowNumber: number | null;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = path.join(
  projectRoot,
  "imports/dentech_jota_haric_tum_urunler_paket_fiyatlari_tl.csv"
);
const reportPaths = {
  ambiguous: path.join(projectRoot, "imports/non-jota-bootstrap-report-ambiguous.csv"),
  create: path.join(projectRoot, "imports/non-jota-bootstrap-report-create.csv"),
  skipped: path.join(projectRoot, "imports/non-jota-bootstrap-report-skipped.csv"),
};

const commit = parseArgs(process.argv.slice(2));
await loadLocalEnv(path.join(projectRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const csvRows = await readPriceCsv(csvPath);
let state = await fetchState();
let plan = buildPlan(csvRows, state.products, state.activeVariants);

if (commit) {
  // Narrow the read/write race and ensure a stale dry-run cannot drive the commit.
  state = await fetchState();
  plan = buildPlan(csvRows, state.products, state.activeVariants);
}

await writeReports(plan);
printSummary(plan, state.products, state.activeVariants, commit);

if (commit) {
  await applyCreates(plan.creates);
  console.log(`\nCommitted ${plan.creates.length} variant create(s).`);
} else {
  console.log("\nDry-run only. Run npm run nonjota:commit to insert these variants.");
}

function parseArgs(args: string[]) {
  const unknown = args.filter((arg) => arg !== "--commit");
  if (unknown.length) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  }
  return args.includes("--commit");
}

async function fetchState() {
  const [products, activeVariants] = await Promise.all([
    fetchProducts(),
    fetchActiveVariants(),
  ]);

  return {
    activeVariants,
    products: products.filter((product) => normalize(product.brand) !== "JOTA"),
  };
}

async function fetchProducts() {
  const rows: Product[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id,brand,is_active,product_group_code,product_name")
      .eq("is_active", true)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Failed to read products: ${error.message}`);

    const page = (data ?? []) as Product[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchActiveVariants() {
  const rows: Variant[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id,product_id")
      .eq("is_active", true)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Failed to read product_variants: ${error.message}`);

    const page = (data ?? []) as Variant[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function buildPlan(csvRows: CsvRow[], products: Product[], activeVariants: Variant[]) {
  const activeProductIds = new Set(activeVariants.map((variant) => variant.product_id));
  const eligible = products.filter((product) => !activeProductIds.has(product.id));
  const validRows = csvRows.filter((row) => row.price !== null);
  const skuIndex = groupBy(validRows, (row) => normalize(row.sku));
  const csvNameIndex = groupBy(validRows, (row) => normalize(row.productName));
  const productNameIndex = groupBy(products, (product) => normalize(product.product_name));
  const usedRows = new Set<number>();
  const creates: CreatePlan[] = [];
  const ambiguous: AmbiguousMatch[] = [];
  const skipped: SkippedRow[] = [];

  for (const product of products) {
    if (activeProductIds.has(product.id)) {
      skipped.push({
        details: product.product_name,
        entity: "product",
        identifier: product.product_group_code,
        reason: "already_has_active_variant",
        rowNumber: null,
      });
    }
  }

  for (const row of csvRows) {
    if (row.price === null) {
      skipped.push({
        details: `${row.productName} | price=${row.priceText || "empty"}`,
        entity: "csv",
        identifier: row.sku,
        reason: "invalid_or_missing_price",
        rowNumber: row.rowNumber,
      });
    }
  }

  for (const product of eligible) {
    const codeKey = normalize(product.product_group_code);
    if (!codeKey) {
      skipped.push({
        details: product.product_name,
        entity: "product",
        identifier: product.id,
        reason: "missing_product_group_code",
        rowNumber: null,
      });
      continue;
    }

    const skuRows = skuIndex.get(codeKey) ?? [];
    if (skuRows.length === 1) {
      usedRows.add(skuRows[0].rowNumber);
      creates.push({ matchSource: "sku", price: skuRows[0].price, product, row: skuRows[0] });
      continue;
    }
    if (skuRows.length > 1) {
      skuRows.forEach((row) => usedRows.add(row.rowNumber));
      ambiguous.push({
        basis: "sku",
        key: codeKey,
        product,
        reason: "multiple priced CSV rows share the exact normalized SKU",
        rows: skuRows,
      });
      creates.push({ matchSource: "none", price: null, product, row: null });
      continue;
    }

    const nameKey = normalize(product.product_name);
    const nameRows = nameKey ? (csvNameIndex.get(nameKey) ?? []) : [];
    const matchingProducts = nameKey ? (productNameIndex.get(nameKey) ?? []) : [];

    if (nameRows.length === 1 && matchingProducts.length === 1) {
      usedRows.add(nameRows[0].rowNumber);
      creates.push({
        matchSource: "product_name",
        price: nameRows[0].price,
        product,
        row: nameRows[0],
      });
      continue;
    }
    if (nameRows.length > 0 && (nameRows.length > 1 || matchingProducts.length > 1)) {
      nameRows.forEach((row) => usedRows.add(row.rowNumber));
      ambiguous.push({
        basis: "product_name",
        key: nameKey,
        product,
        reason:
          nameRows.length > 1
            ? "multiple priced CSV rows share the exact normalized product name"
            : "product name is not unique among active non-JOTA products",
        rows: nameRows,
      });
    }

    creates.push({ matchSource: "none", price: null, product, row: null });
  }

  for (const row of validRows) {
    if (!usedRows.has(row.rowNumber)) {
      skipped.push({
        details: `${row.productName} | price=${row.price}`,
        entity: "csv",
        identifier: row.sku,
        reason: "no_eligible_exact_product_match",
        rowNumber: row.rowNumber,
      });
    }
  }

  return { ambiguous, creates, skipped };
}

async function readPriceCsv(filePath: string): Promise<CsvRow[]> {
  const records = parseCsv(await readFile(filePath, "utf8"));
  const [headers, ...dataRows] = records;
  if (!headers) throw new Error("Price CSV is empty.");

  const indexes = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const skuIndex = indexes.get("sku");
  const nameIndex = indexes.get("ürün adı");
  const priceIndex = indexes.get("fiyat tl");
  if (skuIndex === undefined || nameIndex === undefined || priceIndex === undefined) {
    throw new Error("Price CSV must include sku, ürün adı, and fiyat (tl) columns.");
  }

  return dataRows
    .map((row, index) => {
      const priceText = clean(row[priceIndex]);
      return {
        price: parsePrice(priceText),
        priceText,
        productName: clean(row[nameIndex]),
        rowNumber: index + 2,
        sku: clean(row[skuIndex]),
      };
    })
    .filter((row) => row.sku || row.productName || row.priceText);
}

function parseCsv(contents: string) {
  const firstLine = contents.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = count(firstLine, ";") > count(firstLine, ",") ? ";" : ",";
  const records: string[][] = [];
  let cell = "";
  let record: string[] = [];
  let quoted = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      record.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(cell);
      if (record.some((value) => value.trim())) records.push(record);
      cell = "";
      record = [];
    } else {
      cell += char;
    }
  }

  record.push(cell);
  if (record.some((value) => value.trim())) records.push(record);
  return records;
}

function normalize(value: string) {
  return clean(value)
    .toLocaleUpperCase("tr-TR")
    .replace(/[\s._\-\u2010-\u2015]/gu, "");
}

function normalizeHeader(value: string) {
  return clean(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ");
}

function parsePrice(value: string) {
  if (!value) return null;
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

async function writeReports(plan: ReturnType<typeof buildPlan>) {
  await Promise.all([
    writeCsv(
      reportPaths.create,
      [
        "product_id",
        "brand",
        "product_group_code",
        "product_name",
        "variant_code",
        "price",
        "currency",
        "stock_quantity",
        "stock_status",
        "package_quantity",
        "match_source",
        "csv_row",
      ],
      plan.creates.map((item) => [
        item.product.id,
        item.product.brand,
        item.product.product_group_code,
        item.product.product_name,
        item.product.product_group_code,
        item.price === null ? "" : String(item.price),
        "TRY",
        "50",
        "in_stock",
        "1",
        item.matchSource,
        item.row ? String(item.row.rowNumber) : "",
      ])
    ),
    writeCsv(
      reportPaths.skipped,
      ["entity", "row_number", "identifier", "reason", "details"],
      plan.skipped.map((item) => [
        item.entity,
        item.rowNumber === null ? "" : String(item.rowNumber),
        item.identifier,
        item.reason,
        item.details,
      ])
    ),
    writeCsv(
      reportPaths.ambiguous,
      [
        "product_id",
        "product_group_code",
        "product_name",
        "match_basis",
        "normalized_key",
        "csv_rows",
        "csv_skus",
        "csv_prices",
        "reason",
      ],
      plan.ambiguous.map((item) => [
        item.product.id,
        item.product.product_group_code,
        item.product.product_name,
        item.basis,
        item.key,
        item.rows.map((row) => row.rowNumber).join(" | "),
        item.rows.map((row) => row.sku).join(" | "),
        item.rows.map((row) => row.price).join(" | "),
        item.reason,
      ])
    ),
  ]);
}

async function writeCsv(filePath: string, headers: string[], rows: string[][]) {
  const contents = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
  await writeFile(filePath, `${contents}\n`, "utf8");
}

function printSummary(
  plan: ReturnType<typeof buildPlan>,
  products: Product[],
  activeVariants: Variant[],
  isCommit: boolean
) {
  const activeProductIds = new Set(activeVariants.map((variant) => variant.product_id));
  const alreadyActive = products.filter((product) => activeProductIds.has(product.id)).length;
  const matched = plan.creates.filter((item) => item.price !== null).length;

  console.log(`Non-JOTA bootstrap ${isCommit ? "COMMIT" : "DRY-RUN"} report`);
  console.log(`Active non-JOTA products total: ${products.length}`);
  console.log(`Products already having active variants: ${alreadyActive}`);
  console.log(`Variants to create: ${plan.creates.length}`);
  console.log(`With matched CSV price: ${matched}`);
  console.log(`Without price: ${plan.creates.length - matched}`);
  console.log(`Ambiguous matches: ${plan.ambiguous.length}`);
  console.log(`Skipped rows: ${plan.skipped.length}`);

  printSamples(
    "Sample creates",
    plan.creates.map(
      (item) =>
        `${item.product.product_group_code} | ${item.product.product_name} | price=${item.price ?? "null"} | ${item.matchSource}`
    )
  );
  printSamples(
    "Sample unmatched products",
    plan.creates
      .filter((item) => item.matchSource === "none")
      .map((item) => `${item.product.product_group_code} | ${item.product.product_name}`)
  );
}

async function applyCreates(creates: CreatePlan[]) {
  if (!creates.length) return;

  const payload: VariantInsert[] = creates.map((item) => ({
    currency: "TRY",
    is_active: true,
    package_quantity: 1,
    price: item.price,
    product_id: item.product.id,
    stock_quantity: 50,
    stock_status: "in_stock",
    variant_code: item.product.product_group_code,
  }));
  const { error } = await supabase.from("product_variants").insert(payload);
  if (error) throw new Error(`Variant bootstrap failed: ${error.message}`);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function printSamples(label: string, values: string[]) {
  console.log(`\n${label}:`);
  if (!values.length) {
    console.log("- none");
    return;
  }
  for (const value of values.slice(0, 10)) console.log(`- ${value}`);
}

function escapeCsv(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function clean(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

function count(value: string, character: string) {
  return value.split(character).length - 1;
}

async function loadLocalEnv(envPath: string) {
  try {
    const contents = await readFile(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
