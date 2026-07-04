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

export type UpdateUserProfileActionState = {
  error?: string;
  success?: string;
};

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

export async function updateUserProfileAction(
  _previousState: UpdateUserProfileActionState,
  formData: FormData
): Promise<UpdateUserProfileActionState> {
  const adminProfile = await requireAdmin();
  const userId = getString(formData, "user_id");

  if (!userId) {
    return { error: "Güncellenecek kullanıcı bulunamadı." };
  }

  const patch = parseProfilePatch(formData);

  if ("error" in patch) {
    return patch;
  }

  const supabase = getSupabaseAdminClient();
  const { data: oldProfile, error: oldProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (oldProfileError) {
    return { error: oldProfileError.message };
  }

  const { data: newProfile, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  const changes = summarizeProfileChanges(oldProfile, newProfile);

  if (Object.keys(changes).length > 0) {
    const { error: auditError } = await supabase.from("audit_logs").insert({
      action: "profile_updated",
      entity_id: userId,
      entity_type: "profile",
      new_value: toJson(changes),
      user_id: adminProfile.id,
    });

    if (auditError) {
      return { error: auditError.message };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");

  return { success: "Profil bilgileri güncellendi." };
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

function getNullableString(formData: FormData, key: string, maxLength: number) {
  const value = getString(formData, key);

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new Error(`${key} alanı çok uzun.`);
  }

  return value;
}

function parseProfilePatch(
  formData: FormData
): ProfilePatch | UpdateUserProfileActionState {
  try {
    const fullName = getNullableString(formData, "full_name", 120);
    const phone = getNullableString(formData, "phone", 40);
    const clinicName = getNullableString(formData, "clinic_name", 160);
    const companyName = getNullableString(formData, "company_name", 160);
    const city = getNullableString(formData, "city", 80);
    const district = getNullableString(formData, "district", 80);
    const specialty = getNullableString(formData, "specialty", 120);
    const requestedRoleValue = getString(formData, "requested_role");

    if (
      requestedRoleValue &&
      requestedRoleValue !== "doctor" &&
      requestedRoleValue !== "lab" &&
      requestedRoleValue !== "vet" &&
      requestedRoleValue !== "other"
    ) {
      return { error: "Talep edilen rol geçersiz." };
    }

    const requestedRole: ProfilePatch["requested_role"] =
      requestedRoleValue === "doctor" ||
      requestedRoleValue === "lab" ||
      requestedRoleValue === "vet" ||
      requestedRoleValue === "other"
        ? requestedRoleValue
        : null;

    return {
      city,
      clinic_name: clinicName,
      company_name: companyName,
      district,
      full_name: fullName,
      phone,
      requested_role: requestedRole,
      specialty,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? mapProfileFieldError(error.message) : "Profil güncellenemedi.",
    };
  }
}

function mapProfileFieldError(message: string) {
  if (message.includes("full_name")) {
    return "Ad soyad alanı çok uzun.";
  }

  if (message.includes("phone")) {
    return "Telefon alanı çok uzun.";
  }

  if (message.includes("clinic_name")) {
    return "Klinik adı alanı çok uzun.";
  }

  if (message.includes("company_name")) {
    return "Firma / laboratuvar adı alanı çok uzun.";
  }

  if (message.includes("city")) {
    return "İl alanı çok uzun.";
  }

  if (message.includes("district")) {
    return "İlçe alanı çok uzun.";
  }

  if (message.includes("specialty")) {
    return "Uzmanlık alanı çok uzun.";
  }

  return "Profil bilgileri kaydedilemedi.";
}

function summarizeProfileChanges(oldProfile: Profile, newProfile: Profile) {
  const fields: Array<keyof Profile> = [
    "full_name",
    "phone",
    "clinic_name",
    "company_name",
    "city",
    "district",
    "specialty",
    "requested_role",
  ];

  return fields.reduce<Record<string, { from: unknown; to: unknown }>>(
    (changes, field) => {
      if (JSON.stringify(oldProfile[field]) !== JSON.stringify(newProfile[field])) {
        changes[field] = {
          from: oldProfile[field],
          to: newProfile[field],
        };
      }

      return changes;
    },
    {}
  );
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
