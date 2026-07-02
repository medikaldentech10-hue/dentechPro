import { NextResponse } from "next/server";

import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getAdminRequestDetail } from "@/lib/admin-requests";
import { createAdminRequestQuotePdf } from "@/lib/admin-request-pdf";
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

    const { id } = await params;
    const requestDetail = await getAdminRequestDetail(id);

    if (!requestDetail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdf = await createAdminRequestQuotePdf(requestDetail);
    const fileName = `dentech-teklif-${getRequestDisplayNumber(requestDetail)}.pdf`;

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
