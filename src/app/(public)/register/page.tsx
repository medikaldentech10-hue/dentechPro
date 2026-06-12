import { ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

import { RegisterForm } from "@/components/auth/register-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";

const registrationSteps = [
  {
    description: "Klinik, laboratuvar veya veteriner bilgilerinizi iletin.",
    icon: FileText,
    title: "Hesap oluştur",
  },
  {
    description: "DENTech Medikal ekibi başvurunuzu değerlendirir.",
    icon: ClipboardCheck,
    title: "Onay süreci",
  },
  {
    description: "Onay sonrası fiyatları görüntüleyip talep oluşturabilirsiniz.",
    icon: ShieldCheck,
    title: "Fiyat ve talep erişimi",
  },
];

export default function RegisterPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1180px] items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          DENTech Medikal
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">
          Hesap başvurusu
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Fiyat bilgilerine erişmek ve ürün talebi oluşturmak için hesap
          başvurusu yapın.
        </p>
        <div className="grid gap-3">
          {registrationSteps.map(({ description, icon: Icon, title }) => (
            <div
              key={title}
              className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">
                    {title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {description}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <GlassCard className="mx-auto w-full max-w-2xl">
        <CardHeader className="gap-2">
          <p className="text-sm font-medium text-primary">Dentech Pro</p>
          <CardTitle>Kayıt Talebi Oluştur</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Başvurunuz değerlendirme için alınır; fiyat ve talep erişimi
            onaydan sonra açılır.
          </p>
        </CardHeader>
        <RegisterForm />
      </GlassCard>
    </div>
  );
}
