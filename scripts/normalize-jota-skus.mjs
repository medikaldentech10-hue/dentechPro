import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const GRIT_SUFFIXES = ["SG", "EF", "G", "F"];
const HOLDER_CODES = new Set(["FG", "RA", "HP", "GFG", "SGFG", "FFG", "EFFG"]);
const SAMPLE_MODELS = new Set(["801", "801L", "881", "881F", "881SG", "558", "850", "850G", "Z850", "ZR600", "ZIR600"]);

main().catch((error) => {
  console.error("[sku-normalize] failed", error);
  process.exitCode = 1;
});

async function main() {
  const apply = process.argv.includes("--apply");
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
  const duplicateSkus = getDuplicateTargets(plans);
  const existingSkuOwners = new Map(
    variants.map((variant) => [normalizeSku(variant.variant_code), variant.id])
  );
  const safePlans = [];
  const skippedPlans = [];

  for (const plan of plans) {
    if (!plan.targetSku) {
      skippedPlans.push(plan);
      continue;
    }

    if (normalizeSku(plan.currentSku) === normalizeSku(plan.targetSku)) {
      skippedPlans.push({ ...plan, reason: "already_normalized" });
      continue;
    }

    const duplicateCount = duplicateSkus.get(plan.targetSku) ?? 0;
    const existingOwner = existingSkuOwners.get(plan.targetSku);

    if (duplicateCount > 1) {
      skippedPlans.push({ ...plan, reason: "duplicate_target_in_batch" });
      continue;
    }

    if (existingOwner && existingOwner !== plan.variantId) {
      skippedPlans.push({ ...plan, reason: "duplicate_existing_sku" });
      continue;
    }

    safePlans.push(plan);
  }

  console.log("\nDentech Pro JOTA SKU normalization");
  console.log("----------------------------------");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Variants checked: ${variants.length}`);
  console.log(`Safe changes: ${safePlans.length}`);
  console.log(`Skipped: ${skippedPlans.length}`);
  console.log(`Duplicate target conflicts: ${countReason(skippedPlans, "duplicate_target_in_batch")}`);
  console.log(`Existing SKU conflicts: ${countReason(skippedPlans, "duplicate_existing_sku")}`);

  printSamplePlans([...safePlans, ...skippedPlans]);

  if (!apply) {
    for (const plan of safePlans.slice(0, 80)) {
      console.log(`${plan.productName}: ${plan.currentSku} -> ${plan.targetSku}`);
    }
    console.log("Dry-run only. No database rows were updated. Add --apply after reviewing conflicts.");
    return;
  }

  if (safePlans.length === 0) {
    console.log("No safe SKU changes to apply.");
    return;
  }

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
      "id,variant_code,manufacturer_ref,connection_type,diameter,product:products(product_name,brand,product_group_code)"
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
  const holder = getHolder({
    explicitHolder: parsedRef.holder,
    connectionType: variant.connection_type,
    modelSuffix: modelInfo.gritSuffix,
  });
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
    holder,
    model: modelInfo.model,
    productName,
    reason,
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

  return {
    diameter: parts.find((part) => /^\d{3}$/.test(part)) ?? "",
    holder: parts.find((part) => HOLDER_CODES.has(part)) ?? "",
    model: parts.find((part) => /^(?:ZIR|ZR|Z)?[0-9]{3,5}[A-Z]{0,2}$/.test(part)) ?? "",
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

function getHolder({ explicitHolder, connectionType, modelSuffix }) {
  const baseHolder = normalizeText(explicitHolder || connectionType).toUpperCase();
  if (!HOLDER_CODES.has(baseHolder)) {
    return "";
  }

  if (!modelSuffix || baseHolder !== "FG") {
    return baseHolder;
  }

  return `${modelSuffix}${baseHolder}`;
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

function getDuplicateTargets(plans) {
  const counts = new Map();
  for (const plan of plans) {
    if (!plan.targetSku) continue;
    counts.set(plan.targetSku, (counts.get(plan.targetSku) ?? 0) + 1);
  }
  return counts;
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

function countReason(plans, reason) {
  return plans.filter((plan) => plan.reason === reason).length;
}

function normalizeSku(value) {
  return String(value ?? "").trim().toUpperCase();
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
