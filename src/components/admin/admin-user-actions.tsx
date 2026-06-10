"use client";

import { useState } from "react";

import { reviewUserAction } from "@/app/(admin)/admin/users/actions";
import { Button } from "@/components/ui/button";

type AdminUserActionsProps = {
  userId: string;
  fullName: string | null;
  canReactivate: boolean;
};

const approveActions = [
  { intent: "approve_doctor", label: "Doktor Olarak Onayla" },
  { intent: "approve_lab", label: "Lab Olarak Onayla" },
  { intent: "approve_vet", label: "Vet Olarak Onayla" },
  { intent: "approve_sales_rep", label: "Saha Temsilcisi Yap" },
] as const;

export function AdminUserActions({
  userId,
  fullName,
  canReactivate,
}: AdminUserActionsProps) {
  const [note, setNote] = useState("");
  const displayName = fullName ?? "bu kullanıcı";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-medium">
        İşlem Notu
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          placeholder="Opsiyonel onay/reddetme notu"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {approveActions.map((action) => (
          <ReviewForm
            key={action.intent}
            intent={action.intent}
            note={note}
            userId={userId}
          >
            <Button className="w-full" type="submit">
              {action.label}
            </Button>
          </ReviewForm>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <ReviewForm
          confirmMessage={`${displayName} için kayıt talebini reddetmek istediğinize emin misiniz?`}
          intent="reject"
          note={note}
          userId={userId}
        >
          <Button className="w-full" type="submit" variant="outline">
            Reddet
          </Button>
        </ReviewForm>
        <ReviewForm
          confirmMessage={`${displayName} hesabını askıya almak istediğinize emin misiniz?`}
          intent="suspend"
          note={note}
          userId={userId}
        >
          <Button className="w-full" type="submit" variant="destructive">
            Askıya Al
          </Button>
        </ReviewForm>
        {canReactivate ? (
          <ReviewForm intent="reactivate" note={note} userId={userId}>
            <Button className="w-full" type="submit" variant="secondary">
              Yeniden Aktifleştir
            </Button>
          </ReviewForm>
        ) : null}
      </div>
    </div>
  );
}

function ReviewForm({
  children,
  confirmMessage,
  intent,
  note,
  userId,
}: {
  children: React.ReactNode;
  confirmMessage?: string;
  intent: string;
  note: string;
  userId: string;
}) {
  return (
    <form
      action={reviewUserAction}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name="user_id" type="hidden" value={userId} />
      <input name="intent" type="hidden" value={intent} />
      <input name="note" type="hidden" value={note} />
      {children}
    </form>
  );
}
