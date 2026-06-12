"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/app/(public)/auth-actions";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allowedUserTypes } from "@/lib/auth-options";

const initialState = {
  error: "",
};

const userTypeLabels = {
  doctor: "Diş Hekimi / Klinik",
  lab: "Laboratuvar",
  vet: "Veteriner",
  other: "Diğer",
};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialState
  );

  return (
    <CardContent>
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Ad Soyad</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Dr. Ayşe Yılmaz"
            autoComplete="name"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="user_type">Kullanıcı Tipi</Label>
          <select
            id="user_type"
            name="user_type"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            defaultValue="doctor"
            required
          >
            {allowedUserTypes.map((type) => (
              <option key={type} value={type}>
                {userTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            name="email"
            placeholder="ornek@klinik.com"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+90"
            autoComplete="tel"
            required
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            name="password"
            placeholder="En az 6 karakter"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        {state.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:col-span-2">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Gönderiliyor..." : "Onay İçin Gönder"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="font-medium text-primary">
              Giriş Yap
            </Link>
          </p>
        </div>
      </form>
    </CardContent>
  );
}
