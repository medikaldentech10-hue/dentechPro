import { ListPlus } from "lucide-react";

import { addToOrderDraftAction } from "@/app/(public)/request/actions";
import { PendingSubmitButton } from "@/components/shared/pending-submit-button";
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
  submitLabel = "Ekle",
  variantId,
}: AddToRequestFormProps) {
  if (disabled) {
    return (
      <Button className="w-full rounded-full font-semibold shadow-sm" disabled>
        {disabledReason ?? submitLabel}
      </Button>
    );
  }

  return (
    <form
      action={addToOrderDraftAction}
      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2"
    >
      <input name="variant_id" type="hidden" value={variantId} />
      <input
        aria-label="Adet"
        className="h-10 min-w-0 rounded-full border border-input bg-background/80 px-2 text-center text-sm shadow-sm"
        defaultValue={1}
        min={1}
        name="quantity"
        step={1}
        type="number"
      />
      <PendingSubmitButton
        className="min-w-0 w-full rounded-full px-3 font-semibold shadow-sm"
        pendingLabel="Ekleniyor..."
        type="submit"
      >
        <ListPlus className={submitLabel === "Ekle" ? "hidden sm:block" : ""} data-icon="inline-start" />
        {submitLabel === "Ekle" ? (
          <span className="sr-only">Talep Listesine Ekle</span>
        ) : null}
        {submitLabel}
      </PendingSubmitButton>
    </form>
  );
}
