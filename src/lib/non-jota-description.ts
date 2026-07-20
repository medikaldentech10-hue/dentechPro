type NonJotaDescriptionProduct = {
  brand: string;
  category?: { name: string } | null;
  code: string;
  name: string;
  usageArea?: string | null;
  variants: NonJotaDescriptionVariant[];
};

type NonJotaDescriptionVariant = {
  code: string;
  manufacturerRef: string | null;
  packageQuantity?: number | null;
};

export type NonJotaBrandTone =
  | "seil"
  | "xpect"
  | "hulaser"
  | "dentech"
  | "voldent"
  | "brulon"
  | "icrown"
  | "neutral";

export type NonJotaTemplate = "prosthetic" | "device" | "accessory";

export type NonJotaDescriptionModel = {
  benefits: Array<{ description: string; title: string }>;
  brandLabel: string;
  brandTone: NonJotaBrandTone;
  conclusion: string;
  logoSrc: string | null;
  note: string;
  subtitle: string;
  summary: string;
  template: NonJotaTemplate;
  title: string;
  useCases: string[];
  workflow: Array<{ description: string; title: string }>;
};

type DescriptionProfile = Omit<
  NonJotaDescriptionModel,
  "brandLabel" | "brandTone" | "logoSrc" | "subtitle"
>;

const SPECIFIC_PROFILES: Array<{
  matches: (identity: string) => boolean;
  profile: DescriptionProfile;
}> = [
  {
    matches: (identity) => identity.includes("jb tray"),
    profile: {
      benefits: [
        { title: "Entegre İş Akışı", description: "Ölçü ve kayıt adımlarını planlı bir protokol içinde bir araya getirir." },
        { title: "Kontrollü Adaptasyon", description: "Kenarların klinik gereksinime göre şekillendirilmesine yardımcı olur." },
        { title: "Laboratuvar İletişimi", description: "Kayıtların düzenli biçimde laboratuvara aktarılmasını destekler." },
      ],
      conclusion:
        "JB Tray, uygun vaka seçimi ve üretici talimatlarıyla birlikte kullanıldığında tam protez iş akışının düzenlenmesine yardımcı olur.",
      note: "Kullanım öncesinde ürün uyumu, materyal seçimi ve klinik protokol birlikte değerlendirilmelidir.",
      summary:
        "JB Tray; tam protez ve implant üstü protez süreçlerinde final ölçü ile çene ilişkisi kaydını yapılandırılmış bir iş akışında destekleyen ölçü sistemidir.",
      template: "prosthetic",
      title: "JB Tray Ölçü ve Kayıt Sistemi",
      useCases: [
        "Tam protez ölçü ve kayıt planlaması",
        "İmplant üstü protezlerde klinik kayıt akışı",
        "Kenar şekillendirme ile kişiselleştirilmiş ölçü yaklaşımı",
      ],
      workflow: [
        { title: "Yerleştir ve Uyarla", description: "Kaşık ve kenar yapısı klinik anatomiyi dikkate alarak uyarlanır." },
        { title: "Ölçü ve Kayıt", description: "Planlanan materyalle final ölçü ve gerekli ilişki kayıtları alınır." },
        { title: "Kontrol ve Aktarım", description: "Kayıt bütünlüğü kontrol edilerek laboratuvar aşamasına hazırlanır." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("jb fork"),
    profile: {
      benefits: [
        { title: "Kayıt Odaklı", description: "Çene ilişkisi ve oklüzyon düzlemi bilgilerinin düzenli alınmasını hedefler." },
        { title: "Planlı Transfer", description: "Klinik kayıtların protez planlamasına aktarılmasına yardımcı olur." },
        { title: "Akış Uyumu", description: "Konvansiyonel veya dijital ölçü sonrası iş akışına dahil edilebilir." },
      ],
      conclusion:
        "JB Fork, protez planlamasında çene ilişkisi kaydı ve oklüzyon düzlemi transferini yapılandırmak için kullanım alanı sunar.",
      note: "Kayıt doğruluğu; doğru konumlandırma, stabilizasyon ve klinik kontrol adımlarına bağlıdır.",
      summary:
        "JB Fork; tam protez ve full-arch implant destekli protez vakalarında çene ilişkisi kaydı ile oklüzyon düzlemi transferine yardımcı olan kayıt sistemidir.",
      template: "prosthetic",
      title: "JB Fork Çene İlişkisi Kayıt Sistemi",
      useCases: [
        "Tam protezlerde çene ilişkisi kaydı",
        "Full-arch implant destekli protez planlaması",
        "Oklüzyon düzlemi bilgisinin laboratuvara aktarılması",
      ],
      workflow: [
        { title: "Ölçü veya Tarama", description: "Vaka için gerekli anatomik kayıtlar elde edilir." },
        { title: "JB Fork ile Kayıt", description: "Çene ilişkisi ve oklüzyon düzlemi kontrollü biçimde kaydedilir." },
        { title: "Doğrula ve İlet", description: "Kayıt stabilitesi kontrol edilerek protez planlamasına aktarılır." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("impression saver"),
    profile: {
      benefits: [
        { title: "Kontrollü Dozaj", description: "İhtiyaç duyulan materyal miktarının yönetilmesine yardımcı olur." },
        { title: "Hedefli Uygulama", description: "İnce uygulama yaklaşımıyla materyalin hedef bölgeye yönlendirilmesini destekler." },
        { title: "Kartuş Uyumu", description: "Uyumlu 50 ml kartuş sistemleriyle planlı kullanım sunar." },
      ],
      conclusion:
        "Impression Saver, uyumlu ölçü materyallerinin kontrollü aktarımı ve hedefli uygulanması için yardımcı bir sistemdir.",
      note: "Kartuş, konektör ve uygulama ucu uyumluluğu kullanımdan önce doğrulanmalıdır.",
      summary:
        "Impression Saver, uyumlu kartuş sistemlerinden ölçü materyalinin kontrollü biçimde aktarılmasına ve uygulanmasına yardımcı olur.",
      template: "prosthetic",
      title: "Impression Saver Uygulama Sistemi",
      useCases: [
        "Light-body ölçü materyalinin kontrollü aktarımı",
        "Hedef bölgeye lokal materyal uygulaması",
        "Kartuş tabanlı ölçü iş akışları",
      ],
      workflow: [
        { title: "Sistemi Bağla", description: "Uyumlu konektör ve kartuş bağlantısı kontrol edilir." },
        { title: "Materyali Aktar", description: "Planlanan miktar kontrollü biçimde uygulama sistemine alınır." },
        { title: "Hedefe Uygula", description: "Materyal klinik plana göre hedef bölgeye yönlendirilir." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("smart sil bite") || identity.includes("smartsil bite"),
    profile: {
      benefits: [
        { title: "Kontrollü Akış", description: "Materyalin oklüzal yüzeylere planlı uygulanmasını destekler." },
        { title: "Kayıt Stabilitesi", description: "Sertleşme sonrasında kaydın transfer sürecinde korunmasını hedefler." },
        { title: "Net İş Akışı", description: "Uygulama, kapanış ve kontrol adımlarını sade bir sırada sunar." },
      ],
      conclusion:
        "Smart Sil Bite Registration, oklüzyon kayıtlarının kontrollü alınması ve sonraki aşamalara aktarılması için kullanılır.",
      note: "Çalışma ve sertleşme süreleri için üretici talimatları esas alınmalıdır.",
      summary:
        "Smart Sil Bite Registration, oklüzal ilişkinin kayıt altına alınmasına yönelik kartuş tabanlı bir bite registration materyalidir.",
      template: "prosthetic",
      title: "Smart Sil Bite Registration",
      useCases: [
        "Oklüzyon ve kapanış kaydı",
        "Protetik planlama için ilişki kaydı",
        "Laboratuvar aşamasına kayıt transferi",
      ],
      workflow: [
        { title: "Uygula", description: "Materyal planlanan oklüzal yüzeylere kontrollü biçimde uygulanır." },
        { title: "Kaydı Al", description: "Kapanış ilişkisi klinik protokole göre kaydedilir." },
        { title: "Kontrol Et", description: "Sertleşen kayıt bütünlük ve stabilite açısından değerlendirilir." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("xpect") && identity.includes("rvg"),
    profile: {
      benefits: [
        { title: "Dijital Görüntüleme", description: "İntraoral radyografik görüntünün dijital iş akışına aktarılmasını sağlar." },
        { title: "Yazılım Desteği", description: "Görüntü inceleme ve arşivleme adımlarını destekleyen bir çalışma ortamı sunar." },
        { title: "Sensör Seçenekleri", description: "Mevcut varyantlar klinik kullanım alanına göre değerlendirilebilir." },
      ],
      conclusion:
        "Xpect Vision RVG, görüntü edinme ve değerlendirme iş akışını dijital ortamda yapılandırmak üzere tasarlanmış bir sensör sistemidir.",
      note: "Görüntüler klinik değerlendirme yerine geçmez; cihaz ve yazılım üretici talimatlarına göre kullanılmalıdır.",
      summary:
        "Xpect Vision RVG, intraoral radyografik görüntülerin dijital olarak elde edilmesi, görüntülenmesi ve arşivlenmesi için geliştirilen sensör sistemidir.",
      template: "device",
      title: "Xpect Vision Dijital RVG Sistemi",
      useCases: [
        "İntraoral radyografik görüntüleme",
        "Klinik görüntü inceleme ve arşivleme",
        "Uyumlu yazılım üzerinden vaka dokümantasyonu",
      ],
      workflow: [
        { title: "Hazırlık", description: "Sensör, koruyucu ekipman ve görüntüleme ayarları hazırlanır." },
        { title: "Görüntü Edinimi", description: "Pozisyonlandırma ve çekim üretici protokolüne göre gerçekleştirilir." },
        { title: "İnceleme", description: "Elde edilen görüntü klinik bağlam içinde değerlendirilir ve arşivlenir." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("hulaser") || /\bk2\b/.test(identity),
    profile: {
      benefits: [
        { title: "Mobil Tasarım", description: "Cihazın klinik çalışma alanında planlı konumlandırılmasını destekler." },
        { title: "Protokol Yönetimi", description: "Uygulama parametrelerinin seçilen klinik protokole göre düzenlenmesine olanak tanır." },
        { title: "Kontrollü Kullanım", description: "Uyumlu uç ve aksesuarlarla yapılandırılmış bir cihaz iş akışı sunar." },
      ],
      conclusion:
        "Hulaser K2, eğitimli profesyonellerin belirlenen endikasyon ve üretici protokolleri kapsamında kullanımı için tasarlanmış diyot lazer sistemidir.",
      note: "Lazer güvenliği, koruyucu ekipman, eğitim ve yerel düzenlemeler kullanım öncesinde eksiksiz uygulanmalıdır.",
      summary:
        "Hulaser K2, dental kliniklerde belirlenmiş yumuşak doku ve yardımcı uygulama protokollerinde kullanılmak üzere geliştirilen mobil diyot lazer cihazıdır.",
      template: "device",
      title: "Hulaser K2 Mobil Diyot Lazer",
      useCases: [
        "Üreticinin belirttiği dental diyot lazer protokolleri",
        "Klinik iş akışında kontrollü cihaz uygulamaları",
        "Uyumlu uç ve aksesuarlarla planlanan işlemler",
      ],
      workflow: [
        { title: "Güvenlik Kontrolü", description: "Cihaz, koruyucu ekipman ve çalışma alanı hazırlanır." },
        { title: "Protokol Seçimi", description: "Endikasyona uygun parametreler ve uyumlu uç belirlenir." },
        { title: "Uygulama ve Kayıt", description: "İşlem üretici talimatlarına göre yürütülür ve gerekli kayıtlar tutulur." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("mirror suction"),
    profile: {
      benefits: [
        { title: "Birleşik Fonksiyon", description: "Görüş ve aspirasyon görevlerini aynı çalışma alanında destekler." },
        { title: "Alan Yönetimi", description: "Sıvıların uzaklaştırılması sırasında görüş alanının korunmasına yardımcı olur." },
        { title: "Kompakt Kullanım", description: "Yardımcı ekipman akışını sadeleştiren bir aksesuar yaklaşımı sunar." },
      ],
      conclusion:
        "Mirror Suction, ayna ile aspirasyon fonksiyonlarını birleştirerek klinik çalışma alanının yönetimine yardımcı olan aksesuardır.",
      note: "Bağlantı uyumu, temizlik, dezenfeksiyon ve sterilizasyon talimatları kullanımdan önce kontrol edilmelidir.",
      summary:
        "Mirror Suction, ağız içi görüntüleme ve aspirasyon işlevlerini tek aksesuar üzerinde bir araya getirir.",
      template: "accessory",
      title: "Mirror Suction Ayna ve Aspirasyon Aksesuarı",
      useCases: [
        "Ağız içi görüş alanının desteklenmesi",
        "Sıvıların eş zamanlı uzaklaştırılması",
        "Uyumlu aspirasyon sistemleriyle klinik kullanım",
      ],
      workflow: [
        { title: "Bağlantıyı Kontrol Et", description: "Aksesuarın aspirasyon sistemiyle uyumu doğrulanır." },
        { title: "Konumlandır", description: "Ayna hedef görüş alanına kontrollü biçimde yerleştirilir." },
        { title: "Görüş ve Aspirasyon", description: "İşlem boyunca görüş ve sıvı yönetimi birlikte sürdürülür." },
      ],
    },
  },
  {
    matches: (identity) => identity.includes("airjet") || identity.includes("air flow baslik"),
    profile: {
      benefits: [
        { title: "Yönlendirilmiş Akış", description: "Uyumlu sistemde hava ve profilaksi materyalinin kontrollü yönlendirilmesini destekler." },
        { title: "Başlık Formu", description: "Klinik çalışma alanına erişim için kompakt bir uygulama arayüzü sunar." },
        { title: "Bakım Uyumu", description: "Düzenli temizlik ve üretici bakım adımlarıyla planlı kullanıma uygundur." },
      ],
      conclusion:
        "AirJet Air Flow Başlık, uyumlu sistemlerle profesyonel profilaksi iş akışında kontrollü uygulama için kullanılan bir başlıktır.",
      note: "Cihaz uyumluluğu, basınç ayarı, kullanılacak materyal ve bakım prosedürü üretici talimatlarına göre doğrulanmalıdır.",
      summary:
        "AirJet Air Flow Başlık, uyumlu air-flow sistemlerinde profesyonel profilaksi uygulamalarını yönlendirmek için kullanılan klinik aksesuardır.",
      template: "accessory",
      title: "AirJet Air Flow Başlık",
      useCases: [
        "Uyumlu sistemlerle profesyonel profilaksi",
        "Klinik çalışma alanına yönlendirilmiş uygulama",
        "Üretici protokolüne uygun aksesuar değişimi",
      ],
      workflow: [
        { title: "Uyumu Doğrula", description: "Başlık, cihaz ve kullanılacak materyal uyumu kontrol edilir." },
        { title: "Sistemi Hazırla", description: "Bağlantı ve çalışma parametreleri üretici talimatına göre hazırlanır." },
        { title: "Uygula ve Temizle", description: "Uygulama tamamlandıktan sonra bakım prosedürü yürütülür." },
      ],
    },
  },
];

export function getNonJotaDescriptionModel(
  product: NonJotaDescriptionProduct,
  selectedVariant: NonJotaDescriptionVariant | null,
  selectedDescription?: string | null
): NonJotaDescriptionModel | null {
  if (isJotaBrand(product.brand)) {
    return null;
  }

  const identity = normalize(
    [product.brand, product.name, product.code, product.category?.name].filter(Boolean).join(" ")
  );
  const brand = getBrandPresentation(product.brand);
  const profile =
    SPECIFIC_PROFILES.find((candidate) => candidate.matches(identity))?.profile ??
    getGenericProfile(product, identity, selectedDescription);
  const variantCode = selectedVariant?.code.trim() || selectedVariant?.manufacturerRef?.trim();

  return {
    ...profile,
    brandLabel: brand.label,
    brandTone: brand.tone,
    logoSrc: brand.logoSrc,
    subtitle: [brand.label, getTemplateLabel(profile.template), variantCode || product.code]
      .filter(Boolean)
      .join(" · "),
  };
}

function getGenericProfile(
  product: NonJotaDescriptionProduct,
  identity: string,
  selectedDescription?: string | null
): DescriptionProfile {
  const template = detectTemplate(identity);
  const category = product.category?.name ?? "profesyonel dental kullanım";
  const summary = getPlainSummary(selectedDescription);

  if (template === "device") {
    return {
      benefits: [
        { title: "Planlı Kullanım", description: "Cihazın klinik protokole göre hazırlanmasını ve kullanılmasını destekler." },
        { title: "Teknik Uyum", description: "Uyumlu bileşen ve aksesuarlarla yapılandırılmış bir çalışma akışı sunar." },
        { title: "Klinik Dokümantasyon", description: "Uygulama ve bakım adımlarının düzenli izlenmesine yardımcı olur." },
      ],
      conclusion: `${product.name}, üretici talimatları ve uygun profesyonel eğitim çerçevesinde kullanılmak üzere sunulan bir dental cihazdır.`,
      note: "Teknik kurulum, güvenlik kontrolleri ve periyodik bakım için üretici dokümantasyonu esas alınmalıdır.",
      summary:
        summary ?? `${product.name}, ${category.toLocaleLowerCase("tr-TR")} alanında planlı klinik iş akışını destekleyen bir cihazdır.`,
      template,
      title: product.name,
      useCases: [
        `${category} kapsamındaki uygun profesyonel işlemler`,
        "Üreticinin belirttiği cihaz protokolleri",
        "Uyumlu aksesuar ve sarf malzemeleriyle kullanım",
      ],
      workflow: [
        { title: "Hazırlık", description: "Cihaz, aksesuarlar ve güvenlik kontrolleri tamamlanır." },
        { title: "Uygulama", description: "Seçilen protokol üretici parametrelerine göre yürütülür." },
        { title: "Bakım", description: "İşlem sonrası temizlik, kayıt ve bakım adımları uygulanır." },
      ],
    };
  }

  if (template === "prosthetic") {
    return {
      benefits: [
        { title: "Kontrollü Uygulama", description: "Materyal veya kayıt adımlarının planlı yürütülmesine yardımcı olur." },
        { title: "İş Akışı Uyumu", description: "Klinik ve laboratuvar aşamaları arasındaki aktarımı destekler." },
        { title: "Varyant Seçimi", description: "Mevcut seçeneklerin vaka ve materyal gereksinimine göre değerlendirilmesini sağlar." },
      ],
      conclusion: `${product.name}, protetik veya ölçü iş akışının ilgili aşamasında kontrollü kullanım alanı sunar.`,
      note: "Materyal uyumu, çalışma süresi ve uygulama tekniği için üretici talimatları kontrol edilmelidir.",
      summary:
        summary ?? `${product.name}, ${category.toLocaleLowerCase("tr-TR")} iş akışında ölçü, kayıt veya materyal uygulamasını destekler.`,
      template,
      title: product.name,
      useCases: [
        `${category} kapsamındaki uygun klinik işlemler`,
        "Protetik kayıt veya ölçü iş akışları",
        "Uyumlu materyal ve aksesuarlarla kullanım",
      ],
      workflow: [
        { title: "Hazırla", description: "Ürün ve uyumlu materyaller klinik plana göre hazırlanır." },
        { title: "Uygula", description: "İlgili ölçü veya kayıt adımı kontrollü biçimde yürütülür." },
        { title: "Kontrol Et", description: "Kayıt veya uygulama bütünlüğü sonraki aşamadan önce değerlendirilir." },
      ],
    };
  }

  return {
    benefits: [
      { title: "Pratik Kullanım", description: "Uyumlu sistem içindeki uygulama adımını sadeleştirmeye yardımcı olur." },
      { title: "Kontrollü Akış", description: "Ürünün hedeflenen işlem adımında düzenli kullanılmasını destekler." },
      { title: "Sistem Uyumu", description: "Bağlantı, ölçü ve materyal uyumunun birlikte değerlendirilmesini sağlar." },
    ],
    conclusion: `${product.name}, uyumlu sistemlerle planlı profesyonel kullanım için sunulan bir dental aksesuar veya sarf ürünüdür.`,
    note: "Sipariş ve kullanım öncesinde bağlantı, ölçü, paket içeriği ve sistem uyumluluğu doğrulanmalıdır.",
    summary:
      summary ?? `${product.name}, ${category.toLocaleLowerCase("tr-TR")} iş akışında uyumlu ekipman veya materyalle kullanılmak üzere tasarlanmıştır.`,
    template,
    title: product.name,
    useCases: [
      `${category} kapsamındaki yardımcı uygulamalar`,
      "Uyumlu dental sistemlerle profesyonel kullanım",
      "Klinik veya laboratuvar sarf akışı",
    ],
    workflow: [
      { title: "Uyumu Kontrol Et", description: "Bağlantı, ölçü ve materyal gereksinimleri doğrulanır." },
      { title: "Ürünü Hazırla", description: "Aksesuar veya sarf ürünü kullanım talimatına göre hazırlanır." },
      { title: "Uygula ve Ayır", description: "İşlem tamamlanır; tek kullanımlık veya yeniden işlenebilir ürün ayrımı yapılır." },
    ],
  };
}

function getBrandPresentation(brand: string) {
  const value = normalize(brand);

  if (value.includes("seil")) return { label: "Seil Global", logoSrc: null, tone: "seil" as const };
  if (value.includes("xpect")) return { label: "Xpect Vision", logoSrc: null, tone: "xpect" as const };
  if (value.includes("hulaser")) return { label: "Hulaser", logoSrc: null, tone: "hulaser" as const };
  if (value.includes("dentech")) {
    return { label: "DENTech Medikal", logoSrc: "/brand/dentech-logo.png", tone: "dentech" as const };
  }
  if (value.includes("voldent")) return { label: "VOLDent", logoSrc: null, tone: "voldent" as const };
  if (value.includes("brulon")) return { label: "Brulon", logoSrc: null, tone: "brulon" as const };
  if (value.includes("icrown")) return { label: "iCrown", logoSrc: null, tone: "icrown" as const };

  return { label: brand.trim() || "Dental Ürün", logoSrc: null, tone: "neutral" as const };
}

function detectTemplate(identity: string): NonJotaTemplate {
  if (/\b(rvg|lazer|laser|scanner|tarayici|cihaz|device|kamera)\b/.test(identity)) {
    return "device";
  }

  if (/\b(olcu|impression|bite registration|silikon|aljinat|tray|fork|protez)\b/.test(identity)) {
    return "prosthetic";
  }

  return "accessory";
}

function getTemplateLabel(template: NonJotaTemplate) {
  if (template === "device") return "Klinik Cihaz";
  if (template === "prosthetic") return "Ölçü ve Protetik İş Akışı";
  return "Aksesuar ve Sarf Çözümü";
}

function getPlainSummary(value: string | null | undefined) {
  const text = value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text && text.length >= 24 ? text : null;
}

function isJotaBrand(brand: string) {
  const value = normalize(brand);
  return value === "jota" || value === "jota switzerland";
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
