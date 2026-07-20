import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountSecurityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[620px] items-center px-4 py-10 md:px-6">
      <GlassCard className="w-full">
        <CardHeader className="gap-2">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <CardTitle>Hesap Güvenliği</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Oturum açtığınız hesap için yeni bir şifre belirleyin.
          </p>
        </CardHeader>
        <PasswordUpdateForm mode="account" />
      </GlassCard>
    </div>
  );
}
