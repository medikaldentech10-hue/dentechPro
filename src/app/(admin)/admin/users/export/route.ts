import { NextResponse } from "next/server";

import { getCurrentProfile, isAdmin } from "@/lib/auth";
import {
  buildAdminUsersCsv,
  filterAdminUsers,
  type AdminUsersFilterKey,
} from "@/lib/admin-users";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();

  if (!isAdmin(profile)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams.get("filter"));
  const query = searchParams.get("q")?.trim() ?? "";
  const professionalOnly = filter === "all";

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const filteredProfiles = filterAdminUsers({
    filter,
    professionalOnly,
    profiles: (data ?? []) as Profile[],
    search: query,
  });

  const csv = buildAdminUsersCsv(filteredProfiles);
  const fileName = `dentech-musteriler-${formatDateToken(new Date())}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseFilter(value: string | null): AdminUsersFilterKey {
  if (
    value === "pending" ||
    value === "doctor" ||
    value === "lab" ||
    value === "vet" ||
    value === "sales" ||
    value === "admin" ||
    value === "suspended"
  ) {
    return value;
  }

  return "all";
}

function formatDateToken(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}
