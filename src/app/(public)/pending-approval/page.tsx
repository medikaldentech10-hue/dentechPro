import { Clock3 } from "lucide-react";

import { signOutAction } from "@/app/(public)/auth-actions";
import { GlassCard } from "@/components/premium/glass-card";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[900px] items-center px-4 py-10 md:px-6">
      <GlassCard className="mx-auto w-full">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center md:p-10">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary shadow-sm">
            <Clock3 />
          </span>
          <div className="flex max-w-xl flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              Hesap onayı bekleniyor
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Kayıt talebiniz alındı. DENTech Medikal ekibi hesabınızı
              onayladıktan sonra fiyat görünümü ve talep akışına erişebilirsiniz.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              E-posta doğrulaması etkinse gelen kutunuzdaki doğrulama bağlantısını da
              tamamlayın. Bu işlem hesap onayını otomatik olarak vermez.
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
