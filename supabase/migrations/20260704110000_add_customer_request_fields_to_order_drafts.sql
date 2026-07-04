alter table public.order_drafts
add column if not exists customer_payment_preference text,
add column if not exists customer_note text;

alter table public.order_drafts
drop constraint if exists order_drafts_customer_payment_preference_check;

alter table public.order_drafts
add constraint order_drafts_customer_payment_preference_check check (
  customer_payment_preference is null
  or customer_payment_preference in (
    'bank_transfer',
    'credit_card_link',
    'cash',
    'discuss_later'
  )
);
