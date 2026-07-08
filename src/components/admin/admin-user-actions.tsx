"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog,
  UserRoundX,
} from "lucide-react";

import { reviewUserAction } from "@/app/(admin)/admin/users/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types/auth";

export type ReviewIntent =
  | "approve_doctor"
  | "approve_lab"
  | "approve_vet"
  | "approve_sales_rep"
  | "reject"
  | "suspend"
  | "reactivate";

type AdminUserActionsProps = {
  canReactivate: boolean;
  fullName: string | null;
  requestedRole: Profile["requested_role"];
  role: Profile["role"];
  userId: string;
  userType: Profile["user_type"];
};

const approvalOptions: Array<{
  intent: Extract<
    ReviewIntent,
    "approve_doctor" | "approve_lab" | "approve_vet" | "approve_sales_rep"
  >;
  label: string;
  shortLabel: string;
}> = [
  { intent: "approve_doctor", label: "Hekim olarak onayla", shortLabel: "Hekim" },
  { intent: "approve_lab", label: "Laboratuvar olarak onayla", shortLabel: "Laboratuvar" },
  { intent: "approve_vet", label: "Veteriner olarak onayla", shortLabel: "Veteriner" },
  {
    intent: "approve_sales_rep",
    label: "Saha temsilcisi olarak onayla",
    shortLabel: "Saha Temsilcisi",
  },
] as const;

export function AdminUserActions({
  canReactivate,
  fullName,
  requestedRole,
  role,
  userId,
  userType,
}: AdminUserActionsProps) {
  const [note, setNote] = useState("");
  const displayName = fullName ?? "bu kullanıcı";
  const suggestedApprovalIntent = useMemo(
    () => getSuggestedApprovalIntent(requestedRole, userType, role),
    [requestedRole, role, userType]
  );

  return (
    <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="grid gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          İşlem Notu
        </p>
        <textarea
          className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Opsiyonel açıklama notu"
          value={note}
        />
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Rol ve Onay İşlemleri
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {approvalOptions.map((action) => (
            <ReviewForm
              intent={action.intent}
              key={action.intent}
              note={note}
              userId={userId}
            >
              <Button
                className="w-full justify-center"
                size="sm"
                title={action.label}
                type="submit"
                variant={action.intent === suggestedApprovalIntent ? "default" : "outline"}
              >
                <UserRoundCog data-icon="inline-start" />
                {action.shortLabel}
              </Button>
            </ReviewForm>
          ))}
        </div>
      </div>

      <div className="grid gap-2 border-t border-border/70 pt-4 sm:grid-cols-3">
        <ReviewForm
          confirmMessage={`${displayName} için başvuruyu reddetmek istediğinize emin misiniz?`}
          intent="reject"
          note={note}
          userId={userId}
        >
          <Button className="w-full justify-center" size="sm" type="submit" variant="ghost">
            <UserRoundX data-icon="inline-start" />
            Reddet
          </Button>
        </ReviewForm>

        <ReviewForm
          confirmMessage={`${displayName} hesabını askıya almak istediğinize emin misiniz?`}
          intent="suspend"
          note={note}
          userId={userId}
        >
          <Button
            className="w-full justify-center"
            size="sm"
            type="submit"
            variant="destructive"
          >
            <ShieldAlert data-icon="inline-start" />
            Askıya Al
          </Button>
        </ReviewForm>

        {canReactivate ? (
          <ReviewForm intent="reactivate" note={note} userId={userId}>
            <Button
              className="w-full justify-center"
              size="sm"
              type="submit"
              variant="secondary"
            >
              <ShieldCheck data-icon="inline-start" />
              Yeniden Aktif Et
            </Button>
          </ReviewForm>
        ) : (
          <div />
        )}
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
  intent: ReviewIntent;
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
      <ReviewSubmitButton>{children}</ReviewSubmitButton>
    </form>
  );
}

function ReviewSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  if (!pending) {
    return children;
  }

  return (
    <Button className="w-full justify-center" disabled size="sm" type="submit">
      <LoaderCircle className="animate-spin" data-icon="inline-start" />
      İşleniyor...
    </Button>
  );
}

export function getSuggestedApprovalIntent(
  requestedRole: Profile["requested_role"],
  userType: Profile["user_type"],
  role: Profile["role"]
): ReviewIntent {
  if (requestedRole === "lab") {
    return "approve_lab";
  }

  if (requestedRole === "vet") {
    return "approve_vet";
  }

  if (requestedRole === "doctor") {
    return "approve_doctor";
  }

  if (role === "sales_rep" || userType === "sales") {
    return "approve_sales_rep";
  }

  if (userType === "lab") {
    return "approve_lab";
  }

  if (userType === "vet") {
    return "approve_vet";
  }

  return "approve_doctor";
}
