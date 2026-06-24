import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const GRIT_SUFFIXES = ["SG", "EF", "G", "F"];
const BASE_HOLDER_CODES = new Set(["FG", "RA", "HP"]);
const HOLDER_CODES = new Set([
  "FG",
  "RA",
  "HP",
  ...GRIT_SUFFIXES.flatMap((suffix) => [
    `${suffix}FG`,
    `${suffix}RA`,
    `${suffix}HP`,
  ]),
]);
const SAMPLE_MODELS = new Set(["801", "801L", "881", "881F", "881SG", "558", "850", "850G", "Z850", "ZR600", "ZIR600"]);
const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const CONFLICT_REPORT_PATH = path.join(REPORT_DIR, "jota-sku-normalization-conflicts.csv");
const SKIPPED_REPORT_PATH = path.join(REPORT_DIR, "jota-sku-normalization-skipped.csv");
const REVIEW_REPORT_PATH = path.join(REPORT_DIR, "jota-sku-normalization-review.md");
const SAFE_APPLY_PREVIEW_PATH = path.join(
  REPORT_DIR,
  "jota-sku-normalization-safe-apply-preview.csv"
);
const MANUAL_REVIEW_PATH = path.join(
  REPORT_DIR,
  "jota-sku-normalization-manual-review.csv"
);
const PRE_APPLY_BACKUP_PATH = path.join(
  REPORT_DIR,
  "jota-sku-pre-apply-backup.csv"
);

main().catch((error) => {
  console.error("[sku-normalize] failed", error);
  process.exitCode = 1;
});

async function main() {
  const apply = process.argv.includes("--apply");
  const applySafeOnly = process.argv.includes("--apply-safe-only");

  if (apply && !applySafeOnly) {
    throw new Error(
      "--apply is disabled. Review generated reports, then use --apply-safe-only to update only confident rows."
    );
  }

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
  const variants = await fetchVariants(supabase);
  const plans = variants.map((variant) => buildSkuPlan(variant));
  const duplicateGroups = getDuplicateTargetGroups(plans);
  const existingSkuOwners = new Map(
    variants.map((variant) => [normalizeSku(variant.variant_code), variant.id])
  );
  const safePlans = [];
  const skippedPlans = [];
  const conflictPlans = [];

  for (const plan of plans) {
    if (!plan.targetSku) {
      skippedPlans.push(plan);
      continue;
    }

    if (normalizeSku(plan.currentSku) === normalizeSku(plan.targetSku)) {
      skippedPlans.push({ ...plan, reason: "already_normalized" });
      continue;
    }

    const duplicateGroup = duplicateGroups.get(plan.targetSku) ?? [];
    const existingOwner = existingSkuOwners.get(plan.targetSku);

    if (duplicateGroup.length > 1) {
      const reason = classifyDuplicateGroup(duplicateGroup);
      const skippedPlan = { ...plan, reason };
      skippedPlans.push(skippedPlan);
      if (reason === "duplicate_target_in_batch") {
        conflictPlans.push({ ...skippedPlan, conflictType: "duplicate_target_in_batch" });
      }
      continue;
    }

    if (existingOwner && existingOwner !== plan.variantId) {
      const skippedPlan = { ...plan, reason: "duplicate_existing_sku" };
      skippedPlans.push(skippedPlan);
      conflictPlans.push({ ...skippedPlan, conflictType: "duplicate_existing_sku" });
      continue;
    }

    safePlans.push(plan);
  }
  const manualReviewPlans = getManualReviewPlans(skippedPlans);
  writeReports({ conflictPlans, manualReviewPlans, plans, safePlans, skippedPlans });

  console.log("\nDentech Pro JOTA SKU normalization");
  console.log("----------------------------------");
  console.log(`Mode: ${applySafeOnly ? "APPLY SAFE ONLY" : "DRY RUN"}`);
  console.log(`Variants checked: ${variants.length}`);
  console.log(`Safe changes: ${safePlans.length}`);
  console.log(`Skipped: ${skippedPlans.length}`);
  console.log(`Duplicate target conflicts: ${countReason(skippedPlans, "duplicate_target_in_batch")}`);
  console.log(`Existing SKU conflicts: ${countReason(skippedPlans, "duplicate_existing_sku")}`);
  console.log(`safe_to_apply_count: ${safePlans.length}`);
  console.log(`unsafe_skipped_count: ${manualReviewPlans.length}`);
  console.log(`duplicate_conflict_count: ${conflictPlans.length}`);
  console.log(`existing_conflict_count: ${countReason(skippedPlans, "duplicate_existing_sku")}`);
  console.log(`Conflict report: ${CONFLICT_REPORT_PATH}`);
  console.log(`Skipped report: ${SKIPPED_REPORT_PATH}`);
  console.log(`Review report: ${REVIEW_REPORT_PATH}`);
  console.log(`Safe apply preview: ${SAFE_APPLY_PREVIEW_PATH}`);
  console.log(`Manual review report: ${MANUAL_REVIEW_PATH}`);
  console.log(`Pre-apply backup: ${PRE_APPLY_BACKUP_PATH}`);

  printSamplePlans([...safePlans, ...skippedPlans]);

  if (!applySafeOnly) {
    for (const plan of safePlans.slice(0, 80)) {
      console.log(`${plan.productName}: ${plan.currentSku} -> ${plan.targetSku}`);
    }
    console.log("Dry-run only. No database rows were updated. Use --apply-safe-only only after reviewing the safe preview.");
    return;
  }

  if (safePlans.length === 0) {
    console.log("No safe SKU changes to apply.");
    return;
  }

  writePreApplyBackup(safePlans);

  for (const plan of safePlans) {
    const { error } = await supabase
      .from("product_variants")
      .update({ variant_code: plan.targetSku })
      .eq("id", plan.variantId);

    if (error) {
      console.error(`SKIP ${plan.variantId}: ${error.message}`);
      continue;
    }

    console.log(`APPLIED ${plan.variantId}: ${plan.currentSku} -> ${plan.targetSku}`);
  }
}

async function fetchVariants(supabase) {
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,variant_code,manufacturer_ref,connection_type,diameter,product:products(product_name,brand,product_group_code)"
    )
    .order("variant_code", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((variant) => {
    const productName = variant.product?.product_name ?? "";
    const brand = variant.product?.brand ?? "";
    const manufacturerRef = variant.manufacturer_ref ?? "";
    return /jota|zir|zr|\b[0-9]{3,5}[a-z]{0,2}\b/i.test(
      normalizeText([brand, productName, manufacturerRef].join(" "))
    );
  });
}

function buildSkuPlan(variant) {
  const productName = variant.product?.product_name ?? "";
  const currentSku = variant.variant_code ?? "";
  const parsedRef = parseManufacturerRef(variant.manufacturer_ref);
  const modelInfo = getModelInfo(parsedRef.model || productName || currentSku);
  const holderInfo = getHolderInfo({
    explicitHolder: parsedRef.holder,
    connectionType: variant.connection_type,
    modelSuffix: modelInfo.gritSuffix,
  });
  const holder = holderInfo.holder;
  const diameter = parsedRef.diameter || formatDiameter(variant.diameter);
  let reason = "";

  if (!modelInfo.model) {
    reason = "missing_model";
  } else if (!holder) {
    reason = "missing_holder";
  } else if (!diameter) {
    reason = "missing_safe_diameter";
  }

  return {
    currentSku,
    diameter,
    grit: holderInfo.grit,
    holder,
    model: modelInfo.model,
    productId: variant.product_id ?? "",
    productName,
    reason,
    shaft: holderInfo.shaft,
    sourceFieldsUsed: [
      parsedRef.model ? "manufacturer_ref.model" : "product_name.model",
      parsedRef.holder ? "manufacturer_ref.holder" : "connection_type",
      parsedRef.diameter ? "manufacturer_ref.diameter" : "diameter",
    ].join("|"),
    targetSku: reason ? "" : `JOT-${modelInfo.model}-${holder}-${diameter}`,
    variantId: variant.id,
  };
}

function parseManufacturerRef(value) {
  const normalized = normalizeText(value).toUpperCase();
  const parts = normalized.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length < 2) {
    return {};
  }

  const numericParts = parts.filter((part) => /^\d{3}$/.test(part));
  const modelPart = parts.find((part, index) => {
    if (!/^(?:ZIR|ZR|Z)?[0-9]{3,5}[A-Z]{0,2}$/.test(part)) {
      return false;
    }

    const nextPart = parts[index + 1] ?? "";
    return HOLDER_CODES.has(nextPart) || /^(?:ZIR|ZR|Z)[0-9]{3,5}[A-Z]{0,2}$/.test(part);
  });

  return {
    diameter: numericParts.at(-1) ?? "",
    holder: parts.find((part) => HOLDER_CODES.has(part)) ?? "",
    model: modelPart ?? "",
  };
}

function getModelInfo(value) {
  const normalized = normalizeText(value).toUpperCase();
  const afterJota = normalized.match(/\bJOTA\s+((?:ZIR|ZR|Z)?[0-9]{3,5}[A-Z]{0,2})\b/);
  const fallback = normalized.match(/\b((?:ZIR|ZR|Z)?[0-9]{3,5}[A-Z]{0,2})\b/);
  const rawModel = afterJota?.[1] ?? fallback?.[1] ?? "";

  if (!rawModel) {
    return { gritSuffix: "", model: "" };
  }

  for (const suffix of GRIT_SUFFIXES) {
    if (rawModel.endsWith(suffix) && rawModel.length > suffix.length + 2) {
      return {
        gritSuffix: suffix,
        model: rawModel.slice(0, -suffix.length),
      };
    }
  }

  return { gritSuffix: "", model: rawModel };
}

function getHolderInfo({ explicitHolder, connectionType, modelSuffix }) {
  const baseHolder = normalizeText(explicitHolder || connectionType).toUpperCase();
  if (!HOLDER_CODES.has(baseHolder)) {
    return { grit: modelSuffix, holder: "", shaft: "" };
  }

  if (!modelSuffix || !BASE_HOLDER_CODES.has(baseHolder)) {
    return {
      grit: getGritFromHolder(baseHolder),
      holder: baseHolder,
      shaft: getShaftFromHolder(baseHolder),
    };
  }

  return {
    grit: modelSuffix,
    holder: `${modelSuffix}${baseHolder}`,
    shaft: baseHolder,
  };
}

function getGritFromHolder(holder) {
  for (const suffix of GRIT_SUFFIXES) {
    if (holder.startsWith(suffix) && BASE_HOLDER_CODES.has(holder.slice(suffix.length))) {
      return suffix;
    }
  }

  return "";
}

function getShaftFromHolder(holder) {
  const grit = getGritFromHolder(holder);
  return grit ? holder.slice(grit.length) : holder;
}

function formatDiameter(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue >= 50) {
    return "";
  }

  const code =
    numericValue < 10 ? Math.round(numericValue * 10) : Math.round(numericValue);

  if (code <= 0 || code >= 500) {
    return "";
  }

  return String(code).padStart(3, "0");
}

function getDuplicateTargetGroups(plans) {
  const groups = new Map();
  for (const plan of plans) {
    if (!plan.targetSku) continue;
    const group = groups.get(plan.targetSku) ?? [];
    group.push(plan);
    groups.set(plan.targetSku, group);
  }
  return groups;
}

function classifyDuplicateGroup(plans) {
  const uniqueProductIds = new Set(plans.map((plan) => plan.productId));
  const uniqueProductNames = new Set(
    plans.map((plan) => normalizeComparableText(plan.productName))
  );
  const uniqueCurrentSkus = new Set(
    plans.map((plan) => normalizeComparableText(plan.currentSku))
  );
  const hasNormalizedEquivalent = plans.some(
    (plan) => normalizeSku(plan.currentSku).replace(/^JOTA-/, "JOT-") === plan.targetSku
  );

  if (uniqueProductIds.size === 1 && uniqueProductNames.size === 1) {
    return "duplicate_source_rows";
  }

  if (hasNormalizedEquivalent || uniqueCurrentSkus.size > 1) {
    return "seed_import_duplicate";
  }

  return "duplicate_target_in_batch";
}

function printSamplePlans(plans) {
  console.log("\nRequired sample checks:");
  for (const model of SAMPLE_MODELS) {
    const plan = plans.find((candidate) =>
      normalizeText(candidate.productName).toUpperCase().includes(model)
    );
    if (!plan) {
      console.log(`- ${model}: not found`);
      continue;
    }
    console.log(
      `- ${model}: ${plan.currentSku} -> ${plan.targetSku || `SKIP (${plan.reason})`}`
    );
  }
  const falseDiameter = plans.filter((plan) => plan.targetSku.includes("558-FG-558"));
  console.log(`- 558 false diameter regression: ${falseDiameter.length ? "FOUND" : "none"}`);
}

function writeReports({
  conflictPlans,
  manualReviewPlans,
  plans,
  safePlans,
  skippedPlans,
}) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    CONFLICT_REPORT_PATH,
    toCsv(
      conflictPlans.map((plan) => toReportRow(plan, plan.conflictType)),
      [
        "target_sku",
        "conflict_type",
        "product_id",
        "product_name",
        "variant_id",
        "current_sku",
        "proposed_sku",
        "model",
        "shaft",
        "diameter",
        "source_fields_used",
        "reason",
        "recommended_fix",
      ]
    ),
    "utf8"
  );
  fs.writeFileSync(
    SKIPPED_REPORT_PATH,
    toCsv(
      skippedPlans.map((plan) => toReportRow(plan, plan.reason)),
      [
        "target_sku",
        "conflict_type",
        "product_id",
        "product_name",
        "variant_id",
        "current_sku",
        "proposed_sku",
        "model",
        "shaft",
        "diameter",
        "source_fields_used",
        "reason",
        "recommended_fix",
      ]
    ),
    "utf8"
  );
  fs.writeFileSync(
    REVIEW_REPORT_PATH,
    buildReviewReport({ conflictPlans, plans, safePlans, skippedPlans }),
    "utf8"
  );
  fs.writeFileSync(
    SAFE_APPLY_PREVIEW_PATH,
    toCsv(
      safePlans.map((plan) => toSafeApplyPreviewRow(plan)),
      [
        "variant_id",
        "product_name",
        "current_sku",
        "proposed_sku",
        "model",
        "grit",
        "shaft",
        "diameter",
        "source_fields_used",
        "safe_to_apply",
        "reason",
      ]
    ),
    "utf8"
  );
  fs.writeFileSync(
    MANUAL_REVIEW_PATH,
    toCsv(
      manualReviewPlans.map((plan) => toManualReviewRow(plan)),
      [
        "variant_id",
        "product_id",
        "product_name",
        "current_sku",
        "proposed_sku",
        "model",
        "grit",
        "shaft",
        "diameter",
        "source_fields_used",
        "reason",
        "recommended_action",
      ]
    ),
    "utf8"
  );
}

function writePreApplyBackup(safePlans) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const existingRows = fs.existsSync(PRE_APPLY_BACKUP_PATH)
    ? parseCsv(fs.readFileSync(PRE_APPLY_BACKUP_PATH, "utf8"))
    : [];
  const rowsByVariantId = new Map(
    existingRows
      .filter((row) => row.variant_id)
      .map((row) => [row.variant_id, row])
  );

  for (const plan of safePlans) {
    if (rowsByVariantId.has(plan.variantId)) {
      continue;
    }

    rowsByVariantId.set(plan.variantId, {
      current_sku: plan.currentSku,
      diameter: plan.diameter,
      grit: plan.grit,
      model: plan.model,
      product_id: plan.productId,
      product_name: plan.productName,
      proposed_sku: plan.targetSku,
      shaft: plan.shaft,
      variant_id: plan.variantId,
    });
  }

  fs.writeFileSync(
    PRE_APPLY_BACKUP_PATH,
    toCsv(
      [...rowsByVariantId.values()],
      [
        "variant_id",
        "product_id",
        "product_name",
        "current_sku",
        "proposed_sku",
        "model",
        "grit",
        "shaft",
        "diameter",
      ]
    ),
    "utf8"
  );
}

function parseCsv(contents) {
  const [headerLine, ...lines] = contents.split(/\r?\n/).filter(Boolean);
  if (!headerLine) {
    return [];
  }

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

function toReportRow(plan, conflictType) {
  return {
    conflict_type: conflictType,
    current_sku: plan.currentSku,
    diameter: plan.diameter,
    model: plan.model,
    product_id: plan.productId,
    product_name: plan.productName,
    proposed_sku: plan.targetSku,
    reason: plan.reason,
    recommended_fix: getRecommendedFix(plan.reason),
    shaft: plan.holder,
    source_fields_used: plan.sourceFieldsUsed,
    target_sku: plan.targetSku,
    variant_id: plan.variantId,
  };
}

function toSafeApplyPreviewRow(plan) {
  return {
    current_sku: plan.currentSku,
    diameter: plan.diameter,
    grit: plan.grit,
    model: plan.model,
    product_name: plan.productName,
    proposed_sku: plan.targetSku,
    reason: "safe_to_apply",
    safe_to_apply: "true",
    shaft: plan.shaft,
    source_fields_used: plan.sourceFieldsUsed,
    variant_id: plan.variantId,
  };
}

function toManualReviewRow(plan) {
  return {
    current_sku: plan.currentSku,
    diameter: plan.diameter,
    grit: plan.grit,
    model: plan.model,
    product_id: plan.productId,
    product_name: plan.productName,
    proposed_sku: plan.targetSku,
    reason: plan.reason,
    recommended_action: getRecommendedFix(plan.reason),
    shaft: plan.shaft,
    source_fields_used: plan.sourceFieldsUsed,
    variant_id: plan.variantId,
  };
}

function getRecommendedFix(reason) {
  switch (reason) {
    case "duplicate_target_in_batch":
      return "Inspect same proposed SKU rows; confirm true duplicate variant or add a distinguishing source field before apply.";
    case "duplicate_source_rows":
      return "Likely duplicate imported variant rows with the same model, shaft, diameter, and product family; review source data before applying.";
    case "seed_import_duplicate":
      return "Likely seed/import overlap or family collision; choose one canonical row or manually merge/retire duplicates before applying.";
    case "duplicate_existing_sku":
      return "Existing SKU already belongs to another variant; resolve manually before apply.";
    case "missing_model":
      return "Add manufacturer_ref or product model code before SKU normalization.";
    case "missing_holder":
      return "Confirm holder/shaft as FG, RA, HP, GFG, SGFG, FFG, or EFFG before apply.";
    case "missing_safe_diameter":
      return "Confirm explicit diameter/size; do not infer from model number.";
    case "already_normalized":
      return "No action needed.";
    default:
      return "Review manually before apply.";
  }
}

function buildReviewReport({ conflictPlans, plans, safePlans, skippedPlans }) {
  const reasonCounts = countBy(skippedPlans, (plan) => plan.reason || "unknown");
  const holderExamples = safePlans
    .filter((plan) => /^(?:F|G|SG|EF)(?:FG|RA|HP)$/.test(plan.holder))
    .slice(0, 12);
  const duplicateSourceExamples = skippedPlans
    .filter((plan) => plan.reason === "duplicate_source_rows")
    .slice(0, 12);
  const seedImportExamples = skippedPlans
    .filter((plan) => plan.reason === "seed_import_duplicate")
    .slice(0, 12);

  return [
    "# JOTA SKU Normalization Review",
    "",
    "## Recommended final format",
    "",
    "`JOT-[MODEL]-[GRIT][SHAFT]-[DIAMETER]`",
    "",
    "- `MODEL` preserves real model identity such as `801L`, `859L`, `Z850`, `9813`.",
    "- `GRIT` is included when the model/source name carries `F`, `G`, `SG`, or `EF` as a grit suffix.",
    "- `SHAFT` remains `FG`, `RA`, or `HP`; grit prefixes can produce `FFG`, `GRA`, `SGFG`, `EFRA`, etc.",
    "- `DIAMETER` uses explicit manufacturer ref or safe diameter field only; model numbers such as `558` are not interpreted as diameters.",
    "",
    "## Dry-run summary",
    "",
    `- Variants checked: ${plans.length}`,
    `- Safe proposed changes: ${safePlans.length}`,
    `- Skipped rows: ${skippedPlans.length}`,
    `- Remaining duplicate target conflicts: ${conflictPlans.length}`,
    "",
    "## Skipped row summary",
    "",
    ...[...reasonCounts.entries()].map(([reason, count]) => `- ${reason}: ${count}`),
    "",
    "## Conflict cause summary",
    "",
    "- Previous duplicate target conflicts for `F/G/SG/EF` polishers were caused by dropping grit suffixes when shaft was `RA` or `HP`.",
    "- The dry-run now keeps grit before all shaft codes, so examples such as `9813F` and `9813G` no longer collide.",
    "- Remaining skipped duplicates are blocked as source data issues, not automatically normalized.",
    "- Package/set rows and some carbide rows still lack safe model/holder data and remain skipped.",
    "",
    "## Grit-aware sample proposals",
    "",
    ...formatPlanList(holderExamples),
    "",
    "## Duplicate source row examples",
    "",
    ...formatPlanList(duplicateSourceExamples),
    "",
    "## Seed/import overlap examples",
    "",
    ...formatPlanList(seedImportExamples),
    "",
    "## Apply readiness",
    "",
    "Do not run `sku:normalize:apply` yet. Duplicate source rows, seed/import overlaps, and missing model/holder rows still need manual review even though hard duplicate target conflicts are removed.",
    "",
  ].join("\n");
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function formatPlanList(plans) {
  if (!plans.length) {
    return ["- None"];
  }

  return plans.map(
    (plan) =>
      `- ${plan.productName} / ${plan.variantId}: ${plan.currentSku || "-"} -> ${plan.targetSku || `SKIP (${plan.reason})`}`
  );
}

function countReason(plans, reason) {
  return plans.filter((plan) => plan.reason === reason).length;
}

function getManualReviewPlans(skippedPlans) {
  const manualReasons = new Set([
    "missing_model",
    "missing_holder",
    "duplicate_source_rows",
    "seed_import_duplicate",
    "missing_safe_diameter",
    "duplicate_target_in_batch",
    "duplicate_existing_sku",
  ]);

  return skippedPlans.filter((plan) => manualReasons.has(plan.reason));
}

function toCsv(rows, headers) {
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

function normalizeSku(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeComparableText(value) {
  return normalizeText(value).toUpperCase().replace(/\s+/g, " ").trim();
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
    .replace(/Ã‡/g, "c");
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
