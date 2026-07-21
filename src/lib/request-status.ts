import type { Database } from "@/lib/supabase/database.types";

type RequestStatus = Database["public"]["Tables"]["order_drafts"]["Row"]["status"];

const REQUEST_STATUS_LABELS: Record<string, string> = {
  approved: "Onaylandı",
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
  confirmed: "Onaylandı",
  contacted: "İletişime Geçildi",
  draft: "Taslak",
  payment_pending: "Ödeme Bekliyor",
  payment_received: "Ödeme Alındı",
  pending_payment: "Ödeme Bekliyor",
  preparing: "Hazırlanıyor",
  processing: "Hazırlanıyor",
  rejected: "Reddedildi",
  shipped: "Gönderildi",
  submitted: "Gönderildi",
  whatsapp_approval_pending: "Gönderildi",
};

export const CUSTOMER_CANCELLABLE_STATUSES = [
  "draft",
  "submitted",
  "whatsapp_approval_pending",
] as const;

export function getRequestStatusLabel(status: RequestStatus | string) {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function isCustomerCancellableStatus(status: RequestStatus | string) {
  return CUSTOMER_CANCELLABLE_STATUSES.some(
    (cancellableStatus) => cancellableStatus === status
  );
}
