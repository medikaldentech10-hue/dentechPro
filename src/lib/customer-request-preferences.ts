export const customerPaymentPreferenceOptions = [
  "bank_transfer",
  "credit_card_link",
  "cash",
  "discuss_later",
] as const;

export type CustomerPaymentPreference =
  (typeof customerPaymentPreferenceOptions)[number];

export function isCustomerPaymentPreference(
  value: string
): value is CustomerPaymentPreference {
  return customerPaymentPreferenceOptions.includes(
    value as CustomerPaymentPreference
  );
}

export function customerPaymentPreferenceLabel(
  value: CustomerPaymentPreference | null | undefined
) {
  const labels: Record<CustomerPaymentPreference, string> = {
    bank_transfer: "Havale / EFT",
    cash: "Nakit",
    credit_card_link: "Kredi Kartı / Sanal POS Linki",
    discuss_later: "Daha sonra görüşülsün",
  };

  return value ? labels[value] : null;
}
