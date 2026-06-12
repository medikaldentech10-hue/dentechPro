import { CategoryCard } from "@/components/marketing/category-card";
import { SearchHero } from "@/components/marketing/search-hero";
import { GradientBackground } from "@/components/premium/gradient-background";
import { getCurrentProfile } from "@/lib/auth";
import { mainCategories } from "@/lib/constants";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <GradientBackground className="pb-16">
      <SearchHero profile={profile} />
      <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 md:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Kategoriler
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            Aktif katalog ve yakında eklenecek ürün grupları
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            JOTA Frezler kataloğunu inceleyebilir, diğer ürün grupları için
            güncellemeleri DENTech Medikal üzerinden takip edebilirsiniz.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mainCategories.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </div>
      </section>
    </GradientBackground>
  );
}
