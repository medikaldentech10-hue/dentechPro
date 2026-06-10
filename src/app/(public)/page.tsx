import { CategoryCard } from "@/components/marketing/category-card";
import { SearchHero } from "@/components/marketing/search-hero";
import { GradientBackground } from "@/components/premium/gradient-background";
import { mainCategories } from "@/lib/constants";

export default function HomePage() {
  return (
    <GradientBackground className="pb-16">
      <SearchHero />
      <section className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-4 px-4 md:grid-cols-2 md:px-6 lg:grid-cols-3">
        {mainCategories.map((category) => (
          <CategoryCard key={category.title} {...category} />
        ))}
      </section>
    </GradientBackground>
  );
}
