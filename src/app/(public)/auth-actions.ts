"use server";

import { redirect } from "next/navigation";

import {
  createDefaultProfileForUser,
  getProfileForUser,
  getPostLoginRedirect,
  isAllowedUserType,
  logAuthRedirect,
} from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
};

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logSignInError({ email, error });
    return { error: mapSignInError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum başlatılamadı. Lütfen tekrar deneyin." };
  }

  const profile = await getProfileForUser(user);
  logAuthRedirect("sign-in", profile);

  redirect(getPostLoginRedirect(profile));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = getRequiredString(formData, "full_name");
  const email = getRequiredString(formData, "email");
  const phone = getRequiredString(formData, "phone");
  const password = getRequiredString(formData, "password");
  const userTypeValue = getRequiredString(formData, "user_type");

  if (!fullName || !email || !phone || !password || !userTypeValue) {
    return { error: "Tüm alanları doldurun." };
  }

  if (!isAllowedUserType(userTypeValue)) {
    return { error: "Geçerli bir kullanıcı tipi seçin." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        user_type: userTypeValue,
      },
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

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
