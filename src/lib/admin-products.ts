import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

type VariantSummary = Pick<
  VariantRow,
  | "id"
  | "is_active"
  | "manufacturer_ref"
  | "price"
  | "product_id"
  | "stock_quantity"
  | "variant_code"
>;

type AdminProductRow = Pick<
  ProductRow,
  | "brand"
  | "category_id"
  | "id"
  | "is_active"
  | "product_group_code"
  | "product_name"
  | "updated_at"
> & {
  category: CategoryRow | null;
  variants: VariantSummary[];
};

type AdminProductDetailRow = ProductRow & {
  category: CategoryRow | null;
  variants: VariantRow[];
};

const ADMIN_PRODUCT_DETAIL_SELECT =
  "id,brand,category_id,description,image_url,is_active,material_tags,procedure_tags,product_group_code,product_name,target_user_type,updated_at,usage_area,category:categories(id,name,slug,sort_order),variants:product_variants(id,product_id,variant_code,manufacturer_ref,connection_type,price,currency,stock_quantity,stock_status,package_quantity,diameter,length,grit,color,uts_no,image_url,is_active,created_at,updated_at)";

export type AdminProductFilters = {
  active?: "active" | "inactive" | "all";
  brand?: string;
  category?: string;
  page?: number | string;
  pageSize?: number | string;
  quality?: AdminProductQualityFilter;
  query?: string;
};

export type AdminProductQualityFilter =
  | "all"
  | "inactive_or_duplicate"
  | "missing_price"
  | "no_active_variant";

export type AdminProductListItem = {
  activeVariantCount: number;
  brand: string;
  categoryName: string;
  categorySlug: string | null;
  hasDuplicateLikeVariants: boolean;
  hasInactiveVariant: boolean;
  hasMissingPrice: boolean;
  hasNoActiveVariant: boolean;
  id: string;
  isActive: boolean;
  lowestPrice: number | null;
  priceRange: string;
  productGroupCode: string;
  productName: string;
  totalStock: number;
  updatedAt: string;
  variantCount: number;
};

export type AdminProductListResult = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  products: AdminProductListItem[];
  totalCount: number;
  totalPages: number;
};

export type AdminProductDetail = AdminProductListItem & {
  categoryId: string | null;
  description: string | null;
  imageUrl: string | null;
  materialTags: string[];
  procedureTags: string[];
  targetUserType: string[];
  usageArea: string | null;
  variants: VariantRow[];
};

export async function getAdminCategories() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order,status")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getAdminBrands() {
  const supabase = getSupabaseAdminClient();
  const brands = new Set<string>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("brand")
      .order("brand")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const brand = row.brand.trim();
      if (brand) brands.add(brand);
    }

    if ((data ?? []).length < pageSize) break;
  }

  return [...brands].sort((left, right) => left.localeCompare(right, "tr-TR"));
}

export async function getAdminProductList(
  filters: AdminProductFilters = {}
): Promise<AdminProductListResult> {
  const supabase = getSupabaseAdminClient();
  const startedAt = performance.now();
  const normalizedBrand = filters.brand?.trim();
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("tr-TR");
  const activeFilter = filters.active ?? "active";
  const qualityFilter = filters.quality ?? "all";
  const pageSize = clampInteger(filters.pageSize, 25, 1, 100);
  const page = clampInteger(filters.page, 1, 1, 10_000);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const categoryId = normalizedCategory
    ? await getCategoryIdBySlug(normalizedCategory)
    : null;
  const matchingProductIds = normalizedQuery
    ? await getMatchingVariantProductIds(normalizedQuery)
    : [];
  const productSearch = normalizedQuery
    ? buildProductSearch(normalizedQuery, matchingProductIds)
    : null;

  if (qualityFilter !== "all") {
    return getQualityFilteredAdminProductList({
      activeFilter,
      categoryId,
      normalizedBrand,
      page,
      pageSize,
      productSearch,
      qualityFilter,
      startedAt,
    });
  }

  let query = supabase
    .from("products")
    .select(
      "id,brand,category_id,product_group_code,product_name,is_active,updated_at,category:categories(id,name,slug,sort_order)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (normalizedBrand) {
    query = query.eq("brand", normalizedBrand);
  }

  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  }

  if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (productSearch) {
    query = query.or(productSearch);
  }

  const { count, data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const productRows = normalizeListProductRows(data ?? []);
  const variantSummaries = productRows.length
    ? await getVariantSummariesForProducts(productRows.map((row) => row.id))
    : new Map<string, VariantSummary[]>();
  const rows = productRows.map((product) => ({
    ...product,
    variants: variantSummaries.get(product.id) ?? [],
  }));
  const totalCount = count ?? 0;
  const variantCount = rows.reduce(
    (sum, product) => sum + product.variants.length,
    0
  );

  logAdminProductQuery("admin.products.list", {
    durationMs: Math.round(performance.now() - startedAt),
    page,
    pageSize,
    productCount: rows.length,
    totalCount,
    variantCount,
  });

  return {
    hasNextPage: to + 1 < totalCount,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    products: rows.map(toListItem),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getAdminProductDetail(productId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_DETAIL_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return toDetail(normalizeDetailRows([data])[0]);
}

async function getQualityFilteredAdminProductList({
  activeFilter,
  categoryId,
  normalizedBrand,
  page,
  pageSize,
  productSearch,
  qualityFilter,
  startedAt,
}: {
  activeFilter: "active" | "inactive" | "all";
  categoryId: string | null;
  normalizedBrand: string | undefined;
  page: number;
  pageSize: number;
  productSearch: string | null;
  qualityFilter: Exclude<AdminProductQualityFilter, "all">;
  startedAt: number;
}): Promise<AdminProductListResult> {
  const supabase = getSupabaseAdminClient();
  const productRows: Omit<AdminProductRow, "variants">[] = [];
  const fetchPageSize = 1000;

  for (let from = 0; ; from += fetchPageSize) {
    let query = supabase
      .from("products")
      .select(
        "id,brand,category_id,product_group_code,product_name,is_active,updated_at,category:categories(id,name,slug,sort_order)"
      )
      .order("updated_at", { ascending: false })
      .order("id")
      .range(from, from + fetchPageSize - 1);

    if (normalizedBrand) query = query.eq("brand", normalizedBrand);
    if (activeFilter === "active") query = query.eq("is_active", true);
    if (activeFilter === "inactive") query = query.eq("is_active", false);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (productSearch) query = query.or(productSearch);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    productRows.push(...normalizeListProductRows(data ?? []));
    if ((data ?? []).length < fetchPageSize) break;
  }

  const variantSummaries = productRows.length
    ? await getVariantSummariesForProducts(productRows.map((row) => row.id))
    : new Map<string, VariantSummary[]>();
  const matchingRows = productRows
    .map((product) => ({
      ...product,
      variants: variantSummaries.get(product.id) ?? [],
    }))
    .filter((product) => matchesQualityFilter(product, qualityFilter));
  const totalCount = matchingRows.length;
  const from = (page - 1) * pageSize;
  const products = matchingRows.slice(from, from + pageSize).map(toListItem);

  logAdminProductQuery("admin.products.quality-list", {
    durationMs: Math.round(performance.now() - startedAt),
    page,
    pageSize,
    productCount: products.length,
    qualityFilter,
    totalCount,
  });

  return {
    hasNextPage: from + pageSize < totalCount,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    products,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

function normalizeListProductRows(rows: unknown[]): Omit<AdminProductRow, "variants">[] {
  return rows.map((row) => {
    const product = row as ProductRow & {
      category: CategoryRow | null;
    };

    return {
      brand: product.brand,
      category: product.category,
      category_id: product.category_id,
      id: product.id,
      is_active: product.is_active,
      product_group_code: product.product_group_code,
      product_name: product.product_name,
      updated_at: product.updated_at,
    };
  });
}

async function getVariantSummariesForProducts(productIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const summaries = new Map<string, VariantSummary[]>();

  for (const ids of chunk(productIds, 200)) {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "id,is_active,manufacturer_ref,price,product_id,stock_quantity,variant_code"
      )
      .in("product_id", ids);

    if (error) {
      throw new Error(error.message);
    }

    for (const variant of data ?? []) {
      const current = summaries.get(variant.product_id) ?? [];
      current.push(variant);
      summaries.set(variant.product_id, current);
    }
  }

  return summaries;
}

function normalizeDetailRows(rows: unknown[]): AdminProductDetailRow[] {
  return rows.map((row) => {
    const product = row as ProductRow & {
      category: CategoryRow | null;
      variants: VariantRow[] | null;
    };

    return {
      ...product,
      variants: product.variants ?? [],
    };
  });
}

function toListItem(product: AdminProductRow): AdminProductListItem {
  const activeVariants = product.variants.filter((variant) => variant.is_active);
  const prices = activeVariants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const hasNoActiveVariant = product.is_active && activeVariants.length === 0;

  return {
    activeVariantCount: activeVariants.length,
    brand: product.brand,
    categoryName: product.category?.name ?? "-",
    categorySlug: product.category?.slug ?? null,
    hasDuplicateLikeVariants: hasDuplicateLikeVariants(product.variants),
    hasInactiveVariant: product.variants.some((variant) => !variant.is_active),
    hasMissingPrice:
      product.is_active &&
      (hasNoActiveVariant || activeVariants.some((variant) => variant.price === null)),
    hasNoActiveVariant,
    id: product.id,
    isActive: product.is_active,
    lowestPrice: minPrice,
    priceRange: formatPriceRange(minPrice, maxPrice),
    productGroupCode: product.product_group_code,
    productName: product.product_name,
    totalStock: activeVariants.reduce(
      (sum, variant) => sum + variant.stock_quantity,
      0
    ),
    updatedAt: product.updated_at,
    variantCount: product.variants.length,
  };
}

function matchesQualityFilter(
  product: AdminProductRow,
  qualityFilter: Exclude<AdminProductQualityFilter, "all">
) {
  const item = toListItem(product);

  if (qualityFilter === "missing_price") return item.hasMissingPrice;
  if (qualityFilter === "no_active_variant") return item.hasNoActiveVariant;
  return item.hasInactiveVariant || item.hasDuplicateLikeVariants;
}

function hasDuplicateLikeVariants(variants: VariantSummary[]) {
  const seen = new Set<string>();

  for (const variant of variants) {
    const code = variant.variant_code
      .trim()
      .toLocaleUpperCase("tr-TR")
      .replace(/[\s._-]/g, "");

    if (!code) continue;
    if (seen.has(code)) return true;
    seen.add(code);
  }

  return false;
}

function toDetail(product: AdminProductDetailRow): AdminProductDetail {
  return {
    ...toListItem(product),
    categoryId: product.category_id,
    description: product.description,
    imageUrl: product.image_url,
    materialTags: product.material_tags ?? [],
    procedureTags: product.procedure_tags ?? [],
    targetUserType: product.target_user_type ?? [],
    usageArea: product.usage_area,
    variants: product.variants.sort((a, b) =>
      a.variant_code.localeCompare(b.variant_code)
    ),
  };
}

async function getCategoryIdBySlug(slug: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function getMatchingVariantProductIds(searchQuery: string) {
  const supabase = getSupabaseAdminClient();
  const escapedQuery = escapeLikePattern(searchQuery);
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .or(
      `variant_code.ilike.%${escapedQuery}%,manufacturer_ref.ilike.%${escapedQuery}%`
    )
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.product_id))];
}

function buildProductSearch(searchQuery: string, matchingProductIds: string[]) {
  const escapedQuery = escapeLikePattern(searchQuery);

  return [
    `product_name.ilike.%${escapedQuery}%`,
    `product_group_code.ilike.%${escapedQuery}%`,
    ...matchingProductIds.map((id) => `id.eq.${id}`),
  ].join(",");
}

function formatPriceRange(minPrice: number | null, maxPrice: number | null) {
  if (minPrice === null || maxPrice === null) {
    return "Fiyat yok";
  }

  const formatter = new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  });

  if (minPrice === maxPrice) {
    return formatter.format(minPrice);
  }

  return `${formatter.format(minPrice)} - ${formatter.format(maxPrice)}`;
}

function clampInteger(
  value: number | string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_,]/g, "");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function logAdminProductQuery(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[${event}]`, payload);
}
