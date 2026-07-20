"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/(public)/auth-actions";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = {
  error: "",
};

export function LoginForm({
  errorMessage,
  notice,
}: {
  errorMessage?: string;
  notice?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState
  );

  return (
    <CardContent>
      <form action={formAction} className="flex flex-col gap-5">
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
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            name="password"
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {notice ? (
          <p className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            {notice}
          </p>
        ) : null}
        {state.error || errorMessage ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {state.error || errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
        <Link className="text-center text-sm font-medium text-primary" href="/forgot-password">
          Şifremi unuttum
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium text-primary">
            Kayıt Talebi Oluştur
          </Link>
        </p>
      </form>
    </CardContent>
  );
}
