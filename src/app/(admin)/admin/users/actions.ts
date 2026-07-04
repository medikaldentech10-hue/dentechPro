"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile, UserRole, VerificationStatus } from "@/lib/types/auth";

type ReviewIntent =
  | "approve_doctor"
  | "approve_lab"
  | "approve_vet"
  | "approve_sales_rep"
  | "reject"
  | "suspend"
  | "reactivate";

type ProfilePatch = Database["public"]["Tables"]["profiles"]["Update"];

const reviewConfig: Record<
  ReviewIntent,
  {
    patch: ProfilePatch;
    approvalStatus: VerificationStatus;
    auditAction:
      | "user_approved"
      | "user_rejected"
      | "user_suspended"
      | "user_role_changed";
  }
> = {
  approve_doctor: {
    patch: activeProfilePatch("approved_doctor"),
    approvalStatus: "approved",
    auditAction: "user_approved",
  },
  approve_lab: {
    patch: activeProfilePatch("approved_lab"),
    approvalStatus: "approved",
    auditAction: "user_approved",
  },
  approve_vet: {
    patch: activeProfilePatch("approved_vet"),
    approvalStatus: "approved",
    auditAction: "user_approved",
  },
  approve_sales_rep: {
    patch: activeProfilePatch("sales_rep"),
    approvalStatus: "approved",
    auditAction: "user_role_changed",
  },
  reject: {
    patch: {
      role: "pending_user",
      verification_status: "rejected",
      can_view_prices: false,
      is_active: false,
    },
    approvalStatus: "rejected",
    auditAction: "user_rejected",
  },
  suspend: {
    patch: {
      role: "suspended_user",
      verification_status: "suspended",
      can_view_prices: false,
      is_active: false,
    },
    approvalStatus: "suspended",
    auditAction: "user_suspended",
  },
  reactivate: {
    patch: {
      role: "pending_user",
      verification_status: "pending",
      can_view_prices: false,
      is_active: true,
    },
    approvalStatus: "pending",
    auditAction: "user_role_changed",
  },
};

export async function reviewUserAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const targetUserId = getString(formData, "user_id");
  const intentValue = getString(formData, "intent");
  const note = getString(formData, "note") || null;

  if (!targetUserId || !isReviewIntent(intentValue)) {
    throw new Error("Geçersiz kullanıcı yönetimi işlemi.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: oldProfile, error: oldProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (oldProfileError) {
    throw new Error(oldProfileError.message);
  }

  const config = reviewConfig[intentValue];
  const { data: newProfile, error: updateError } = await supabase
    .from("profiles")
    .update(config.patch)
    .eq("id", targetUserId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: approvalError } = await supabase.from("user_approvals").insert({
    user_id: targetUserId,
    reviewed_at: new Date().toISOString(),
    reviewed_by_user_id: adminProfile.id,
    note,
    status: config.approvalStatus,
  });

  if (approvalError) {
    throw new Error(approvalError.message);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: adminProfile.id,
    action: config.auditAction,
    entity_type: "profile",
    entity_id: targetUserId,
    old_value: toJson(oldProfile),
    new_value: toJson(newProfile),
  });

  if (auditError) {
    throw new Error(auditError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

function activeProfilePatch(role: UserRole): ProfilePatch {
  return {
    role,
    verification_status: "approved",
    can_view_prices: true,
    is_active: true,
  };
}

function isReviewIntent(value: string): value is ReviewIntent {
  return value in reviewConfig;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toJson(value: Profile): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
