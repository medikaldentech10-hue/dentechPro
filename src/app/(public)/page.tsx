import { Box, ClipboardList, Headphones, Search } from "lucide-react";

import { CategoryCard } from "@/components/marketing/category-card";
import { SearchHero } from "@/components/marketing/search-hero";
import { GradientBackground } from "@/components/premium/gradient-background";

const categories = [
  {
    title: "Frezler",
    description: "Elmas, karbit ve teknik frez grupları",
    status: "active" as const,
    href: "/products",
    visual: "bur" as const,
  },
  {
    title: "Polisaj Ürünleri",
    description: "Zirkonya, metal ve kompozit yüzey işlemleri",
    status: "coming-soon" as const,
    visual: "polish" as const,
  },
  {
    title: "Endodonti",
    description: "Kanal tedavisi için seçili ürün grupları",
    status: "coming-soon" as const,
    visual: "endo" as const,
  },
  {
    title: "Laboratuvar Çözümleri",
    description: "Laboratuvar iş akışına uygun ürün grupları",
    status: "coming-soon" as const,
    visual: "lab" as const,
  },
  {
    title: "Klinik Sarf",
    description: "Günlük kullanım için temel sarf ürünleri",
    status: "coming-soon" as const,
    visual: "supply" as const,
  },
  {
    title: "Cihaz ve Ekipman",
    description: "Görüntüleme ve klinik ekipman çözümleri",
    status: "coming-soon" as const,
    visual: "device" as const,
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

export default function HomePage() {
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
