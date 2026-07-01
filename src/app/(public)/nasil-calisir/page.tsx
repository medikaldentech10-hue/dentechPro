import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  FlaskConical,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const processSteps = [
  {
    title: "Hesabınızı oluşturun",
    description:
      "Klinik, laboratuvar veya veteriner hesabınızla kayıt olun ve temel kurum bilgilerinizi paylaşın.",
    icon: UserPlus,
  },
  {
    title: "Onay sürecini tamamlayın",
    description:
      "DENTech ekibi hesabınızı kontrol eder ve uygun kullanıcı rolüyle manuel olarak onaylar.",
    icon: ShieldCheck,
  },
  {
    title: "Ürünleri inceleyin",
    description:
      "Ürün adı, SKU, kategori veya kullanım alanına göre katalogda arama yapın ve varyantları karşılaştırın.",
    icon: Search,
  },
  {
    title: "Talep listenizi oluşturun",
    description:
      "İlgilendiğiniz ürünleri talep listenize ekleyin, miktarları gözden geçirin ve B2B talebinizi hazırlayın.",
    icon: ClipboardList,
  },
  {
    title: "DENTech ekibi size dönüş yapsın",
    description:
      "Talebiniz incelenir; stok, fiyat ve süreç bilgisi için ekibimiz sizinle iletişime geçer.",
    icon: BadgeCheck,
  },
];

const userTypes = [
  {
    title: "Klinikler",
    description:
      "Günlük tedavi akışında kullanılan ürünleri inceleyin, uygun varyantları seçin ve talebinizi iletin.",
    icon: Building2,
  },
  {
    title: "Laboratuvarlar",
    description:
      "Laboratuvar süreçlerine uygun ürünleri tek katalogda gözden geçirin ve ekibimizle operasyonel ihtiyaçlarınızı netleştirin.",
    icon: FlaskConical,
  },
  {
    title: "Veteriner Hekimler",
    description:
      "Veteriner dental ürün grupları kademeli olarak genişlerken uygun ürünler için katalog ve talep akışını takip edin.",
    icon: Stethoscope,
  },
];

const faqs = [
  {
    question: "Fiyatları neden göremiyorum?",
    answer:
      "Fiyatlar yalnızca onaylı kullanıcı hesaplarına gösterilir. Hesabınız henüz onaylanmadıysa katalogu inceleyebilir, ancak fiyatları görüntüleyemezsiniz.",
  },
  {
    question: "Hesabım ne zaman onaylanır?",
    answer:
      "Hesap onayı DENTech ekibi tarafından manuel olarak yapılır. Başvurunuz incelendikten sonra uygun kullanıcı rolüyle hesabınız aktif hale getirilir.",
  },
  {
    question: "Talep listesi sipariş midir?",
    answer:
      "Hayır. Talep listesi online ödeme veya doğrudan checkout ekranı değildir; ilgilendiğiniz ürünleri ekibimize iletmenizi sağlayan B2B talep akışıdır.",
  },
  {
    question: "Talep gönderdikten sonra ne olur?",
    answer:
      "Ekibimiz talebinizi inceler ve stok, fiyat, uygun varyant ve süreç bilgisiyle sizinle iletişime geçer.",
  },
  {
    question: "Ürün stok bilgisi nasıl öğrenilir?",
    answer:
      "Stok bilgisi, talebiniz veya ürün özelindeki değerlendirme sonrasında DENTech ekibi tarafından paylaşılır.",
  },
  {
    question: "Laboratuvar hesabı açabilir miyim?",
    answer:
      "Evet. Laboratuvar kullanıcıları kayıt olabilir; uygun kullanıcı tipi değerlendirilerek hesap manuel olarak onaylanır.",
  },
  {
    question: "Veteriner dental ürünler eklenecek mi?",
    answer:
      "İlgili ürün grupları planlı şekilde genişletilmektedir. Güncel kapsam için katalogu takip edebilir veya ekibimizle iletişime geçebilirsiniz.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-8 md:gap-10 md:px-6 md:py-12">
      <section className="clinical-gradient overflow-hidden rounded-[2rem] border border-border/70 bg-card/88 px-5 py-8 shadow-[0_18px_70px_rgb(15_23_42/0.07)] md:px-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-center">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              B2B Rehber
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              DENTech Pro nasıl çalışır?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              DENTech Pro, dental profesyonellerin ürünleri inceleyip onaylı
              hesaplarıyla fiyat görüntüleyebildiği ve talep oluşturabildiği B2B
              katalog sistemidir.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className={cn(buttonVariants())} href="/products">
                Kataloğu İncele
              </Link>
              <Link
                className={cn(buttonVariants({ variant: "outline" }))}
                href="/register"
              >
                Hesap Oluştur
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-primary/15 bg-background/82 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Onaylı Hesaplar
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/88">
                Fiyat görünürlüğü ve talep akışı, kullanıcı tipinin doğru
                yönetilmesi için onaylı hesaplarla çalışır.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-background/82 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                B2B Talep Akışı
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/88">
                Talep listesi doğrudan ödeme ekranı değildir; ürünleri DENTech
                ekibine düzenli şekilde iletmenizi sağlar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Süreç nasıl ilerler?
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            DENTech Pro’da ürün keşfi, hesap onayı ve talep takibi tek bir B2B
            akışta toplanır. Aşağıdaki adımlar yeni kullanıcıların sistemi hızlıca
            anlaması için özetlenmiştir.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {processSteps.map(({ description, icon: Icon, title }, index) => (
            <article
              className="relative rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
              key={title}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-primary">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-[2rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm md:px-7">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            Kimler için?
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Sayfa yapısı ve talep akışı; klinikler, laboratuvarlar ve veteriner
            kullanıcılar için olabildiğince anlaşılır olacak şekilde tasarlanır.
          </p>

          <div className="mt-5 grid gap-3">
            {userTypes.map(({ description, icon: Icon, title }) => (
              <article
                className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
                key={title}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm md:px-7">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            Fiyat ve onay süreci
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            DENTech Pro’da fiyatlar yalnızca onaylı kullanıcı hesaplarına
            gösterilir. Hesap onayı, kullanıcı tipinin ve talep sürecinin doğru
            yönetilmesi için DENTech ekibi tarafından manuel olarak yapılır.
            Talep listesi, online ödeme ekranı değil; ürünleri ekibimize
            iletmenizi sağlayan B2B talep akışıdır.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Fiyat Görünürlüğü
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/88">
                Onaysız kullanıcılar katalogu inceleyebilir; fiyatlar ise yalnızca
                onaylanan hesaplarda açılır.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Talep Sonrası
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/88">
                Talebiniz sonrasında ekibimiz ürün uygunluğu, stok ve ticari
                detaylar için sizinle iletişime geçer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm md:px-7">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            Sık sorulan sorular
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            İlk kullanımda en çok sorulan noktaları kısa ve net şekilde burada
            topladık.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {faqs.map(({ answer, question }) => (
            <details
              className="group rounded-2xl border border-border/70 bg-background/82 p-4 shadow-sm"
              key={question}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
                <span>{question}</span>
                <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 pr-6 text-sm leading-6 text-muted-foreground">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="clinical-gradient rounded-[2rem] border border-border/70 bg-card/88 px-5 py-8 shadow-sm md:px-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
              Ürünleri incelemeye başlayın.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Kataloğu keşfedin, uygun ürünleri bulun ve hesabınızı oluşturarak
              DENTech Pro talep akışına dahil olun.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className={cn(buttonVariants())} href="/products">
              Kataloğa Git
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href="/register"
            >
              Hesap Oluştur
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
