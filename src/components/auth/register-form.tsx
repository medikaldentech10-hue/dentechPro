"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { signUpAction } from "@/app/(public)/auth-actions";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = {
  error: "",
};

const registrationOptions = [
  { value: "doctor", label: "Hekim" },
  { value: "lab", label: "Laboratuvar" },
  { value: "vet", label: "Veteriner" },
] as const;

type RegistrationType = (typeof registrationOptions)[number]["value"];

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);
  const [userType, setUserType] = useState<RegistrationType>("doctor");
  const copy = useMemo(() => getRegistrationCopy(userType), [userType]);

  return (
    <CardContent>
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="user_type">Kullanıcı Tipi</Label>
          <select
            id="user_type"
            name="user_type"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            onChange={(event) => setUserType(event.target.value as RegistrationType)}
            required
            value={userType}
          >
            {registrationOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">{copy.fullNameLabel}</Label>
          <Input
            autoComplete="name"
            id="full_name"
            name="full_name"
            placeholder={copy.fullNamePlaceholder}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="ornek@kurum.com"
            required
            type="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            autoComplete="tel"
            id="phone"
            name="phone"
            placeholder="+90 5xx xxx xx xx"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={copy.organizationFieldName}>{copy.organizationLabel}</Label>
          <Input
            id={copy.organizationFieldName}
            name={copy.organizationFieldName}
            placeholder={copy.organizationPlaceholder}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="city">İl</Label>
          <Input
            autoComplete="address-level1"
            id="city"
            name="city"
            placeholder="İstanbul"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="district">İlçe</Label>
          <Input
            autoComplete="address-level2"
            id="district"
            name="district"
            placeholder="Kadıköy"
            required
          />
        </div>

        {userType === "doctor" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="specialty">Ünvan / Uzmanlık</Label>
            <Input
              id="specialty"
              name="specialty"
              placeholder="Ortodonti, protez, periodontoloji..."
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            autoComplete="new-password"
            id="password"
            minLength={6}
            name="password"
            placeholder="En az 6 karakter"
            required
            type="password"
          />
        </div>

        {state.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:col-span-2">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 md:col-span-2">
          <Button disabled={isPending} type="submit">
            {isPending ? "Gönderiliyor..." : "Onay İçin Gönder"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link className="font-medium text-primary" href="/login">
              Giriş Yap
            </Link>
          </p>
        </div>
      </form>
    </CardContent>
  );
}

function getRegistrationCopy(userType: RegistrationType) {
  if (userType === "lab") {
    return {
      fullNameLabel: "Yetkili Adı",
      fullNamePlaceholder: "Ahmet Yılmaz",
      organizationFieldName: "company_name",
      organizationLabel: "Laboratuvar Adı",
      organizationPlaceholder: "Örnek Dental Laboratuvarı",
    };
  }

  if (userType === "vet") {
    return {
      fullNameLabel: "Yetkili Adı",
      fullNamePlaceholder: "Dr. Zeynep Kaya",
      organizationFieldName: "clinic_name",
      organizationLabel: "Klinik Adı",
      organizationPlaceholder: "Örnek Veteriner Kliniği",
    };
  }

  return {
    fullNameLabel: "Ad Soyad",
    fullNamePlaceholder: "Dr. Ayşe Yılmaz",
    organizationFieldName: "clinic_name",
    organizationLabel: "Klinik Adı",
    organizationPlaceholder: "Örnek Ağız ve Diş Sağlığı Kliniği",
  };
}
