"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { updateUserProfileFormAction } from "@/app/(admin)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types/auth";

type AdminUserProfileFormProps = {
  profile: Profile;
  returnTo: string;
};

const requestedRoleOptions = [
  { value: "", label: "Belirtilmedi" },
  { value: "doctor", label: "Hekim" },
  { value: "lab", label: "Laboratuvar" },
  { value: "vet", label: "Veteriner" },
  { value: "other", label: "Genel Başvuru" },
] as const;

const roleOptions = [
  { value: "pending_user", label: "Onay Bekliyor" },
  { value: "approved_doctor", label: "Hekim" },
  { value: "approved_lab", label: "Laboratuvar" },
  { value: "approved_vet", label: "Veteriner" },
  { value: "sales_rep", label: "Saha Temsilcisi" },
  { value: "suspended_user", label: "Askıya Alındı" },
  { value: "admin", label: "Admin" },
] as const;

type FormValues = {
  city: string;
  clinic_name: string;
  company_name: string;
  district: string;
  full_name: string;
  phone: string;
  requested_role: string;
  role: Profile["role"];
  specialty: string;
};

export function AdminUserProfileForm({
  profile,
  returnTo,
}: AdminUserProfileFormProps) {
  const [values, setValues] = useState<FormValues>(() => getFormValues(profile));

  const updateValue = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Profil Bilgileri</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            Profil alanlarını ve mevcut erişim rolünü buradan güncelleyebilirsiniz.
          </p>
        </div>
      </div>

      <form action={updateUserProfileFormAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input name="user_id" type="hidden" value={profile.id} />
        <input name="return_to" type="hidden" value={returnTo} />
        <input name="role" type="hidden" value={values.role} />
        <input name="requested_role" type="hidden" value={values.requested_role} />

        <Field label="Ad Soyad / Yetkili">
          <Input
            name="full_name"
            onChange={(event) => updateValue("full_name", event.currentTarget.value)}
            value={values.full_name}
          />
        </Field>

        <Field label="Telefon">
          <Input
            name="phone"
            onChange={(event) => updateValue("phone", event.currentTarget.value)}
            value={values.phone}
          />
        </Field>

        <Field label="Mevcut Rol">
          <select
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            onChange={(event) =>
              updateValue("role", event.currentTarget.value as FormValues["role"])
            }
            value={values.role}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Talep Edilen Rol">
          <select
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            onChange={(event) => updateValue("requested_role", event.currentTarget.value)}
            value={values.requested_role}
          >
            {requestedRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Klinik Adı">
          <Input
            name="clinic_name"
            onChange={(event) => updateValue("clinic_name", event.currentTarget.value)}
            value={values.clinic_name}
          />
        </Field>

        <Field label="Firma / Laboratuvar Adı">
          <Input
            name="company_name"
            onChange={(event) => updateValue("company_name", event.currentTarget.value)}
            value={values.company_name}
          />
        </Field>

        <Field label="Uzmanlık">
          <Input
            name="specialty"
            onChange={(event) => updateValue("specialty", event.currentTarget.value)}
            value={values.specialty}
          />
        </Field>

        <Field label="İl">
          <Input
            name="city"
            onChange={(event) => updateValue("city", event.currentTarget.value)}
            value={values.city}
          />
        </Field>

        <Field label="İlçe">
          <Input
            name="district"
            onChange={(event) => updateValue("district", event.currentTarget.value)}
            value={values.district}
          />
        </Field>

        <div className="flex items-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Kaydediliyor..." : "Bilgileri Kaydet"}
    </Button>
  );
}

function getFormValues(profile: Profile): FormValues {
  return {
    city: profile.city ?? "",
    clinic_name: profile.clinic_name ?? "",
    company_name: profile.company_name ?? "",
    district: profile.district ?? "",
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    requested_role: profile.requested_role ?? "",
    role: profile.role,
    specialty: profile.specialty ?? "",
  };
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
