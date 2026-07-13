import { Box, ClipboardList, Headphones, Search } from "lucide-react";

import { CategoryCard } from "@/components/marketing/category-card";
import { SearchHero } from "@/components/marketing/search-hero";
import { GradientBackground } from "@/components/premium/gradient-background";
import { getPublicProducts } from "@/lib/products";

const mainCatalogCategories = [
  {
    title: "Frezler",
    description: "Elmas, karbit ve aşındırıcı frez gruplarını inceleyin",
    slug: "frezler",
    visual: "bur" as const,
    matchTerms: ["frez", "bur", "asindirici", "aşındırıcı", "tas", "taş", "elmas", "karbit"],
  },
  {
    title: "Cilalama",
    description: "Cilalama frezleri, uçları ve polisaj gruplarını inceleyin",
    slug: "cilalama",
    visual: "polish" as const,
    matchTerms: ["cilalama", "polisaj", "polish", "polisher", "zirkonya", "metal"],
  },
  {
    title: "Ölçü Materyalleri",
    description: "Ölçü ve yardımcı materyal seçeneklerini inceleyin",
    slug: "olcu-materyalleri",
    visual: "supply" as const,
    matchTerms: ["olcu", "ölçü", "materyal", "aljinat", "silikon"],
  },
  {
    title: "Pedodonti",
    description: "Çocuk diş hekimliği ürünlerini inceleyin",
    slug: "pedodonti",
    visual: "supply" as const,
    matchTerms: ["pedodonti", "cocuk", "çocuk"],
  },
  {
    title: "Klinik Cihazlar",
    description: "Klinik cihaz ve ekipman gruplarını inceleyin",
    slug: "klinik-cihazlar",
    visual: "device" as const,
    matchTerms: ["klinik", "cihaz", "cihazlari", "cihazları", "ekipman"],
  },
  {
    title: "Setler / Paketler",
    description: "Set ve paket ürün gruplarını inceleyin",
    slug: "setler-paketler",
    visual: "lab" as const,
    matchTerms: ["set", "setler", "paket", "paketler", "kit"],
  },
];

const steps = [
  {
    title: "Ürünleri İnceleyin",
    description: "Ürün adı, kodu veya kategoriyle ihtiyacınıza uygun seçenekleri bulun.",
    icon: Search,
  },
  {
    title: "Talep Listesi Oluşturun",
    description: "İlgilendiğiniz ürünleri listenize ekleyin ve miktarları netleştirin.",
    icon: ClipboardList,
  },
  {
    title: "Onay ve Teklif",
    description: "Ekibimiz talebinizi inceleyip fiyat, stok ve süreç detaylarıyla dönüş sağlar.",
    icon: Headphones,
  },
  {
    title: "Sipariş ve Teslimat",
    description: "Onay sonrasında siparişiniz planlanır, hazırlanır ve teslimat süreci başlatılır.",
    icon: Box,
  },
];

export default async function HomePage() {
  const categoryResults = await Promise.all(
    mainCatalogCategories.map((category) =>
      getPublicProducts({ category: category.slug, pageSize: 1 })
    )
  );
  const categories = mainCatalogCategories.map((category, index) => {
    const hasActiveProducts = categoryResults[index]?.products.length ? true : false;
    return {
      title: category.title,
      description: category.description,
      status: hasActiveProducts ? ("active" as const) : ("coming-soon" as const),
      href: `/products?category=${encodeURIComponent(category.slug)}`,
      visual: category.visual,
    };
  });

  return (
    <GradientBackground className="pb-0">
      <SearchHero />

      <section
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 md:px-8"
        id="kategoriler"
      >
        <h2 className="text-center text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">
          Kategoriler
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </div>
      </section>

      <section
        className="mx-auto mt-10 flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-12 md:px-8"
        id="nasil-calisir"
      >
        <h2 className="text-center text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">
          Nasıl Çalışır?
        </h2>
        <div className="grid gap-5 md:grid-cols-4">
          {steps.map(({ description, icon: Icon, title }, index) => (
            <div className="relative flex items-start gap-4" key={title}>
              {index < steps.length - 1 ? (
                <span className="absolute left-[4.5rem] top-9 hidden h-px w-[calc(100%-4rem)] border-t border-dashed border-primary/55 md:block" />
              ) : null}
              <span className="relative z-10 flex size-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-primary shadow-sm dark:border-white/10 dark:bg-slate-950">
                <Icon className="size-7 stroke-[1.75]" />
              </span>
              <div className="pt-1 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold text-primary">{index + 1}</span>
                  <h3 className="font-semibold text-slate-950 dark:text-slate-50">
                    {title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </GradientBackground>
  );
}
