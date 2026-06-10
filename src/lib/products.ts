import "server-only";

import { canViewPrices } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/auth";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type ProductFilters = {
  brand?: string;
  category?: string;
  query?: string;
};

export type CatalogCategory = Pick<
  CategoryRow,
  "id" | "name" | "slug" | "sort_order"
>;

export type PublicCatalogVariant = {
  code: string;
  connectionType: string | null;
  grit: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  manufacturerRef: string | null;
  name: string;
  packageQuantity: number;
};

export type PricedCatalogVariant = PublicCatalogVariant & {
  currency: string;
  price: number | null;
  stockQuantity: number;
  stockStatus: VariantRow["stock_status"];
};

export type PublicCatalogProduct = {
  brand: string;
  category: CatalogCategory | null;
  code: string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  status: string;
  usageArea: string | null;
  variants: PublicCatalogVariant[];
};

export type PricedCatalogProduct = Omit<PublicCatalogProduct, "variants"> & {
  variants: PricedCatalogVariant[];
};

type ProductQueryRow = ProductRow & {
  category: CategoryRow | null;
  variants: VariantRow[];
};

export function getCanViewPrices(profile: Profile | null) {
  return canViewPrices(profile);
}

export async function getCatalogCategories() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data satisfies CatalogCategory[];
}

export async function getPublicProducts(filters: ProductFilters = {}) {
  const rows = await getProductRows(filters);
  return rows.map(toPublicProduct);
}

export async function getPublicProductById(productId: string) {
  const row = await getProductRowById(productId);
  return row ? toPublicProduct(row) : null;
}

export async function getPricedProductsForProfile(
  profile: Profile | null,
  filters: ProductFilters = {}
) {
  const rows = await getProductRows(filters);

  if (!getCanViewPrices(profile)) {
    return rows.map(toPublicProduct);
  }

  return rows.map(toPricedProduct);
}

export async function getPricedProductByIdForProfile(
  profile: Profile | null,
  productId: string
) {
  const row = await getProductRowById(productId);

  if (!row) {
    return null;
  }

  return getCanViewPrices(profile) ? toPricedProduct(row) : toPublicProduct(row);
}

async function getProductRows(filters: ProductFilters) {
  const supabase = getSupabaseAdminClient();
  const normalizedBrand = filters.brand?.trim() || "JOTA";
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim().toLowerCase();

  const query = supabase
    .from("products")
    .select(
      "*,category:categories(*),variants:product_variants(*)"
    )
    .eq("is_active", true)
    .eq("brand", normalizedBrand)
    .order("product_name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProductRows(data ?? []).filter((product) => {
    if (
      normalizedCategory &&
      product.category?.slug !== normalizedCategory
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      product.product_name,
      product.product_group_code,
      product.description,
      product.usage_area,
      product.category?.name,
      ...product.variants.map((variant) => variant.variant_code),
      ...product.variants.map((variant) => variant.manufacturer_ref),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

async function getProductRowById(productId: string) {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("products")
    .select("*,category:categories(*),variants:product_variants(*)")
    .eq("is_active", true);

  query = isUuid(productId)
    ? query.eq("id", productId)
    : query.eq("product_group_code", productId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeProductRows([data])[0] : null;
}

function normalizeProductRows(rows: unknown[]): ProductQueryRow[] {
  return rows.map((row) => {
    const product = row as ProductRow & {
      category: CategoryRow | null;
      variants: VariantRow[] | null;
    };

    return {
      ...product,
      variants: (product.variants ?? []).filter((variant) => variant.is_active),
    };
  });
}

function toPublicProduct(row: ProductQueryRow): PublicCatalogProduct {
  return {
    brand: row.brand,
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
          sort_order: row.category.sort_order,
        }
      : null,
    code: row.product_group_code,
    description: row.description,
    id: row.id,
    imageUrl: row.image_url,
    name: row.product_name,
    status: row.usage_area ?? "JOTA ürün kataloğu",
    usageArea: row.usage_area,
    variants: row.variants.map(toPublicVariant),
  };
}

function toPricedProduct(row: ProductQueryRow): PricedCatalogProduct {
  return {
    ...toPublicProduct(row),
    variants: row.variants.map(toPricedVariant),
  };
}

function toPublicVariant(row: VariantRow): PublicCatalogVariant {
  return {
    code: row.variant_code,
    connectionType: row.connection_type,
    grit: row.grit,
    id: row.id,
    imageUrl: row.image_url,
    isActive: row.is_active,
    manufacturerRef: row.manufacturer_ref,
    name: getVariantName(row),
    packageQuantity: row.package_quantity,
  };
}

function toPricedVariant(row: VariantRow): PricedCatalogVariant {
  return {
    ...toPublicVariant(row),
    currency: row.currency,
    price: row.price,
    stockQuantity: row.stock_quantity,
    stockStatus: row.stock_status,
  };
}

function getVariantName(row: VariantRow) {
  return [row.connection_type, row.diameter ? `Ø ${row.diameter}` : null, row.grit]
    .filter(Boolean)
    .join(" · ") || row.variant_code;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
