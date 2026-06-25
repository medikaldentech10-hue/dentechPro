import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "scripts", "data", "jota-sku-reference.csv");
const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const SAFE_PREVIEW_PATH = path.join(REPORT_DIR, "jota-reference-sku-safe-preview.csv");
const MANUAL_REVIEW_PATH = path.join(REPORT_DIR, "jota-reference-sku-manual-review.csv");
const SUMMARY_PATH = path.join(REPORT_DIR, "jota-reference-sku-summary.md");
const MISSING_PLAN_PATH = path.join(REPORT_DIR, "jota-missing-products-plan.csv");
const BATCH_01_PREVIEW_PATH = path.join(REPORT_DIR, "jota-missing-products-batch-01-preview.csv");
const PRE_APPLY_BACKUP_PATH = path.join(REPORT_DIR, "jota-reference-sku-pre-apply-backup.csv");
const HOLDER_CODES = new Set(["FG", "RA", "HP", "FFG", "GFG", "SGFG", "EFG", "EFFG", "FRA", "GRA", "SGRA", "EFRA", "FHP", "GHP", "SGHP", "EFHP"]);
const SPECIAL_TYPES = new Set(["POL", "ARK", "CER", "SUR", "SET", "PKG"]);
const BATCH_01_PRIORITY_SKUS = [
  "JOT-801-FG-008",
  "JOT-801-FG-021",
  "JOT-801XL-FG-014",
  "JOT-801XL-FG-018",
  "JOT-833-EFG-023",
  "JOT-83O-EFFG-018",
  "JOT-83O-EFFG-021",
  "JOT-83O-EFFG-023",
];

main().catch((error) => {
  console.error("[sku-reference-rewrite] failed", error);
  process.exitCode = 1;
});

async function main() {
  const apply = process.argv.includes("--apply-safe-reference");
  const env = readEnvFile(".env.local");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const references = readReferenceRows();
  const referenceBySku = new Map(references.map((row) => [normalizeSku(row.sku), row]));
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const variants = await fetchVariants(supabase);
  const plans = variants.map((variant) => matchVariantToReference(variant, references, referenceBySku));
  const safePlans = plans.filter((plan) => plan.safeToApply);
  const safeUpdates = safePlans.filter((plan) => normalizeSku(plan.currentSku) !== normalizeSku(plan.referenceSku));
  const rawDuplicateTargets = getDuplicateTargets(safeUpdates);
  const rawExistingConflicts = getExistingTargetConflicts(safeUpdates, variants);
  const blockedTargetSkus = new Set([...rawDuplicateTargets.keys(), ...rawExistingConflicts.map((conflict) => normalizeSku(conflict.referenceSku))]);
  const conflictManualRows = buildConflictManualRows(safeUpdates, rawDuplicateTargets, rawExistingConflicts, blockedTargetSkus);
  const finalSafePlans = safePlans.filter((plan) => !blockedTargetSkus.has(normalizeSku(plan.referenceSku)));
  const finalSafeUpdates = safeUpdates.filter((plan) => !blockedTargetSkus.has(normalizeSku(plan.referenceSku)));
  const duplicateTargets = getDuplicateTargets(finalSafeUpdates);
  const existingConflicts = getExistingTargetConflicts(finalSafeUpdates, variants);
  const safePreviewRows = plans
    .filter((plan) => plan.safeToApply && !blockedTargetSkus.has(normalizeSku(plan.referenceSku)))
    .map((plan) => ({
      variant_id: plan.variantId,
      product_id: plan.productId,
      product_name: plan.productName,
      current_sku: plan.currentSku,
      reference_sku: plan.referenceSku,
      reference_name: plan.referenceName,
      match_confidence: plan.confidence,
      proposed_action:
        normalizeSku(plan.currentSku) === normalizeSku(plan.referenceSku)
          ? "keep_current_sku"
          : "update_sku_to_reference",
      reason: plan.reason,
    }));
  const manualRows = [
    ...plans
    .filter((plan) => !plan.safeToApply)
    .map((plan) => ({
      variant_id: plan.variantId,
      product_id: plan.productId,
      product_name: plan.productName,
      current_sku: plan.currentSku,
      possible_reference_sku: plan.referenceSku,
      possible_reference_name: plan.referenceName,
      reason: plan.confidence,
      notes: plan.reason,
    })),
    ...conflictManualRows,
  ];
  const matchedReferenceSkus = new Set(
    finalSafePlans
      .map((plan) => normalizeSku(plan.referenceSku))
  );
  const existingSkuSet = new Set(variants.map((variant) => normalizeSku(variant.variant_code)));
  const missingReferences = references.filter(
    (reference) => !existingSkuSet.has(normalizeSku(reference.sku)) && !matchedReferenceSkus.has(normalizeSku(reference.sku))
  );
  const missingPlanRows = buildMissingProductPlan(missingReferences, variants);
  const batch01Rows = buildBatch01Preview(missingPlanRows, variants);

  writeReports({
    batch01Rows,
    duplicateTargets,
    existingConflicts,
    finalSafeUpdates,
    manualRows,
    missingPlanRows,
    plans,
    references,
    safePreviewRows,
  });

  printSummary({
    apply,
    batch01Rows,
    duplicateTargets,
    existingConflicts,
    finalSafeUpdates,
    manualRows,
    missingPlanRows,
    plans,
    references,
    safePreviewRows,
    variants,
  });

  if (!apply) {
    console.log("Dry-run only. No database rows were updated.");
    return;
  }

  if (duplicateTargets.size || existingConflicts.length) {
    throw new Error("Safe reference apply blocked because duplicate target conflicts exist.");
  }

  writePreApplyBackup(finalSafeUpdates);

  for (const plan of finalSafeUpdates) {
    const { error } = await supabase
      .from("product_variants")
      .update({ variant_code: plan.referenceSku })
      .eq("id", plan.variantId);

    if (error) {
      throw new Error(`${plan.variantId}: ${error.message}`);
    }

    console.log(`APPLIED ${plan.variantId}: ${plan.currentSku} -> ${plan.referenceSku}`);
  }
}

async function fetchVariants(supabase) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, variant_code, manufacturer_ref, connection_type, diameter, image_url, product:products(product_name, brand, product_group_code, image_url, category:categories(name, slug))")
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((variant) => {
    const text = normalizeText(`${variant.variant_code ?? ""} ${variant.manufacturer_ref ?? ""} ${variant.product?.product_name ?? ""} ${variant.product?.brand ?? ""}`);
    return /\bjot|jota|zir|zr|karbit|frez|polisaj|arkansas/.test(text);
  });
}

function readReferenceRows() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing reference file: ${DATA_PATH}`);
  }

  const rows = parseCsv(fs.readFileSync(DATA_PATH, "utf8"));
  return rows
    .map((row) => ({
      name: row["İsim"] ?? row["Isim"] ?? row["Ä°sim"] ?? row.name ?? "",
      sku: row.SKU ?? row.sku ?? "",
    }))
    .filter((row) => row.sku && row.name)
    .map((row) => ({ ...row, parsed: parseReferenceSku(row.sku), normalizedName: normalizeName(row.name) }));
}

function matchVariantToReference(variant, references, referenceBySku) {
  const currentSku = variant.variant_code ?? "";
  const exactReference = referenceBySku.get(normalizeSku(currentSku));
  const currentParsed = parseVariantSignals(variant);

  if (exactReference) {
    return toPlan({
      confidence: "exact_sku",
      reason: "Current SKU already exists in authoritative reference.",
      reference: exactReference,
      safeToApply: true,
      variant,
    });
  }

  const exactSignalMatches = references.filter((reference) => isExactSignalMatch(currentParsed, reference.parsed));
  if (exactSignalMatches.length === 1) {
    return toPlan({
      confidence: "exact_model_holder_diameter",
      reason: "Model, holder, diameter/type matched one authoritative reference row.",
      reference: exactSignalMatches[0],
      safeToApply: true,
      variant,
    });
  }

  const nameMatches = references.filter((reference) => isExactNameModelHolderMatch(variant, currentParsed, reference));
  if (nameMatches.length === 1) {
    return toPlan({
      confidence: "exact_name_model_holder",
      reason: "Normalized name plus model/holder matched one authoritative reference row.",
      reference: nameMatches[0],
      safeToApply: true,
      variant,
    });
  }

  const possibleMatches = references
    .map((reference) => ({ reference, score: getPossibleScore(variant, currentParsed, reference) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
  const possibleReference = possibleMatches[0]?.reference;

  return toPlan({
    confidence: possibleReference ? "possible_match" : "no_match",
    reason: possibleReference
      ? "Reference candidate exists but confidence is below safe apply threshold."
      : "No authoritative reference candidate found.",
    reference: possibleReference,
    safeToApply: false,
    variant,
  });
}

function toPlan({ confidence, reason, reference, safeToApply, variant }) {
  return {
    confidence,
    currentSku: variant.variant_code ?? "",
    productId: variant.product_id ?? "",
    productName: variant.product?.product_name ?? "",
    reason,
    referenceName: reference?.name ?? "",
    referenceSku: reference?.sku ?? "",
    safeToApply,
    variantId: variant.id,
  };
}

function parseReferenceSku(sku) {
  const parts = normalizeSku(sku).split("-").filter(Boolean);
  const [, ...rest] = parts;
  const holderIndex = rest.findIndex((part) => HOLDER_CODES.has(part));
  const holder = holderIndex === -1 ? "" : rest[holderIndex];
  const model = holderIndex === -1 ? rest[0] ?? "" : rest.slice(0, holderIndex).join("-");
  const tail = holderIndex === -1 ? rest.slice(1) : rest.slice(holderIndex + 1);
  const type = tail.find((part) => SPECIAL_TYPES.has(part)) ?? "";
  const diameter = tail.find((part) => /^\d{3}$/.test(part)) ?? "";
  return { diameter, holder, model, type };
}

function parseVariantSignals(variant) {
  const productName = normalizeSku(variant.product?.product_name ?? "");
  const skuParsed = parseReferenceSku(variant.variant_code ?? "");
  const refParsed = parseReferenceSku(`JOT-${variant.manufacturer_ref ?? ""}`);
  const model = skuParsed.model || refParsed.model || extractModel(productName);
  const holder = skuParsed.holder || refParsed.holder || normalizeSku(variant.connection_type);
  const diameter = skuParsed.diameter || refParsed.diameter || formatDiameter(variant.diameter);
  const type = skuParsed.type || refParsed.type || inferType(variant.product?.product_name ?? "");
  return { diameter, holder, model, normalizedName: normalizeName(variant.product?.product_name ?? ""), type };
}

function extractModel(value) {
  const normalized = normalizeSku(value);
  const match = normalized.match(/\b((?:ZIR|ZR|Z|GP|LS|CQ|CX|CG|C|RRC|SD)?[0-9]{1,5}[A-Z]{0,2})\b/);
  return match?.[1] ?? "";
}

function inferType(value) {
  const text = normalizeText(value);
  if (/polisaj|polisher|cilalama/.test(text)) return "POL";
  if (/arkansas/.test(text)) return "ARK";
  if (/cerrahi/.test(text)) return "SUR";
  if (/seramik|diamond stone|ayar tasi|ayar taşı/.test(text)) return "CER";
  if (/set|paket/.test(text)) return "SET";
  return "";
}

function isExactSignalMatch(current, reference) {
  if (!current.model || !reference.model || current.model !== reference.model) return false;
  if (!current.holder || !reference.holder || current.holder !== reference.holder) return false;
  if (reference.diameter) return current.diameter === reference.diameter;
  if (reference.type) return current.type === reference.type;
  return false;
}

function isExactNameModelHolderMatch(variant, current, reference) {
  if (!current.model || !reference.parsed.model || current.model !== reference.parsed.model) return false;
  if (!current.holder || !reference.parsed.holder || current.holder !== reference.parsed.holder) return false;
  const variantName = normalizeName(variant.product?.product_name ?? "");
  return variantName === reference.normalizedName || variantName.includes(reference.normalizedName) || reference.normalizedName.includes(variantName);
}

function getPossibleScore(variant, current, reference) {
  let score = 0;
  if (current.model && current.model === reference.parsed.model) score += 5;
  if (current.holder && current.holder === reference.parsed.holder) score += 3;
  if (current.diameter && current.diameter === reference.parsed.diameter) score += 3;
  if (current.type && current.type === reference.parsed.type) score += 2;
  const variantName = normalizeName(variant.product?.product_name ?? "");
  if (variantName && reference.normalizedName && (variantName.includes(reference.normalizedName) || reference.normalizedName.includes(variantName))) score += 4;
  return score;
}

function getDuplicateTargets(plans) {
  const groups = new Map();
  for (const plan of plans) {
    const key = normalizeSku(plan.referenceSku);
    const group = groups.get(key) ?? [];
    group.push(plan);
    groups.set(key, group);
  }
  return new Map([...groups.entries()].filter(([, group]) => group.length > 1));
}

function getExistingTargetConflicts(safeUpdates, variants) {
  const existing = new Map(variants.map((variant) => [normalizeSku(variant.variant_code), variant.id]));
  return safeUpdates
    .map((plan) => ({ ...plan, existingOwner: existing.get(normalizeSku(plan.referenceSku)) }))
    .filter((plan) => plan.existingOwner && plan.existingOwner !== plan.variantId);
}

function buildConflictManualRows(safeUpdates, rawDuplicateTargets, rawExistingConflicts, blockedTargetSkus) {
  const existingConflictByTarget = new Map(rawExistingConflicts.map((conflict) => [normalizeSku(conflict.referenceSku), conflict]));
  return safeUpdates
    .filter((plan) => blockedTargetSkus.has(normalizeSku(plan.referenceSku)))
    .map((plan) => {
      const target = normalizeSku(plan.referenceSku);
      const duplicateGroup = rawDuplicateTargets.get(target);
      const existingConflict = existingConflictByTarget.get(target);
      const conflictType = duplicateGroup
        ? "blocked_duplicate_target"
        : existingConflict
          ? "blocked_existing_target_conflict"
          : "blocked_reference_conflict";
      const detail = duplicateGroup
        ? `${duplicateGroup.length} current variants proposed the same authoritative SKU.`
        : `Authoritative SKU already belongs to variant ${existingConflict?.existingOwner ?? "unknown"}.`;

      return {
        variant_id: plan.variantId,
        product_id: plan.productId,
        product_name: plan.productName,
        current_sku: plan.currentSku,
        possible_reference_sku: plan.referenceSku,
        possible_reference_name: plan.referenceName,
        reason: conflictType,
        notes: `${detail} Moved out of safe apply; requires manual product/variant review.`,
      };
    });
}

function buildMissingProductPlan(missingReferences, variants) {
  const familyKeys = new Set(variants.map((variant) => getFamilyKey(variant.product?.product_name ?? variant.variant_code ?? "")));
  return missingReferences.map((reference) => {
    const detected = reference.parsed;
    const familyKey = getFamilyKey(reference.name || detected.model);
    const existingFamilyMatch = familyKeys.has(familyKey) ? familyKey : "";
    return {
      reference_sku: reference.sku,
      reference_name: reference.name,
      detected_category: detectCategory(reference),
      detected_model: detected.model,
      detected_holder: detected.holder,
      detected_diameter: detected.diameter,
      detected_type_or_grit: detected.type || getGritFromHolder(detected.holder),
      existing_family_match: existingFamilyMatch,
      proposed_action: existingFamilyMatch
        ? "Batch 01: add missing variant to existing family after dry-run import plan."
        : getMissingAction(reference),
      priority: getMissingPriority(reference, existingFamilyMatch),
    };
  }).sort((a, b) => Number(a.priority) - Number(b.priority) || a.reference_sku.localeCompare(b.reference_sku));
}

function buildBatch01Preview(missingPlanRows, variants) {
  const familyRepresentatives = getFamilyRepresentatives(variants);
  return missingPlanRows
    .filter((row) => {
      if (!row.existing_family_match) return false;
      const referenceSku = normalizeSku(row.reference_sku);
      return BATCH_01_PRIORITY_SKUS.includes(referenceSku);
    })
    .map((row) => {
      const family = familyRepresentatives.get(row.existing_family_match);
      const referenceSku = normalizeSku(row.reference_sku);
      const priorityIndex = BATCH_01_PRIORITY_SKUS.indexOf(referenceSku);
      const parsed = parseReferenceSku(row.reference_sku);
      const category = family?.product?.category?.name ?? row.detected_category;
      const imageSource = family?.product?.image_url ? `copy family product image: ${family.product.image_url}` : "";
      return {
        reference_sku: row.reference_sku,
        reference_name: row.reference_name,
        target_existing_family: row.existing_family_match,
        proposed_product_id: family?.product_id ?? "",
        proposed_variant_code: row.reference_sku,
        proposed_variant_name: row.reference_name,
        detected_model: row.detected_model,
        detected_holder: row.detected_holder,
        detected_diameter: row.detected_diameter,
        detected_grit: row.detected_type_or_grit || getGritFromHolder(parsed.holder),
        category,
        price_source: "",
        stock_source: "",
        image_source: imageSource,
        safe_to_insert: family ? "manual_price_stock_required" : "false",
        reason: family
          ? "Existing family match. Insert only after a dedicated dry-run insert script confirms price and stock policy."
          : "No existing family representative found.",
        _sort: priorityIndex === -1 ? 100 : priorityIndex,
      };
    })
    .sort((a, b) => a._sort - b._sort || a.reference_sku.localeCompare(b.reference_sku))
    .map((row) => {
      const output = { ...row };
      delete output._sort;
      return output;
    });
}

function getFamilyRepresentatives(variants) {
  const representatives = new Map();
  for (const variant of variants) {
    const key = getFamilyKey(variant.product?.product_name ?? variant.variant_code ?? "");
    if (!key || representatives.has(key)) continue;
    representatives.set(key, variant);
  }
  return representatives;
}

function getMissingPriority(reference, existingFamilyMatch) {
  if (existingFamilyMatch) return 1;
  const text = normalizeText(reference.name);
  if (/elmas|frez|zirkonya|801|859|881/.test(text)) return 1;
  if (/polisaj|arkansas|karbit|cerrahi|seramik|zirkonya/.test(text)) return 2;
  return 3;
}

function getMissingAction(reference) {
  const priority = getMissingPriority(reference, "");
  if (priority === 1) return "Batch 01: review as common frez/high-search product before insert.";
  if (priority === 2) return "Batch 02: review polisher, Arkansas, carbide, surgical, or adjustment product before insert.";
  return "Batch 03: review set/package/special product before insert.";
}

function detectCategory(reference) {
  const text = normalizeText(reference.name);
  if (/karbit/.test(text)) return "Karbit Frezler";
  if (/arkansas|ayar tasi|ayar taşı|diamond stone/.test(text)) return "Aşındırıcı Taşlar";
  if (/polisaj|polisher|cilalama/.test(text)) return "Cilalama Frezleri";
  if (/set|paket/.test(text)) return "Setler / Paketler";
  if (/zirkonya|elmas|frez/.test(text)) return "Elmas Frezler";
  return "Diğer Ürünler";
}

function getFamilyKey(value) {
  const model = extractModel(value);
  return model.replace(/(?:SG|EF|G|F)$/u, "");
}

function getGritFromHolder(holder) {
  const match = normalizeSku(holder).match(/^(SG|EF|G|F)(FG|RA|HP)$/);
  return match?.[1] ?? "";
}

function writeReports({ batch01Rows, duplicateTargets, existingConflicts, finalSafeUpdates, manualRows, missingPlanRows, plans, references, safePreviewRows }) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(SAFE_PREVIEW_PATH, toCsv(safePreviewRows, [
    "variant_id",
    "product_id",
    "product_name",
    "current_sku",
    "reference_sku",
    "reference_name",
    "match_confidence",
    "proposed_action",
    "reason",
  ]), "utf8");
  fs.writeFileSync(MANUAL_REVIEW_PATH, toCsv(manualRows, [
    "variant_id",
    "product_id",
    "product_name",
    "current_sku",
    "possible_reference_sku",
    "possible_reference_name",
    "reason",
    "notes",
  ]), "utf8");
  fs.writeFileSync(MISSING_PLAN_PATH, toCsv(missingPlanRows, [
    "reference_sku",
    "reference_name",
    "detected_category",
    "detected_model",
    "detected_holder",
    "detected_diameter",
    "detected_type_or_grit",
    "existing_family_match",
    "proposed_action",
    "priority",
  ]), "utf8");
  fs.writeFileSync(BATCH_01_PREVIEW_PATH, toCsv(batch01Rows, [
    "reference_sku",
    "reference_name",
    "target_existing_family",
    "proposed_product_id",
    "proposed_variant_code",
    "proposed_variant_name",
    "detected_model",
    "detected_holder",
    "detected_diameter",
    "detected_grit",
    "category",
    "price_source",
    "stock_source",
    "image_source",
    "safe_to_insert",
    "reason",
  ]), "utf8");
  fs.writeFileSync(SUMMARY_PATH, buildSummary({ batch01Rows, duplicateTargets, existingConflicts, finalSafeUpdates, manualRows, missingPlanRows, plans, references }), "utf8");
}

function buildSummary({ batch01Rows, duplicateTargets, existingConflicts, finalSafeUpdates, manualRows, missingPlanRows, plans, references }) {
  const confidenceCounts = countBy(plans, (plan) => plan.confidence);
  return [
    "# JOTA Reference SKU Rewrite Summary",
    "",
    "Generated: 2026-06-25",
    "",
    "## Scope",
    "",
    "- Authoritative reference source: `scripts/data/jota-sku-reference.csv`.",
    "- Dry-run/reporting workflow only unless `sku:rewrite:apply-safe-reference` is explicitly run.",
    "- Product names, prices, stock, requests, grouping, and UI are not changed by dry-run.",
    "",
    "## Counts",
    "",
    `- Reference rows: ${references.length}`,
    `- Checked variants: ${plans.length}`,
    `- Safe update candidates: ${finalSafeUpdates.length}`,
    `- Manual review rows: ${manualRows.length}`,
    `- Missing reference SKUs/products: ${missingPlanRows.length}`,
    `- Batch 01 missing variant preview rows: ${batch01Rows.length}`,
    `- Duplicate target conflicts: ${duplicateTargets.size}`,
    `- Existing target conflicts: ${existingConflicts.length}`,
    "",
    "## Match Confidence",
    "",
    ...[...confidenceCounts.entries()].map(([confidence, count]) => `- ${confidence}: ${count}`),
    "",
    "## Top Missing Products / Variants",
    "",
    ...missingPlanRows.slice(0, 20).map((row) => `- P${row.priority}: ${row.reference_sku} — ${row.reference_name} (${row.proposed_action})`),
    "",
    "## Report Paths",
    "",
    `- Safe preview: ${SAFE_PREVIEW_PATH}`,
    `- Manual review: ${MANUAL_REVIEW_PATH}`,
    `- Missing products plan: ${MISSING_PLAN_PATH}`,
    `- Batch 01 missing variants preview: ${BATCH_01_PREVIEW_PATH}`,
    `- Pre-apply backup: ${PRE_APPLY_BACKUP_PATH}`,
    "",
  ].join("\n");
}

function printSummary({ apply, batch01Rows, duplicateTargets, existingConflicts, finalSafeUpdates, manualRows, missingPlanRows, references, safePreviewRows, variants }) {
  console.log("\nDentech Pro JOTA reference SKU rewrite");
  console.log("--------------------------------------");
  console.log(`Mode: ${apply ? "APPLY SAFE REFERENCE" : "DRY RUN"}`);
  console.log(`Reference rows: ${references.length}`);
  console.log(`Checked variants: ${variants.length}`);
  console.log(`Safe preview rows: ${safePreviewRows.length}`);
  console.log(`Safe update count: ${finalSafeUpdates.length}`);
  console.log(`Manual review count: ${manualRows.length}`);
  console.log(`Missing product count: ${missingPlanRows.length}`);
  console.log(`Batch 01 preview count: ${batch01Rows.length}`);
  console.log(`Duplicate target conflicts: ${duplicateTargets.size}`);
  console.log(`Existing target conflicts: ${existingConflicts.length}`);
  console.log(`Safe preview: ${SAFE_PREVIEW_PATH}`);
  console.log(`Manual review: ${MANUAL_REVIEW_PATH}`);
  console.log(`Missing products plan: ${MISSING_PLAN_PATH}`);
  console.log(`Batch 01 preview: ${BATCH_01_PREVIEW_PATH}`);
  console.log(`Pre-apply backup: ${PRE_APPLY_BACKUP_PATH}`);
  console.log(`Summary: ${SUMMARY_PATH}`);
}

function writePreApplyBackup(finalSafeUpdates) {
  const headers = [
    "variant_id",
    "product_id",
    "product_name",
    "current_sku",
    "reference_sku",
    "reference_name",
    "match_confidence",
    "reason",
  ];
  const existingRows = fs.existsSync(PRE_APPLY_BACKUP_PATH)
    ? parseCsv(fs.readFileSync(PRE_APPLY_BACKUP_PATH, "utf8"))
    : [];
  const rowsByVariant = new Map(existingRows.map((row) => [row.variant_id, row]));

  for (const plan of finalSafeUpdates) {
    if (rowsByVariant.has(plan.variantId)) continue;
    rowsByVariant.set(plan.variantId, {
      variant_id: plan.variantId,
      product_id: plan.productId,
      product_name: plan.productName,
      current_sku: plan.currentSku,
      reference_sku: plan.referenceSku,
      reference_name: plan.referenceName,
      match_confidence: plan.confidence,
      reason: plan.reason,
    });
  }

  fs.writeFileSync(PRE_APPLY_BACKUP_PATH, toCsv([...rowsByVariant.values()], headers), "utf8");
  console.log(`Pre-apply backup written: ${PRE_APPLY_BACKUP_PATH}`);
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

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function formatDiameter(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric >= 50) return "";
  const code = numeric < 10 ? Math.round(numeric * 10) : Math.round(numeric);
  return String(code).padStart(3, "0");
}

function normalizeName(value) {
  return normalizeText(value)
    .replace(/\bjota\b/g, "")
    .replace(/\b(elmas|frez|karbit|polisaj|ucu|polisher|standard|mavi|yesil|kirmizi|siyah|sari|kusak|ince|kaba|extra|genel|preparasyon)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeSku(value) {
  return String(value ?? "").trim().toUpperCase();
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
