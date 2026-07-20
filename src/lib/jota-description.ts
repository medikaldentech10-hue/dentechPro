type JotaDescriptionProduct = {
  brand: string;
  category?: { name: string } | null;
  code: string;
  name: string;
  variants: JotaDescriptionVariant[];
};

type JotaDescriptionVariant = {
  code: string;
  color?: string | null;
  connectionType: string | null;
  grit: string | null;
  manufacturerRef: string | null;
  packageQuantity?: number | null;
};

export type JotaHeaderTone =
  | "blue"
  | "green"
  | "red"
  | "black"
  | "yellow"
  | "neutral";

export type JotaDescriptionModel = {
  benefits: Array<{ description: string; title: string }>;
  clinicalUses: string[];
  headerTone: JotaHeaderTone;
  paragraph: string;
  subtitle: string;
  technicalRows: Array<{ label: string; value: string }>;
  title: string;
};

type GritProfile = "standard" | "coarse" | "super-coarse" | "fine" | "yellow" | "neutral";
type JotaProductType = "bur" | "polisher" | "unknown";
type FamilyContent = {
  clinicalUses: string[];
  form: string;
  paragraph: string;
  title: string;
};
type GritContent = {
  band: string;
  benefit: string;
  grain: string;
  wording: string;
};

const FAMILY_CONTENT: Record<string, FamilyContent> = {
  "801": {
    clinicalUses: [
      "Kavite erişimi ve yuvarlak form gerektiren preparasyon adımları",
      "Kontrollü kontur oluşturma ve lokal materyal uzaklaştırma",
      "Seçilen gren seviyesine göre genel preparasyon veya bitim işlemleri",
    ],
    form: "Yuvarlak (Round) / Figür 801",
    paragraph:
      "Yuvarlak formdaki JOTA 801 elmas frez, kavite erişimi, kontur oluşturma ve lokal preparasyon işlemlerinde kontrollü çalışma için tasarlanmıştır.",
    title: "JOTA 801 Yuvarlak Elmas Frez",
  },
  "805": {
    clinicalUses: [
      "Ters konik form gerektiren kavite ve preparasyon adımları",
      "Giriş alanlarının kontrollü genişletilmesi ve form düzenleme",
      "Seçilen gren seviyesine göre materyal uzaklaştırma veya yüzey bitirme",
    ],
    form: "Ters Konik (Inverted Cone) / Figür 805",
    paragraph:
      "Ters konik formdaki JOTA 805 elmas frez, kavite formunun düzenlenmesi, giriş alanlarının kontrollü genişletilmesi ve lokal preparasyon işlemleri için tasarlanmıştır.",
    title: "JOTA 805 Ters Konik Elmas Frez",
  },
  "830": {
    clinicalUses: [
      "Alev form gerektiren kontur ve yüzey preparasyonu",
      "Marjin çevresinde kontrollü şekillendirme ve düzeltme",
      "Seçilen gren seviyesine göre preparasyon, ön bitim veya bitim işlemleri",
    ],
    form: "Alev (Flame) / Figür 830",
    paragraph:
      "Alev formdaki JOTA 830 elmas frez, kontur oluşturma, yüzey preparasyonu ve marjin çevresinde kontrollü düzeltme işlemleri için kullanım alanı sunar.",
    title: "JOTA 830 Alev Form Elmas Frez",
  },
  "831": {
    clinicalUses: [
      "İnce alev form gerektiren hassas kontur düzenlemeleri",
      "Dar bölgelerde ön bitim ve yüzey düzeltme",
      "Marjin ve geçiş alanlarında kontrollü refinman",
    ],
    form: "Alev / İnce Form / Figür 831",
    paragraph:
      "İnce alev formdaki JOTA 831 elmas frez, dar bölgelerde hassas kontur düzenleme, ön bitim ve yüzey refinmanı işlemlerini hedefler.",
    title: "JOTA 831 İnce Alev Elmas Frez",
  },
  "833": {
    clinicalUses: [
      "Armut veya torpido form gerektiren preparasyon adımları",
      "Oklüzal kontur ve yüzey geçişlerinin düzenlenmesi",
      "Seçilen gren seviyesine göre şekillendirme veya bitim işlemleri",
    ],
    form: "Armut / Torpido / Figür 833",
    paragraph:
      "Armut ve torpido formdaki JOTA 833 elmas frez, preparasyon konturlarının oluşturulması, yüzey geçişlerinin düzenlenmesi ve kontrollü şekillendirme için uygundur.",
    title: "JOTA 833 Armut / Torpido Elmas Frez",
  },
  "835": {
    clinicalUses: [
      "Silindirik form gerektiren kavite ve yüzey preparasyonu",
      "Paralel duvar ve düz yüzeylerin kontrollü düzenlenmesi",
      "Lokal kontur oluşturma ve materyal uzaklaştırma",
    ],
    form: "Silindirik / Figür 835",
    paragraph:
      "Silindirik formdaki JOTA 835 elmas frez, düz yüzeylerin düzenlenmesi, kavite duvarlarının şekillendirilmesi ve kontrollü preparasyon işlemleri için tasarlanmıştır.",
    title: "JOTA 835 Silindirik Elmas Frez",
  },
  "837L": {
    clinicalUses: [
      "Uzun silindirik form gerektiren yüzey preparasyonu",
      "Geniş aksiyel yüzeylerde kontrollü kontur düzenleme",
      "Seçilen gren seviyesine göre genel veya hızlı preparasyon",
    ],
    form: "Uzun Silindirik / Figür 837L",
    paragraph:
      "Uzun silindirik formdaki JOTA 837L elmas frez, geniş aksiyel yüzeylerde kontrollü preparasyon, kontur düzenleme ve yüzey şekillendirme için kullanım alanı sunar.",
    title: "JOTA 837L Uzun Silindirik Elmas Frez",
  },
  "852": {
    clinicalUses: [
      "Dar alanlarda ve aproksimal bölgelerde hassas şekillendirme",
      "İnce konik form gerektiren kontur ve preparasyon adımları",
      "Seçilen gren seviyesine göre yüzey düzeltme veya bitim işlemleri",
    ],
    form: "İğne / İnce Konik / Figür 852",
    paragraph:
      "İğne ve ince konik formdaki JOTA 852 elmas frez, dar çalışma alanlarında kontur verme, hassas şekillendirme ve yüzey düzenleme işlemleri için tasarlanmıştır.",
    title: "JOTA 852 İğne Form Elmas Frez",
  },
  "859": {
    clinicalUses: [
      "Uzun iğne form gerektiren dar alan preparasyonları",
      "Aproksimal bölgelerde kontrollü kontur ve geçiş düzenleme",
      "Seçilen gren seviyesine göre preparasyon veya hassas bitim",
    ],
    form: "Uzun İğne / Figür 859",
    paragraph:
      "Uzun iğne formdaki JOTA 859 elmas frez, dar çalışma alanlarında kontrollü preparasyon, aproksimal kontur düzenleme ve yüzey geçişlerinin refinmanı için uygundur.",
    title: "JOTA 859 Uzun İğne Elmas Frez",
  },
  "859L": {
    clinicalUses: [
      "Ekstra uzun iğne form gerektiren erişimi sınırlı bölgeler",
      "Dar alanlarda kontrollü kontur ve yüzey düzenleme",
      "Seçilen gren seviyesine göre preparasyon veya hassas bitim",
    ],
    form: "Ekstra Uzun İğne / Figür 859L",
    paragraph:
      "Ekstra uzun iğne formdaki JOTA 859L elmas frez, erişimi sınırlı ve dar bölgelerde kontrollü kontur, preparasyon ve yüzey düzenleme işlemlerini hedefler.",
    title: "JOTA 859L Ekstra Uzun İğne Elmas Frez",
  },
  "868": {
    clinicalUses: [
      "İnce konik form gerektiren preparasyon ve kontur işlemleri",
      "Marjin, bevel ve geçiş alanlarının kontrollü düzenlenmesi",
      "Seçilen gren seviyesine göre şekillendirme, ön bitim veya bitim",
    ],
    form: "İnce Konik / Figür 868",
    paragraph:
      "İnce konik formdaki JOTA 868 elmas frez, kontrollü preparasyon, bevel oluşturma ve marjin ile yüzey geçişlerinin refinmanı için kullanım alanı sunar.",
    title: "JOTA 868 İnce Konik Elmas Frez",
  },
  "881": {
    clinicalUses: [
      "Silindirik düz uç form gerektiren yüzey preparasyonu",
      "Düz yüzeylerde kontur ve marjin düzenleme",
      "Seçilen gren seviyesine göre preparasyon, ön bitim veya bitim",
    ],
    form: "Silindirik Düz Uç / Figür 881",
    paragraph:
      "Silindirik düz uç formdaki JOTA 881 elmas frez, düz yüzeylerin preparasyonu, kontur düzenleme ve marjin refinmanı işlemleri için tasarlanmıştır.",
    title: "JOTA 881 Silindirik Düz Uç Elmas Frez",
  },
  Z838L: {
    clinicalUses: [
      "Zirkonya restorasyonlarda kontrollü kontur düzeltme",
      "Uzun silindirik form gerektiren yüzey ve kenar düzenlemeleri",
      "Seçilen gren seviyesine göre materyal azaltma veya yüzey bitirme",
    ],
    form: "Uzun Silindirik / Figür Z838L",
    paragraph:
      "Uzun silindirik formdaki JOTA Z838L elmas frez, zirkonya restorasyonlarda kontrollü kontur düzeltme ve yüzey düzenleme işlemleri için tasarlanmıştır.",
    title: "JOTA Z838L Zirkonya Elmas Frez",
  },
};

const GRIT_CONTENT: Record<GritProfile, GritContent> = {
  standard: {
    band: "Mavi Kuşak (Standard)",
    benefit: "Genel preparasyon adımlarında kontrollü ve dengeli materyal uzaklaştırmayı destekler.",
    grain: "Standard gren — dengeli genel preparasyon",
    wording: "Seçili standard gren, dengeli materyal uzaklaştırma ve genel preparasyon için uygundur.",
  },
  coarse: {
    band: "Yeşil Kuşak (Coarse)",
    benefit: "Daha hızlı materyal uzaklaştırma gereken preparasyon adımlarını destekler.",
    grain: "Kaba gren — hızlı materyal uzaklaştırma",
    wording: "Seçili kaba gren, daha hızlı materyal uzaklaştırma gereken preparasyon adımlarına yöneliktir.",
  },
  "super-coarse": {
    band: "Siyah Kuşak (Super Coarse)",
    benefit: "Yüksek materyal azaltma gereken işlemlerde agresif redüksiyon karakteri sunar.",
    grain: "Süper kaba gren — agresif redüksiyon",
    wording: "Seçili süper kaba gren, agresif redüksiyon ve yüksek materyal azaltma gereken adımlara yöneliktir.",
  },
  fine: {
    band: "Kırmızı Kuşak (Fine)",
    benefit: "Bitim ve ön bitim adımlarında daha kontrollü yüzey düzenlemeyi destekler.",
    grain: "İnce gren — bitim ve ön bitim",
    wording: "Seçili ince gren, bitim ve ön bitim aşamalarında kontrollü yüzey düzenleme için uygundur.",
  },
  yellow: {
    band: "Sarı Kuşak",
    benefit: "Hassas bitim adımlarında kontrollü yüzey düzenlemeyi destekler.",
    grain: "Sarı kuşak gren — hassas bitim",
    wording: "Seçili sarı kuşak gren, hassas bitim aşamalarında kontrollü yüzey düzenlemeye yöneliktir.",
  },
  neutral: {
    band: "Standart Gren",
    benefit: "Seçilen formun kontrollü kullanımına ve planlı preparasyon akışına katkı sağlar.",
    grain: "Gren bilgisi seçili varyantta belirtilmemiş",
    wording: "Gren bilgisi belirtilmeyen varyantlarda kullanım, planlanan işlem ve klinik tekniğe göre değerlendirilmelidir.",
  },
};

export function getJotaDescriptionModel(
  product: JotaDescriptionProduct,
  selectedVariant: JotaDescriptionVariant | null
): JotaDescriptionModel | null {
  if (!isJotaBrand(product.brand)) {
    return null;
  }

  const family = getJotaFamily(product, selectedVariant);
  const productType = getJotaProductType(product, selectedVariant);
  const familyContent = getFamilyContent(product, family, productType);
  const gritProfile = getGritProfile(selectedVariant);
  const gritContent = GRIT_CONTENT[gritProfile];
  const shaft = formatShaftType(selectedVariant?.connectionType);

  return {
    benefits: getBenefits(productType, gritContent, gritProfile),
    clinicalUses: familyContent.clinicalUses,
    headerTone: getHeaderTone(gritProfile),
    paragraph: `${familyContent.paragraph} ${gritContent.wording}`,
    subtitle: `Swiss Quality · ${gritContent.band} · ${shaft}`,
    technicalRows: [
      { label: "Form / Figür", value: familyContent.form },
      { label: "Ürün Kodu", value: getVariantCode(selectedVariant, product.code) },
      { label: "Gren Yapısı", value: gritContent.grain },
      { label: "Şaft Tipi", value: shaft },
      { label: "Varyant Seçenekleri", value: getVariantOptions(product.variants) },
      {
        label: "Paket İçeriği",
        value: getPackageContent(product, selectedVariant),
      },
    ],
    title: familyContent.title,
  };
}

function getFamilyContent(
  product: JotaDescriptionProduct,
  family: string,
  productType: JotaProductType
) {
  const name = normalize(product.name);

  if (family === "852" && name.includes("chamfer")) {
    return {
      clinicalUses: [
        "Chamfer form gerektiren preparasyon ve marjin düzenlemeleri",
        "Aksiyel yüzeylerde kontrollü kontur oluşturma",
        "Seçilen gren seviyesine göre preparasyon veya bitim işlemleri",
      ],
      form: "Chamfer / Figür 852",
      paragraph:
        "Chamfer formdaki JOTA 852 elmas frez, aksiyel yüzey preparasyonu, kontrollü kontur oluşturma ve chamfer marjin düzenlemeleri için kullanım alanı sunar.",
      title: "JOTA 852 Chamfer Elmas Frez",
    };
  }

  if (family === "859L" && name.includes("uzun alev")) {
    return getGenericFamilyContent(product, family, productType);
  }

  return FAMILY_CONTENT[family] ?? getGenericFamilyContent(product, family, productType);
}

function getBenefits(
  productType: JotaProductType,
  gritContent: GritContent,
  gritProfile: GritProfile
) {
  const firstBenefit =
    productType === "polisher"
      ? {
          description: getPolisherGritBenefit(gritProfile),
          title: "Kontrollü Polisaj",
        }
      : { description: gritContent.benefit, title: "Kontrollü Kesim" };

  return [
    firstBenefit,
    {
      description:
        "Üretici kullanım talimatlarına uygun devir ve basınçla stabil bir çalışma yaklaşımını destekler.",
      title: "Stabil Çalışma",
    },
    {
      description: "Form ve gren bilgisinin birlikte sunulması, doğru varyant seçimini kolaylaştırır.",
      title: "Klinik Verim",
    },
    {
      description:
        "Doğru kullanım, temizlik ve bakım protokolü ürün performansının korunmasına yardımcı olur.",
      title: "Uzun Ömür",
    },
  ];
}

function getPolisherGritBenefit(gritProfile: GritProfile) {
  const descriptions: Record<GritProfile, string> = {
    standard: "Dengeli yüzey düzeltme ve polisaj adımlarını destekler.",
    coarse: "Polisaj iş akışının ilk yüzey düzeltme adımlarına yardımcı olur.",
    "super-coarse": "Kontrollü başlangıç düzeltmesi gereken polisaj adımlarını hedefler.",
    fine: "İnce yüzey düzenleme ve bitim adımlarını destekler.",
    yellow: "Hafif ve ekstra ince bitim adımlarını destekler.",
    neutral: "Ürün sistemindeki polisaj adımına uygun kontrollü yüzey refinmanını destekler.",
  };

  return descriptions[gritProfile];
}

function getGenericFamilyContent(
  product: JotaDescriptionProduct,
  family: string,
  productType: JotaProductType
): FamilyContent {
  if (productType === "polisher") {
    const material = getPolisherMaterial(product);

    return {
      clinicalUses: [
        `${material} yüzeylerde kontrollü düzeltme ve polisaj adımları`,
        "Restorasyon konturlarının ve yüzey geçişlerinin refinmanı",
        "Ürün sistemindeki adıma göre ön polisaj, ara polisaj veya bitim işlemleri",
      ],
      form: `Polisaj / Cilalama Ucu / Aile ${family}`,
      paragraph: `JOTA ${family} polisaj ürünü, ${material.toLocaleLowerCase("tr-TR")} yüzeylerde kontrollü refinman, yüzey düzenleme ve kademeli bitim işlemleri için kullanım alanı sunar.`,
      title: getGenericTitle(product),
    };
  }

  if (productType === "bur") {
    const isZirconia = normalize(product.name).includes("zirkonya");

    return {
      clinicalUses: [
        isZirconia
          ? "Zirkonya yüzeylerde kontrollü kontur ve preparasyon"
          : "Ürün formuna uygun kontrollü preparasyon ve şekillendirme",
        "Kontur, yüzey ve geçiş alanlarının düzenlenmesi",
        "Seçilen gren seviyesine göre materyal uzaklaştırma, ön bitim veya bitim",
      ],
      form: getDetectedForm(product.name, family),
      paragraph: isZirconia
        ? `JOTA ${family} ailesi, zirkonya restorasyonlarda ürün formuna uygun kontrollü kontur, preparasyon ve yüzey düzenleme işlemleri için tasarlanmıştır.`
        : `JOTA ${family} frez ailesi, ürün formuna uygun kontrollü preparasyon, kontur oluşturma ve yüzey düzenleme işlemleri için kullanım alanı sunar.`,
      title: getGenericTitle(product),
    };
  }

  return {
    clinicalUses: [
      "Ürün formu ve teknik özelliklerine uygun profesyonel kullanım",
      "Seçili varyanta göre kontrollü çalışma adımları",
      "Planlanan işleme göre yüzey veya materyal düzenleme",
    ],
    form: `JOTA Ürün Ailesi / ${family}`,
    paragraph: `JOTA ${family} ürün ailesi, seçili varyantın form, şaft ve teknik özelliklerine uygun planlı profesyonel kullanım için yapılandırılmıştır.`,
    title: getGenericTitle(product),
  };
}

function getGenericTitle(product: JotaDescriptionProduct) {
  const baseTitle = product.name.split(/\s+[—-]\s+/)[0].trim();

  return /^jota\b/i.test(baseTitle) ? baseTitle.replace(/^jota\b/i, "JOTA") : `JOTA ${baseTitle}`;
}

function getPolisherMaterial(product: JotaDescriptionProduct) {
  const text = normalize([product.name, product.category?.name].filter(Boolean).join(" "));

  if (text.includes("zirkonya")) return "Zirkonya restorasyon";
  if (text.includes("seramik")) return "Seramik restorasyon";
  if (text.includes("kompozit")) return "Kompozit restorasyon";
  if (text.includes("metal")) return "Metal restorasyon";
  return "Restoratif materyal";
}

function getDetectedForm(productName: string, family: string) {
  const name = normalize(productName);
  const forms: Array<[string, string]> = [
    ["uzun boyunlu yuvarlak", "Uzun Boyunlu Yuvarlak"],
    ["mikro yuvarlak", "Mikro Yuvarlak"],
    ["yuvarlak", "Yuvarlak"],
    ["ters konik", "Ters Konik"],
    ["tomurcuk", "Tomurcuk"],
    ["chamfer", "Chamfer"],
    ["alev / ince form", "Alev / İnce Form"],
    ["alev / uzun konik", "Alev / Uzun Konik"],
    ["alev", "Alev"],
    ["armut / torpido", "Armut / Torpido"],
    ["mikro silindirik", "Mikro Silindirik"],
    ["uzun silindirik", "Uzun Silindirik"],
    ["yuvarlatilmis uclu silindirik", "Yuvarlatılmış Uçlu Silindirik"],
    ["silindirik duz uc", "Silindirik Düz Uç"],
    ["silindirik uzun", "Uzun Silindirik"],
    ["silindirik", "Silindirik"],
    ["disk form", "Disk Form"],
    ["extra uzun igne", "Ekstra Uzun İğne"],
    ["uzun igne", "Uzun İğne"],
    ["igne / ince konik", "İğne / İnce Konik"],
    ["uzun ince konik", "Uzun İnce Konik"],
    ["ince konik", "İnce Konik"],
    ["konik", "Konik"],
  ];
  const detected = forms.find(([keyword]) => name.includes(keyword))?.[1];

  return detected ? `${detected} / Figür ${family}` : `Frez Formu / Figür ${family}`;
}

function getJotaFamily(
  product: JotaDescriptionProduct,
  variant: JotaDescriptionVariant | null
) {
  const nameToken = getIdentityTokens(product.name).find((token) => /\d/.test(token));
  const variantToken = [variant?.code, variant?.manufacturerRef]
    .filter((value): value is string => Boolean(value))
    .flatMap(getIdentityTokens)
    .find((token) => /\d/.test(token));
  const family = normalizeFamilyToken(nameToken ?? variantToken ?? product.code);

  if (family === "838L" || family === "Z838") {
    return "Z838L";
  }

  return family || "JOTA";
}

function getIdentityTokens(value: string) {
  return value
    .replace(/^JOTA\s+/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function normalizeFamilyToken(value: string) {
  const token = value.toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9]/g, "");

  return token.replace(/(?:SG|EF)$/, "").replace(/(?<=\d|L)[FGM]$/, "");
}

function isJotaBrand(brand: string) {
  const normalized = normalize(brand);
  return normalized === "jota" || normalized === "jota switzerland";
}

function getGritProfile(variant: JotaDescriptionVariant | null): GritProfile {
  const value = normalize([variant?.color, variant?.grit, variant?.code].filter(Boolean).join(" "));

  if (
    matchesAny(value, ["black", "siyah", "super coarse", "super-coarse", "super kaba", "super-kaba", "sg", "xc"]) ||
    /(?:^|[^a-z0-9])sg(?:fg|ra|hp)(?:[^a-z0-9]|$)/.test(value)
  ) {
    return "super-coarse";
  }
  if (
    matchesAny(value, ["green", "yesil", "coarse", "kaba", "g", "c"]) ||
    /(?:^|[^a-z0-9])g(?:fg|ra|hp)(?:[^a-z0-9]|$)/.test(value)
  ) {
    return "coarse";
  }
  if (
    matchesAny(value, ["yellow", "sari", "extra ince", "extra fine", "ef", "y"]) ||
    /(?:^|[^a-z0-9])ef(?:fg|g|ra|hp)?(?:[^a-z0-9]|$)/.test(value)
  ) {
    return "yellow";
  }
  if (
    matchesAny(value, ["red", "kirmizi", "fine", "ince", "f"]) ||
    /(?:^|[^a-z0-9])f(?:fg|ra|hp)(?:[^a-z0-9]|$)/.test(value)
  ) {
    return "fine";
  }
  if (matchesAny(value, ["blue", "mavi", "standard", "standart", "m", "fg"])) return "standard";

  return "neutral";
}

function getHeaderTone(gritProfile: GritProfile): JotaHeaderTone {
  const tones: Record<GritProfile, JotaHeaderTone> = {
    standard: "blue",
    coarse: "green",
    fine: "red",
    "super-coarse": "black",
    yellow: "yellow",
    neutral: "neutral",
  };

  return tones[gritProfile];
}

function matchesAny(value: string, terms: string[]) {
  const tokens = value.split(/[^a-z0-9]+/).filter(Boolean);
  return terms.some((term) =>
    term.includes(" ") || term.includes("-") ? value.includes(term) : tokens.includes(term)
  );
}

function formatShaftType(value: string | null | undefined) {
  const rawShaft = value?.trim().toLocaleUpperCase("tr-TR");
  const shaft = rawShaft?.match(/^(?:SG|EF|G|F)?(FG|RA|HP)$/)?.[1] ?? rawShaft;
  return shaft ? `${shaft} Şaft` : "Şaft tipi belirtilmemiş";
}

function getVariantCode(variant: JotaDescriptionVariant | null, fallback: string) {
  return variant?.code.trim() || variant?.manufacturerRef?.trim() || fallback.trim() || "Belirtilmemiş";
}

function getVariantOptions(variants: JotaDescriptionVariant[]) {
  const options = [...new Set(variants.map((variant) => GRIT_CONTENT[getGritProfile(variant)].band))];
  return options.length ? options.join(", ") : "Gren seçeneği belirtilmemiş";
}

function getPackageContent(
  product: JotaDescriptionProduct,
  variant: JotaDescriptionVariant | null
) {
  const explicitQuantity = variant?.packageQuantity;
  const productType = getJotaProductType(product, variant);

  // `1` is commonly a catalog default rather than pack evidence. Preserve explicit
  // multi-piece quantities; otherwise use conservative JOTA category conventions.
  if (Number.isInteger(explicitQuantity) && Number(explicitQuantity) > 1) {
    return `${explicitQuantity} Adet Orijinal JOTA`;
  }

  if (productType === "polisher") {
    return "2 Adet Orijinal JOTA";
  }

  if (productType === "bur") {
    return "5 Adet Orijinal JOTA";
  }

  if (Number.isInteger(explicitQuantity) && Number(explicitQuantity) === 1) {
    return "1 Adet Orijinal JOTA";
  }

  return "Paket içeriği belirtilmemiş";
}

function getJotaProductType(
  product: JotaDescriptionProduct,
  variant: JotaDescriptionVariant | null
): JotaProductType {
  const text = normalize(
    [
      product.name,
      product.category?.name,
      product.code,
      variant?.code,
      variant?.manufacturerRef,
      variant?.connectionType,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (/\b(polisher|polisaj|cila|cilalama)\b/.test(text)) {
    return "polisher";
  }

  if (
    /\b(frez|bur|diamond|elmas|friction grip)\b/.test(text) ||
    /(?:^|[^a-z0-9])(fg|ra)(?:[^a-z0-9]|$)/.test(text)
  ) {
    return "bur";
  }

  return "unknown";
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}
