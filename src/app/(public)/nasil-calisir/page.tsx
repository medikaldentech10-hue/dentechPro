import Link from "next/link";
import {
  ClipboardList,
  Eye,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const guideSteps = [
  {
    title: "Kayıt olma",
    description: "Klinik, laboratuvar veya veteriner hesabınızla kayıt formunu doldurun.",
    icon: UserPlus,
  },
  {
    title: "Hesap onayı",
    description: "DENTech ekibi hesabınızı kontrol eder ve uygun rol ile onaylar.",
    icon: ShieldCheck,
  },
  {
    title: "Fiyat görüntüleme",
    description: "Fiyatlar yalnızca onaylı kullanıcı hesaplarında görünür.",
    icon: Eye,
  },
  {
    title: "Ürün arama",
    description: "SKU, çap, kategori veya kullanım alanına göre kataloğu inceleyin.",
    icon: Search,
  },
  {
    title: "Talep listesi oluşturma",
    description: "Uygun ürünleri talep listenize ekleyin ve miktarları kontrol edin.",
    icon: ClipboardList,
  },
  {
    title: "Talep gönderme",
    description: "Listenizi DENTech ekibine ileterek takip sürecini başlatın.",
    icon: Send,
  },
  {
    title: "DENTech ekibiyle takip",
    description: "Ekibimiz talebiniz için sizinle iletişime geçer.",
    icon: MessageCircle,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-10 md:px-6 md:py-14">
      <section className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
          Nasıl Çalışır?
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          DENTech Pro’da ürünleri incelemek, fiyatları görüntülemek ve talep
          göndermek için izlenen temel adımlar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className={cn(buttonVariants())}>
            Hesap Oluştur
          </Link>
          <Link
            href="/products"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Kataloğu İncele
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {guideSteps.map(({ description, icon: Icon, title }, index) => (
          <article
            className="rounded-2xl border border-border/70 bg-card/82 p-5 shadow-sm"
            key={title}
          >
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)] text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Adım {index + 1}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
