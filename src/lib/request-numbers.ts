import type { Database } from "@/lib/supabase/database.types";

type OrderDraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];

export function getRequestDisplayNumber(
  request: Pick<OrderDraftRow, "id" | "request_number">
) {
  const requestNumber = request.request_number?.trim();
  return requestNumber || request.id;
}

export function getRequestSearchTokens(
  request: Pick<OrderDraftRow, "id" | "request_number">
) {
  return [request.request_number, request.id].filter(Boolean) as string[];
}
