import { ListPlus } from "lucide-react";

import { addToOrderDraftAction } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";

type AddToRequestFormProps = {
  disabled?: boolean;
  disabledReason?: string;
  submitLabel?: string;
  variantId: string;
};

export function AddToRequestForm({
  disabled = false,
  disabledReason,
  submitLabel = "Talep Listesine Ekle",
  variantId,
}: AddToRequestFormProps) {
  if (disabled) {
    return (
      <Button className="w-full" disabled>
        {disabledReason ?? submitLabel}
      </Button>
    );
  }

  return (
    <form
      action={addToOrderDraftAction}
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[88px_minmax(0,1fr)]"
    >
      <input name="variant_id" type="hidden" value={variantId} />
      <input
        aria-label="Adet"
        className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={1}
        min={1}
        name="quantity"
        step={1}
        type="number"
      />
      <Button className="min-w-0 w-full whitespace-normal text-center leading-5" type="submit">
        <ListPlus data-icon="inline-start" />
        {submitLabel}
      </Button>
    </form>
  );
}
