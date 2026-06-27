import Link from "next/link";

import { CategoryCard } from "@/components/marketing/category-card";
import { SearchHero } from "@/components/marketing/search-hero";
import { GradientBackground } from "@/components/premium/gradient-background";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

const categories = [
  {
    title: "JOTA Frezler",
    description: "Elmas, karbit, taş, disk ve cilalama ürünleri",
    status: "active" as const,
    href: "/products",
    meta: "302 varyant",
  },
  {
    title: "Ölçü Materyalleri",
    description: "Ölçü ve klinik yardımcı ürünleri",
    status: "coming-soon" as const,
  },
  {
    title: "Klinik Cihazları",
    description: "Klinik operasyon ekipmanları",
    status: "coming-soon" as const,
  },
  {
    title: "Pedodonti Ürünleri",
    description: "Çocuk diş hekimliği ürün ailesi",
    status: "coming-soon" as const,
  },
  {
    title: "Laboratuvar Ürünleri",
    description: "Dental laboratuvar çözümleri",
    status: "coming-soon" as const,
  },
  {
    title: "Veteriner Dental Ürünler",
    description: "Veteriner dental uygulamalar",
    status: "coming-soon" as const,
  },
];

const steps = [
  {
    title: "Hesap oluşturun",
    description: "Klinik, laboratuvar veya veteriner hesabınızla kayıt olun.",
  },
  {
    title: "Onay sürecini tamamlayın",
    description: "DENTech ekibi hesabınızı kontrol ederek uygun rol ile onaylar.",
  },
  {
    title: "Ürünleri inceleyin",
    description: "SKU, çap, kategori veya kullanım alanına göre ürünleri bulun.",
  },
  {
    title: "Talebinizi iletin",
    description: "Ürünleri talep listenize ekleyin ve ekibimize gönderin.",
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <GradientBackground className="pb-16">
      <SearchHero profile={profile} />

      <section
        className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 md:px-6"
        id="kategoriler"
      >
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            Ürün Kategorileri
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            İhtiyacınıza uygun ürün grubunu seçerek kataloğu inceleyin.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </div>
      </section>

      <section
        className="mx-auto mt-16 flex w-full max-w-[1200px] flex-col gap-6 px-4 md:px-6"
        id="nasil-calisir"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-normal text-foreground">
              Nasıl Çalışır?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Hesap onayından talep göndermeye kadar süreç kısa ve takip edilebilir.
            </p>
          </div>
          <Link
            href="/nasil-calisir"
            className={cn(buttonVariants({ variant: "outline" }), "self-start")}
          >
            Nasıl Çalışır?
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => (
            <div
              className="rounded-2xl border border-border/70 bg-card/78 p-5 shadow-sm backdrop-blur"
              key={step.title}
            >
              <span className="mb-5 flex size-9 items-center justify-center rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </GradientBackground>
  );
}
