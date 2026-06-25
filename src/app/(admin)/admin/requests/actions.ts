"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import {
  applyRequestStockMovement,
  isAdminPaymentMethod,
  isAdminRequestStatus,
  updateRequestPaymentInfo,
  validateRequestStockMovement,
  writeRequestStatusAudit,
} from "@/lib/admin-requests";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type DraftUpdate = Database["public"]["Tables"]["order_drafts"]["Update"];

export async function updateRequestStatusAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const requestId = getString(formData, "request_id");
  const status = getString(formData, "status");

  if (!requestId || !isAdminRequestStatus(status)) {
    throw new Error("Geçersiz talep durumu.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: oldDraft, error: oldDraftError } = await supabase
    .from("order_drafts")
    .select("*")
    .eq("id", requestId)
    .single();

  if (oldDraftError) {
    throw new Error(oldDraftError.message);
  }

  await validateRequestStockMovement({
    newStatus: status,
    oldDraft,
  });

  const patch: DraftUpdate = { status };
  const { data: newDraft, error: updateError } = await supabase
    .from("order_drafts")
    .update(patch)
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  try {
    await applyRequestStockMovement({
      adminProfile,
      newStatus: status,
      oldDraft,
    });
  } catch (error) {
    await supabase
      .from("order_drafts")
      .update({ status: oldDraft.status })
      .eq("id", requestId);
    throw error;
  }

  await writeRequestStatusAudit({ adminProfile, newDraft, oldDraft });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  redirect(`/admin/requests/${requestId}?status=updated`);
}

export async function updateRequestPaymentInfoAction(formData: FormData) {
  const adminProfile = await requireAdmin();
  const requestId = getString(formData, "request_id");
  const rawMethod = getString(formData, "payment_method");
  const note = getString(formData, "payment_note");
  const reference = getString(formData, "payment_reference");
  const requestNote = getString(formData, "request_note");
  let method: Parameters<typeof updateRequestPaymentInfo>[0]["method"] = null;

  if (rawMethod) {
    if (!isAdminPaymentMethod(rawMethod)) {
      throw new Error("Geçersiz ödeme bilgisi.");
    }

    method = rawMethod;
  }

  if (!requestId) {
    throw new Error("Geçersiz ödeme bilgisi.");
  }

  if (note.length > 1000) {
    throw new Error("Ödeme notu en fazla 1000 karakter olabilir.");
  }

  if (reference.length > 160) {
    throw new Error("Ödeme referansı en fazla 160 karakter olabilir.");
  }

  if (requestNote.length > 1000) {
    throw new Error("Talep notu en fazla 1000 karakter olabilir.");
  }

  await updateRequestPaymentInfo({
    adminProfile,
    method,
    note,
    reference,
    requestNote: requestNote || null,
    requestId,
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  redirect(`/admin/requests/${requestId}?payment=updated`);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
