import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { allowedUserTypes } from "@/lib/auth-options";
import type {
  Profile,
  PublicRole,
  RegistrationUserType,
  RequestedRole,
  UserRole,
} from "@/lib/types/auth";

export type RegistrationProfileFields = {
  city: string;
  clinic_name: string | null;
  company_name: string | null;
  district: string;
  full_name: string;
  phone: string;
  requested_role: RequestedRole;
  specialty: string | null;
  user_type: RegistrationUserType;
};

export const approvedUserRoles: readonly UserRole[] = [
  "approved_doctor",
  "approved_lab",
  "approved_vet",
] as const;

export const priceVisibleRoles: readonly UserRole[] = [
  "admin",
  "sales_rep",
  "approved_doctor",
  "approved_lab",
  "approved_vet",
] as const;

export function isAllowedUserType(value: string): value is RegistrationUserType {
  return allowedUserTypes.includes(value as RegistrationUserType);
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    logAuthDebug("profile.read", {
      fallbackCreated: false,
      profileFound: false,
      reason: "no-auth-user",
    });
    return null;
  }

  return getProfileForUser(user);
}

export async function getUserRole(): Promise<PublicRole> {
  const profile = await getCurrentProfile();
  return profile?.role ?? "public";
}

export function canViewPrices(profile: Profile | null) {
  return Boolean(
    profile?.is_active &&
      profile.can_view_prices &&
      priceVisibleRoles.includes(profile.role)
  );
}

export function isAdmin(profile: Profile | null) {
  return profile?.is_active === true && profile.role === "admin";
}

export function isSalesRep(profile: Profile | null) {
  return profile?.is_active === true && profile.role === "sales_rep";
}

export function isApprovedUser(profile: Profile | null) {
  return Boolean(profile?.is_active && approvedUserRoles.includes(profile.role));
}

export function isPendingUser(profile: Profile | null) {
  return (
    profile?.is_active === true &&
    profile.role === "pending_user" &&
    profile.verification_status === "pending"
  );
}

export function isSuspendedUser(profile: Profile | null) {
  return (
    profile?.is_active === false ||
    profile?.role === "suspended_user" ||
    profile?.verification_status === "suspended"
  );
}

export function getPostLoginRedirect(profile: Profile | null) {
  if (isSuspendedUser(profile)) {
    return "/account-suspended";
  }

  if (isAdmin(profile)) {
    return "/admin";
  }

  if (isSalesRep(profile)) {
    return "/sales";
  }

  if (isApprovedUser(profile)) {
    return "/dashboard";
  }

  return "/pending-approval";
}

export function logAuthRedirect(context: string, profile: Profile | null) {
  logAuthDebug("redirect", {
    context,
    profileFound: Boolean(profile),
    redirectTarget: getPostLoginRedirect(profile),
    role: profile?.role,
    userId: profile?.id,
  });
}

export async function requireAdmin() {
  const profile = await requireActiveProfile();

  if (!isAdmin(profile)) {
    const redirectTarget = getPostLoginRedirect(profile);
    logAuthDebug("route.guard", {
      guard: "admin",
      profileFound: true,
      redirectTarget,
      role: profile.role,
      userId: profile.id,
    });
    redirect(redirectTarget);
  }

  return profile;
}

export async function requireSalesAccess() {
  const profile = await requireActiveProfile();

  if (!isSalesRep(profile) && !isAdmin(profile)) {
    const redirectTarget = getPostLoginRedirect(profile);
    logAuthDebug("route.guard", {
      guard: "sales",
      profileFound: true,
      redirectTarget,
      role: profile.role,
      userId: profile.id,
    });
    redirect(redirectTarget);
  }

  return profile;
}

export async function requireDashboardAccess() {
  const profile = await requireActiveProfile();

  if (!isApprovedUser(profile) && !isSalesRep(profile) && !isAdmin(profile)) {
    const redirectTarget = getPostLoginRedirect(profile);
    logAuthDebug("route.guard", {
      guard: "dashboard",
      profileFound: true,
      redirectTarget,
      role: profile.role,
      userId: profile.id,
    });
    redirect(redirectTarget);
  }

  return profile;
}

async function requireActiveProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    logAuthDebug("route.guard", {
      profileFound: false,
      redirectTarget: "/login",
    });
    redirect("/login");
  }

  if (isSuspendedUser(profile)) {
    logAuthDebug("route.guard", {
      profileFound: true,
      redirectTarget: "/account-suspended",
      role: profile.role,
      userId: profile.id,
    });
    redirect("/account-suspended");
  }

  return profile;
}

export async function getProfileForUser(user: User) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    logAuthDebug("profile.read", {
      fallbackCreated: false,
      profileFound: true,
      role: data.role,
      userId: user.id,
    });
    return data;
  }

  logAuthDebug("profile.read", {
    fallbackCreated: false,
    profileFound: false,
    userId: user.id,
  });

  return createDefaultProfileForUser(user);
}

export async function createDefaultProfileForUser(user: User) {
  const admin = getSupabaseAdminClient();
  const metadata = user.user_metadata;
  const submittedUserType = String(metadata.user_type ?? "other");
  const userType = isAllowedUserType(submittedUserType)
    ? submittedUserType
    : "other";
  const requestedRole = normalizeRequestedRole(metadata.requested_role, userType);

  const profile: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: user.id,
    full_name: nullableString(metadata.full_name),
    email: user.email ?? nullableString(metadata.email),
    phone: nullableString(metadata.phone),
    requested_role: requestedRole,
    clinic_name: nullableString(metadata.clinic_name),
    company_name: nullableString(metadata.company_name),
    city: nullableString(metadata.city),
    district: nullableString(metadata.district),
    specialty: nullableString(metadata.specialty),
    role: "pending_user",
    user_type: userType,
    verification_status: "pending",
    can_view_prices: false,
    is_active: true,
  };

  const { data, error } = await admin
    .from("profiles")
    .insert(profile)
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingProfileError) {
      throw new Error(existingProfileError.message);
    }

    logAuthDebug("profile.create-fallback", {
      fallbackCreated: false,
      profileFound: true,
      reason: "insert-conflict-return-existing",
      role: existingProfile.role,
      userId: user.id,
    });

    return existingProfile;
  }

  if (error) {
    throw new Error(error.message);
  }

  logAuthDebug("profile.create-fallback", {
    fallbackCreated: true,
    profileFound: true,
    role: data.role,
    userId: user.id,
  });

  return data;
}

function normalizeRequestedRole(
  value: unknown,
  fallback: RegistrationUserType
): RequestedRole {
  if (typeof value === "string" && isAllowedUserType(value)) {
    return value;
  }

  return fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function logAuthDebug(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[auth.${event}]`, payload);
}
