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
  query?: string;
};

export type AdminProductListItem = {
  brand: string;
  categoryName: string;
  categorySlug: string | null;
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

export async function getAdminProductList(
  filters: AdminProductFilters = {}
): Promise<AdminProductListResult> {
  const supabase = getSupabaseAdminClient();
  const startedAt = performance.now();
  const normalizedBrand = filters.brand?.trim() || "JOTA";
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("tr-TR");
  const activeFilter = filters.active ?? "active";
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

  let query = supabase
    .from("products")
    .select(
      "id,brand,category_id,product_group_code,product_name,is_active,updated_at,category:categories(id,name,slug,sort_order)",
      { count: "exact" }
    )
    .eq("brand", normalizedBrand)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  }

  if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (normalizedQuery) {
    const escapedQuery = escapeLikePattern(normalizedQuery);
    const productSearch = [
      `product_name.ilike.%${escapedQuery}%`,
      `product_group_code.ilike.%${escapedQuery}%`,
      ...matchingProductIds.map((id) => `id.eq.${id}`),
    ].join(",");
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
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id,is_active,manufacturer_ref,price,product_id,stock_quantity,variant_code"
    )
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((summaries, variant) => {
    const current = summaries.get(variant.product_id) ?? [];
    current.push(variant);
    summaries.set(variant.product_id, current);
    return summaries;
  }, new Map<string, VariantSummary[]>());
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
  const prices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return {
    brand: product.brand,
    categoryName: product.category?.name ?? "-",
    categorySlug: product.category?.slug ?? null,
    id: product.id,
    isActive: product.is_active,
    lowestPrice: minPrice,
    priceRange: formatPriceRange(minPrice, maxPrice),
    productGroupCode: product.product_group_code,
    productName: product.product_name,
    totalStock: product.variants.reduce(
      (sum, variant) => sum + variant.stock_quantity,
      0
    ),
    updatedAt: product.updated_at,
    variantCount: product.variants.length,
  };
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

function logAdminProductQuery(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[${event}]`, payload);
}
