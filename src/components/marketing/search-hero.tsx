import Link from "next/link";
import { ClipboardCheck, EyeOff, Search } from "lucide-react";

import { GlassCard } from "@/components/premium/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getHeaderAuthState } from "@/lib/auth-ui";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type SearchHeroProps = {
  profile?: Profile | null;
};

const examples = ["JOT-801-FG-010", "014 FG", "Zirkonya polisaj", "Arkansas"];

const benefits = [
  {
    title: "Akıllı ürün arama",
    description: "SKU, çap, uç tipi veya kullanım alanına göre hızlı arama.",
    icon: Search,
  },
  {
    title: "Onaylı hesaplara özel fiyatlar",
    description: "Fiyatlar yalnızca onaylı kullanıcı hesaplarında görüntülenir.",
    icon: EyeOff,
  },
  {
    title: "Hızlı talep süreci",
    description: "Ürünleri listenize ekleyin, talebinizi DENTech ekibine iletin.",
    icon: ClipboardCheck,
  },
];

export function SearchHero({ profile = null }: SearchHeroProps) {
  const authState = getHeaderAuthState(profile);

  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-4 py-12 text-center md:px-6 md:py-18">
      <div className="flex max-w-3xl flex-col items-center gap-5">
        <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
          Dental ürünleri daha hızlı bulun.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          JOTA frezlerden klinik ve laboratuvar çözümlerine kadar ürünleri
          inceleyin, onaylı hesabınızla fiyatları görüntüleyin ve talebinizi
          hızlıca iletin.
        </p>
      </div>

      <GlassCard className="w-full max-w-4xl border-primary/20 bg-white/82 shadow-[0_24px_80px_rgb(15_23_42/0.08)]">
        <CardContent className="p-2.5">
          <form action="/products" className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-16 flex-1 items-center gap-3 rounded-xl border border-[var(--primary-border)] bg-white px-4 shadow-inner shadow-foreground/5 dark:bg-background/70">
              <Search className="text-primary" />
              <Input
                className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                name="q"
                placeholder="Ürün adı, SKU, çap, uç tipi veya kullanım alanı ara..."
              />
            </div>
            <button
              type="submit"
              className={cn(buttonVariants(), "h-16 px-6 text-sm font-semibold")}
            >
              Ürün Ara
            </button>
          </form>
          <div className="flex flex-wrap gap-2 px-1 pb-1 pt-3">
            {examples.map((example) => (
              <Link
                className="rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary"
                href={`/products?q=${encodeURIComponent(example)}`}
                key={example}
              >
                {example}
              </Link>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      <div className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
        {benefits.map(({ description, icon: Icon, title }) => (
          <div
            key={title}
            className="rounded-xl border border-border/70 bg-card/78 p-4 shadow-sm backdrop-blur"
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/products" className={cn(buttonVariants())}>
          Kataloğu İncele
        </Link>
        <Link
          href={authState.href}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          {authState.label}
        </Link>
      </div>
    </section>
  );
}
