import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { GlassCard } from "@/components/premium/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) {
    if (!params.error) {
      redirect("/forgot-password?error=invalid-link");
    }

    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[560px] items-center px-4 py-10 md:px-6">
        <GlassCard className="w-full">
          <CardHeader>
            <CardTitle>Bağlantı geçersiz</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı
              isteyin.
            </p>
            <Link className={buttonVariants()} href="/forgot-password">
              Yeni Bağlantı İste
            </Link>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[560px] items-center px-4 py-10 md:px-6">
      <GlassCard className="w-full">
        <CardHeader className="gap-2">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </span>
          <CardTitle>Yeni Şifre Belirle</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Hesabınız için en az 8 karakterden oluşan yeni bir şifre belirleyin.
          </p>
        </CardHeader>
        <PasswordUpdateForm mode="recovery" />
      </GlassCard>
    </div>
  );
}
