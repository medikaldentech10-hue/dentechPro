import { Clock3 } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/(public)/auth-actions";
import { GlassCard } from "@/components/premium/glass-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";

const hasWhatsAppContact = !DENTECH_WHATSAPP_NUMBER.includes("X");
const whatsappHref = `https://wa.me/${DENTECH_WHATSAPP_NUMBER}`;

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
              E-posta doğrulaması bekleniyor
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Kayıt talebiniz alındı.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Lütfen e-posta adresinize gönderilen doğrulama bağlantısını açarak
              hesabınızı doğrulayın. E-posta doğrulamasından sonra DENTech Medikal
              ekibi hesabınızı inceleyip onaylayacaktır.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Hesabınız onaylandıktan sonra fiyatları görüntüleyebilir ve talep
              oluşturabilirsiniz.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Süreci hızlandırmak veya kayıt durumunuz hakkında bilgi almak için
              bizimle iletişime geçebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasWhatsAppContact ? (
              <Link className={buttonVariants()} href={whatsappHref}>
                Bizimle İletişime Geç
              </Link>
            ) : null}
            <form action={signOutAction}>
              <Button variant="outline" type="submit">
                Çıkış Yap
              </Button>
            </form>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
