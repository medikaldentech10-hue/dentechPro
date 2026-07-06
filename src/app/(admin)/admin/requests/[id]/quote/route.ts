import { NextResponse } from "next/server";

import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getAdminRequestDetail } from "@/lib/admin-requests";
import { createAdminRequestQuotePdf } from "@/lib/admin-request-pdf";
import {
  assertRateLimit,
  isRateLimitExceededError,
  logRateLimitBlockedAttempt,
  RATE_LIMIT_POLICIES,
  recordRateLimitEvent,
} from "@/lib/rate-limit";
import { getRequestDisplayNumber } from "@/lib/request-numbers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuoteRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: QuoteRouteProps) {
  try {
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(profile) || profile.verification_status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await assertRateLimit({
        policy: RATE_LIMIT_POLICIES.adminQuotePdfDownload,
        userId: profile.id,
      });
    } catch (error) {
      if (isRateLimitExceededError(error)) {
        await logRateLimitBlockedAttempt({
          action: RATE_LIMIT_POLICIES.adminQuotePdfDownload.action,
          metadata: null,
          reason: error.reason,
          userId: profile.id,
        });

        return NextResponse.json(
          {
            error:
              "Çok fazla PDF indirme denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.",
          },
          {
            headers: {
              "Retry-After": String(error.retryAfterSeconds),
            },
            status: 429,
          }
        );
      }

      throw error;
    }

    const { id } = await params;
    const requestDetail = await getAdminRequestDetail(id);

    if (!requestDetail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdf = await createAdminRequestQuotePdf(requestDetail);
    const fileName = `dentech-teklif-${getRequestDisplayNumber(requestDetail)}.pdf`;
    await recordRateLimitEvent({
      action: RATE_LIMIT_POLICIES.adminQuotePdfDownload.action,
      metadata: {
        request_id: requestDetail.id,
        request_number: getRequestDisplayNumber(requestDetail),
      },
      userId: profile.id,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("[admin.request.quote]", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "PDF oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
