"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";
import {
  addVariantToDraft,
  clearDraft,
  removeDraftItem,
  submitDraftToWhatsApp,
  updateDraftItemQuantity,
} from "@/lib/order-drafts";

export async function addToOrderDraftAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const variantId = getRequiredString(formData, "variant_id");
  const quantity = parseQuantity(formData);

  if (!variantId) {
    throw new Error("Varyant bulunamadı.");
  }

  await addVariantToDraft({ profile, quantity, variantId });
  revalidateRequestPaths();
  redirect("/request?status=added");
}

export async function updateOrderItemQuantityAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const itemId = getRequiredString(formData, "item_id");
  const quantity = parseQuantity(formData);

  if (!itemId) {
    throw new Error("Talep kalemi bulunamadı.");
  }

  await updateDraftItemQuantity({ itemId, profile, quantity });
  revalidateRequestPaths();
  redirect("/request?status=updated");
}

export async function removeOrderItemAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const itemId = getRequiredString(formData, "item_id");

  if (!itemId) {
    throw new Error("Talep kalemi bulunamadı.");
  }

  await removeDraftItem({ itemId, profile });
  revalidateRequestPaths();
  redirect("/request?status=removed");
}

export async function clearOrderDraftAction() {
  const profile = await getRequiredProfile();

  await clearDraft(profile);
  revalidateRequestPaths();
  redirect("/request?status=cleared");
}

export async function submitOrderDraftToWhatsAppAction() {
  const profile = await getRequiredProfile();
  const whatsAppUrl = await submitDraftToWhatsApp(profile);

  revalidateRequestPaths();
  redirect(whatsAppUrl);
}

async function getRequiredProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

function getRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseQuantity(formData: FormData) {
  const quantity = Number(getRequiredString(formData, "quantity") || "1");

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Adet pozitif tam sayı olmalıdır.");
  }

  return quantity;
}

function revalidateRequestPaths() {
  revalidatePath("/request");
  revalidatePath("/products");
}
