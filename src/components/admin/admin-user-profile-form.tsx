"use client";

import { useActionState } from "react";

import {
  updateUserProfileAction,
  type UpdateUserProfileActionState,
} from "@/app/(admin)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types/auth";

const initialState: UpdateUserProfileActionState = {};

type AdminUserProfileFormProps = {
  profile: Profile;
};

const requestedRoleOptions = [
  { value: "", label: "Belirtilmedi" },
  { value: "doctor", label: "Hekim" },
  { value: "lab", label: "Laboratuvar" },
  { value: "vet", label: "Veteriner" },
  { value: "other", label: "Genel Başvuru" },
] as const;

export function AdminUserProfileForm({ profile }: AdminUserProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateUserProfileAction,
    initialState
  );

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Profil Bilgileri</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            Eski veya eksik kayıtları burada güncelleyebilirsiniz. E-posta ve rol bu
            formdan değişmez.
          </p>
        </div>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input name="user_id" type="hidden" value={profile.id} />

        <Field label="Ad Soyad / Yetkili">
          <Input defaultValue={profile.full_name ?? ""} name="full_name" />
        </Field>

        <Field label="Telefon">
          <Input defaultValue={profile.phone ?? ""} name="phone" />
        </Field>

        <Field label="Talep Edilen Rol">
          <select
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            defaultValue={profile.requested_role ?? ""}
            name="requested_role"
          >
            {requestedRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Klinik Adı">
          <Input defaultValue={profile.clinic_name ?? ""} name="clinic_name" />
        </Field>

        <Field label="Firma / Laboratuvar Adı">
          <Input defaultValue={profile.company_name ?? ""} name="company_name" />
        </Field>

        <Field label="Uzmanlık">
          <Input defaultValue={profile.specialty ?? ""} name="specialty" />
        </Field>

        <Field label="İl">
          <Input defaultValue={profile.city ?? ""} name="city" />
        </Field>

        <Field label="İlçe">
          <Input defaultValue={profile.district ?? ""} name="district" />
        </Field>

        <div className="flex items-end">
          <Button disabled={isPending} type="submit">
            {isPending ? "Kaydediliyor..." : "Bilgileri Kaydet"}
          </Button>
        </div>

        {state.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:col-span-2 xl:col-span-3">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary md:col-span-2 xl:col-span-3">
            {state.success}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
