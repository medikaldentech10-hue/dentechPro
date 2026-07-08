import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  let response = NextResponse.next({
    request,
  });
  const authCookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  const hasAuthCookies = authCookies.length > 0;

  if (!hasAuthCookies) {
    logProxyPerf({
      durationMs: Math.round(performance.now() - startedAt),
      path: request.nextUrl.pathname,
      refreshedSession: false,
      reason: "no-auth-cookie",
    });
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch (error) {
    if (isExpiredSessionError(error)) {
      clearAuthCookies(request, response, authCookies.map((cookie) => cookie.name));
      logProxyPerf({
        durationMs: Math.round(performance.now() - startedAt),
        path: request.nextUrl.pathname,
        refreshedSession: false,
        reason: "expired-session",
      });
      logExpiredSessionDebug(request.nextUrl.pathname);
      return response;
    }

    throw error;
  }
  logProxyPerf({
    durationMs: Math.round(performance.now() - startedAt),
    path: request.nextUrl.pathname,
    refreshedSession: true,
  });

  return response;
}

function logProxyPerf(payload: Record<string, unknown>) {
  if (process.env.DENTECH_PERF_LOGS !== "true") {
    return;
  }

  console.info("[proxy]", payload);
}

function clearAuthCookies(
  request: NextRequest,
  response: NextResponse,
  cookieNames: string[]
) {
  for (const name of cookieNames) {
    request.cookies.delete(name);
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
    });
  }
}

function isExpiredSessionError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const details =
    typeof error === "object" && error !== null ? JSON.stringify(error) : "";
  const haystack = `${message} ${details}`.toLocaleLowerCase("en-US");

  return (
    haystack.includes("invalid refresh token") ||
    haystack.includes("refresh token not found") ||
    haystack.includes("refresh_token_not_found")
  );
}

function logExpiredSessionDebug(path: string) {
  if (process.env.DENTECH_PERF_LOGS !== "true") {
    return;
  }

  console.info("[auth.session.expired]", { path });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/dashboard/:path*",
    "/request/:path*",
  ],
};
