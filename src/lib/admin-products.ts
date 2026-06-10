import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

type AdminProductRow = ProductRow & {
  category: CategoryRow | null;
  variants: VariantRow[];
};

export type AdminProductFilters = {
  active?: "active" | "inactive" | "all";
  brand?: string;
  category?: string;
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
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getAdminProductList(filters: AdminProductFilters = {}) {
  const supabase = getSupabaseAdminClient();
  const normalizedBrand = filters.brand?.trim();
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim().toLowerCase();
  const activeFilter = filters.active ?? "active";

  let query = supabase
    .from("products")
    .select("*,category:categories(*),variants:product_variants(*)")
    .order("updated_at", { ascending: false });

  if (normalizedBrand) {
    query = query.eq("brand", normalizedBrand);
  }

  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  }

  if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRows(data ?? [])
    .filter((product) => {
      if (normalizedCategory && product.category?.slug !== normalizedCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        product.product_name,
        product.product_group_code,
        product.brand,
        product.category?.name,
        ...product.variants.map((variant) => variant.variant_code),
        ...product.variants.map((variant) => variant.manufacturer_ref),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .map(toListItem);
}

export async function getAdminProductDetail(productId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*,category:categories(*),variants:product_variants(*)")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return toDetail(normalizeRows([data])[0]);
}

function normalizeRows(rows: unknown[]): AdminProductRow[] {
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

function toDetail(product: AdminProductRow): AdminProductDetail {
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
