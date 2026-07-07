import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
} from "lucide-react";

import { ProductDetailClient } from "@/components/products/product-detail-client";
import { SurfaceCard } from "@/components/premium/surface-card";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { canViewPrices, getCurrentProfile, isSalesRep } from "@/lib/auth";
import { getPricedProductByIdForProfile } from "@/lib/products";
import { cn } from "@/lib/utils";

const DESCRIPTION_FALLBACK =
  "Bu ürün için detaylı açıklama yakında eklenecektir. Ürün seçimi ve stok bilgisi için DENTech Medikal ekibiyle iletişime geçebilirsiniz.";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, profile] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
  ]);
  const selectedVariantId = getStringParam(query.variant);
  const product = await getPricedProductByIdForProfile(profile, id);

  if (!product) {
    notFound();
  }

  const priceVisibility = canViewPrices(profile)
    ? "approved"
    : profile
      ? "pending"
      : "public";
  const salesMode = isSalesRep(profile);
  const descriptionState = getProductDescriptionState(product.description);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 md:gap-6 md:px-6 md:py-8">
      <Link
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto w-fit px-0 text-sm text-muted-foreground hover:text-foreground"
        )}
        href="/products"
      >
        <ArrowLeft data-icon="inline-start" />
        Kataloğa Dön
      </Link>

      <ProductDetailClient
        desktopDescription={
          <SurfaceCard className="hidden rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:block">
            <CardContent className="p-5">
              <ProductDescriptionHtml
                html={descriptionState.html}
                isFallback={descriptionState.isFallback}
              />
            </CardContent>
          </SurfaceCard>
        }
        initialVariantId={selectedVariantId}
        mobileDescription={
          <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:hidden">
            <CardContent className="p-4">
              <ProductDescriptionHtml
                html={descriptionState.html}
                isFallback={descriptionState.isFallback}
              />
            </CardContent>
          </SurfaceCard>
        }
        priceVisibility={priceVisibility}
        product={product}
        salesMode={salesMode}
      />
    </div>
  );
}

function ProductDescriptionHtml({
  html,
  isFallback,
}: {
  html: string;
  isFallback: boolean;
}) {
  if (isFallback) {
    return (
      <section className="rounded-2xl border border-border/65 bg-background/72 p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ürün Açıklaması
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">{html}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ürün Açıklaması
      </h2>
      <div className="product-description-html" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getProductDescriptionState(rawDescription: string | null) {
  const source = rawDescription?.trim() ?? "";
  const sanitized = sanitizeProductDescriptionHtml(source);
  const plainText = stripHtml(sanitized);

  if (plainText.length >= 24) {
    return {
      html: sanitized,
      isFallback: false,
    };
  }

  return {
    html: DESCRIPTION_FALLBACK,
    isFallback: true,
  };
}

function sanitizeProductDescriptionHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\/?(script|iframe|object|embed|form|input|button|textarea|select|meta|link|picture|source)[^>]*>/gi,
      ""
    )
    .replace(/\s(on\w+)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(style|class|id)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      ""
    )
    .replace(/<img\b[^>]*>/gi, (match) => sanitizeImageTag(match))
    .replace(/<a\b[^>]*>/gi, (match) => sanitizeAnchorTag(match))
    .replace(/<a\b(?![^>]*\bhref=)[^>]*>/gi, "<span>")
    .replace(/<\/a>/gi, "</span>")
    .trim();
}

function sanitizeAnchorTag(tag: string) {
  const href = getAttributeValue(tag, "href");

  if (!href || !isSafeHref(href)) {
    return "<span>";
  }

  const isExternal = /^https?:\/\//i.test(href);
  const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";

  return `<a href="${escapeHtmlAttribute(href)}"${target}>`;
}

function sanitizeImageTag(tag: string) {
  const src = getAttributeValue(tag, "src");

  if (!src || !isSafeImageSrc(src)) {
    return "";
  }

  const alt = getAttributeValue(tag, "alt") ?? "";

  return `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" decoding="async">`;
}

function getAttributeValue(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i")
  );

  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function isSafeHref(value: string) {
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(value);
}

function isSafeImageSrc(value: string) {
  return /^(https?:\/\/|\/(?!\/))/i.test(value);
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getStringParam(value: string | string[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();

  return trimmed || undefined;
}
