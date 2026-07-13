import Link from "next/link";
import type { ReactNode } from "react";
import { Clock3, Mail, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";

const footerColumns = [
  {
    title: "Katalog",
    links: [
      { href: "/products", label: "Tüm Ürünler" },
      { href: "/products?brand=JOTA", label: "JOTA Frezler" },
      { href: "/#kategoriler", label: "Kategoriler" },
    ],
  },
  {
    title: "Kategoriler",
    links: [
      { href: "/products?category=burs", label: "Frezler" },
      { href: "/#kategoriler", label: "Polisaj Ürünleri" },
      { href: "/#kategoriler", label: "Endodonti" },
      { href: "/#kategoriler", label: "Laboratuvar" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { href: "/#iletisim", label: "İletişim" },
      { href: "/register", label: "Hesap Oluştur" },
    ],
  },
  {
    title: "Destek",
    links: [
      { href: "/nasil-calisir", label: "Nasıl Çalışır" },
      { href: "/request", label: "Talep Listem" },
      { href: "/login", label: "Giriş Yap" },
    ],
  },
];

export function Footer() {
  const whatsappHref = `https://wa.me/${DENTECH_WHATSAPP_NUMBER}`;

  return (
    <footer className="border-t border-slate-200 bg-white/92 dark:border-white/10 dark:bg-background/92" id="iletisim">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-[1.2fr_2fr_1.25fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            DENTech Medikal, diş hekimliği klinik ve laboratuvarlarına yönelik
            ürünleri hızlıca incelemeniz ve talep oluşturmanız için çalışır.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {footerColumns.map((column) => (
            <FooterList title={column.title} key={column.title}>
              {column.links.map((link) => (
                <Link
                  className="transition hover:text-foreground"
                  href={link.href}
                  key={`${column.title}-${link.label}`}
                >
                  {link.label}
                </Link>
              ))}
            </FooterList>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <HeadsetIcon />
            Bizimle İletişime Geçin
          </p>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <ContactRow icon={<MessageCircle className="size-4" />}>
              <Link className="hover:text-foreground" href={whatsappHref}>
                WhatsApp: {DENTECH_WHATSAPP_NUMBER}
              </Link>
            </ContactRow>
            <ContactRow icon={<Phone className="size-4" />}>
              Telefon: 0532 264 96 11
            </ContactRow>
            <ContactRow icon={<Mail className="size-4" />}>
              E-posta: info@dentechmedikal.com
            </ContactRow>
            <ContactRow icon={<Clock3 className="size-4" />}>
              Çalışma saatleri: 09:00 - 18:00
            </ContactRow>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-muted-foreground dark:border-white/10">
        © {new Date().getFullYear()} DENTech Medikal. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}

function FooterList({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function ContactRow({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function HeadsetIcon() {
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-primary">
      <MessageCircle className="size-4" />
    </span>
  );
}
