import Link from "next/link";
import { Search, ShieldCheck, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/premium/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchHero() {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-4 py-14 text-center md:px-6 md:py-20">
      <div className="flex max-w-3xl flex-col items-center gap-5">
        <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary shadow-sm">
          <ShieldCheck className="size-4" />
          DENTech Medikal profesyonel portalı
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
          Profesyonel Dental Ürün Kataloğu
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          DENTech Medikal güvencesiyle seçili dental ürünleri inceleyin,
          fiyat bilgilerine erişin ve taleplerinizi hızlıca iletin.
        </p>
      </div>
      <GlassCard className="w-full max-w-3xl">
        <CardContent className="p-2">
          <form action="/products" className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-border/60 bg-muted/45 px-4 shadow-inner shadow-foreground/5">
              <Search className="text-muted-foreground" />
              <Input
                className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                name="q"
                placeholder="Ürün, kod veya kullanım alanı ara"
              />
            </div>
            <button
              type="submit"
              className={cn(buttonVariants(), "h-14 px-6")}
            >
              Katalogda Ara
            </button>
          </form>
        </CardContent>
      </GlassCard>
      <div className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ["JOTA Frezler", "Aktif profesyonel katalog"],
          ["Fiyat Erişimi", "Onaylı hesaplara özel görünüm"],
          ["Talep Akışı", "B2B sipariş öncesi hızlı iletişim"],
        ].map(([title, description]) => (
          <div
            key={title}
            className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur"
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
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
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Giriş Yap
        </Link>
      </div>
    </section>
  );
}
