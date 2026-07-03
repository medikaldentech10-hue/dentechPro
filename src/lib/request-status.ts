import type { Database } from "@/lib/supabase/database.types";

type RequestStatus = Database["public"]["Tables"]["order_drafts"]["Row"]["status"];

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
  confirmed: "Onaylandı",
  contacted: "İletişime Geçildi",
  draft: "Taslak",
  payment_pending: "Ödeme Bekliyor",
  payment_received: "Ödeme Alındı",
  preparing: "Hazırlanıyor",
  shipped: "Gönderildi",
  submitted: "Gönderildi",
  whatsapp_approval_pending: "WhatsApp Onayı",
};

export function getRequestStatusLabel(status: RequestStatus | string) {
  return REQUEST_STATUS_LABELS[status as RequestStatus] ?? status;
}
