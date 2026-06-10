import { ShieldAlert } from "lucide-react";

import { signOutAction } from "@/app/(public)/auth-actions";
import { GlassCard } from "@/components/premium/glass-card";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

export default function AccountSuspendedPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[900px] items-center px-4 py-10 md:px-6">
      <GlassCard className="mx-auto w-full">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center md:p-10">
          <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive shadow-sm">
            <ShieldAlert />
          </span>
          <div className="flex max-w-xl flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              Hesap erişimi askıya alındı
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Bu hesapla korumalı panellere erişim kapalıdır. Durum hakkında
              bilgi almak için DENTech Medikal ekibiyle iletişime geçin.
            </p>
          </div>
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Çıkış Yap
            </Button>
          </form>
        </CardContent>
      </GlassCard>
    </div>
  );
}
