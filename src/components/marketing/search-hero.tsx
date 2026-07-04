"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  Box,
  CheckCircle2,
  Headphones,
  Search,
  Zap,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCommandSearchSuggestions } from "@/lib/search-suggestions";
import { cn } from "@/lib/utils";

const examples = [
  "RVG",
  "Çocuk kronu",
  "Frez",
  "Zirkonya polisaj",
  "Total protez",
  "Ölçü materyali",
];

const benefits = [
  {
    title: "Onaylı Hesap Fiyatları",
    description: "Size özel fiyatlarınızı görün, güvenli şekilde teklif talebi oluşturun.",
    icon: CheckCircle2,
  },
  {
    title: "Geniş Ürün Yelpazesi",
    description: "Klinik, laboratuvar ve görüntüleme gruplarını tek platformda inceleyin.",
    icon: Box,
  },
  {
    title: "Hızlı Talep Akışı",
    description: "Ürünleri bulun, listenizi oluşturun, ekibimiz sizinle hızlıca iletişime geçsin.",
    icon: Zap,
  },
  {
    title: "Uzman Destek",
    description: "Ürün, kullanım ve sipariş süreçlerinde ekibimiz yanınızda.",
    icon: Headphones,
  },
];

export function SearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const suggestions = getCommandSearchSuggestions(query, 6);
  const showFallbackRow = Boolean(trimmedQuery) && suggestions.length === 0;

  const submitQuery = useCallback(
    (rawQuery: string) => {
      const trimmed = rawQuery.trim();

      if (!trimmed) {
        return false;
      }

      const params = new URLSearchParams({
        page: "1",
        q: trimmed,
      });

      router.push(`/products?${params.toString()}`);
      return true;
    },
    [router]
  );

  return (
    <section className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center overflow-hidden px-4 pb-12 pt-10 text-center md:px-8 md:pb-14 md:pt-14">
      <HeroInstrumentCluster side="left" />
      <HeroInstrumentCluster side="right" />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 md:text-6xl dark:text-slate-50">
          Dental ürünleri hızlıca bulun.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg dark:text-slate-300">
          DENTech Pro’da cihaz, sarf ürün, frez ve laboratuvar çözümlerini
          inceleyin; onaylı hesabınızla fiyatları görüntüleyip talebinizi oluşturun.
        </p>

        <form
          className="mt-7 w-full max-w-3xl"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuery(query);
          }}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_50px_rgb(15_23_42/0.08)] dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex flex-col sm:flex-row">
              <div className="flex min-h-16 flex-1 items-center gap-3 px-5">
                <Search className="size-5 text-slate-500" />
                <Input
                  className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                  name="q"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ürün adı, kodu veya kategori yazın..."
                  value={query}
                />
              </div>
              <button
                className={cn(
                  buttonVariants(),
                  "m-1.5 h-[3.25rem] rounded-lg px-8 text-sm font-semibold sm:h-auto"
                )}
                type="submit"
              >
                Ürün Ara
              </button>
            </div>

            {trimmedQuery ? (
              <div className="border-t border-slate-200/90 bg-slate-50/70 px-3 py-3 text-left dark:border-white/10 dark:bg-white/[0.03]">
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <button
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-transparent bg-white/90 px-3.5 py-3 text-left transition hover:border-primary/20 hover:bg-primary/5 dark:bg-slate-950/60 dark:hover:bg-primary/10"
                      key={`${suggestion.query}-${suggestion.label}`}
                      onClick={() => submitQuery(suggestion.query)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-950 dark:text-slate-50">
                          {suggestion.label}
                        </div>
                        {suggestion.helper ? (
                          <div className="mt-1 text-xs leading-5 text-muted-foreground">
                            {suggestion.helper}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-primary">
                        <Search className="size-3.5" />
                        <ArrowUpRight className="size-3.5" />
                      </div>
                    </button>
                  ))}

                  {showFallbackRow ? (
                    <button
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-white/90 px-3.5 py-3 text-left transition hover:border-primary/20 hover:bg-primary/5 dark:bg-slate-950/60 dark:hover:bg-primary/10"
                      onClick={() => submitQuery(trimmedQuery)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-950 dark:text-slate-50">
                          Katalogda ara: {trimmedQuery}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          Yazdığınız ifadeyle katalog sonuçlarını açın.
                        </div>
                      </div>
                      <div className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-primary">
                        <Search className="size-3.5" />
                        <ArrowUpRight className="size-3.5" />
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-xs text-muted-foreground">Örnek aramalar:</span>
          {examples.map((example) => (
            <Link
              className="rounded-full border border-[var(--primary-border)] bg-white px-3.5 py-1.5 text-xs font-medium text-primary shadow-sm transition hover:bg-[var(--primary-soft)] dark:bg-slate-950/70"
              href={`/products?q=${encodeURIComponent(example)}&page=1`}
              key={example}
            >
              {example}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-10 grid w-full max-w-[1200px] gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ description, icon: Icon, title }) => (
          <div
            className="rounded-xl border border-slate-200/80 bg-white/86 p-5 shadow-[0_14px_44px_rgb(15_23_42/0.07)] backdrop-blur dark:border-white/10 dark:bg-slate-950/72"
            key={title}
          >
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary">
                <Icon className="size-8 stroke-[1.75]" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroInstrumentCluster({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-8 hidden h-[310px] w-[300px] opacity-80 lg:block",
        isLeft ? "left-0" : "right-0"
      )}
    >
      {isLeft ? (
        <div className="absolute bottom-0 left-10 flex items-end gap-5">
          {[190, 235, 165].map((height, index) => (
            <span
              className="relative block w-5 rounded-full bg-gradient-to-b from-slate-400 via-slate-200 to-slate-500 shadow-[0_18px_35px_rgb(15_23_42/0.12)]"
              key={height}
              style={{ height }}
            >
              <span className="absolute -top-10 left-1/2 h-14 w-7 -translate-x-1/2 rounded-t-full bg-[repeating-linear-gradient(120deg,#707780_0_2px,#cbd5e1_2px_5px)]" />
              <span
                className={cn(
                  "absolute bottom-16 left-1/2 h-2.5 w-8 -translate-x-1/2 rounded-full",
                  index === 0 ? "bg-primary" : index === 1 ? "bg-slate-300" : "bg-blue-700"
                )}
              />
            </span>
          ))}
        </div>
      ) : (
        <div className="absolute right-0 top-20 h-44 w-72 rotate-[-10deg] rounded-full border-[10px] border-slate-300/80 bg-gradient-to-br from-white to-slate-100 shadow-[0_18px_45px_rgb(15_23_42/0.12)]">
          <span className="absolute -bottom-10 left-1/2 h-16 w-5 -translate-x-1/2 rotate-45 rounded-full bg-slate-300" />
          <span className="absolute -bottom-20 left-[58%] h-24 w-7 rotate-45 rounded-full bg-gradient-to-b from-slate-100 to-slate-300" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
