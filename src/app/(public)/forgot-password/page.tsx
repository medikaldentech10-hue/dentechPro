import { KeyRound } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[560px] items-center px-4 py-10 md:px-6">
      <GlassCard className="w-full">
        <CardHeader className="gap-2">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </span>
          <CardTitle>Şifremi Unuttum</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Hesabınızın e-posta adresini girin. Kayıtlı bir hesap varsa sıfırlama
            bağlantısı gönderilir.
          </p>
        </CardHeader>
        <ForgotPasswordForm />
      </GlassCard>
    </div>
  );
}
