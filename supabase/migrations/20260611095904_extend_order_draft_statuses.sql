alter table public.order_drafts
drop constraint if exists order_drafts_status_check;

alter table public.order_drafts
add constraint order_drafts_status_check check (
  status in (
    'draft',
    'submitted',
    'contacted',
    'whatsapp_approval_pending',
    'payment_pending',
    'payment_received',
    'preparing',
    'confirmed',
    'shipped',
    'completed',
    'cancelled'
  )
);
