import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  let response = NextResponse.next({
    request,
  });
  const hasAuthCookies = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

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

  await supabase.auth.getUser();
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/dashboard/:path*",
    "/request/:path*",
  ],
};
