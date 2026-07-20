import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import {
  getPostLoginRedirect,
  getRoutingProfileForUser,
} from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
];

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const isRecovery = requestedNext === "/reset-password" || type === "recovery";
  const supabase = await getSupabaseServerClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && isEmailOtpType(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : null;

  if (!result || result.error) {
    const failurePath = isRecovery
      ? "/reset-password?error=invalid-link"
      : "/login?error=confirmation";
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  // A successful recovery exchange has already established the session cookies.
  // Route it before profile lookup; the reset page validates that session again.
  if (isRecovery) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  const user = result.data.user ?? (await supabase.auth.getUser()).data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
  }

  const profile = await getRoutingProfileForUser(user);
  return NextResponse.redirect(new URL(getPostLoginRedirect(profile), request.url));
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));
}
