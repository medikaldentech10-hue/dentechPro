"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getCurrentRoutingProfile,
} from "@/lib/auth";
import {
  isCustomerPaymentPreference,
  type CustomerPaymentPreference,
} from "@/lib/customer-request-preferences";
import {
  addVariantToDraft,
  cancelCustomerRequest,
  clearDraft,
  removeDraftItem,
  type RequestDraftTotals,
  submitDraftToWhatsApp,
  updateDraftItemQuantity,
} from "@/lib/order-drafts";
import {
  isRateLimitExceededError,
  logRateLimitBlockedAttempt,
  RATE_LIMIT_POLICIES,
  type RateLimitAction,
} from "@/lib/rate-limit";

export async function addToOrderDraftAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const variantId = getRequiredString(formData, "variant_id");
  const quantity = parseQuantity(formData);

  if (!variantId) {
    throw new Error("Varyant bulunamadı.");
  }

  try {
    await addVariantToDraft({ profile, quantity, variantId });
  } catch (error) {
    await handleRateLimitError({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        quantity,
        variant_id: variantId,
      },
      redirects: {
        min_interval: "/request?error=item_rate_limited",
        window_limit: "/request?error=item_rate_limited",
      },
      userId: profile.id,
    });
    throw error;
  }

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

  try {
    await updateDraftItemQuantity({ itemId, profile, quantity });
  } catch (error) {
    await handleRateLimitError({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        item_id: itemId,
        quantity,
      },
      redirects: {
        min_interval: "/request?error=item_rate_limited",
        window_limit: "/request?error=item_rate_limited",
      },
      userId: profile.id,
    });
    throw error;
  }

  revalidateRequestPaths();
  redirect("/request?status=updated");
}

export type RequestItemMutationResult = RequestDraftTotals & {
  error?: string;
  itemId?: string;
  lineTotal?: number;
  quantity?: number;
  removed?: boolean;
  success?: boolean;
  unitPrice?: number | null;
};

export async function addToOrderDraftInlineAction(input: {
  quantity: number;
  variantId: string;
}): Promise<{
  error?: string;
  success?: boolean;
}> {
  const startedAt = performance.now();

  try {
    const profile = await getRequiredProfile();
    await addVariantToDraft({
      profile,
      quantity: input.quantity,
      variantId: input.variantId,
    });

    revalidateRequestPaths();
    logRequestActionPerf("request.addItem", {
      durationMs: Math.round(performance.now() - startedAt),
      quantity: input.quantity,
      success: true,
    });

    return { success: true };
  } catch (error) {
    const message = await getInlineMutationErrorMessage({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        quantity: input.quantity,
        variant_id: input.variantId,
      },
    });

    logRequestActionPerf("request.addItem", {
      durationMs: Math.round(performance.now() - startedAt),
      quantity: input.quantity,
      success: false,
    });

    return { error: message };
  }
}

export async function updateOrderItemQuantityInlineAction(
  input: {
    itemId: string;
    quantity: number;
  }
): Promise<RequestItemMutationResult> {
  const startedAt = performance.now();

  try {
    const authStartedAt = performance.now();
    const profile = await getRequiredAccessProfile();
    const authMs = Math.round(performance.now() - authStartedAt);
    const result = await updateDraftItemQuantity({
      itemId: input.itemId,
      profile,
      quantity: input.quantity,
    });

    logRequestActionPerf("request.updateQuantity", {
      authMs,
      durationMs: Math.round(performance.now() - startedAt),
      quantity: input.quantity,
      success: true,
    });

    return {
      ...result,
      success: true,
    };
  } catch (error) {
    const authMs = Math.round(performance.now() - startedAt);
    const message = await getInlineMutationErrorMessage({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        item_id: input.itemId,
        quantity: input.quantity,
      },
    });
    logRequestActionPerf("request.updateQuantity", {
      authMs,
      durationMs: Math.round(performance.now() - startedAt),
      quantity: input.quantity,
      success: false,
    });

    return {
      error: message,
      itemId: input.itemId,
      quantity: input.quantity,
      subtotal: 0,
      total: 0,
    };
  }
}

export async function removeOrderItemAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const itemId = getRequiredString(formData, "item_id");

  if (!itemId) {
    throw new Error("Talep kalemi bulunamadı.");
  }

  try {
    await removeDraftItem({ itemId, profile });
  } catch (error) {
    await handleRateLimitError({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        item_id: itemId,
      },
      redirects: {
        min_interval: "/request?error=item_rate_limited",
        window_limit: "/request?error=item_rate_limited",
      },
      userId: profile.id,
    });
    throw error;
  }

  revalidateRequestPaths();
  redirect("/request?status=removed");
}

export async function removeOrderItemInlineAction(input: {
  itemId: string;
}): Promise<RequestItemMutationResult> {
  const startedAt = performance.now();

  try {
    const profile = await getRequiredProfile();
    const result = await removeDraftItem({
      itemId: input.itemId,
      profile,
    });

    revalidatePath("/request");
    logRequestActionPerf("request.removeItem", {
      durationMs: Math.round(performance.now() - startedAt),
      success: true,
    });

    return {
      ...result,
      removed: true,
      success: true,
    };
  } catch (error) {
    const message = await getInlineMutationErrorMessage({
      action: RATE_LIMIT_POLICIES.requestItemMutation.action,
      error,
      metadata: {
        item_id: input.itemId,
      },
    });
    logRequestActionPerf("request.removeItem", {
      durationMs: Math.round(performance.now() - startedAt),
      success: false,
    });

    return {
      error: message,
      itemId: input.itemId,
      subtotal: 0,
      total: 0,
    };
  }
}

export async function clearOrderDraftAction() {
  const profile = await getRequiredProfile();

  await clearDraft(profile);
  revalidateRequestPaths();
  redirect("/request?status=cleared");
}

export async function submitOrderDraftToWhatsAppAction(formData: FormData) {
  const startedAt = performance.now();
  const profile = await getRequiredProfile();
  const rawPreference = getRequiredString(formData, "customer_payment_preference");
  const customerNote = getRequiredString(formData, "customer_note");

  if (!isCustomerPaymentPreference(rawPreference)) {
    throw new Error("Geçersiz ödeme tercihi.");
  }

  if (customerNote.length > 1000) {
    throw new Error("Talep notu en fazla 1000 karakter olabilir.");
  }

  let whatsAppUrl: string;
  try {
    whatsAppUrl = await submitDraftToWhatsApp({
      customerNote: customerNote || null,
      customerPaymentPreference: rawPreference as CustomerPaymentPreference,
      profile,
    });
  } catch (error) {
    await handleRateLimitError({
      action: RATE_LIMIT_POLICIES.customerRequestSubmit.action,
      error,
      metadata: {
        customer_payment_preference: rawPreference,
        note_length: customerNote.length,
      },
      redirects: {
        min_interval: "/request?error=submit_rate_limited",
        window_limit: "/request?error=submit_daily_limit",
      },
      userId: profile.id,
    });
    throw error;
  }

  revalidateRequestPaths();
  logRequestActionPerf("request.submit", {
    durationMs: Math.round(performance.now() - startedAt),
    success: true,
  });
  redirect(whatsAppUrl);
}

export async function cancelCustomerRequestAction(formData: FormData) {
  const profile = await getRequiredProfile();
  const requestId = getRequiredString(formData, "request_id");

  if (!requestId) {
    throw new Error("Talep bulunamadı.");
  }

  await cancelCustomerRequest({ profile, requestId });
  revalidateRequestPaths();
  redirect("/request?status=cancelled");
}

async function getRequiredProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

async function getRequiredAccessProfile() {
  const profile = await getCurrentRoutingProfile();

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

async function handleRateLimitError({
  action,
  error,
  metadata,
  redirects,
  userId,
}: {
  action: RateLimitAction;
  error: unknown;
  metadata: Record<string, string | number>;
  redirects: Record<"min_interval" | "window_limit", string>;
  userId: string;
}) {
  if (!isRateLimitExceededError(error)) {
    return;
  }

  await logRateLimitBlockedAttempt({
    action,
    metadata,
    reason: error.reason,
    userId,
  });

  redirect(redirects[error.reason]);
}

async function getInlineMutationErrorMessage({
  action,
  error,
  metadata,
}: {
  action: RateLimitAction;
  error: unknown;
  metadata: Record<string, string | number>;
}) {
  if (!isRateLimitExceededError(error)) {
    return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  }

  const profile = await getCurrentRoutingProfile();
  if (profile) {
    await logRateLimitBlockedAttempt({
      action,
      metadata,
      reason: error.reason,
      userId: profile.id,
    });
  }

  return "Çok kısa sürede fazla işlem yapıldı. Lütfen birkaç saniye sonra tekrar deneyin.";
}

function logRequestActionPerf(event: string, payload: Record<string, unknown>) {
  if (process.env.DENTECH_PERF_LOGS !== "true") {
    return;
  }

  console.info(`[${event}]`, payload);
}
