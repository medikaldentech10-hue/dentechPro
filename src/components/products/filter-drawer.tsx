"use client";

import { SlidersHorizontal } from "lucide-react";

import { FilterSection } from "@/components/products/filter-sidebar";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CatalogCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

type FilterDrawerProps = {
  categories: CatalogCategory[];
  currentParams?: {
    brand?: string;
    category?: string;
    max_price?: string;
    min_price?: string;
    q?: string;
    usage?: string;
  };
  selectedCategory?: string;
};

export function FilterDrawer({
  categories,
  currentParams,
  selectedCategory,
}: FilterDrawerProps) {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <SlidersHorizontal data-icon="inline-start" />
              Filtreler
            </button>
          }
        />
        <SheetContent
          side="bottom"
          className="inset-x-2 bottom-2 max-h-[78dvh] overflow-hidden rounded-2xl border border-border/70 bg-background/96 p-0 shadow-2xl backdrop-blur-xl"
        >
          <SheetHeader className="border-b border-border/70 p-4 pr-12">
            <SheetTitle>JOTA katalog filtreleri</SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(78dvh-64px)] overflow-y-auto overscroll-contain p-4">
            <FilterSection
              currentParams={currentParams}
              items={categories}
              selectedCategory={selectedCategory}
              title="JOTA Alt Kategorileri"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
