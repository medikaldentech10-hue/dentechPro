import type { Profile } from "@/lib/types/auth";

export type HeaderAuthState = {
  href: string;
  isAuthenticated: boolean;
  label: string;
  showRequestList: boolean;
};

export function getHeaderAuthState(profile: Profile | null): HeaderAuthState {
  if (!profile) {
    return {
      href: "/login",
      isAuthenticated: false,
      label: "Giriş Yap",
      showRequestList: false,
    };
  }

  if (!profile.is_active || profile.role === "suspended_user") {
    return {
      href: "/account-suspended",
      isAuthenticated: true,
      label: "Hesap Askıda",
      showRequestList: false,
    };
  }

  if (profile.role === "admin") {
    return {
      href: "/admin",
      isAuthenticated: true,
      label: "Admin Paneli",
      showRequestList: true,
    };
  }

  if (profile.role === "sales_rep") {
    return {
      href: "/sales",
      isAuthenticated: true,
      label: "Saha Paneli",
      showRequestList: true,
    };
  }

  if (
    profile.role === "approved_doctor" ||
    profile.role === "approved_lab" ||
    profile.role === "approved_vet"
  ) {
    return {
      href: "/dashboard",
      isAuthenticated: true,
      label: "Panelim",
      showRequestList: true,
    };
  }

  return {
    href: "/pending-approval",
    isAuthenticated: true,
    label: "Onay Bekleniyor",
    showRequestList: false,
  };
}
