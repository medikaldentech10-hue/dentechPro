import type {
  Profile,
  RequestedRole,
  UserRole,
  UserType,
  VerificationStatus,
} from "@/lib/types/auth";

export type AdminUsersFilterKey =
  | "all"
  | "pending"
  | "doctor"
  | "lab"
  | "vet"
  | "sales"
  | "admin"
  | "suspended";

export const adminUsersFilterOptions: Array<{
  key: AdminUsersFilterKey;
  label: string;
}> = [
  { key: "all", label: "Tümü" },
  { key: "pending", label: "Onay Bekleyen" },
  { key: "doctor", label: "Hekimler" },
  { key: "lab", label: "Laboratuvarlar" },
  { key: "vet", label: "Veterinerler" },
  { key: "sales", label: "Saha" },
  { key: "admin", label: "Admin" },
  { key: "suspended", label: "Askıya Alınan" },
];

export function isPendingReview(profile: Profile) {
  return (
    profile.verification_status === "pending" || profile.role === "pending_user"
  );
}

export function isProfessionalCustomerProfile(profile: Profile) {
  if (
    profile.role === "approved_doctor" ||
    profile.role === "approved_lab" ||
    profile.role === "approved_vet"
  ) {
    return true;
  }

  if (
    profile.role === "pending_user" ||
    profile.role === "suspended_user" ||
    profile.verification_status === "pending" ||
    profile.verification_status === "suspended"
  ) {
    return (
      profile.requested_role === "doctor" ||
      profile.requested_role === "lab" ||
      profile.requested_role === "vet" ||
      profile.user_type === "doctor" ||
      profile.user_type === "lab" ||
      profile.user_type === "vet"
    );
  }

  return false;
}

export function matchesAdminUserFilter(
  profile: Profile,
  filter: AdminUsersFilterKey
) {
  switch (filter) {
    case "pending":
      return isPendingReview(profile);
    case "doctor":
      return profile.role === "approved_doctor";
    case "lab":
      return profile.role === "approved_lab";
    case "vet":
      return profile.role === "approved_vet";
    case "sales":
      return profile.role === "sales_rep";
    case "admin":
      return profile.role === "admin";
    case "suspended":
      return (
        profile.role === "suspended_user" ||
        profile.verification_status === "suspended"
      );
    default:
      return true;
  }
}

export function filterAdminUsers({
  filter,
  professionalOnly,
  profiles,
  search,
}: {
  filter: AdminUsersFilterKey;
  professionalOnly?: boolean;
  profiles: Profile[];
  search?: string;
}) {
  const query = normalizeAdminUserSearch(search ?? "");

  return profiles.filter((profile) => {
    if (professionalOnly && !isProfessionalCustomerProfile(profile)) {
      return false;
    }

    if (filter !== "all" && !matchesAdminUserFilter(profile, filter)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = normalizeAdminUserSearch(
      [
        profile.full_name,
        profile.email,
        profile.phone,
        profile.clinic_name,
        profile.company_name,
        profile.city,
        profile.district,
        profile.specialty,
        getRoleLabel(profile.role),
        getRequestedRoleLabel(profile.requested_role),
        getRequestedRoleLabel(profile.user_type),
        getStatusLabel(profile.verification_status),
        getUserTypeDescription(profile.user_type),
      ]
        .filter(Boolean)
        .join(" ")
    );

    return haystack.includes(query);
  });
}

export function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: "Admin",
    approved_doctor: "Hekim",
    approved_lab: "Laboratuvar",
    approved_vet: "Veteriner",
    pending_user: "Onay Bekliyor",
    sales_rep: "Saha Temsilcisi",
    suspended_user: "Askıya Alındı",
  };

  return labels[role];
}

export function getRequestedRoleLabel(value: RequestedRole | UserType | null) {
  const labels: Partial<Record<UserType, string>> = {
    admin: "Admin",
    doctor: "Hekim",
    lab: "Laboratuvar",
    other: "Genel Başvuru",
    sales: "Saha Temsilcisi",
    vet: "Veteriner",
  };

  return value ? labels[value] ?? "Belirtilmedi" : "Belirtilmedi";
}

export function getRequestedRoleDisplay(profile: Profile) {
  if (profile.requested_role) {
    return `${getRequestedRoleLabel(profile.requested_role)} Başvurusu`;
  }

  if (profile.user_type) {
    return `${getRequestedRoleLabel(profile.user_type)} Başvurusu`;
  }

  return "Başvuru tipi belirtilmedi";
}

export function getUserTypeDescription(userType: UserType | null) {
  const descriptions: Partial<Record<UserType, string>> = {
    admin: "Operasyon yetkisine sahip hesap",
    doctor: "Klinik / hekim kullanıcısı",
    lab: "Laboratuvar kullanıcısı",
    other: "Ek doğrulama gerektirebilecek kayıt tipi",
    sales: "Saha operasyon hesabı",
    vet: "Veteriner kullanıcı",
  };

  return descriptions[userType ?? "other"] ?? "Kayıt tipi belirtilmedi";
}

export function getStatusLabel(status: VerificationStatus) {
  const labels: Record<VerificationStatus, string> = {
    approved: "Onaylı",
    pending: "Onay Bekliyor",
    rejected: "Reddedildi",
    suspended: "Askıya Alındı",
  };

  return labels[status];
}

export function formatAdminUserLocation(
  city: string | null,
  district: string | null
) {
  if (city && district) {
    return `${district} / ${city}`;
  }

  if (city) {
    return city;
  }

  if (district) {
    return district;
  }

  return "Belirtilmedi";
}

export function normalizeAdminUserSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function formatAdminUserDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function escapeCsvValue(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  const escaped = normalized.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export function buildAdminUsersCsv(profiles: Profile[]) {
  const header = [
    "Ad Soyad / Yetkili",
    "E-posta",
    "Telefon",
    "Kullanıcı Tipi",
    "Mevcut Rol",
    "Talep Edilen Rol",
    "Klinik Adı",
    "Firma / Laboratuvar Adı",
    "İl",
    "İlçe",
    "Uzmanlık",
    "Durum",
    "Kayıt Tarihi",
  ];

  const rows = profiles.map((profile) => [
    profile.full_name ?? "",
    profile.email ?? "",
    profile.phone ?? "",
    getUserTypeDescription(profile.user_type),
    getRoleLabel(profile.role),
    getRequestedRoleDisplay(profile),
    profile.clinic_name ?? "",
    profile.company_name ?? "",
    profile.city ?? "",
    profile.district ?? "",
    profile.specialty ?? "",
    getStatusLabel(profile.verification_status),
    formatAdminUserDate(profile.created_at),
  ]);

  return [header, ...rows]
    .map((columns) => columns.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}
