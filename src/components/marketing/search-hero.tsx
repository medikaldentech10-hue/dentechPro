import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/premium/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const aiSearchExamples = [
  "Zirkonya polisaj",
  "Chamfer preparasyon",
  "Kompozit cilalama",
  "Endo erişim",
  "Karbit frez",
  "Laboratuvar HP ürünleri",
];

export function SearchHero() {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-4 py-14 text-center md:px-6 md:py-20">
      <div className="flex max-w-3xl flex-col items-center gap-5">
        <div className="flex size-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
          <Sparkles />
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
          DENTech Medikal için modern dental ürün talep platformu
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          İlk aktif katalog: JOTA Frezler. Klinik, laboratuvar ve saha ekipleri
          için onaylı fiyat görünümü ve B2B talep akışına hazır mimari.
        </p>
      </div>
      <GlassCard className="w-full max-w-3xl">
        <CardContent className="p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-border/60 bg-muted/45 px-4 shadow-inner shadow-foreground/5">
              <Search className="text-muted-foreground" />
              <Input
                className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                placeholder="Hangi işlem için ürün arıyorsunuz?"
              />
            </div>
            <Link
              href="/products"
              className={cn(buttonVariants(), "h-14 px-6")}
            >
              JOTA Frezleri Keşfet
            </Link>
          </div>
        </CardContent>
      </GlassCard>
      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {aiSearchExamples.map((example) => (
          <span
            key={example}
            className="rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
          >
            {example}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/products" className={cn(buttonVariants())}>
          JOTA Frezleri Keşfet
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
