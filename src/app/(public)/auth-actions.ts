"use server";

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
};

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
