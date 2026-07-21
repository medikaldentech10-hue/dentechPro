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
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const requestedNext = searchParams.get("next");
  const callbackError = searchParams.get("error");
  const callbackErrorCode = searchParams.get("error_code");
  const callbackErrorDescription = searchParams.get("error_description");
  const isRecovery = requestedNext === "/reset-password" || type === "recovery";

  if (callbackError || callbackErrorCode || callbackErrorDescription) {
    logCallbackResult("none", "failure", {
      code: callbackErrorCode,
      name: callbackError,
    });
    return redirectToCallbackFailure(request, isRecovery);
  }

  const authCookieResponse = new NextResponse();
  const supabase = await getSupabaseServerClient((cookiesToSet) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      authCookieResponse.cookies.set(name, value, options);
    });
  });
  const strategy = code
    ? "code_exchange"
    : tokenHash && isEmailOtpType(type)
      ? "token_hash"
      : null;

  if (!strategy) {
    return NextResponse.redirect(new URL(isRecovery ? "/reset-password" : "/login", request.url));
  }

  let result;

  try {
    result =
      strategy === "code_exchange"
        ? await supabase.auth.exchangeCodeForSession(code!)
        : await supabase.auth.verifyOtp({
            token_hash: tokenHash!,
            type: type as EmailOtpType,
          });
  } catch (error) {
    logCallbackResult(strategy, "failure", getSafeErrorDetails(error));
    return redirectToCallbackFailure(request, isRecovery);
  }

  if (result.error) {
    logCallbackResult(strategy, "failure", result.error);
    return redirectToCallbackFailure(request, isRecovery);
  }

  logCallbackResult(strategy, "success");

  // A successful recovery exchange has already established the session cookies.
  // Route it before profile lookup; the reset page validates that session again.
  if (isRecovery) {
    return redirectWithAuthCookies(request, "/reset-password", authCookieResponse);
  }

  const user = result.data.user ?? (await supabase.auth.getUser()).data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const profile = await getRoutingProfileForUser(user);
  return redirectWithAuthCookies(
    request,
    getPostLoginRedirect(profile),
    authCookieResponse
  );
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));
}

function redirectToCallbackFailure(request: NextRequest, isRecovery: boolean) {
  const failurePath = isRecovery
    ? "/reset-password?error=invalid-link"
    : "/login?error=confirmation";
  return NextResponse.redirect(new URL(failurePath, request.url));
}

function redirectWithAuthCookies(
  request: NextRequest,
  path: string,
  authCookieResponse: NextResponse
) {
  return NextResponse.redirect(new URL(path, request.url), {
    headers: authCookieResponse.headers,
  });
}

function getSafeErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const value = error as { code?: unknown; name?: unknown };
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    name: typeof value.name === "string" ? value.name : undefined,
  };
}

function logCallbackResult(
  strategy: "code_exchange" | "none" | "token_hash",
  outcome: "failure" | "success",
  error?: { code?: string | null; name?: string | null }
) {
  if (outcome === "success" && process.env.NODE_ENV !== "development") {
    return;
  }

  const log = outcome === "failure" ? console.error : console.info;
  log("[auth.callback]", {
    strategy,
    outcome,
    errorCode: error?.code ?? undefined,
    errorName: error?.name ?? undefined,
  });
}
