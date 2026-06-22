import {
  ClipboardCheck,
  Clock3,
  FileClock,
  FileText,
  Gauge,
  History,
  KeyRound,
  Layers3,
  MessageCircle,
  PackageSearch,
  Percent,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export type {
  PublicRole,
  UserRole,
  UserType,
  VerificationStatus,
} from "@/lib/types/auth";

export type PriceVisibility = "public" | "pending" | "approved";

export const publicNav = [
  { href: "/products", label: "Katalog" },
  { href: "/usage", label: "Kullanım Alanları" },
  { href: "/login", label: "Giriş Yap" },
];

export const dashboardNav = [
  { href: "/dashboard", label: "Panel", icon: Gauge },
  { href: "/products", label: "Katalog", icon: PackageSearch },
];

export const salesNav = [
  { href: "/sales", label: "Panel", icon: Gauge },
  { href: "/products", label: "Katalog", icon: PackageSearch },
  { href: "/sales/request", label: "Talepler", icon: ShoppingBag },
];

export const adminNav = [
  { href: "/admin", label: "Panel", icon: ShieldCheck },
  { href: "/admin/users", label: "Kullanıcılar", icon: ClipboardCheck },
  { href: "/admin/products", label: "Ürünler", icon: PackageSearch },
  { href: "/admin/requests", label: "Talepler", icon: ShoppingBag },
  { href: "/admin/customers", label: "Müşteriler", icon: Users },
  { href: "/admin/search-logs", label: "Arama Logları", icon: Search },
];

export const mainCategories = [
  {
    title: "JOTA Frezler",
    description: "Elmas, karbit, taş, disk ve cilalama ürünleri",
    status: "active" as const,
    href: "/products",
    meta: "302 varyant",
  },
  {
    title: "Ölçü Materyalleri",
    description: "Ölçü ve klinik yardımcı ürünleri",
    status: "coming-soon" as const,
  },
  {
    title: "Klinik Cihazları",
    description: "Klinik operasyon ekipmanları",
    status: "coming-soon" as const,
  },
  {
    title: "Pedodonti Ürünleri",
    description: "Çocuk diş hekimliği ürün ailesi",
    status: "coming-soon" as const,
  },
  {
    title: "Laboratuvar Ürünleri",
    description: "Dental laboratuvar çözümleri",
    status: "coming-soon" as const,
  },
  {
    title: "Veteriner Dental Ürünler",
    description: "Veteriner dental uygulamalar",
    status: "coming-soon" as const,
  },
];

export const jotaSubcategories = [
  "Elmas Frezler",
  "Karbit Frezler",
  "Aşındırıcı Taşlar",
  "Ayırıcı Diskler",
  "Cilalama Frezleri",
  "Diğer Ürünler",
];

export const usageFilters = [
  "Preparasyon",
  "Polisaj",
  "Zirkonya",
  "Kompozit",
  "Karbit",
  "Laboratuvar",
  "Klinik Kullanım",
];

export const sampleProducts = [
  {
    id: "jota-859l-flame-long",
    name: "JOTA 859L Elmas Frez",
    category: "Elmas Frezler",
    variant: "Alev, Uzun",
    code: "859L.FG.012",
    price: "₺275,00 + KDV",
    status: "Preparasyon için sık kullanılan varyant",
  },
  {
    id: "jota-852-cone-round",
    name: "JOTA 852 Elmas Frez",
    category: "Elmas Frezler",
    variant: "Konik, Yuvarlak Uçlu",
    code: "852.FG.014",
    price: "₺285,00 + KDV",
    status: "Kuron preparasyonu placeholder",
  },
  {
    id: "jota-z850-zirconia",
    name: "JOTA Z850 Zirkonya Elmas Frez",
    category: "Elmas Frezler",
    variant: "Zirkonya düzeltme",
    code: "Z850.FG.016",
    price: "₺410,00 + KDV",
    status: "Zirkonya polisaj öncesi kullanım",
  },
  {
    id: "jota-9805m-polisher",
    name: "JOTA 9805M Cilalama Frezi",
    category: "Cilalama Frezleri",
    variant: "Orta gren polisaj",
    code: "9805M.RA",
    price: "₺365,00 + KDV",
    status: "Kompozit cilalama için öneri placeholder",
  },
  {
    id: "jota-cq1-carbide",
    name: "JOTA CQ1 Karbit Frez",
    category: "Karbit Frezler",
    variant: "Çapraz kesim",
    code: "CQ1.FG.010",
    price: "₺320,00 + KDV",
    status: "Hızlı ürün arama için örnek kayıt",
  },
];

export const salesActions = [
  { title: "Müşteri Ara", description: "Ziyaret sırasında hızlı hesap bul", icon: Search },
  { title: "Yeni Müşteri Oluştur", description: "Klinik/lab/vet kaydı başlat", icon: UserPlus },
  { title: "Müşteri Adına Sipariş", description: "Talep listesini temsilci olarak kur", icon: ShoppingBag },
  { title: "Hızlı Ürün Ara", description: "JOTA ürün kataloğu ve kullanım filtreleri", icon: PackageSearch },
  { title: "WhatsApp Onayı Bekleyenler", description: "Müşteriye gönderilen talepler", icon: MessageCircle },
  { title: "Ödeme Bekleyenler", description: "Onay sonrası takip edilecek hesaplar", icon: Wallet },
  { title: "Takip Notları", description: "Bir sonraki ziyaret için saha notları", icon: FileText },
  { title: "Son Müşteri Görüşmeleri", description: "Güncel ziyaret ve telefon kayıtları", icon: Clock3 },
];

export const recentCustomerMeetings = [
  {
    customer: "DentGroup A.Ş.",
    contact: "Merve Kaya",
    note: "JOTA 859L ve Z850 numune talebi görüşüldü",
    nextStep: "WhatsApp onayı bekleniyor",
    time: "Bugün 14:20",
  },
  {
    customer: "Smile Dent Klinik",
    contact: "Dr. Emre Acar",
    note: "Kompozit cilalama ürünleri için hızlı katalog paylaşıldı",
    nextStep: "Ödeme bekleyenler listesine al",
    time: "Dün 17:40",
  },
  {
    customer: "LabPro Dental",
    contact: "Selin Demir",
    note: "Laboratuvar HP ürünleri için gelecek kategori talebi",
    nextStep: "Takip notu açıldı",
    time: "Dün 11:10",
  },
];

export const adminActions = [
  { title: "Kullanıcı Onayları", description: "Rol ve hesap durumları", icon: ClipboardCheck },
  { title: "Ürün Yönetimi", description: "Katalog içerik yapısı", icon: PackageSearch },
  { title: "Varyant/Fiyat/Stok Yönetimi", description: "Yetkili fiyat görünümü", icon: FileClock },
  { title: "Sipariş Yönetimi", description: "Talep ve onay akışı", icon: ShoppingBag },
  { title: "Saha Yetkileri", description: "Temsilci erişimleri", icon: KeyRound },
  { title: "İndirim Yetkisi", description: "Limit ve onay kurgusu", icon: Percent },
  { title: "Audit Log", description: "Kritik işlem izleri", icon: History },
  { title: "Toplu İşlemler", description: "İçe aktarma ve toplu güncelleme placeholder", icon: Layers3 },
];
