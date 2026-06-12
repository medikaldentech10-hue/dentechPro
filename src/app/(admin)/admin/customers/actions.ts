"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateAdminCustomer } from "@/lib/admin-customers";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export async function updateCustomerAction(formData: FormData) {
  const adminProfile = await requireApprovedAdmin();
  const customerId = getRequiredString(formData, "customer_id");
  const name = getRequiredString(formData, "name");

  if (!customerId || !name) {
    throw new Error("Müşteri adı zorunludur.");
  }

  const email = getOptionalString(formData, "email");

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Geçerli bir e-posta adresi girin.");
  }

  const patch: CustomerUpdate = {
    company_name: getOptionalString(formData, "company_name"),
    email,
    is_active: formData.get("is_active") === "on",
    name,
    notes: getOptionalString(formData, "notes"),
    phone: getOptionalString(formData, "phone"),
  };

  await updateAdminCustomer({
    adminProfile,
    customerId,
    patch,
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}?status=updated`);
}

async function requireApprovedAdmin() {
  const profile = await requireAdmin();

  if (
    profile.role !== "admin" ||
    !profile.is_active ||
    profile.verification_status !== "approved"
  ) {
    throw new Error("Bu işlem için aktif admin yetkisi gerekir.");
  }

  return profile;
}

function getRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value ? value : null;
}
