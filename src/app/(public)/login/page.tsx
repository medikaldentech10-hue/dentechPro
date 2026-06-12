import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1120px] items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_440px]">
      <div className="hidden flex-col gap-5 lg:flex">
        <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <ShieldCheck />
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            DENTech Medikal
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground">
            Profesyonel ürün ve talep portalı
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Onaylı hesabınızla fiyat bilgilerine erişin, ürünleri inceleyin ve
            taleplerinizi Dentech Pro üzerinden hızlıca yönetin.
          </p>
        </div>
      </div>
      <GlassCard className="mx-auto w-full max-w-md">
        <CardHeader className="gap-2">
          <p className="text-sm font-medium text-primary">Dentech Pro</p>
          <CardTitle>Giriş Yap</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Dentech Pro hesabınıza giriş yapın.
          </p>
        </CardHeader>
        <LoginForm />
      </GlassCard>
    </div>
  );
}
