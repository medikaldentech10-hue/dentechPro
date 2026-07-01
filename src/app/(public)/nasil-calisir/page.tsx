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
    title: "Profesyonel hesabınızı oluşturun",
    description:
      "Klinik, laboratuvar veya ilgili profesyonel kullanıcı bilgilerinizle kayıt olun.",
    icon: UserPlus,
  },
  {
    title: "Hesap bilgileriniz değerlendirilsin",
    description:
      "DENTech Medikal ekibi, kullanıcı tipinizi ve profesyonel kullanım kapsamınızı kontrol ederek hesabınızı uygun rolle tanımlar.",
    icon: ShieldCheck,
  },
  {
    title: "Ürünleri inceleyin",
    description:
      "Ürün adı, SKU, kategori veya kullanım alanına göre katalogda arama yapın; ürün ve varyant bilgilerini karşılaştırın.",
    icon: Search,
  },
  {
    title: "Talep listenizi hazırlayın",
    description:
      "İlgilendiğiniz ürünleri talep listenize ekleyin ve ihtiyaç duyduğunuz miktarları gözden geçirin.",
    icon: ClipboardList,
  },
  {
    title: "Ekibimiz sizinle iletişime geçsin",
    description:
      "Talebiniz incelendikten sonra stok, uygun varyant ve ticari detaylar için DENTech Medikal ekibi sizinle iletişime geçer.",
    icon: BadgeCheck,
  },
];

const userTypes = [
  {
    title: "Klinikler",
    description:
      "Tedavi akışında kullanılan ürünleri inceleyebilir, uygun varyantları seçebilir ve taleplerinizi DENTech Medikal ekibine iletebilirsiniz.",
    icon: Building2,
  },
  {
    title: "Laboratuvarlar",
    description:
      "Laboratuvar süreçlerine uygun ürün gruplarını tek katalogda değerlendirebilir ve operasyonel ihtiyaçlarınızı netleştirebilirsiniz.",
    icon: FlaskConical,
  },
  {
    title: "Veteriner Hekimler",
    description:
      "Veteriner dental ürün kapsamı genişledikçe uygun ürünleri katalog üzerinden takip edebilir ve talep sürecine dahil olabilirsiniz.",
    icon: Stethoscope,
  },
];

const faqs = [
  {
    question: "Fiyat bilgisi neden kapalı hesapla paylaşılır?",
    answer:
      "DENTech Pro’da yer alan profesyonel kullanım kapsamındaki ürünlerde fiyat ve talep süreçleri kapalı profesyonel hesap yapısı üzerinden yürütülür. Bu yapı, Sağlık Bakanlığı/TİTCK düzenlemeleri ve profesyonel kullanım gereklilikleriyle uyumlu bir süreç oluşturmak için tercih edilir.",
  },
  {
    question: "Kimler hesap oluşturabilir?",
    answer:
      "Dental klinikler, laboratuvarlar, sağlık meslek mensupları ve ilgili profesyonel kullanıcılar hesap oluşturabilir. Hesap tipi DENTech Medikal ekibi tarafından değerlendirilir.",
  },
  {
    question: "Profesyonel kullanıcı değilsem satın alma yapabilir miyim?",
    answer:
      "DENTech Pro’da profesyonel kullanım kapsamındaki tıbbi cihaz ve dental ürünler için doğrudan satış yapılmaz. Tıbbi cihaz kapsamında olmayan veya genel satışa uygun ürünler için DENTech Medikal ile iletişime geçebilirsiniz.",
  },
  {
    question: "Talep listesi ne işe yarar?",
    answer:
      "Talep listesi, ilgilendiğiniz ürünleri DENTech Medikal ekibine düzenli şekilde iletmenizi sağlar. Doğrudan ödeme veya otomatik sipariş ekranı değildir.",
  },
  {
    question: "Talep gönderdikten sonra ne olur?",
    answer:
      "Ekibimiz talebinizi inceler; stok, uygun varyant ve ticari detaylar için sizinle iletişime geçer.",
  },
  {
    question: "Stok bilgisi nasıl paylaşılır?",
    answer:
      "Stok bilgisi ürün ve talep özelinde değerlendirilir. Güncel uygunluk bilgisi DENTech Medikal ekibi tarafından paylaşılır.",
  },
  {
    question: "Veteriner dental ürünler katalogda yer alacak mı?",
    answer:
      "Veteriner dental ürün kapsamı planlı şekilde genişletilmektedir. Güncel ürün gruplarını katalog üzerinden takip edebilirsiniz.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-8 md:gap-10 md:px-6 md:py-12">
      <section className="clinical-gradient overflow-hidden rounded-[2rem] border border-border/70 bg-card/88 px-5 py-8 shadow-[0_18px_70px_rgb(15_23_42/0.07)] md:px-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-center">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              DENTech Pro Kullanım Rehberi
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              Profesyonel dental ürünler için kapalı katalog yapısı
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              DENTech Pro, dental klinikler, laboratuvarlar ve ilgili
              profesyonel kullanıcılar için hazırlanmış kapalı ürün katalog ve
              talep platformudur. Ürünleri inceleyebilir, uygun varyantları
              seçebilir ve talebinizi DENTech Medikal ekibine iletebilirsiniz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className={cn(buttonVariants())} href="/products">
                Kataloğu İncele
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-background/82 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Bilgilendirme
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/88">
              DENTech Pro’da listelenen profesyonel kullanım kapsamındaki tıbbi
              cihaz ve dental ürün grupları; sağlık meslek mensupları,
              klinikler, laboratuvarlar ve ilgili profesyonel kullanıcılar için
              sunulur. Fiyat ve talep süreçleri, Sağlık Bakanlığı/TİTCK
              düzenlemeleri ve profesyonel kullanım gereklilikleri doğrultusunda
              kapalı hesap yapısı üzerinden yürütülür.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/86 px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Süreç nasıl ilerler?
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            Ürün inceleme, profesyonel hesap doğrulama ve talep iletme süreci
            sade bir akışta ilerler. Aşağıdaki adımlar, DENTech Pro’yu ilk kez
            kullanan profesyonel kullanıcılar için özetlenmiştir.
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
            Kimler kullanabilir?
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            DENTech Pro, profesyonel dental ürün ihtiyaçlarının daha düzenli
            takip edilebilmesi için klinik, laboratuvar ve ilgili profesyonel
            kullanıcılar düşünülerek tasarlanmıştır.
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
            Fiyat bilgisi ve profesyonel hesap doğrulaması
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            DENTech Pro’da fiyat bilgileri kamuya açık bir satış ekranı olarak
            listelenmez. Profesyonel kullanım kapsamındaki ürünlerde fiyat ve
            ticari bilgiler; kullanıcı tipi, ürün grubu, stok durumu ve ilgili
            satış koşulları değerlendirildikten sonra uygun profesyonel
            hesaplarla paylaşılır.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Talep listesi doğrudan ödeme veya otomatik sipariş ekranı değildir.
            İlgilendiğiniz ürünleri DENTech Medikal ekibine düzenli şekilde
            iletmenizi sağlar. Talep sonrası ekibimiz stok, uygun varyant ve
            ticari detaylar için sizinle iletişime geçer.
          </p>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/8 p-4">
            <p className="text-sm leading-6 text-foreground/88">
              Profesyonel kullanıcı olmayan ziyaretçiler için doğrudan satış
              yapılmaz. Tıbbi cihaz kapsamında olmayan veya genel satışa uygun
              ürün grupları hakkında bilgi almak için DENTech Medikal ekibiyle
              iletişime geçebilirsiniz.
            </p>
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
              Hesabınızı oluşturarak süreci başlatın.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Profesyonel kullanıma uygun ürün gruplarını incelemek ve talep
              sürecine dahil olmak için hesabınızı oluşturabilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className={cn(buttonVariants())} href="/register">
              Hesap Oluştur
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
