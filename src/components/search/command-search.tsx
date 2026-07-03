"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Command,
  CornerDownLeft,
  Search,
  XIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getCommandSearchSuggestions } from "@/lib/search-suggestions";
import { cn } from "@/lib/utils";

const OPEN_COMMAND_SEARCH_EVENT = "dentech:open-command-search";
const POPULAR_QUERIES = [
  "JOT-801-FG-010",
  "014 FG",
  "zirkonya",
  "arkansas",
  "polisaj",
  "mavi frez",
];

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = query.trim();
  const suggestions = getCommandSearchSuggestions(query, 6);
  const showFallbackRow = Boolean(trimmedQuery) && suggestions.length === 0;

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

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

      setQuery(trimmed);
      setOpen(false);
      router.push(`/products?${params.toString()}`);

      return true;
    },
    [router]
  );

  useEffect(() => {
    const onOpenRequest = () => openModal();
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (target instanceof HTMLElement && isTypingTarget(target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openModal();
      }
    };

    window.addEventListener(OPEN_COMMAND_SEARCH_EVENT, onOpenRequest);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener(OPEN_COMMAND_SEARCH_EVENT, onOpenRequest);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openModal]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-950/28 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />

        <DialogPrimitive.Popup className="fixed top-[96px] left-1/2 z-[60] flex h-auto w-[min(640px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/97 text-foreground shadow-[0_24px_80px_rgb(15_23_42/0.18)] transition duration-150 ease-out data-ending-style:opacity-0 data-ending-style:scale-[0.985] data-starting-style:opacity-0 data-starting-style:scale-[0.985] max-sm:top-[76px] max-sm:w-[calc(100vw-24px)] dark:shadow-[0_28px_90px_rgb(0_0_0/0.42)] sm:top-[104px]">
          <DialogPrimitive.Close
            render={
              <button
                aria-label="Kapat"
                className={cn(
                  buttonVariants({ size: "icon-sm", variant: "ghost" }),
                  "absolute top-3 right-3 z-10"
                )}
                type="button"
              />
            }
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>

          <div className="border-b border-border/70 p-5 pr-12">
            <DialogPrimitive.Title className="text-base font-medium text-foreground">
              Ürün ara
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              Ürün adı, SKU, kategori veya kullanım alanı yazın.
            </DialogPrimitive.Description>
          </div>

          <div className="p-4 sm:p-5">
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitQuery(query);
              }}
            >
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/86 px-4 py-3 shadow-sm">
                <Search className="size-4 shrink-0 text-primary" />
                <input
                  aria-label="Ürün arama terimi"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ürün adı, SKU veya kullanım alanı ara..."
                  ref={inputRef}
                  value={query}
                />
                <button
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
                  type="submit"
                >
                  Ara
                </button>
              </div>

              {trimmedQuery ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Öneriler
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <button
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/65 bg-card/70 px-3.5 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
                        key={`${suggestion.query}-${suggestion.label}`}
                        onClick={() => submitQuery(suggestion.query)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
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
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/65 bg-card/70 px-3.5 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
                        onClick={() => submitQuery(trimmedQuery)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
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

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Popüler aramalar
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_QUERIES.map((chip) => (
                    <button
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "rounded-full border-primary/20 bg-primary/6 px-3 text-foreground hover:bg-primary/10"
                      )}
                      key={chip}
                      onClick={() => submitQuery(chip)}
                      type="button"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Command className="size-3.5" />
                  <span>Ctrl+K / Cmd+K ile açın</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CornerDownLeft className="size-3.5" />
                  <span>Enter ile arayın</span>
                </div>
              </div>
            </form>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type CommandSearchTriggerProps = {
  className?: string;
  mobile?: boolean;
};

export function CommandSearchTrigger({
  className,
  mobile = false,
}: CommandSearchTriggerProps) {
  return (
    <button
      aria-haspopup="dialog"
      aria-label="Ürün arama modalını aç"
      className={cn(
        buttonVariants({
          size: mobile ? "icon-lg" : "lg",
          variant: "outline",
        }),
        mobile
          ? "border-[var(--primary-border)] bg-white/92 text-slate-800 shadow-sm hover:bg-[var(--primary-soft)] dark:bg-background/70 dark:text-slate-100"
          : "h-10 gap-2 border-[var(--primary-border)] bg-white px-3.5 text-slate-800 shadow-sm hover:bg-[var(--primary-soft)] dark:bg-background/70 dark:text-slate-100",
        className
      )}
      onClick={() => {
        window.dispatchEvent(new Event(OPEN_COMMAND_SEARCH_EVENT));
      }}
      type="button"
    >
      <Search className="size-4 text-primary" />
      {mobile ? null : (
        <>
          <span>Ara</span>
          <span className="rounded-md border border-border/70 bg-background/70 px-1.5 py-0.5 text-[0.68rem] font-semibold text-muted-foreground">
            Ctrl/Cmd K
          </span>
        </>
      )}
    </button>
  );
}

function isTypingTarget(target: HTMLElement) {
  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}
