"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import {
  changePasswordAction,
  resetPasswordAction,
} from "@/app/(public)/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const initialState = {
  error: "",
  success: "",
};

export function PasswordUpdateForm({ mode }: { mode: "account" | "recovery" }) {
  const action = mode === "recovery" ? resetPasswordAction : changePasswordAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [recoveryState, setRecoveryState] = useState<"checking" | "invalid" | "ready">(
    mode === "recovery" ? "checking" : "ready"
  );

  useEffect(() => {
    if (mode !== "recovery") {
      return;
    }

    let active = true;
    void getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data, error }) => {
        if (active) {
          setRecoveryState(!error && data.user ? "ready" : "invalid");
        }
      })
      .catch(() => {
        if (active) {
          setRecoveryState("invalid");
        }
      });

    return () => {
      active = false;
    };
  }, [mode]);

  if (recoveryState === "checking") {
    return (
      <CardContent>
        <p className="text-sm text-muted-foreground">Bağlantı doğrulanıyor...</p>
      </CardContent>
    );
  }

  if (recoveryState === "invalid") {
    return (
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı
          isteyin.
        </p>
        <Link
          className={cn(buttonVariants(), "w-fit")}
          href="/forgot-password"
        >
          Yeni Bağlantı İste
        </Link>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Yeni şifre</Label>
          <Input
            autoComplete="new-password"
            id="password"
            minLength={8}
            name="password"
            placeholder="En az 8 karakter"
            required
            type="password"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password_confirmation">Yeni şifre tekrarı</Label>
          <Input
            autoComplete="new-password"
            id="password_confirmation"
            minLength={8}
            name="password_confirmation"
            placeholder="Yeni şifrenizi tekrar girin"
            required
            type="password"
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
          {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </Button>
      </form>
    </CardContent>
  );
}
