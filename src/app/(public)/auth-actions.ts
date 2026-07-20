"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  createDefaultProfileForUser,
  getPostLoginRedirect,
  getRoutingProfileForUser,
  isAllowedUserType,
  logAuthRedirect,
  type RegistrationProfileFields,
} from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { RegistrationUserType } from "@/lib/types/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const FORGOT_PASSWORD_SUCCESS =
  "Eğer bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.";
const DEFAULT_PRODUCTION_SITE_URL = "https://dentech-pro.vercel.app";

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const startedAt = performance.now();
  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logSignInError({ email, error });
    return { error: mapSignInError(error.message) };
  }

  const user = data.user;

  if (!user) {
    return { error: "Oturum başlatılamadı. Lütfen tekrar deneyin." };
  }

  const profile = await getRoutingProfileForUser(user);
  logAuthRedirect("sign-in", profile);
  logAuthPerf("login.action", {
    durationMs: Math.round(performance.now() - startedAt),
    redirectTarget: getPostLoginRedirect(profile),
    role: profile.role,
  });

  redirect(getPostLoginRedirect(profile));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const registration = parseRegistrationFormData(formData);

  if ("error" in registration) {
    return { error: registration.error };
  }

  const { email, password, profileFields } = registration;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profileFields,
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: "Kayıt talebi oluşturulamadı. E-posta adresini kontrol edin." };
  }

  if (data.user) {
    await createDefaultProfileForUser(data.user);
  }

  redirect("/pending-approval");
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = getRequiredString(formData, "email");

  if (!isValidEmail(email)) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }

  const supabase = await getSupabaseServerClient();
  try {
    const siteUrl = await getPasswordResetSiteUrl();
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error && process.env.NODE_ENV === "development") {
      console.warn("[auth.passwordReset.request]", {
        message: error.message,
        name: error.name,
        status: error.status,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth.passwordReset.request]", {
        message: error instanceof Error ? error.message : "unknown-error",
      });
    }
  }

  return { success: FORGOT_PASSWORD_SUCCESS };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validation = validateNewPassword(formData);

  if (validation.error) {
    return validation;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş." };
  }

  const { error } = await supabase.auth.updateUser({
    password: validation.password,
  });

  if (error) {
    return { error: "Şifre güncellenemedi. Bağlantıyı yeniden isteyip tekrar deneyin." };
  }

  await supabase.auth.signOut();
  redirect("/login?status=password-updated");
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validation = validateNewPassword(formData);

  if (validation.error) {
    return validation;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Şifrenizi değiştirmek için giriş yapın." };
  }

  const { error } = await supabase.auth.updateUser({
    password: validation.password,
  });

  if (error) {
    return { error: "Şifre güncellenemedi. Lütfen tekrar deneyin." };
  }

  return { success: "Şifreniz başarıyla güncellendi." };
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

function parseRegistrationFormData(
  formData: FormData
):
  | {
      email: string;
      password: string;
      profileFields: RegistrationProfileFields;
    }
  | { error: string } {
  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");
  const fullName = getRequiredString(formData, "full_name");
  const phone = getRequiredString(formData, "phone");
  const userTypeValue = getRequiredString(formData, "user_type");
  const city = getRequiredString(formData, "city");
  const district = getRequiredString(formData, "district");
  const clinicName = getRequiredString(formData, "clinic_name");
  const companyName = getRequiredString(formData, "company_name");
  const specialty = getOptionalString(formData, "specialty");

  if (!email || !password || !fullName || !phone || !userTypeValue || !city || !district) {
    return { error: "Zorunlu alanları doldurun." };
  }

  if (!isAllowedUserType(userTypeValue)) {
    return { error: "Geçerli bir kullanıcı tipi seçin." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const organizationValidation = validateOrganizationFields({
    clinicName,
    companyName,
    userType: userTypeValue,
  });

  if (organizationValidation) {
    return { error: organizationValidation };
  }

  return {
    email,
    password,
    profileFields: {
      city,
      clinic_name: clinicName || null,
      company_name: companyName || null,
      district,
      full_name: fullName,
      phone,
      requested_role: userTypeValue,
      specialty,
      user_type: userTypeValue,
    },
  };
}

function validateOrganizationFields({
  clinicName,
  companyName,
  userType,
}: {
  clinicName: string;
  companyName: string;
  userType: RegistrationUserType;
}) {
  if (userType === "lab" && !companyName) {
    return "Laboratuvar adı zorunludur.";
  }

  if ((userType === "doctor" || userType === "vet") && !clinicName) {
    return "Klinik adı zorunludur.";
  }

  return null;
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value || null;
}

function validateNewPassword(formData: FormData):
  | { error: string; password?: never }
  | { error?: never; password: string } {
  const password = getRequiredString(formData, "password");
  const confirmation = getRequiredString(formData, "password_confirmation");

  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalıdır." };
  }

  if (password !== confirmation) {
    return { error: "Şifreler eşleşmiyor." };
  }

  return { password };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getPasswordResetSiteUrl() {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredSiteUrl) {
    return new URL(configuredSiteUrl).origin;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_SITE_URL;
  }

  return getRequestOrigin();
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return new URL(origin).origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!host) {
    throw new Error("Auth redirect origin could not be determined.");
  }

  return new URL(`${protocol}://${host}`).origin;
}

function logSignInError({
  email,
  error,
}: {
  email: string;
  error: { name: string; message: string; status?: number };
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn("[auth.signInWithPassword]", {
    email,
    name: error.name,
    message: error.message,
    status: error.status,
  });
}

function mapSignInError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "E-posta adresi henüz doğrulanmamış.";
  }

  if (normalizedMessage.includes("user not found")) {
    return "Bu e-posta ile kayıtlı kullanıcı bulunamadı.";
  }

  if (normalizedMessage.includes("email logins are disabled")) {
    return "E-posta ile giriş şu anda devre dışı.";
  }

  return "Giriş sırasında beklenmeyen bir hata oluştu.";
}

function logAuthPerf(event: string, payload: Record<string, unknown>) {
  if (process.env.DENTECH_PERF_LOGS !== "true") {
    return;
  }

  console.info(`[${event}]`, payload);
}
