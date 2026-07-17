"use client";

import { type FormEvent, useState, useTransition } from "react";
import { ListPlus } from "lucide-react";

import { addToOrderDraftInlineAction } from "@/app/(public)/request/actions";
import { useRequestDrawer } from "@/components/request/request-drawer-provider";
import { Button } from "@/components/ui/button";

type AddToRequestFormProps = {
  currency?: string;
  disabled?: boolean;
  disabledReason?: string;
  productName: string;
  submitLabel?: string;
  unitPrice?: number | null;
  variantId: string;
  variantLabel?: string | null;
};

export function AddToRequestForm({
  currency,
  disabled = false,
  disabledReason,
  productName,
  submitLabel = "Ekle",
  unitPrice,
  variantId,
  variantLabel,
}: AddToRequestFormProps) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const drawer = useRequestDrawer();

  if (disabled) {
    return (
      <Button className="w-full rounded-full font-semibold shadow-sm" disabled>
        {disabledReason ?? submitLabel}
      </Button>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuantity = Number(quantity);

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      setError("Adet pozitif tam sayı olmalıdır.");
      return;
    }

    setError(null);
    const token = drawer.beginAdd({
      currency,
      productName,
      quantity: nextQuantity,
      unitPrice,
      variantId,
      variantLabel,
    });

    startTransition(async () => {
      const result = await addToOrderDraftInlineAction({
        quantity: nextQuantity,
        variantId,
      });

      if (!result.success) {
        const message = result.error ?? "Ürün talep listesine eklenemedi.";
        setError(message);
        drawer.failAdd(token, message);
        return;
      }

      drawer.confirmAdd(token, result);
      setQuantity("1");
    });
  };

  return (
    <div className="grid gap-2">
      <form
        className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2"
        onSubmit={handleSubmit}
      >
        <input
          aria-label="Adet"
          className="h-10 min-w-0 rounded-full border border-input bg-background/80 px-2 text-center text-sm shadow-sm"
          min={1}
          onChange={(event) => setQuantity(event.currentTarget.value)}
          step={1}
          type="number"
          value={quantity}
        />
        <Button
          className="min-w-0 w-full rounded-full px-3 font-semibold shadow-sm"
          disabled={isPending}
          type="submit"
        >
          <ListPlus
            className={submitLabel === "Ekle" ? "hidden sm:block" : ""}
            data-icon="inline-start"
          />
          {submitLabel === "Ekle" ? (
            <span className="sr-only">Talep Listesine Ekle</span>
          ) : null}
          {isPending ? "Ekleniyor..." : submitLabel}
        </Button>
      </form>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
