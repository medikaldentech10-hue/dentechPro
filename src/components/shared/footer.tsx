import Link from "next/link";
import type { ReactNode } from "react";

import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";

const quickLinks = [
  { href: "/products", label: "Katalog" },
  { href: "/#kategoriler", label: "Ürün Kategorileri" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır" },
  { href: "/request", label: "Talep Listem" },
  { href: "/login", label: "Giriş Yap" },
];

const productGroups = [
  "JOTA Frezler",
  "Ölçü Materyalleri",
  "Klinik Cihazları",
  "Laboratuvar Ürünleri",
];

export function Footer() {
  const whatsappHref = `https://wa.me/${DENTECH_WHATSAPP_NUMBER}`;

  return (
    <footer
      className="border-t border-border/70 bg-background/88"
      id="iletisim"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:px-6">
        <div>
          <p className="text-base font-semibold text-foreground">DENTech Medikal</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Dental klinik ve laboratuvarlara yönelik ürün ve çözüm tedariği sunar.
          </p>
        </div>
        <FooterList title="Hızlı Bağlantılar">
          {quickLinks.map((link) => (
            <Link className="transition hover:text-foreground" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </FooterList>
        <FooterList title="Ürün Grupları">
          {productGroups.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </FooterList>
        <FooterList title="İletişim">
          <span>Telefon: Bilgi eklenecek</span>
          <Link className="transition hover:text-foreground" href={whatsappHref}>
            WhatsApp: {DENTECH_WHATSAPP_NUMBER}
          </Link>
          <span>E-posta: Bilgi eklenecek</span>
          <span>Adres: Bilgi eklenecek</span>
        </FooterList>
      </div>
      <div className="border-t border-border/70 px-4 py-4 text-center text-xs text-muted-foreground">
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
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
