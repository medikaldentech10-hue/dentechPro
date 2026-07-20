"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/(public)/auth-actions";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = {
  error: "",
  success: "",
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  return (
    <CardContent>
      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="ornek@klinik.com"
            required
            type="email"
          />
        </div>
        {state.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            {state.success}
          </p>
        ) : null}
        <Button disabled={isPending} type="submit">
          {isPending ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
        </Button>
        <Link className="text-center text-sm font-medium text-primary" href="/login">
          Giriş sayfasına dön
        </Link>
      </form>
    </CardContent>
  );
}
