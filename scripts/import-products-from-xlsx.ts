import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types.ts";

type CellValue = boolean | number | string | null;

type WorkbookRow = Record<string, CellValue> & {
  __rowNumber: number;
};

type WorkbookSheet = {
  headers: string[];
  name: string;
  nonEmptyRowCount: number;
  rows: WorkbookRow[];
};

type WorkbookPayload = {
  sheets: WorkbookSheet[];
};

type ParsedArgs = {
  commit: boolean;
  dryRun: boolean;
  fullSync: boolean;
  workbookPath: string;
};

type ProductRow = {
  action: string;
  adminNotes: string | null;
  brand: string | null;
  brandCode: string | null;
  catalogOrder: number | null;
  categoryCode: string | null;
  categoryName: string | null;
  defaultPackSize: number | null;
  description: string | null;
  familyCode: string | null;
  imageUrl: string | null;
  isActive: boolean | null;
  launchStatus: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  modelCode: string | null;
  packageLogic: string | null;
  productGroupCode: string | null;
  productName: string | null;
  shortDescription: string | null;
  slug: string | null;
  sourceNote: string | null;
  usageArea: string | null;
  vatRate: number | null;
  workbookRowNumber: number;
};

type VariantRow = {
  action: string;
  adminNotes: string | null;
  barcode: string | null;
  brandCode: string | null;
  clinicalNote: string | null;
  colorCode: string | null;
  connectionType: string | null;
  currency: string | null;
  diameter: number | null;
  gritLabel: string | null;
  imageUrl: string | null;
  isActive: boolean | null;
  lengthMm: number | null;
  manufacturerRef: string | null;
  minOrderQty: number | null;
  packSize: number | null;
  price: number | null;
  productGroupCode: string | null;
  requestable: boolean | null;
  shapeModel: string | null;
  sortOrder: number | null;
  stockQuantity: number | null;
  stockStatus: VariantStockStatus | null;
  unit: string | null;
  variantName: string | null;
  variantSku: string | null;
  vatRate: number | null;
  workbookRowNumber: number;
};

type StockRow = {
  countedBy: string | null;
  currentStockQuantity: number | null;
  lastCountDate: string | null;
  newStockQuantity: number | null;
  notes: string | null;
  productGroupCode: string | null;
  reorderLevel: number | null;
  stockStatus: VariantStockStatus | null;
  variantExistsCheck: string | null;
  variantName: string | null;
  variantSku: string | null;
  warehouse: string | null;
  workbookRowNumber: number;
};

type BrandListRow = {
  brandCode: string;
  brandName: string;
};

type CategoryListRow = {
  categoryCode: string;
  categoryName: string;
};

type ImportCategoryNode = {
  key: string;
  level: number;
  name: string;
  parentKey: string | null;
  slug: string;
  sortOrder: number;
};

type PreparedProduct = {
  brand: string;
  categoryKey: string;
  defaultPackSize: number | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  launchStatus: string | null;
  packageLogic: string | null;
  productGroupCode: string;
  productName: string;
  shortDescription: string | null;
  slug: string | null;
  sourceNote: string | null;
  usageArea: string | null;
  vatRate: number | null;
  variantRows: PreparedVariant[];
  workbookRowNumber: number;
};

type PreparedVariant = {
  barcode: string | null;
  clinicalNote: string | null;
  colorCode: string | null;
  connectionType: string | null;
  currency: string;
  diameter: number | null;
  gritLabel: string | null;
  imageUrl: string | null;
  isActive: boolean;
  lengthMm: number | null;
  manufacturerRef: string | null;
  minOrderQty: number | null;
  packSize: number;
  price: number | null;
  productGroupCode: string;
  requestable: boolean | null;
  shapeModel: string | null;
  sortOrder: number | null;
  stockQuantity: number | null;
  stockStatus: VariantStockStatus | null;
  unit: string | null;
  variantName: string;
  variantSku: string;
  vatRate: number | null;
  workbookRowNumber: number;
};

type ValidationIssue = {
  code: string;
  details?: string;
  level: "error" | "warning";
  rowNumber?: number;
  sheet?: string;
};

type ExistingCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  status: string;
};

type ExistingProduct = {
  brand: string;
  category_id: string | null;
  description: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  product_group_code: string;
  product_name: string;
  usage_area: string | null;
};

type ExistingVariant = {
  color: string | null;
  connection_type: string | null;
  currency: string;
  diameter: number | null;
  grit: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean;
  length: number | null;
  manufacturer_ref: string | null;
  package_quantity: number;
  price: number | null;
  product_id: string;
  stock_quantity: number;
  stock_status: string;
  sort_order: number;
  variant_code: string;
};

type DryRunSummary = {
  categoriesToCreate: number;
  categoriesToUpdate: number;
  productsToCreate: number;
  productsToDeactivateIfFullSync: number;
  productsToUpdate: number;
  stockRowsMatched: number;
  stockRowsUnmatched: number;
  variantsToCreate: number;
  variantsToDeactivateIfFullSync: number;
  variantsToUpdate: number;
};

type AdminSupabase = ReturnType<typeof createClient<Database>>;
type VariantStockStatus = Database["public"]["Tables"]["product_variants"]["Row"]["stock_status"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const defaultWorkbookPath = path.join(projectRoot, "imports", "dentech_urunler_doldurulmus.xlsx");

const EXPECTED_SHEETS = [
  "01_PRODUCTS",
  "02_VARIANTS",
  "03_STOCK_UPDATE",
  "04_LISTS",
  "05_IMPORT_RULES",
  "06_JOTA_EXAMPLE",
] as const;

const REQUIRED_PRODUCT_HEADERS = ["product_group_code", "product_name", "is_active"] as const;
const REQUIRED_VARIANT_HEADERS = ["product_group_code", "variant_sku", "is_active"] as const;

const PYTHON_CANDIDATES: Array<{ args: string[]; command: string }> = [
  ...(process.env.DENTECH_IMPORT_PYTHON
    ? [{ args: [] as string[], command: process.env.DENTECH_IMPORT_PYTHON }]
    : []),
  ...(process.env.PYTHON ? [{ args: [] as string[], command: process.env.PYTHON }] : []),
  {
    args: [],
    command:
      "C:\\Users\\samet\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe",
  },
  { args: [], command: "python" },
  { args: ["-3"], command: "py" },
];

const args = parseArgs(process.argv.slice(2));

await loadLocalEnv(path.join(projectRoot, ".env.local"));

const workbook = readWorkbookWithPython(args.workbookPath);
const workbookSheetMap = new Map(workbook.sheets.map((sheet) => [sheet.name, sheet]));
const detectedColumns = Object.fromEntries(
  workbook.sheets.map((sheet) => [sheet.name, sheet.headers])
);

const sheetIssues = validateWorkbookSheets(workbook.sheets);
const productsSheet = requireSheet(workbookSheetMap, "01_PRODUCTS");
const variantsSheet = requireSheet(workbookSheetMap, "02_VARIANTS");
const stockSheet = workbookSheetMap.get("03_STOCK_UPDATE") ?? null;
const listsSheet = workbookSheetMap.get("04_LISTS") ?? null;

const productsRaw = productsSheet.rows.map(mapProductRow);
const variantsRaw = variantsSheet.rows.map(mapVariantRow);
const stockRaw = stockSheet?.rows.map(mapStockRow) ?? [];
const listLookups = buildListLookups(listsSheet?.rows ?? []);

const validationIssues: ValidationIssue[] = [...sheetIssues];
const categoryNodes = new Map<string, ImportCategoryNode>();
const preparedProducts = new Map<string, PreparedProduct>();
const preparedVariants = new Map<string, PreparedVariant>();
const stockRowsBySku = new Map<string, StockRow>();
const unmatchedStockRows: StockRow[] = [];
const stockMatches = new Set<string>();

collectProducts({
  categoryNodes,
  issues: validationIssues,
  listLookups,
  preparedProducts,
  rows: productsRaw,
});

collectVariants({
  issues: validationIssues,
  preparedProducts,
  preparedVariants,
  rows: variantsRaw,
});

mergeStockUpdates({
  issues: validationIssues,
  matchedStockRows: stockMatches,
  preparedVariants,
  rows: stockRaw,
  stockRowsBySku,
  unmatchedStockRows,
});

runReadinessValidations({
  issues: validationIssues,
  preparedProducts,
  preparedVariants,
  productsRaw,
  unmatchedStockRows,
});

const htmlScriptLikeDescriptionCount = productsRaw.filter((row) =>
  looksScriptLike(row.description)
).length;

const fatalIssues = validationIssues.filter((issue) => issue.level === "error");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for import script."
  );
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const [existingCategories, existingProducts, existingVariants] = await Promise.all([
  fetchExistingCategories(supabase),
  fetchExistingProducts(supabase),
  fetchExistingVariants(supabase),
]);

const categoryPlan = buildCategoryPlan({
  categoryNodes,
  existingCategories,
});

const dryRunSummary = buildDryRunSummary({
  existingProducts,
  existingVariants,
  preparedProducts,
  preparedVariants,
  stockRowsMatched: stockMatches.size,
  stockRowsUnmatched: unmatchedStockRows.length,
  categoriesToCreate: categoryPlan.toCreate.length,
  categoriesToUpdate: categoryPlan.toUpdate.length,
});

printWorkbookReport({
  args,
  detectedColumns,
  dryRunSummary,
  fatalIssueCount: fatalIssues.length,
  htmlScriptLikeDescriptionCount,
  issueCount: validationIssues.length,
  listLookups,
  workbook,
});

printValidationIssues(validationIssues);
printNextNotes({
  args,
  dryRunSummary,
  htmlScriptLikeDescriptionCount,
});

if (args.commit) {
  if (fatalIssues.length > 0) {
    throw new Error(
      `Commit aborted because ${fatalIssues.length} fatal validation issue(s) were found.`
    );
  }

  await applyImport({
    args,
    categoryNodes,
    existingCategories,
    existingProducts,
    existingVariants,
    preparedProducts,
    preparedVariants,
    supabase,
  });

  console.info("[import.xlsx] commit completed", {
    fullSync: args.fullSync,
  });
} else {
  console.info("[import.xlsx] dry-run completed without database writes.");
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional = argv.filter((value) => !value.startsWith("--"));
  const commit = argv.includes("--commit");
  const fullSync = argv.includes("--full-sync");
  const dryRun = !commit || argv.includes("--dry-run");
  const workbookPath = positional[0] ? path.resolve(projectRoot, positional[0]) : defaultWorkbookPath;

  if (!existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  return {
    commit,
    dryRun,
    fullSync,
    workbookPath,
  };
}

function readWorkbookWithPython(workbookPath: string): WorkbookPayload {
  const pythonScript = `
import json
import sys
from openpyxl import load_workbook

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

workbook_path = sys.argv[1]
wb = load_workbook(workbook_path, read_only=True, data_only=True)
sheets = []

for ws in wb.worksheets:
    header_row_index = None
    headers = []
    rows = []
    non_empty_row_count = 0

    for row_index, row in enumerate(ws.iter_rows(values_only=True), start=1):
        values = list(row)
        if not any(cell is not None and str(cell).strip() for cell in values):
            continue

        non_empty_row_count += 1

        if header_row_index is None:
            header_row_index = row_index
            headers = [str(cell).strip() if cell is not None else "" for cell in values]
            continue

        record = {"__rowNumber": row_index}
        for index, header in enumerate(headers):
            if not header:
                continue
            cell = values[index] if index < len(values) else None
            record[header] = cell
        rows.append(record)

    sheets.append({
        "name": ws.title,
        "headers": headers,
        "rows": rows,
        "nonEmptyRowCount": non_empty_row_count,
    })

print(json.dumps({"sheets": sheets}, ensure_ascii=False, default=str))
`;

  let lastFailure = "";

  for (const candidate of PYTHON_CANDIDATES) {
    if (!candidate.command) {
      continue;
    }

    const probe = spawnSync(candidate.command, [...candidate.args, "-c", "import openpyxl"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (probe.error) {
      lastFailure = probe.error.message;
      continue;
    }

    if (probe.status !== 0) {
      lastFailure = probe.stderr || probe.stdout || `Unable to use ${candidate.command}`;
      continue;
    }

    const result = spawnSync(
      candidate.command,
      [...candidate.args, "-c", pythonScript, workbookPath],
      {
        encoding: "utf8",
        maxBuffer: 25 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    if (result.error) {
      lastFailure = result.error.message;
      continue;
    }

    if (result.status === 0) {
      return JSON.parse(result.stdout) as WorkbookPayload;
    }

    lastFailure = result.stderr || result.stdout || `Workbook read failed via ${candidate.command}`;
  }

  throw new Error(
    `Could not read XLSX workbook with Python/openpyxl. Last failure: ${lastFailure}`
  );
}

function validateWorkbookSheets(sheets: WorkbookSheet[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const names = new Set(sheets.map((sheet) => sheet.name));

  for (const expected of EXPECTED_SHEETS) {
    if (!names.has(expected) && expected !== "03_STOCK_UPDATE") {
      issues.push({
        code: "missing_sheet",
        details: `Expected sheet not found: ${expected}`,
        level: "error",
        sheet: expected,
      });
    }
  }

  const productsSheet = sheets.find((sheet) => sheet.name === "01_PRODUCTS");
  if (productsSheet) {
    for (const header of REQUIRED_PRODUCT_HEADERS) {
      if (!productsSheet.headers.includes(header)) {
        issues.push({
          code: "missing_product_header",
          details: `Missing product header: ${header}`,
          level: "error",
          sheet: "01_PRODUCTS",
        });
      }
    }
  }

  const variantsSheet = sheets.find((sheet) => sheet.name === "02_VARIANTS");
  if (variantsSheet) {
    for (const header of REQUIRED_VARIANT_HEADERS) {
      if (!variantsSheet.headers.includes(header)) {
        issues.push({
          code: "missing_variant_header",
          details: `Missing variant header: ${header}`,
          level: "error",
          sheet: "02_VARIANTS",
        });
      }
    }
  }

  return issues;
}

function requireSheet(sheetMap: Map<string, WorkbookSheet>, name: string) {
  const sheet = sheetMap.get(name);

  if (!sheet) {
    throw new Error(`Required sheet missing: ${name}`);
  }

  return sheet;
}

function mapProductRow(row: WorkbookRow): ProductRow {
  return {
    action: asString(row.action) ?? "upsert",
    adminNotes: asString(row.admin_notes),
    brand: asString(row.brand),
    brandCode: asString(row.brand_code),
    catalogOrder: asNumber(row.catalog_order),
    categoryCode: asString(row.category_code),
    categoryName: asString(row.category_name),
    defaultPackSize: asNumber(row.default_pack_size),
    description: asString(row.description),
    familyCode: asString(row.family_code),
    imageUrl: asString(row.image_url),
    isActive: asBoolean(row.is_active),
    launchStatus: asString(row.launch_status),
    metaDescription: asString(row.meta_description),
    metaTitle: asString(row.meta_title),
    modelCode: asString(row.model_code),
    packageLogic: asString(row.package_logic),
    productGroupCode: asString(row.product_group_code),
    productName: asString(row.product_name),
    shortDescription: asString(row.short_description),
    slug: asString(row.slug),
    sourceNote: asString(row.source_note),
    usageArea: asString(row.usage_area),
    vatRate: asNumber(row.vat_rate),
    workbookRowNumber: row.__rowNumber,
  };
}

function mapVariantRow(row: WorkbookRow): VariantRow {
  return {
    action: asString(row.action) ?? "upsert",
    adminNotes: asString(row.admin_notes),
    barcode: asString(row.barcode),
    brandCode: asString(row.brand_code),
    clinicalNote: asString(row.clinical_note),
    colorCode: asString(row.color_code),
    connectionType: asString(row.connection_type),
    currency: asString(row.currency),
    diameter: asNumber(row.diameter),
    gritLabel: asString(row.grit_label),
    imageUrl: asString(row.image_url),
    isActive: asBoolean(row.is_active),
    lengthMm: asNumber(row.length_mm),
    manufacturerRef: asString(row.manufacturer_ref),
    minOrderQty: asNumber(row.min_order_qty),
    packSize: asNumber(row.pack_size),
    price: asNumber(row.price),
    productGroupCode: asString(row.product_group_code),
    requestable: asBoolean(row.requestable),
    shapeModel: asString(row.shape_model),
    sortOrder: asNumber(row.sort_order),
    stockQuantity: asNumber(row.stock_quantity),
    stockStatus: normalizeStockStatus(asString(row.stock_status)),
    unit: asString(row.unit),
    variantName: asString(row.variant_name),
    variantSku: asString(row.variant_sku),
    vatRate: asNumber(row.vat_rate),
    workbookRowNumber: row.__rowNumber,
  };
}

function mapStockRow(row: WorkbookRow): StockRow {
  return {
    countedBy: asString(row.counted_by),
    currentStockQuantity: asNumber(row.current_stock_quantity),
    lastCountDate: asString(row.last_count_date),
    newStockQuantity: asNumber(row.new_stock_quantity),
    notes: asString(row.notes),
    productGroupCode: asString(row.product_group_code),
    reorderLevel: asNumber(row.reorder_level),
    stockStatus: normalizeStockStatus(asString(row.stock_status)),
    variantExistsCheck: asString(row.variant_exists_check),
    variantName: asString(row.variant_name),
    variantSku: asString(row.variant_sku),
    warehouse: asString(row.warehouse),
    workbookRowNumber: row.__rowNumber,
  };
}

function buildListLookups(rows: WorkbookRow[]) {
  const brandsByCode = new Map<string, BrandListRow>();
  const categoriesByCode = new Map<string, CategoryListRow>();

  for (const row of rows) {
    const brandCode = asString(row.BRAND_CODE);
    const brandName = asString(row.BRAND_NAME);
    const categoryCode = asString(row.CATEGORY_CODE);
    const categoryName = asString(row.CATEGORY_NAME);

    if (brandCode && brandName) {
      brandsByCode.set(brandCode.toUpperCase(), { brandCode, brandName });
    }

    if (categoryCode && categoryName) {
      categoriesByCode.set(categoryCode.toUpperCase(), { categoryCode, categoryName });
    }
  }

  return {
    brandsByCode,
    categoriesByCode,
  };
}

function collectProducts({
  categoryNodes,
  issues,
  listLookups,
  preparedProducts,
  rows,
}: {
  categoryNodes: Map<string, ImportCategoryNode>;
  issues: ValidationIssue[];
  listLookups: ReturnType<typeof buildListLookups>;
  preparedProducts: Map<string, PreparedProduct>;
  rows: ProductRow[];
}) {
  for (const row of rows) {
    const action = normalizeAction(row.action);
    if (action === "skip" || action === "delete") {
      issues.push({
        code: "product_row_skipped_by_action",
        details: `Ignored product row with action=${action}`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    const productGroupCode = row.productGroupCode?.trim();
    const productName = row.productName?.trim();
    const brand = resolveBrand(row.brand, row.brandCode, listLookups);
    const categoryPath = resolveCategoryPath(row.categoryName, row.categoryCode, listLookups);

    if (!productGroupCode) {
      issues.push({
        code: "missing_product_group_code",
        details: "Product row missing product_group_code",
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    if (!productName) {
      issues.push({
        code: "missing_product_name",
        details: `Product ${productGroupCode} missing product_name`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    if (!brand) {
      issues.push({
        code: "missing_brand",
        details: `Product ${productGroupCode} missing brand/brand_code`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    if (!categoryPath) {
      issues.push({
        code: "missing_category",
        details: `Product ${productGroupCode} missing category_name/category_code`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    if (preparedProducts.has(productGroupCode)) {
      issues.push({
        code: "duplicate_product_group_code",
        details: `Duplicate product_group_code: ${productGroupCode}`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
      continue;
    }

    const categoryKey = registerCategoryPath(categoryNodes, categoryPath);
    preparedProducts.set(productGroupCode, {
      brand,
      categoryKey,
      defaultPackSize: row.defaultPackSize,
      description: row.description,
      imageUrl: normalizeImageUrl(row.imageUrl),
      isActive: row.isActive ?? false,
      launchStatus: row.launchStatus,
      packageLogic: row.packageLogic,
      productGroupCode,
      productName,
      shortDescription: row.shortDescription,
      slug: row.slug,
      sourceNote: row.sourceNote,
      usageArea: row.usageArea,
      vatRate: row.vatRate,
      variantRows: [],
      workbookRowNumber: row.workbookRowNumber,
    });
  }
}

function collectVariants({
  issues,
  preparedProducts,
  preparedVariants,
  rows,
}: {
  issues: ValidationIssue[];
  preparedProducts: Map<string, PreparedProduct>;
  preparedVariants: Map<string, PreparedVariant>;
  rows: VariantRow[];
}) {
  for (const row of rows) {
    const action = normalizeAction(row.action);
    if (action === "skip" || action === "delete") {
      issues.push({
        code: "variant_row_skipped_by_action",
        details: `Ignored variant row with action=${action}`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    const productGroupCode = row.productGroupCode?.trim();
    const variantSku = row.variantSku?.trim();
    const product = productGroupCode ? preparedProducts.get(productGroupCode) : null;

    if (!productGroupCode) {
      issues.push({
        code: "missing_variant_product_group_code",
        details: "Variant row missing product_group_code",
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    if (!variantSku) {
      issues.push({
        code: "missing_variant_sku",
        details: `Variant row under ${productGroupCode} missing variant_sku`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    if (row.isActive !== false && isUuid(variantSku)) {
      issues.push({
        code: "invalid_active_variant_sku",
        details: `Active variant under ${productGroupCode} has placeholder variant_sku ${variantSku}`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    if (row.isActive === false && isUuid(variantSku)) {
      issues.push({
        code: "uuid_like_variant_sku",
        details: `Inactive variant under ${productGroupCode} has placeholder variant_sku ${variantSku}`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
    }

    if (!product) {
      issues.push({
        code: "variant_product_not_found",
        details: `Variant ${variantSku} references missing product_group_code ${productGroupCode}`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    if (preparedVariants.has(variantSku)) {
      issues.push({
        code: "duplicate_variant_sku",
        details: `Duplicate variant_sku: ${variantSku}`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    const duplicateInProduct = product.variantRows.find(
      (variant) =>
        getPreparedVariantIdentityKey(variant) ===
        getVariantRowIdentityKey(row, productGroupCode, product.defaultPackSize)
    );

    if (duplicateInProduct) {
      issues.push({
        code: "duplicate_variant_under_product",
        details: `Variant ${variantSku} looks like a duplicate of ${duplicateInProduct.variantSku} under ${productGroupCode}`,
        level: "error",
        rowNumber: row.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
      continue;
    }

    const preparedVariant: PreparedVariant = {
      barcode: row.barcode,
      clinicalNote: row.clinicalNote,
      colorCode: row.colorCode,
      connectionType: row.connectionType,
      currency: row.currency?.trim() || "TRY",
      diameter: row.diameter,
      gritLabel: row.gritLabel,
      imageUrl: normalizeImageUrl(row.imageUrl),
      isActive: row.isActive ?? false,
      lengthMm: row.lengthMm,
      manufacturerRef: row.manufacturerRef?.trim() || null,
      minOrderQty: row.minOrderQty,
      packSize: row.packSize ?? product.defaultPackSize ?? 1,
      price: row.price,
      productGroupCode,
      requestable: row.requestable,
      shapeModel: row.shapeModel,
      sortOrder: row.sortOrder,
      stockQuantity: row.stockQuantity,
      stockStatus: normalizeStockStatus(row.stockStatus),
      unit: row.unit,
      variantName: row.variantName?.trim() || variantSku,
      variantSku,
      vatRate: row.vatRate ?? product.vatRate,
      workbookRowNumber: row.workbookRowNumber,
    };

    preparedVariants.set(variantSku, preparedVariant);
    product.variantRows.push(preparedVariant);
  }
}

function mergeStockUpdates({
  issues,
  matchedStockRows,
  preparedVariants,
  rows,
  stockRowsBySku,
  unmatchedStockRows,
}: {
  issues: ValidationIssue[];
  matchedStockRows: Set<string>;
  preparedVariants: Map<string, PreparedVariant>;
  rows: StockRow[];
  stockRowsBySku: Map<string, StockRow>;
  unmatchedStockRows: StockRow[];
}) {
  for (const row of rows) {
    const variantSku = row.variantSku?.trim();

    if (!variantSku) {
      issues.push({
        code: "stock_row_missing_sku",
        details: "Stock update row missing variant_sku",
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "03_STOCK_UPDATE",
      });
      unmatchedStockRows.push(row);
      continue;
    }

    if (stockRowsBySku.has(variantSku)) {
      issues.push({
        code: "duplicate_stock_row",
        details: `Duplicate stock update row for ${variantSku}`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "03_STOCK_UPDATE",
      });
    }

    stockRowsBySku.set(variantSku, row);
    const variant = preparedVariants.get(variantSku);

    if (!variant) {
      unmatchedStockRows.push(row);
      issues.push({
        code: "unmatched_stock_row",
        details: `Stock update row could not match variant_sku ${variantSku}`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "03_STOCK_UPDATE",
      });
      continue;
    }

    matchedStockRows.add(variantSku);

    if (row.newStockQuantity !== null) {
      variant.stockQuantity = row.newStockQuantity;
    } else if (variant.stockQuantity === null && row.currentStockQuantity !== null) {
      variant.stockQuantity = row.currentStockQuantity;
    }

    if (row.stockStatus) {
      variant.stockStatus = normalizeStockStatus(row.stockStatus);
    }
  }
}

function runReadinessValidations({
  issues,
  preparedProducts,
  preparedVariants,
  productsRaw,
  unmatchedStockRows,
}: {
  issues: ValidationIssue[];
  preparedProducts: Map<string, PreparedProduct>;
  preparedVariants: Map<string, PreparedVariant>;
  productsRaw: ProductRow[];
  unmatchedStockRows: StockRow[];
}) {
  for (const product of preparedProducts.values()) {
    if (!product.imageUrl) {
      issues.push({
        code: "missing_product_image",
        details: `Product ${product.productGroupCode} has no image_url`,
        level: "warning",
        rowNumber: product.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
    }

    if (product.variantRows.length === 0) {
      issues.push({
        code: "product_without_variants",
        details: `Product ${product.productGroupCode} has no variant rows`,
        level: "error",
        rowNumber: product.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
    }
  }

  for (const variant of preparedVariants.values()) {
    if (!variant.price && variant.price !== 0) {
      issues.push({
        code: "missing_variant_price",
        details: `Variant ${variant.variantSku} has no price`,
        level: "warning",
        rowNumber: variant.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
    }

    if (variant.stockQuantity === null || !variant.stockStatus) {
      issues.push({
        code: "missing_variant_stock",
        details: `Variant ${variant.variantSku} is missing stock quantity or stock status`,
        level: "warning",
        rowNumber: variant.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
    }

    if (!variant.imageUrl) {
      const parentProduct = preparedProducts.get(variant.productGroupCode);
      if (!parentProduct?.imageUrl) {
        issues.push({
          code: "missing_variant_and_product_image",
          details: `Variant ${variant.variantSku} has no variant image and parent product has no image`,
          level: "warning",
          rowNumber: variant.workbookRowNumber,
          sheet: "02_VARIANTS",
        });
      }
    }

    if (!variant.variantSku && !variant.manufacturerRef) {
      issues.push({
        code: "missing_variant_identity",
        details: `Variant under ${variant.productGroupCode} is missing SKU/reference`,
        level: "error",
        rowNumber: variant.workbookRowNumber,
        sheet: "02_VARIANTS",
      });
    }
  }

  const jotaProducts = [...preparedProducts.values()].filter((product) =>
    normalizeText(product.brand).includes("jota")
  );

  for (const product of jotaProducts) {
    if (!/^jot[-_]/i.test(product.productGroupCode)) {
      issues.push({
        code: "jota_group_code_pattern",
        details: `JOTA product ${product.productGroupCode} does not follow expected JOT-* package code pattern`,
        level: "warning",
        rowNumber: product.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
    }

    if (product.variantRows.length === 0) {
      continue;
    }

    const hasGroupingSignal = product.variantRows.some(
      (variant) => variant.colorCode || variant.gritLabel || variant.diameter !== null
    );

    if (!hasGroupingSignal) {
      issues.push({
        code: "jota_grouping_missing_axes",
        details: `JOTA package ${product.productGroupCode} has no color/grit/diameter grouping signals`,
        level: "warning",
        rowNumber: product.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
    }

    for (const variant of product.variantRows) {
      if (!variant.variantSku.toUpperCase().startsWith(product.productGroupCode.toUpperCase())) {
        issues.push({
          code: "jota_variant_sku_prefix_mismatch",
          details: `Variant ${variant.variantSku} does not start with product_group_code ${product.productGroupCode}`,
          level: "warning",
          rowNumber: variant.workbookRowNumber,
          sheet: "02_VARIANTS",
        });
      }
    }
  }

  const productsMissingDescriptions = productsRaw.filter(
    (row) => !row.description && !row.shortDescription
  );

  for (const row of productsMissingDescriptions) {
    if (row.productGroupCode) {
      issues.push({
        code: "missing_product_description",
        details: `Product ${row.productGroupCode} has neither description nor short_description`,
        level: "warning",
        rowNumber: row.workbookRowNumber,
        sheet: "01_PRODUCTS",
      });
    }
  }

  if (unmatchedStockRows.length > 0) {
    issues.push({
      code: "unmatched_stock_rows_summary",
      details: `${unmatchedStockRows.length} stock update row(s) could not be matched`,
      level: "warning",
      sheet: "03_STOCK_UPDATE",
    });
  }
}

async function fetchExistingCategories(supabase: AdminSupabase) {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,parent_id,slug,sort_order,status");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ExistingCategory[];
  return {
    byId: new Map(rows.map((row) => [row.id, row])),
    bySlug: new Map(rows.map((row) => [row.slug, row])),
    rows,
  };
}

async function fetchExistingProducts(supabase: AdminSupabase) {
  const { data, error } = await supabase
    .from("products")
    .select("id,brand,category_id,description,image_url,is_active,product_group_code,product_name,usage_area");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ExistingProduct[];
  return {
    byCode: new Map(rows.map((row) => [row.product_group_code, row])),
    rows,
  };
}

async function fetchExistingVariants(supabase: AdminSupabase) {
  const selectWithSortOrder =
    "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,length,grit,package_quantity,price,currency,stock_quantity,stock_status,sort_order,image_url,is_active";
  const selectWithoutSortOrder =
    "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,length,grit,package_quantity,price,currency,stock_quantity,stock_status,image_url,is_active";
  let { data, error } = (await supabase
    .from("product_variants")
    .select(selectWithSortOrder as "*")) as {
    data: ExistingVariant[] | null;
    error: { message: string } | null;
  };

  if (error?.message.includes("sort_order")) {
    const fallback = (await supabase
      .from("product_variants")
      .select(selectWithoutSortOrder)) as {
      data: Array<Omit<ExistingVariant, "sort_order">> | null;
      error: { message: string } | null;
    };

    data = fallback.data?.map((row) => ({ ...row, sort_order: 0 })) ?? null;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  return {
    byCode: new Map(rows.map((row) => [row.variant_code, row])),
    rows,
  };
}

function buildCategoryPlan({
  categoryNodes,
  existingCategories,
}: {
  categoryNodes: Map<string, ImportCategoryNode>;
  existingCategories: Awaited<ReturnType<typeof fetchExistingCategories>>;
}) {
  const toCreate: ImportCategoryNode[] = [];
  const toUpdate: Array<{ existing: ExistingCategory; next: ImportCategoryNode }> = [];

  for (const node of [...categoryNodes.values()].sort((left, right) => left.level - right.level)) {
    const existing = existingCategories.bySlug.get(node.slug);

    if (!existing) {
      toCreate.push(node);
      continue;
    }

    const needsUpdate =
      existing.name !== node.name ||
      existing.sort_order !== node.sortOrder ||
      existing.status !== "active";

    if (needsUpdate) {
      toUpdate.push({ existing, next: node });
    }
  }

  return { toCreate, toUpdate };
}

function buildDryRunSummary({
  categoriesToCreate,
  categoriesToUpdate,
  existingProducts,
  existingVariants,
  preparedProducts,
  preparedVariants,
  stockRowsMatched,
  stockRowsUnmatched,
}: {
  categoriesToCreate: number;
  categoriesToUpdate: number;
  existingProducts: Awaited<ReturnType<typeof fetchExistingProducts>>;
  existingVariants: Awaited<ReturnType<typeof fetchExistingVariants>>;
  preparedProducts: Map<string, PreparedProduct>;
  preparedVariants: Map<string, PreparedVariant>;
  stockRowsMatched: number;
  stockRowsUnmatched: number;
}) {
  let productsToCreate = 0;
  let productsToUpdate = 0;
  let variantsToCreate = 0;
  let variantsToUpdate = 0;

  for (const product of preparedProducts.values()) {
    if (existingProducts.byCode.has(product.productGroupCode)) {
      productsToUpdate += 1;
    } else {
      productsToCreate += 1;
    }
  }

  for (const variant of preparedVariants.values()) {
    if (existingVariants.byCode.has(variant.variantSku)) {
      variantsToUpdate += 1;
    } else {
      variantsToCreate += 1;
    }
  }

  const workbookProductCodes = new Set(preparedProducts.keys());
  const workbookVariantCodes = new Set(preparedVariants.keys());
  const productsToDeactivateIfFullSync = existingProducts.rows.filter(
    (row) => !workbookProductCodes.has(row.product_group_code)
  ).length;
  const variantsToDeactivateIfFullSync = existingVariants.rows.filter(
    (row) => !workbookVariantCodes.has(row.variant_code)
  ).length;

  return {
    categoriesToCreate,
    categoriesToUpdate,
    productsToCreate,
    productsToDeactivateIfFullSync,
    productsToUpdate,
    stockRowsMatched,
    stockRowsUnmatched,
    variantsToCreate,
    variantsToDeactivateIfFullSync,
    variantsToUpdate,
  } satisfies DryRunSummary;
}

function printWorkbookReport({
  args,
  detectedColumns,
  dryRunSummary,
  fatalIssueCount,
  htmlScriptLikeDescriptionCount,
  issueCount,
  listLookups,
  workbook,
}: {
  args: ParsedArgs;
  detectedColumns: Record<string, string[]>;
  dryRunSummary: DryRunSummary;
  fatalIssueCount: number;
  htmlScriptLikeDescriptionCount: number;
  issueCount: number;
  listLookups: ReturnType<typeof buildListLookups>;
  workbook: WorkbookPayload;
}) {
  console.info("[import.xlsx] workbook", {
    commit: args.commit,
    dryRun: args.dryRun,
    fullSync: args.fullSync,
    path: path.relative(projectRoot, args.workbookPath),
    sheets: workbook.sheets.map((sheet) => ({
      headers: sheet.headers,
      name: sheet.name,
      nonEmptyRowCount: sheet.nonEmptyRowCount,
      rowCount: sheet.rows.length,
    })),
  });

  console.info("[import.xlsx] reference-mappings", {
    brandsDetectedInLists: listLookups.brandsByCode.size,
    categoriesDetectedInLists: listLookups.categoriesByCode.size,
    currentSchemaTargets: {
      categories: "public.categories",
      products: "public.products",
      productsDescription: "description",
      productsImage: "image_url",
      productsPublicCode: "product_group_code",
      usageArea: "products.usage_area",
      variants: "public.product_variants",
      variantsPrice: "price",
      variantsPublicCode: "variant_code",
      variantsStockQuantity: "stock_quantity",
      variantsStockStatus: "stock_status",
    },
    unsupportedWorkbookColumns: [
      "brand_code (no separate brands table)",
      "short_description (no schema target)",
      "launch_status (no schema target)",
      "meta_title (no schema target)",
      "meta_description (no schema target)",
      "requestable (no schema target)",
      "barcode (no schema target)",
      "clinical_note (no schema target)",
    ],
  });

  console.info("[import.xlsx] columns-detected", detectedColumns);
  console.info("[import.xlsx] dry-run-summary", {
    ...dryRunSummary,
    fatalIssueCount,
    htmlScriptLikeDescriptionCount,
    issueCount,
  });
}

function printValidationIssues(issues: ValidationIssue[]) {
  if (issues.length === 0) {
    console.info("[import.xlsx] validation", "No validation issues found.");
    return;
  }

  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    console.info(`[import.xlsx] ${prefix}`, {
      code: issue.code,
      details: issue.details,
      rowNumber: issue.rowNumber,
      sheet: issue.sheet,
    });
  }
}

function printNextNotes({
  args,
  dryRunSummary,
  htmlScriptLikeDescriptionCount,
}: {
  args: ParsedArgs;
  dryRunSummary: DryRunSummary;
  htmlScriptLikeDescriptionCount: number;
}) {
  console.info("[import.xlsx] next-steps", {
    commitCommand: "npm.cmd run import:products:commit",
    dryRunCommand: "npm.cmd run import:products:dry",
    fullSyncCommand:
      "node --experimental-strip-types scripts/import-products-from-xlsx.ts --dry-run --full-sync",
    note:
      htmlScriptLikeDescriptionCount > 0
        ? "HTML descriptions were preserved. Script-like description blocks should be rendered in a sandboxed UI phase, not executed directly in React."
        : "No script-like HTML description blocks detected in sampled workbook content.",
    productsToDeactivateIfFullSync: dryRunSummary.productsToDeactivateIfFullSync,
    variantsToDeactivateIfFullSync: dryRunSummary.variantsToDeactivateIfFullSync,
    writesPerformed: args.commit,
  });
}

async function applyImport({
  args,
  categoryNodes,
  existingCategories,
  existingProducts,
  existingVariants,
  preparedProducts,
  preparedVariants,
  supabase,
}: {
  args: ParsedArgs;
  categoryNodes: Map<string, ImportCategoryNode>;
  existingCategories: Awaited<ReturnType<typeof fetchExistingCategories>>;
  existingProducts: Awaited<ReturnType<typeof fetchExistingProducts>>;
  existingVariants: Awaited<ReturnType<typeof fetchExistingVariants>>;
  preparedProducts: Map<string, PreparedProduct>;
  preparedVariants: Map<string, PreparedVariant>;
  supabase: AdminSupabase;
}) {
  const categoryIdByKey = new Map<string, string>();
  const categoryIdBySlug = new Map(existingCategories.rows.map((row) => [row.slug, row.id]));

  for (const node of [...categoryNodes.values()].sort((left, right) => left.level - right.level)) {
    const existing = existingCategories.bySlug.get(node.slug);
    const parentId = node.parentKey ? categoryIdByKey.get(node.parentKey) ?? null : null;

    if (existing) {
      const payload = compactPayload<Database["public"]["Tables"]["categories"]["Update"]>({
        name: node.name,
        parent_id: parentId,
        slug: node.slug,
        sort_order: node.sortOrder,
        status: "active",
      });
      const { data, error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      categoryIdByKey.set(node.key, data.id);
      categoryIdBySlug.set(node.slug, data.id);
      continue;
    }

    const payload: Database["public"]["Tables"]["categories"]["Insert"] = {
      name: node.name,
      parent_id: parentId,
      slug: node.slug,
      sort_order: node.sortOrder,
      status: "active",
    };
    const { data, error } = await supabase
      .from("categories")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    categoryIdByKey.set(node.key, data.id);
    categoryIdBySlug.set(node.slug, data.id);
  }

  const productIdByCode = new Map<string, string>();

  for (const product of preparedProducts.values()) {
    const existing = existingProducts.byCode.get(product.productGroupCode);
    const categoryNode = categoryNodes.get(product.categoryKey);
    const categoryId = categoryNode ? categoryIdBySlug.get(categoryNode.slug) ?? null : null;

    if (!categoryId) {
      throw new Error(`Category id could not be resolved for ${product.productGroupCode}`);
    }

    const updatePayload = compactPayload<Database["public"]["Tables"]["products"]["Update"]>({
      brand: product.brand,
      category_id: categoryId,
      description: product.description ?? undefined,
      image_url: product.imageUrl ?? undefined,
      is_active: product.isActive,
      product_group_code: product.productGroupCode,
      product_name: product.productName,
      usage_area: product.usageArea ?? undefined,
    });

    if (existing) {
      const { data, error } = await supabase
        .from("products")
        .update(updatePayload)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      productIdByCode.set(product.productGroupCode, data.id);
    } else {
      const insertPayload: Database["public"]["Tables"]["products"]["Insert"] = {
        brand: product.brand,
        category_id: categoryId,
        description: product.description ?? null,
        image_url: product.imageUrl ?? null,
        is_active: product.isActive,
        product_group_code: product.productGroupCode,
        product_name: product.productName,
        usage_area: product.usageArea ?? null,
      };
      const { data, error } = await supabase
        .from("products")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      productIdByCode.set(product.productGroupCode, data.id);
    }
  }

  for (const variant of preparedVariants.values()) {
    const existing = existingVariants.byCode.get(variant.variantSku);
    const productId = productIdByCode.get(variant.productGroupCode);

    if (!productId) {
      throw new Error(`Product id could not be resolved for variant ${variant.variantSku}`);
    }

    const updatePayload = compactPayload<
      Database["public"]["Tables"]["product_variants"]["Update"] & { sort_order?: number }
    >({
      color: variant.colorCode ?? undefined,
      connection_type: variant.connectionType ?? undefined,
      currency: variant.currency,
      diameter: variant.diameter ?? undefined,
      grit: variant.gritLabel ?? undefined,
      image_url: variant.imageUrl ?? undefined,
      is_active: variant.isActive,
      length: variant.lengthMm ?? undefined,
      manufacturer_ref: variant.manufacturerRef ?? undefined,
      package_quantity: variant.packSize,
      price: variant.price ?? undefined,
      product_id: productId,
      sort_order: variant.sortOrder ?? 0,
      stock_quantity: variant.stockQuantity ?? undefined,
      stock_status: variant.stockStatus ?? undefined,
      variant_code: variant.variantSku,
    });

    if (existing) {
      const { error } = await supabase
        .from("product_variants")
        .update(updatePayload as never)
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const insertPayload: Database["public"]["Tables"]["product_variants"]["Insert"] & {
        sort_order?: number;
      } = {
        color: variant.colorCode ?? null,
        connection_type: variant.connectionType ?? null,
        currency: variant.currency,
        diameter: variant.diameter ?? null,
        grit: variant.gritLabel ?? null,
        image_url: variant.imageUrl ?? null,
        is_active: variant.isActive,
        length: variant.lengthMm ?? null,
        manufacturer_ref: variant.manufacturerRef ?? null,
        package_quantity: variant.packSize,
        price: variant.price ?? null,
        product_id: productId,
        sort_order: variant.sortOrder ?? 0,
        stock_quantity: variant.stockQuantity ?? 0,
        stock_status: variant.stockStatus ?? "ask_for_stock",
        variant_code: variant.variantSku,
      };
      const { error } = await supabase.from("product_variants").insert(insertPayload as never);

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  if (args.fullSync) {
    const workbookProductCodes = new Set(preparedProducts.keys());
    const workbookVariantCodes = new Set(preparedVariants.keys());

    const productIdsToDeactivate = existingProducts.rows
      .filter((row) => !workbookProductCodes.has(row.product_group_code) && row.is_active)
      .map((row) => row.id);
    const variantIdsToDeactivate = existingVariants.rows
      .filter((row) => !workbookVariantCodes.has(row.variant_code) && row.is_active)
      .map((row) => row.id);

    if (productIdsToDeactivate.length) {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .in("id", productIdsToDeactivate);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (variantIdsToDeactivate.length) {
      const { error } = await supabase
        .from("product_variants")
        .update({ is_active: false })
        .in("id", variantIdsToDeactivate);

      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

function registerCategoryPath(
  categoryNodes: Map<string, ImportCategoryNode>,
  categoryPath: string
) {
  const segments = categoryPath
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let parentKey: string | null = null;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const key = segments.slice(0, index + 1).join(">");
    const slug = slugify(segment);

    if (!categoryNodes.has(key)) {
      categoryNodes.set(key, {
        key,
        level: index,
        name: segment,
        parentKey,
        slug,
        sortOrder: (index + 1) * 100,
      });
    }

    parentKey = key;
  }

  return parentKey ?? categoryPath;
}

function resolveBrand(
  brand: string | null,
  brandCode: string | null,
  listLookups: ReturnType<typeof buildListLookups>
) {
  const direct = brand?.trim();
  if (direct) {
    return normalizeBrand(direct);
  }

  if (brandCode) {
    const listRow = listLookups.brandsByCode.get(brandCode.toUpperCase());
    if (listRow?.brandName) {
      return normalizeBrand(listRow.brandName);
    }
  }

  return null;
}

function resolveCategoryPath(
  categoryName: string | null,
  categoryCode: string | null,
  listLookups: ReturnType<typeof buildListLookups>
) {
  const direct = categoryName?.trim();
  if (direct) {
    return direct;
  }

  if (categoryCode) {
    const listRow = listLookups.categoriesByCode.get(categoryCode.toUpperCase());
    if (listRow?.categoryName) {
      return listRow.categoryName;
    }
  }

  return null;
}

function normalizeBrand(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "jota switzerland" || normalized === "jota") {
    return "JOTA Switzerland";
  }
  if (normalized === "xpect vision" || normalized === "xpectvision") {
    return "Xpect Vision";
  }

  return value.trim();
}

function getPreparedVariantIdentityKey(variant: PreparedVariant) {
  return [
    normalizeText(variant.productGroupCode),
    normalizeText(variant.connectionType ?? ""),
    normalizeText(variant.colorCode ?? ""),
    formatIdentityNumber(variant.diameter),
    normalizeText(variant.gritLabel ?? ""),
    formatIdentityNumber(variant.lengthMm),
    variant.packSize,
  ].join("|");
}

function getVariantRowIdentityKey(
  row: VariantRow,
  productGroupCode: string,
  defaultPackSize: number | null
) {
  return [
    normalizeText(productGroupCode),
    normalizeText(row.connectionType ?? ""),
    normalizeText(row.colorCode ?? ""),
    formatIdentityNumber(row.diameter),
    normalizeText(row.gritLabel ?? ""),
    formatIdentityNumber(row.lengthMm),
    row.packSize ?? defaultPackSize ?? 1,
  ].join("|");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatIdentityNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function normalizeAction(value: string) {
  return normalizeText(value);
}

function normalizeStockStatus(value: string | null): VariantStockStatus | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeText(value)
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const mapping: Record<string, VariantStockStatus> = {
    active: "in_stock",
    ask_for_stock: "ask_for_stock",
    in_stock: "in_stock",
    low_stock: "low_stock",
    out_of_stock: "out_of_stock",
    pre_order: "ask_for_stock",
    preorder: "ask_for_stock",
  };

  return mapping[normalized] ?? null;
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const candidate = value
    .split(/[;,]/)
    .map((part) => part.trim())
    .find((part) => /^https?:\/\//i.test(part));

  if (!candidate) {
    return value.trim();
  }

  return candidate;
}

function looksScriptLike(value: string | null) {
  if (!value) {
    return false;
  }

  return /<script\b|javascript:|onload=|onclick=|window\./i.test(value);
}

function compactPayload<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function asString(value: CellValue) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
}

function asNumber(value: CellValue) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: CellValue) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeText(value);
  if (["1", "true", "aktif", "active", "ready", "evet", "yes", "upsert"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "pasif", "inactive", "hayir", "no", "draft"].includes(normalized)) {
    return false;
  }

  return null;
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
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
