import { ListPlus } from "lucide-react";

import { addToOrderDraftAction } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";

type AddToRequestFormProps = {
  disabled?: boolean;
  disabledReason?: string;
  variantId: string;
};

export function AddToRequestForm({
  disabled = false,
  disabledReason,
  variantId,
}: AddToRequestFormProps) {
  if (disabled) {
    return (
      <Button className="w-full" disabled>
        {disabledReason ?? "Talep Listesine Ekle"}
      </Button>
    );
  }

  return (
    <form action={addToOrderDraftAction} className="grid grid-cols-[88px_1fr] gap-2">
      <input name="variant_id" type="hidden" value={variantId} />
      <input
        aria-label="Adet"
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={1}
        min={1}
        name="quantity"
        step={1}
        type="number"
      />
      <Button className="w-full" type="submit">
        <ListPlus data-icon="inline-start" />
        Talep Listesine Ekle
      </Button>
    </form>
  );
}
