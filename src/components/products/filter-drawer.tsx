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
  selectedCategory?: string;
};

export function FilterDrawer({
  categories,
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
          className="max-h-[86dvh] overflow-y-auto rounded-t-2xl border-border/70 bg-background/94 backdrop-blur-xl"
        >
          <SheetHeader>
            <SheetTitle>JOTA katalog filtreleri</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 p-4 pt-0">
            <FilterSection
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
