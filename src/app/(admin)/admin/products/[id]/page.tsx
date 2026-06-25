import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  toggleProductActiveAction,
  toggleVariantActiveAction,
  updateProductAction,
  updateVariantAction,
} from "@/app/(admin)/admin/products/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminCategories,
  getAdminProductDetail,
} from "@/lib/admin-products";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Variant = Database["public"]["Tables"]["product_variants"]["Row"];

type AdminProductDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: AdminProductDetailPageProps) {
  const [{ id }, query, categories] = await Promise.all([
    params,
    searchParams,
    getAdminCategories(),
  ]);
  const product = await getAdminProductDetail(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle
          title={product.productName}
          description="Ürün alanları ve varyant bazlı fiyat/stok bilgilerini yönetin."
        />
        <Link className="text-sm font-medium text-primary" href="/admin/products">
          Ürün listesine dön
        </Link>
      </div>

      {query.status ? (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          Değişiklikler kaydedildi.
        </div>
      ) : null}

      <SurfaceCard>
        <CardContent className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">Ürün Bilgileri</h2>
              <p className="text-sm text-muted-foreground">
                Import eşleşmesi ürün kodu üzerinden yapılır.
              </p>
            </div>
            <ProductStatusBadge isActive={product.isActive} />
          </div>

          <form action={updateProductAction} className="grid gap-4">
            <input name="product_id" type="hidden" value={product.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ürün Adı">
                <Input
                  defaultValue={product.productName}
                  name="product_name"
                  required
                />
              </Field>
              <Field label="Ürün Grup Kodu">
                <Input
                  defaultValue={product.productGroupCode}
                  name="product_group_code"
                  required
                />
              </Field>
              <Field label="Marka">
                <Input defaultValue={product.brand} name="brand" required />
              </Field>
              <Field label="Kategori">
                <select
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  defaultValue={product.categoryId ?? ""}
                  name="category_id"
                >
                  <option value="">Kategori seçilmedi</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kullanım Alanı">
                <Input
                  defaultValue={product.usageArea ?? ""}
                  name="usage_area"
                />
              </Field>
              <Field label="Görsel URL">
                <Input defaultValue={product.imageUrl ?? ""} name="image_url" />
              </Field>
              <Field label="Materyal Etiketleri">
                <Input
                  defaultValue={product.materialTags.join(", ")}
                  name="material_tags"
                  placeholder="Elmas, Zirkonya"
                />
              </Field>
              <Field label="Prosedür Etiketleri">
                <Input
                  defaultValue={product.procedureTags.join(", ")}
                  name="procedure_tags"
                  placeholder="Preparasyon, Polisaj"
                />
              </Field>
              <Field label="Hedef Kullanıcı Tipleri">
                <Input
                  defaultValue={product.targetUserType.join(", ")}
                  name="target_user_type"
                  placeholder="doctor, lab"
                />
              </Field>
            </div>
            <Field label="Açıklama">
              <textarea
                className="min-h-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                defaultValue={product.description ?? ""}
                name="description"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                defaultChecked={product.isActive}
                name="is_active"
                type="checkbox"
              />
              Aktif ürün
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit">Ürünü Kaydet</Button>
            </div>
          </form>
          <div className="mt-3">
            <ToggleProductForm
              isActive={!product.isActive}
              productId={product.id}
            />
          </div>
        </CardContent>
      </SurfaceCard>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Varyantlar</h2>
        {product.variants.map((variant) => (
          <VariantEditor
            key={variant.id}
            productId={product.id}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

function VariantEditor({
  productId,
  variant,
}: {
  productId: string;
  variant: Variant;
}) {
  return (
    <SurfaceCard>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{variant.variant_code}</h3>
            <p className="text-sm text-muted-foreground">
              {variant.manufacturer_ref ?? "Referans yok"}
            </p>
          </div>
          <ProductStatusBadge isActive={variant.is_active} />
        </div>
        <form action={updateVariantAction} className="grid gap-4">
          <input name="product_id" type="hidden" value={productId} />
          <input name="variant_id" type="hidden" value={variant.id} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Varyant/SKU Kodu">
              <Input
                defaultValue={variant.variant_code}
                name="variant_code"
                required
              />
            </Field>
            <Field label="Üretici Ref">
              <Input
                defaultValue={variant.manufacturer_ref ?? ""}
                name="manufacturer_ref"
              />
            </Field>
            <Field label="Bağlantı Tipi">
              <Input
                defaultValue={variant.connection_type ?? ""}
                name="connection_type"
              />
            </Field>
            <Field label="Fiyat">
              <Input
                defaultValue={variant.price ?? ""}
                min="0"
                name="price"
                step="0.01"
                type="number"
              />
            </Field>
            <Field label="Para Birimi">
              <Input defaultValue={variant.currency} name="currency" />
            </Field>
            <Field label="Stok">
              <Input
                defaultValue={variant.stock_quantity}
                min="0"
                name="stock_quantity"
                required
                step="1"
                type="number"
              />
            </Field>
            <Field label="Paket Miktarı">
              <Input
                defaultValue={variant.package_quantity}
                min="1"
                name="package_quantity"
                step="1"
                type="number"
              />
            </Field>
            <Field label="Çap">
              <Input
                defaultValue={variant.diameter ?? ""}
                name="diameter"
                step="0.01"
                type="number"
              />
            </Field>
            <Field label="Uzunluk">
              <Input
                defaultValue={variant.length ?? ""}
                name="length"
                step="0.01"
                type="number"
              />
            </Field>
            <Field label="Gren">
              <Input defaultValue={variant.grit ?? ""} name="grit" />
            </Field>
            <Field label="Renk">
              <Input defaultValue={variant.color ?? ""} name="color" />
            </Field>
            <Field label="UTS No">
              <Input defaultValue={variant.uts_no ?? ""} name="uts_no" />
            </Field>
            <Field label="Görsel URL">
              <Input defaultValue={variant.image_url ?? ""} name="image_url" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              defaultChecked={variant.is_active}
              name="is_active"
              type="checkbox"
            />
            Aktif varyant
          </label>
          {!variant.is_active ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Fiyat ve stok kontrol edilmeden aktif etmeyin.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit">Varyantı Kaydet</Button>
          </div>
        </form>
        <ToggleVariantForm
          isActive={!variant.is_active}
          productId={productId}
          variantId={variant.id}
        />
      </CardContent>
    </SurfaceCard>
  );
}

function ToggleProductForm({
  isActive,
  productId,
}: {
  isActive: boolean;
  productId: string;
}) {
  return (
    <form action={toggleProductActiveAction}>
      <input name="product_id" type="hidden" value={productId} />
      <input name="is_active" type="hidden" value={String(isActive)} />
      <Button type="submit" variant="outline">
        {isActive ? "Ürünü Aktifleştir" : "Ürünü Pasifleştir"}
      </Button>
    </form>
  );
}

function ToggleVariantForm({
  isActive,
  productId,
  variantId,
}: {
  isActive: boolean;
  productId: string;
  variantId: string;
}) {
  return (
    <form action={toggleVariantActiveAction}>
      <input name="product_id" type="hidden" value={productId} />
      <input name="variant_id" type="hidden" value={variantId} />
      <input name="is_active" type="hidden" value={String(isActive)} />
      <Button type="submit" variant="outline">
        {isActive ? "Varyantı Aktifleştir" : "Varyantı Pasifleştir"}
      </Button>
    </form>
  );
}

function ProductStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-background/70",
        isActive
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
    >
      {isActive ? "Aktif" : "Pasif"}
    </Badge>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
